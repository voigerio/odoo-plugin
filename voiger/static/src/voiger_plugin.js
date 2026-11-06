import { Plugin, usePlugin } from "@odoo/owl";
import { _t } from "@web/core/l10n/translation";
import { NotificationPlugin } from "@web/core/notifications/notification_plugin";
import { ORM } from "@web/core/orm_plugin";
import { phoneCallHandlerRegistry } from "@web/core/phone/phone_call";
import { services } from "@web/core/services";
import { voigerPanel } from "./voiger_panel";

function duration(ms) {
    const seconds = Math.round(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function describeCall(call) {
    const phone = call.phone;
    if (call.direction === "inbound") {
        return call.answered
            ? _t("Incoming Voiger call from %(phone)s, %(duration)s", { phone, duration: duration(call.durationMs) })
            : _t("Missed Voiger call from %(phone)s", { phone });
    }
    return call.answered
        ? _t("Outbound Voiger call to %(phone)s, %(duration)s", { phone, duration: duration(call.durationMs) })
        : _t("Outbound Voiger call to %(phone)s, not answered", { phone });
}

let active = null;

export class VoigerPlugin extends Plugin {
    orm = usePlugin(ORM);
    notification = usePlugin(NotificationPlugin);

    setup() {
        active = this;
        voigerPanel.setHandlers({
            onDialOutcome: (outcome) => this.onDialOutcome(outcome),
            onCall: (call) => this.logCall(call).catch((error) => console.warn("Voiger call not logged", error)),
        });
    }

    onDialOutcome(outcome) {
        if (outcome === "no_country_code") {
            this.notification.add(_t("This number has no country code, so Voiger can't call it. Add the country code, for example +66."), { type: "warning" });
        } else if (outcome !== "accepted") {
            this.notification.add(_t("Voiger couldn't start the call."), { type: "danger" });
        }
    }

    async findContacts(phone) {
        if (!phone) {
            return [];
        }
        const ids = await this.orm.call("res.partner", "search", [[["phone_mobile_search", "=", phone]]], { limit: 5 });
        return ids.map((id) => ({ model: "res.partner", id }));
    }

    async logCall(call) {
        const targets = call.record ? [call.record] : await this.findContacts(call.phone);
        const body = describeCall(call);
        for (const { model, id } of targets) {
            await this.orm.call(model, "message_post", [[id]], {
                body,
                message_type: "comment",
                subtype_xmlid: "mail.mt_note",
            });
        }
    }
}

services.add(VoigerPlugin);

// Ahead of Odoo's own handlers (sequence 50), such as the "install Odoo Phone" dialog shown to admins.
phoneCallHandlerRegistry.add("voiger", {
    execute(env, { phoneNumber, resModel, resId }) {
        const record = resModel && resId ? { model: resModel, id: resId } : null;
        if (!voigerPanel.dial(phoneNumber, record)) {
            active?.notification.add(_t("Sign in to Voiger and the call will start."), { type: "info" });
        }
        return true;
    },
}, { sequence: 10 });
