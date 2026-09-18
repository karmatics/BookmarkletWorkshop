class CodeCollapserWidget {
  constructor() {}

  static STYLES_ID = "luno-widget-styles";
  static STATE_STORAGE_KEY = "luno_block_states_v1";

  static getSavedStates() {
    try {
      const raw = localStorage.getItem(CodeCollapserWidget.STATE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  static saveState(fingerprint, isCollapsed) {
    if (!fingerprint) return;
    try {
      const states = CodeCollapserWidget.getSavedStates();
      states[fingerprint] = Boolean(isCollapsed);
      localStorage.setItem(CodeCollapserWidget.STATE_STORAGE_KEY, JSON.stringify(states));
    } catch (e) {}
  }

  static injectStyles() {
    if (typeof document === "undefined" || document.getElementById(CodeCollapserWidget.STYLES_ID)) return;
    const style = document.createElement("style");
    style.id = CodeCollapserWidget.STYLES_ID;
    style.textContent = [
      ".luno-force-hidden { display: none !important; }",
      ".luno-shim-base {",
      "  display: block !important;",
      "  margin: 8px 0 !important;",
      "  background: #0d1117 !important;",
      "  border: 3px solid #00f2fe !important;",
      "  border-radius: 0px !important;",
      "  padding: 6px 10px !important;",
      "  font-family: monospace !important;",
      "  font-size: 11px !important;",
      "  color: #c9d1d9 !important;",
      "  box-sizing: border-box !important;",
      "  cursor: pointer !important;",
      "  user-select: none !important;",
      "}",
      ".luno-shim-header {",
      "  display: flex !important;",
      "  justify-content: space-between !important;",
      "  align-items: center !important;",
      "  margin-bottom: 4px !important;",
      "}",
      ".luno-shim-preview {",
      "  color: #7ee787 !important;",
      "  font-size: 10px !important;",
      "  white-space: pre-wrap !important;",
      "  word-break: break-all !important;",
      "  max-height: 75px !important;",
      "  overflow: hidden !important;",
      "  opacity: 0.85 !important;",
      "  border-top: 1px solid #21262d !important;",
      "  padding-top: 4px !important;",
      "}",
      ".luno-widget-expanded-bar {",
      "  display: flex !important;",
      "  justify-content: space-between !important;",
      "  align-items: center !important;",
      "  background: #0d1117 !important;",
      "  border: 1px solid #0088cc !important;",
      "  border-bottom: none !important;",
      "  padding: 4px 8px !important;",
      "  font-family: monospace !important;",
      "  font-size: 11px !important;",
      "  cursor: pointer !important;",
      "  border-radius: 0px !important;",
      "}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }

  static findWrapTarget(element) {
    if (!element || element.nodeType !== 1) return null;
    let curr = element;
    while (curr && curr.parentElement && curr.tagName.toLowerCase() !== "body") {
      const tag = curr.tagName.toLowerCase();
      if (tag === "ms-code-block" || curr.classList.contains("code-block-container")) {
        return curr;
      }
      curr = curr.parentElement;
    }
    return element;
  }

  static wrapElement(targetElement, options = {}) {
    if (!targetElement) return null;
    const wrapTarget = CodeCollapserWidget.findWrapTarget(targetElement);
    if (!wrapTarget) return null;

    if (wrapTarget.__lunoWidgetController__) {
      return wrapTarget.__lunoWidgetController__;
    }

    CodeCollapserWidget.injectStyles();

    const fingerprint = options.fingerprint || "";
    const savedStates = CodeCollapserWidget.getSavedStates();
    const startCollapsed = (fingerprint && savedStates[fingerprint] !== undefined)
      ? savedStates[fingerprint]
      : (options.startCollapsed !== undefined ? options.startCollapsed : true);

    const rawText = wrapTarget.innerText || wrapTarget.textContent || "";
    const lines = rawText ? rawText.split(/\r?\n/) : [];
    const lineCount = lines.length;
    const previewSnippet = lines.slice(0, 5).join("\n");
    const classification = options.classification || { badgeLabel: "📄 JS Block", badgeColor: "#00f2fe" };

    const shim = document.createElement("div");
    shim.className = "luno-shim-base";

    const shimHeader = document.createElement("div");
    shimHeader.className = "luno-shim-header";

    const shimLabel = document.createElement("span");
    shimLabel.style.color = classification.badgeColor || "#00f2fe";
    shimLabel.style.fontWeight = "bold";
    shimLabel.textContent = `${classification.badgeLabel} (${lineCount} lines)`;

    const btnExpand = document.createElement("button");
    btnExpand.textContent = "[+ Expand]";
    btnExpand.style.cssText = "background:#161b22; color:#00f2fe; border:1px solid #00f2fe; padding:2px 6px; font-size:10px; font-family:monospace; cursor:pointer; font-weight:bold;";

    shimHeader.appendChild(shimLabel);
    shimHeader.appendChild(btnExpand);

    const shimPreview = document.createElement("div");
    shimPreview.className = "luno-shim-preview";
    shimPreview.textContent = previewSnippet || "...";

    shim.appendChild(shimHeader);
    shim.appendChild(shimPreview);

    const expandedBar = document.createElement("div");
    expandedBar.className = "luno-widget-expanded-bar";

    const expandedLabel = document.createElement("span");
    expandedLabel.style.color = classification.badgeColor || "#00f2fe";
    expandedLabel.style.fontWeight = "bold";
    expandedLabel.textContent = `${classification.badgeLabel} (${lineCount} lines)`;

    const expandedControls = document.createElement("div");
    expandedControls.style.cssText = "display:flex; gap:6px; align-items:center;";

    const btnInbox = document.createElement("button");
    btnInbox.textContent = "📥 Send to Inbox";
    btnInbox.style.cssText = "background:#271052; color:#d2a8ff; border:1px solid #8257e5; padding:2px 6px; font-size:10px; font-family:monospace; cursor:pointer; font-weight:bold;";
    btnInbox.onclick = function(e) {
      e.stopPropagation();
      const hostWin = window.opener || window.parent;
      if (hostWin && typeof hostWin.postMessage === "function") {
        hostWin.postMessage({
          type: "LUNO_SEND_INBOX",
          target: "aistudio.google.com",
          timestamp: new Date().toISOString(),
          timeString: new Date().toLocaleTimeString(),
          payload: { rawText: rawText, fingerprint: fingerprint, lines: lineCount }
        }, "*");
        btnInbox.textContent = "✓ Sent!";
        setTimeout(() => { btnInbox.textContent = "📥 Send to Inbox"; }, 1500);
      }
    };

    const btnCollapse = document.createElement("button");
    btnCollapse.textContent = "[− Collapse]";
    btnCollapse.style.cssText = "background:#161b22; color:#00f2fe; border:1px solid #00f2fe; padding:2px 6px; font-size:10px; font-family:monospace; cursor:pointer; font-weight:bold;";

    expandedControls.appendChild(btnInbox);
    expandedControls.appendChild(btnCollapse);
    expandedBar.appendChild(expandedLabel);
    expandedBar.appendChild(expandedControls);

    if (wrapTarget.parentNode) {
      wrapTarget.parentNode.insertBefore(shim, wrapTarget);
      wrapTarget.parentNode.insertBefore(expandedBar, wrapTarget);
    }

    const controller = {
      isCollapsed: startCollapsed,
      fingerprint: fingerprint,
      toggle: function() {
        this.setCollapsed(!this.isCollapsed);
      },
      setCollapsed: function(collapse) {
        this.isCollapsed = Boolean(collapse);
        if (fingerprint) CodeCollapserWidget.saveState(fingerprint, this.isCollapsed);
        if (this.isCollapsed) {
          wrapTarget.classList.add("luno-force-hidden");
          expandedBar.classList.add("luno-force-hidden");
          shim.classList.remove("luno-force-hidden");
        } else {
          wrapTarget.classList.remove("luno-force-hidden");
          expandedBar.classList.remove("luno-force-hidden");
          shim.classList.add("luno-force-hidden");
        }
      }
    };

    shim.onclick = (e) => {
      if (e.target.tagName !== "BUTTON") controller.toggle();
    };
    btnExpand.onclick = (e) => {
      e.stopPropagation();
      controller.toggle();
    };
    expandedBar.onclick = (e) => {
      if (e.target.tagName !== "BUTTON") controller.toggle();
    };
    btnCollapse.onclick = (e) => {
      e.stopPropagation();
      controller.toggle();
    };

    controller.setCollapsed(startCollapsed);
    wrapTarget.__lunoWidgetController__ = controller;
    return controller;
  }
}

globalThis.CodeCollapserWidget = CodeCollapserWidget;
if (typeof module !== "undefined" && module.exports) module.exports = CodeCollapserWidget;