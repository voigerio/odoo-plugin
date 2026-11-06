export const PANEL_URL = "https://integrations.voiger.io/odoo/panel/";
const PANEL_ORIGIN = new URL(PANEL_URL).origin;

// Plain DOM outside Owl, so the frame and its call survive every Odoo screen change.
const panel = document.createElement("div");
panel.className = "o_voiger_panel d-none";
let frame = null;
let ready = false;
let queuedDial = null;
const handlers = { onDialOutcome: () => {}, onCall: () => {} };

function send(message) {
    frame.contentWindow.postMessage({ voiger: "odoo", v: 1, ...message }, PANEL_ORIGIN);
}

function mount() {
    if (frame) {
        return;
    }
    frame = document.createElement("iframe");
    frame.src = PANEL_URL;
    frame.title = "Voiger";
    frame.allow = "microphone; autoplay; clipboard-write";
    panel.appendChild(frame);
    document.body.appendChild(panel);
}

window.addEventListener("message", (event) => {
    const message = event.data;
    if (!frame || event.source !== frame.contentWindow || event.origin !== PANEL_ORIGIN) {
        return;
    }
    if (message?.voiger !== "odoo" || message.v !== 1) {
        return;
    }
    if (message.type === "ready") {
        ready = message.ready === true;
        if (ready && queuedDial) {
            send(queuedDial);
            queuedDial = null;
        }
    } else if (message.type === "dial") {
        handlers.onDialOutcome(message.outcome);
    } else if (message.type === "call" && message.call) {
        handlers.onCall(message.call);
    }
});

export const voigerPanel = {
    setHandlers(next) {
        Object.assign(handlers, next);
    },
    toggle() {
        mount();
        panel.classList.toggle("d-none");
    },
    /** Returns false when the call waits for the agent to sign in to Voiger. */
    dial(phone, record) {
        mount();
        panel.classList.remove("d-none");
        const message = { type: "dial", id: crypto.randomUUID(), phone, record };
        if (!ready) {
            queuedDial = message;
            return false;
        }
        send(message);
        return true;
    },
};
