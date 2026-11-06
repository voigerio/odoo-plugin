import { Component, xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { voigerPanel } from "./voiger_panel";

export class VoigerSystray extends Component {
    static template = xml`
        <button type="button" class="o_voiger_systray o_nav_entry" title="Voiger" t-on-click="() => this.toggle()">
            <i class="oi" data-icon="phone" role="img" aria-label="Voiger"/>
        </button>`;

    toggle() {
        voigerPanel.toggle();
    }
}

registry.category("systray").add("voiger.systray", { Component: VoigerSystray }, { sequence: 1 });
