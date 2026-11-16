import { _t } from "@web/core/l10n/translation";

export const PANEL_URL = "https://integrations.voiger.io/odoo/panel/";
const PANEL_ORIGIN = new URL(PANEL_URL).origin;
const DIALER_MODE_KEY = "voiger.odoo.dialerMode";

// Plain DOM outside Owl, so the frame and its call survive every Odoo screen change.
const panel = document.createElement("div");
panel.className = "o_voiger_panel d-none";
let frame = null;
let ready = false;
let queuedDial = null;
const liveCalls = new Set();
const handlers = {
    onDialOutcome: () => {},
    onStarted: () => {},
    onCall: () => {},
    onModeBlocked: () => {},
};

export function readDialerMode() {
    try {
        return localStorage.getItem(DIALER_MODE_KEY) !== "false";
    } catch {
        return true;
    }
}

function send(message) {
    frame.contentWindow.postMessage({ voiger: "odoo", v: 1, ...message }, PANEL_ORIGIN);
}

function loadFrame() {
    const compact = readDialerMode();
    panel.classList.toggle("o_voiger_panel_full", !compact);
    const url = new URL(PANEL_URL);
    url.searchParams.set("dialerMode", String(compact));
    ready = false;
    frame.src = url.href;
}

function header() {
    const bar = document.createElement("div");
    bar.className = "o_voiger_panel_header d-flex align-items-center gap-2 px-3 py-1 border-bottom";
    const title = document.createElement("span");
    title.className = "fw-bold flex-grow-1";
    title.textContent = "Voiger";
    const mode = document.createElement("div");
    mode.className = "form-check form-switch mb-0";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.className = "form-check-input";
    toggle.id = "o_voiger_compact";
    toggle.checked = readDialerMode();
    const label = document.createElement("label");
    label.className = "form-check-label";
    label.htmlFor = toggle.id;
    label.textContent = _t("Compact");
    mode.append(toggle, label);
    toggle.addEventListener("change", () => {
        // Reloading the dialer would drop the call.
        if (liveCalls.size) {
            toggle.checked = readDialerMode();
            handlers.onModeBlocked();
            return;
        }
        try {
            localStorage.setItem(DIALER_MODE_KEY, String(toggle.checked));
        } catch {
            // Applies to this page only.
        }
        loadFrame();
    });
    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn-close";
    close.title = _t("Hide");
    close.addEventListener("click", hide);
    bar.append(title, mode, close);
    return bar;
}

/** Loads the dialer hidden, so an incoming call can ring and open it. */
export function mount() {
    if (frame) {
        return;
    }
    frame = document.createElement("iframe");
    frame.title = "Voiger";
    frame.allow = "microphone; autoplay; clipboard-write";
    panel.append(header(), frame);
    document.body.appendChild(panel);
    loadFrame();
    const focus = () => {
        if (document.visibilityState === "visible") {
            send({ type: "focus" });
        }
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
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
    } else if (message.type === "started" && message.call) {
        liveCalls.add(message.call.key);
        handlers.onStarted(message.call);
    } else if (message.type === "call" && message.call) {
        liveCalls.delete(message.call.key);
        handlers.onCall(message.call);
    }
});

/** Drops the panel down under the Voiger button in the top bar, with its arrow on the button. */
function place() {
    const button = document.querySelector(".o_voiger_systray");
    const rect = button?.getBoundingClientRect();
    if (!rect?.width) {
        panel.style.removeProperty("top");
        panel.style.removeProperty("right");
        return;
    }
    const right = Math.max(8, window.innerWidth - rect.right - 8);
    panel.style.top = `${rect.bottom + 8}px`;
    panel.style.right = `${right}px`;
    panel.style.setProperty("--o-voiger-arrow-right", `${window.innerWidth - right - rect.left - rect.width / 2 - 7}px`);
}

function hide() {
    panel.classList.add("d-none");
}

function show() {
    mount();
    place();
    panel.classList.remove("d-none");
}

window.addEventListener("resize", () => panel.classList.contains("d-none") || place());
document.addEventListener("keydown", (event) => event.key === "Escape" && !liveCalls.size && hide());
// Like Odoo's own top-bar menus, a click elsewhere closes it, unless a call is on.
document.addEventListener("pointerdown", (event) => {
    if (liveCalls.size || panel.contains(event.target) || event.target.closest?.(".o_voiger_systray, .o_phone_form_link, a[href^='tel:'], .o_notification")) {
        return;
    }
    hide();
});

export const voigerPanel = {
    setHandlers(next) {
        Object.assign(handlers, next);
    },
    toggle() {
        if (panel.classList.contains("d-none")) {
            show();
        } else {
            hide();
        }
    },
    show,
    /** Returns false when the call waits for the agent to sign in to Voiger. */
    dial(phone, record) {
        show();
        const message = { type: "dial", id: crypto.randomUUID(), phone, record };
        if (!ready) {
            queuedDial = message;
            return false;
        }
        send(message);
        return true;
    },
};
