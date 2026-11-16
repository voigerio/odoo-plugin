import { Plugin, usePlugin } from "@odoo/owl";
import { DialogPlugin } from "@web/core/dialog/dialog_plugin";
import { _t } from "@web/core/l10n/translation";
import { rpc } from "@web/core/network/rpc";
import { NotificationPlugin } from "@web/core/notifications/notification_plugin";
import { ORM } from "@web/core/orm_plugin";
import { phoneCallHandlerRegistry } from "@web/core/phone/phone_call";
import { services } from "@web/core/services";
import { FormViewDialog } from "@web/views/view_dialogs/form_view_dialog";
import { ActionPlugin } from "@web/webclient/actions/action_plugin";
import { mount, voigerPanel } from "./voiger_panel";

const LOGS_KEY = "voiger.odoo.logs";
const LOG_KEPT_MS = 24 * 60 * 60 * 1000;

function duration(ms) {
    const seconds = Math.round(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const escape = (value) => String(value).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

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

/** The chatter note: what happened, then Voiger's notes, summary and call details. */
export function callBody(call) {
    const recording = call.details?.recordingUrl;
    return [
        `<p>${escape(describeCall(call))}</p>`,
        call.details?.html ?? "",
        // Odoo keeps <audio> but strips its controls; voiger_message.js shows the player.
        recording?.startsWith("https://")
            ? `<audio src="${escape(recording)}"></audio><p><a href="${escape(recording)}" target="_blank" rel="noopener">${escape(_t("Play the recording"))}</a></p>`
            : "",
    ].join("");
}

// Which notes a call wrote, so a later update edits them, from any tab or after a reload.
function readLogs() {
    try {
        const logs = JSON.parse(localStorage.getItem(LOGS_KEY) ?? "{}");
        return logs && typeof logs === "object" ? logs : {};
    } catch {
        return {};
    }
}

function writeLog(key, entry) {
    const logs = readLogs();
    const now = Date.now();
    for (const [other, value] of Object.entries(logs)) {
        if (now - (value.at ?? 0) > LOG_KEPT_MS) {
            delete logs[other];
        }
    }
    logs[key] = { ...entry, at: now };
    try {
        localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    } catch {
        // The note is posted; a later update then posts a second one.
    }
}

let active = null;

export class VoigerPlugin extends Plugin {
    orm = usePlugin(ORM);
    notification = usePlugin(NotificationPlugin);
    action = usePlugin(ActionPlugin);
    dialog = usePlugin(DialogPlugin);
    queues = new Map();

    setup() {
        active = this;
        voigerPanel.setHandlers({
            onDialOutcome: (outcome) => this.onDialOutcome(outcome),
            onStarted: (call) => this.onStarted(call).catch((error) => console.warn("Voiger call start not handled", error)),
            onCall: (call) => this.serialize(call.key, () => this.logCall(call)),
        });
        mount();
    }

    serialize(key, work) {
        const next = (this.queues.get(key) ?? Promise.resolve())
            .then(work)
            .catch((error) => console.warn("Voiger call not logged", error));
        this.queues.set(key, next);
        next.then(() => this.queues.get(key) === next && this.queues.delete(key));
    }

    onDialOutcome(outcome) {
        if (outcome === "no_country_code") {
            this.notification.add(_t("This number has no country code, so Voiger can't call it. Add the country code, for example +66."), { type: "warning" });
        } else if (outcome !== "accepted") {
            this.notification.add(_t("Voiger couldn't start the call."), { type: "danger" });
        }
    }

    /** Up to two contacts with this number: enough to tell one from several. */
    async contactsWith(phone) {
        return phone ? this.orm.search("res.partner", [["phone_mobile_search", "=", phone]], { limit: 2 }) : [];
    }

    /** The one contact with this number; none when no contact or several share it. */
    async findContact(phone) {
        const ids = await this.contactsWith(phone);
        return ids.length === 1 ? ids[0] : null;
    }

    async onStarted(call) {
        if (call.direction === "inbound") {
            voigerPanel.show();
        }
        if (call.record) {
            return;
        }
        const ids = await this.contactsWith(call.phone);
        const contactId = ids.length === 1 ? ids[0] : null;
        if (ids.length > 1) {
            this.notification.add(
                _t("%(phone)s belongs to more than one Odoo contact, so this call isn't logged on any of them.", { phone: call.phone }),
                { type: "warning" }
            );
        } else if (contactId && call.direction === "inbound") {
            await this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "res.partner",
                res_id: contactId,
                views: [[false, "form"]],
                target: "current",
            });
        } else if (!contactId) {
            this.offerNewContact(call);
        }
    }

    offerNewContact(call) {
        const close = this.notification.add(_t("%(phone)s is not an Odoo contact.", { phone: call.phone }), {
            type: "info",
            sticky: true,
            buttons: [
                {
                    name: _t("Create contact"),
                    primary: true,
                    onClick: () => {
                        close();
                        this.dialog.add(FormViewDialog, {
                            resModel: "res.partner",
                            title: _t("New contact"),
                            context: {
                                default_phone: call.phone,
                                ...(call.name ? { default_name: call.name } : {}),
                                ...(call.email ? { default_email: call.email } : {}),
                            },
                            onRecordSaved: (record) =>
                                this.serialize(call.key, () => this.contactCreated(call.key, record.resId)),
                        });
                    },
                },
            ],
        });
    }

    async contactCreated(key, partnerId) {
        const entry = readLogs()[key] ?? {};
        const targets = entry.targets ?? [];
        if (!targets.some((target) => target.model === "res.partner" && target.id === partnerId)) {
            targets.push({ model: "res.partner", id: partnerId });
        }
        writeLog(key, { ...entry, targets });
        if (entry.call) {
            await this.logCall(entry.call);
        }
    }

    /** The record the call was started from, its contact for a lead, or else the one contact with that number. */
    async findTargets(call) {
        if (!call.record) {
            const contactId = await this.findContact(call.phone);
            return contactId ? [{ model: "res.partner", id: contactId }] : [];
        }
        const targets = [{ ...call.record }];
        if (call.record.model === "crm.lead") {
            const [lead] = await this.orm
                .read("crm.lead", [call.record.id], ["partner_id"])
                .catch(() => []);
            const partnerId = Array.isArray(lead?.partner_id) ? lead.partner_id[0] : lead?.partner_id?.id;
            if (partnerId) {
                targets.push({ model: "res.partner", id: partnerId });
            }
        }
        return targets;
    }

    async logCall(call) {
        const entry = readLogs()[call.key] ?? {};
        const targets = entry.targets ?? (await this.findTargets(call));
        const body = callBody(call);
        for (const target of targets) {
            if (target.messageId) {
                if (target.body !== body) {
                    await rpc("/mail/message/update_content", {
                        message_id: target.messageId,
                        update_data: { body },
                    });
                }
            } else {
                const posted = await rpc("/mail/message/post", {
                    thread_model: target.model,
                    thread_id: target.id,
                    post_data: { body, message_type: "comment", subtype_xmlid: "mail.mt_note" },
                });
                target.messageId = posted.message_id;
            }
            target.body = body;
            writeLog(call.key, { ...entry, call, targets });
        }
        writeLog(call.key, { ...entry, call, targets });
        const tags = call.details?.tags ?? [];
        const contacts = targets.filter((target) => target.model === "res.partner").map((target) => target.id);
        if (tags.length && contacts.length) {
            await this.addTags(contacts, tags);
        }
    }

    async addTags(contactIds, names) {
        const tagIds = [];
        for (const name of names) {
            try {
                const [found] = await this.orm.search("res.partner.category", [["name", "=ilike", name]], { limit: 1 });
                tagIds.push(found ?? (await this.orm.create("res.partner.category", [{ name }]))[0]);
            } catch (error) {
                // Users without Sales or contact-manager rights can't create a tag.
                console.warn(`Voiger tag "${name}" not added`, error);
            }
        }
        if (tagIds.length) {
            await this.orm.write("res.partner", contactIds, { category_id: tagIds.map((id) => [4, id]) });
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
