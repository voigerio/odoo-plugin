import { Message } from "@mail/core/common/message";
import { patch } from "@web/core/utils/patch";

const isRecording = (audio) => {
    try {
        const url = new URL(audio.getAttribute("src"));
        return url.protocol === "https:" && url.hostname.endsWith(".voiger.io");
    } catch {
        return false;
    }
};

/** A Voiger call note's recording plays in the chatter. */
patch(Message.prototype, {
    prepareMessageBody(bodyEl) {
        const roots = super.prepareMessageBody(bodyEl);
        for (const audio of bodyEl?.querySelectorAll("audio[src]") ?? []) {
            if (isRecording(audio)) {
                audio.controls = true;
                audio.preload = "none";
                audio.classList.add("o_voiger_recording");
            }
        }
        return roots;
    },
});
