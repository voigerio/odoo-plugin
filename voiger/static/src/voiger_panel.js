import { _t } from "@web/core/l10n/translation";

export const PANEL_URL = "https://integrations.voiger.io/odoo/panel/";
const PANEL_ORIGIN = new URL(PANEL_URL).origin;
const PINNED_KEY = "voiger.odoo.pinned";

// Plain DOM outside Owl, so the frame and its call survive every Odoo screen change.
const panel = document.createElement("div");
panel.className = "o_voiger_panel d-none";
let frame = null;
let ready = false;
let queuedDial = null;
const handlers = {
    onDialOutcome: () => {},
    onStarted: () => {},
    onCall: () => {},
};

function readPinned() {
    try {
        return localStorage.getItem(PINNED_KEY) === "true";
    } catch {
        return false;
    }
}
let pinned = readPinned();

function send(message) {
    frame.contentWindow.postMessage({ voiger: "odoo", v: 1, ...message }, PANEL_ORIGIN);
}

function loadFrame() {
    const url = new URL(PANEL_URL);
    url.searchParams.set("dialerMode", "true");
    ready = false;
    frame.src = url.href;
}

function header() {
    const bar = document.createElement("div");
    bar.className = "o_voiger_panel_header d-flex align-items-center gap-2 px-3 py-1 border-bottom";
    const title = document.createElement("span");
    title.className = "fw-bold flex-grow-1";
    title.textContent = "Voiger";
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "btn btn-link p-0 o_voiger_pin";
    pin.title = _t("Keep open");
    pin.innerHTML = '<i class="oi" data-icon="push_pin" role="img"></i>';
    const showPinned = () => {
        pin.classList.toggle("text-primary", pinned);
        pin.classList.toggle("text-muted", !pinned);
        pin.setAttribute("aria-pressed", String(pinned));
    };
    showPinned();
    pin.addEventListener("click", () => {
        pinned = !pinned;
        try {
            localStorage.setItem(PINNED_KEY, String(pinned));
        } catch {
            // Applies to this page only.
        }
        showPinned();
    });
    const close = document.createElement("button");
    close.type = "button";
    close.className = "btn-close";
    close.title = _t("Hide");
    close.addEventListener("click", hide);
    bar.append(title, pin, close);
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
        handlers.onStarted(message.call);
    } else if (message.type === "call" && message.call) {
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
document.addEventListener("keydown", (event) => event.key === "Escape" && !pinned && hide());
// Like Odoo's own top-bar menus, a click elsewhere closes it unless pinned; a call goes on hidden.
document.addEventListener("pointerdown", (event) => {
    if (pinned || panel.contains(event.target) || event.target.closest?.(".o_voiger_systray, .o_phone_form_link, a[href^='tel:'], .o_notification")) {
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
