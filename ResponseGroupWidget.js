class ResponseGroupWidget {
  constructor() {}

  static STYLES_ID = "luno-response-group-styles";

  static injectStyles() {
    if (typeof document === "undefined" || document.getElementById(ResponseGroupWidget.STYLES_ID)) return;
    const style = document.createElement("style");
    style.id = ResponseGroupWidget.STYLES_ID;
    style.textContent = [
      ".luno-response-group {",
      "  position: relative !important;",
      "  outline: 1px solid #8257e5 !important;",
      "  border-radius: 4px !important;",
      "  padding: 6px !important;",
      "  margin: 10px 0 !important;",
      "  background: rgba(39, 16, 82, 0.15) !important;",
      "}",
      ".luno-group-action-bar {",
      "  display: flex !important;",
      "  justify-content: space-between !important;",
      "  align-items: center !important;",
      "  background: #271052 !important;",
      "  color: #d2a8ff !important;",
      "  padding: 4px 8px !important;",
      "  font-family: monospace !important;",
      "  font-size: 11px !important;",
      "  font-weight: bold !important;",
      "  border-radius: 2px !important;",
      "  margin-bottom: 6px !important;",
      "  user-select: none !important;",
      "}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }

  static wrapTurnGroup(turnElement) {
    if (!turnElement || turnElement.__lunoGroupController__) return null;

    const codeElements = turnElement.querySelectorAll("ms-code-block, pre");
    if (!codeElements || codeElements.length === 0) return null;

    ResponseGroupWidget.injectStyles();
    turnElement.classList.add("luno-response-group");

    let totalLines = 0;
    const blocksData = [];

    codeElements.forEach((el, idx) => {
      const text = (el.innerText || el.textContent || "").trim();
      if (text) {
        const lineCount = text.split(/\r?\n/).length;
        totalLines += lineCount;
        blocksData.push({ element: el, text: text, lines: lineCount, index: idx });
      }
    });

    if (blocksData.length === 0) return null;

    const groupBar = document.createElement("div");
    groupBar.className = "luno-group-action-bar";

    const label = document.createElement("span");
    label.textContent = `🤖 Turn Group (${blocksData.length} code blocks / ${totalLines} total lines)`;

    const btnSendAll = document.createElement("button");
    btnSendAll.textContent = `📥 Send All Turn Code (${blocksData.length} blocks)`;
    btnSendAll.style.cssText = "background:#8257e5; color:#fff; border:none; border-radius:2px; padding:3px 8px; font-size:10px; font-family:monospace; cursor:pointer; font-weight:bold;";

    btnSendAll.onclick = function(e) {
      e.stopPropagation();
      const combinedText = blocksData.map(b => b.text).join("\n\n");
      const hostWin = window.opener || window.parent;

      if (hostWin && typeof hostWin.postMessage === "function") {
        hostWin.postMessage({
          type: "LUNO_SEND_INBOX",
          target: "aistudio.google.com",
          timestamp: new Date().toISOString(),
          timeString: new Date().toLocaleTimeString(),
          payload: {
            rawText: combinedText,
            count: blocksData.length,
            lines: totalLines,
            isGroupPayload: true
          }
        }, "*");

        btnSendAll.textContent = `✓ Sent ${blocksData.length} Blocks to Inbox!`;
        btnSendAll.style.background = "#238636";
        setTimeout(() => {
          btnSendAll.textContent = `📥 Send All Turn Code (${blocksData.length} blocks)`;
          btnSendAll.style.background = "#8257e5";
        }, 2000);
      }
    };

    groupBar.appendChild(label);
    groupBar.appendChild(btnSendAll);

    if (turnElement.firstChild) {
      turnElement.insertBefore(groupBar, turnElement.firstChild);
    } else {
      turnElement.appendChild(groupBar);
    }

    const controller = {
      blockCount: blocksData.length,
      totalLines: totalLines,
      blocks: blocksData
    };

    turnElement.__lunoGroupController__ = controller;
    return controller;
  }
}

globalThis.ResponseGroupWidget = ResponseGroupWidget;
if (typeof module !== "undefined" && module.exports) module.exports = ResponseGroupWidget;