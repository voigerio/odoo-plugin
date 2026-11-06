export const VOIGER_URL = "https://app.voiger.io/?dialerMode=true";

// Plain DOM outside Owl, so the frame and its call survive every Odoo screen change.
const panel = document.createElement("div");
panel.className = "o_voiger_panel d-none";
let frame = null;

export const voigerPanel = {
    toggle() {
        if (!frame) {
            frame = document.createElement("iframe");
            frame.src = VOIGER_URL;
            frame.title = "Voiger";
            frame.allow = "microphone; autoplay; clipboard-write";
            panel.appendChild(frame);
            document.body.appendChild(panel);
        }
        panel.classList.toggle("d-none");
    },
};
