class OutboxNotifier {
  constructor() {}

  static BANNER_ID = "luno-outbox-notify-banner";

  static showNotification(payloadData) {
    if (typeof document === "undefined") return;

    var existing = document.getElementById(OutboxNotifier.BANNER_ID);
    if (existing) existing.remove();

    var title = (payloadData && payloadData.title) || "Luno Outbox Package";
    var text = (payloadData && (payloadData.text || payloadData.payload)) || "";

    var banner = document.createElement("div");
    banner.id = OutboxNotifier.BANNER_ID;
    banner.style.cssText = [
      "position: fixed !important;",
      "bottom: 16px !important;",
      "right: 16px !important;",
      "z-index: 2147483647 !important;",
      "background: #271052 !important;",
      "color: #d2a8ff !important;",
      "border: 2px solid #8257e5 !important;",
      "border-radius: 8px !important;",
      "padding: 8px 12px !important;",
      "font-family: monospace !important;",
      "font-size: 11px !important;",
      "font-weight: bold !important;",
      "box-shadow: 0 8px 24px rgba(130, 87, 229, 0.4) !important;",
      "display: flex !important;",
      "align-items: center !important;",
      "gap: 8px !important;",
      "cursor: pointer !important;"
    ].join("\n");

    var label = document.createElement("span");
    label.appendChild(document.createTextNode("📥 Luno Outbox Ready: " + title));

    var btnPaste = document.createElement("button");
    btnPaste.appendChild(document.createTextNode("📋 Fill Prompt Field"));
    btnPaste.style.cssText = "background:#8257e5; color:#fff; border:none; border-radius:4px; padding:3px 8px; font-size:10px; font-family:monospace; cursor:pointer; font-weight:bold;";
    btnPaste.onclick = function(e) {
      e.stopPropagation();
      OutboxNotifier.insertTextIntoAiStudioPrompt(text);
      banner.remove();
    };

    var btnClose = document.createElement("button");
    btnClose.appendChild(document.createTextNode("✖"));
    btnClose.style.cssText = "background:#161b22; color:#ff7b72; border:1px solid #da3633; border-radius:4px; padding:2px 5px; font-size:10px; font-family:monospace; cursor:pointer;";
    btnClose.onclick = function(e) {
      e.stopPropagation();
      banner.remove();
    };

    banner.appendChild(label);
    banner.appendChild(btnPaste);
    banner.appendChild(btnClose);

    (document.body || document.documentElement).appendChild(banner);

    setTimeout(function() {
      if (banner.parentNode) banner.remove();
    }, 12000);
  }

  static insertTextIntoAiStudioPrompt(textToInsert) {
    if (!textToInsert) return;

    var selectors = [
      "ms-prompt-input textarea",
      "textarea.prompt-input",
      "textarea[placeholder*='Prompt']",
      "textarea[placeholder*='prompt']",
      "mat-input-element",
      "div[contenteditable='true']",
      ".input-area textarea",
      "textarea"
    ];

    var targetInput = null;
    for (var i = 0; i < selectors.length; i++) {
      var found = document.querySelector(selectors[i]);
      if (found) {
        targetInput = found;
        break;
      }
    }

    if (targetInput) {
      targetInput.focus();
      var tagName = targetInput.tagName.toLowerCase();

      if (tagName === "textarea" || tagName === "input") {
        targetInput.value = textToInsert;
        targetInput.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
        targetInput.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
        targetInput.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "a" }));
        targetInput.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "a" }));
      } else if (targetInput.isContentEditable) {
        targetInput.textContent = textToInsert;
        targetInput.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      }

      try {
        targetInput.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (e) {}
    } else {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textToInsert);
        alert("📋 Outbox text copied to clipboard! Paste directly into AI Studio prompt box.");
      } else {
        prompt("Copy Outbox text:", textToInsert);
      }
    }
  }

  static setupOutboxListener() {
    if (typeof window === "undefined" || window.__LUNO_OUTBOX_LISTENER_ACTIVE__) return;
    window.__LUNO_OUTBOX_LISTENER_ACTIVE__ = true;

    window.addEventListener("message", function(e) {
      if (!e || !e.data || typeof e.data !== "object") return;
      var type = e.data.type;
      if (type === "LUNO_OUTBOX_NOTIFY" && (e.data.payload || e.data.text)) {
        OutboxNotifier.showNotification(e.data.payload || { title: "Package", text: e.data.text });
      }
    });
  }
}

globalThis.OutboxNotifier = OutboxNotifier;
if (typeof module !== "undefined" && module.exports) module.exports = OutboxNotifier;