class PromptCollapserWidget {
  constructor() {}

  static STYLES_ID = "luno-prompt-widget-styles";
  static STATE_STORAGE_KEY = "luno_prompt_states_v1";

  static getSavedStates() {
    try {
      const raw = localStorage.getItem(PromptCollapserWidget.STATE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  static saveState(fingerprint, isCollapsed) {
    if (!fingerprint) return;
    try {
      const states = PromptCollapserWidget.getSavedStates();
      states[fingerprint] = Boolean(isCollapsed);
      localStorage.setItem(PromptCollapserWidget.STATE_STORAGE_KEY, JSON.stringify(states));
    } catch (e) {}
  }

  static injectStyles() {
    if (typeof document === "undefined" || document.getElementById(PromptCollapserWidget.STYLES_ID)) return;
    const style = document.createElement("style");
    style.id = PromptCollapserWidget.STYLES_ID;
    style.textContent = [
      ".luno-prompt-shim-base {",
      "  display: block !important;",
      "  margin: 6px 0 !important;",
      "  background: #1a1012 !important;",
      "  border: 2px solid #d35400 !important;",
      "  border-radius: 6px !important;",
      "  padding: 6px 10px !important;",
      "  font-family: monospace !important;",
      "  font-size: 11px !important;",
      "  color: #ffb74d !important;",
      "  box-sizing: border-box !important;",
      "  cursor: pointer !important;",
      "  user-select: none !important;",
      "}",
      ".luno-prompt-shim-header {",
      "  display: flex !important;",
      "  justify-content: space-between !important;",
      "  align-items: center !important;",
      "}",
      ".luno-prompt-preview {",
      "  color: #ffcc80 !important;",
      "  font-size: 10px !important;",
      "  white-space: nowrap !important;",
      "  overflow: hidden !important;",
      "  text-overflow: ellipsis !important;",
      "  opacity: 0.85 !important;",
      "  margin-top: 3px !important;",
      "}",
      ".luno-prompt-expanded-bar {",
      "  display: flex !important;",
      "  justify-content: space-between !important;",
      "  align-items: center !important;",
      "  background: #1a1012 !important;",
      "  border: 1px solid #d35400 !important;",
      "  border-bottom: none !important;",
      "  padding: 4px 8px !important;",
      "  font-family: monospace !important;",
      "  font-size: 11px !important;",
      "  cursor: pointer !important;",
      "  border-radius: 6px 6px 0 0 !important;",
      "}"
    ].join("\n");
    (document.head || document.documentElement).appendChild(style);
  }

  static computePromptFingerprint(text) {
    if (!text) return "";
    const trimmed = text.trim();
    const len = trimmed.length;
    const lines = trimmed.split("\n").length;
    const head = trimmed.slice(0, 25).replace(/\s+/g, "");
    return `prompt_${lines}_${len}_${head}`;
  }

  static wrapPrompt(promptElement, options = {}) {
    if (!promptElement || promptElement.__lunoPromptController__) return null;

    PromptCollapserWidget.injectStyles();

    const rawText = (promptElement.innerText || promptElement.textContent || "").trim();
    if (!rawText) return null;

    const fingerprint = options.fingerprint || PromptCollapserWidget.computePromptFingerprint(rawText);
    const savedStates = PromptCollapserWidget.getSavedStates();
    const startCollapsed = (savedStates[fingerprint] !== undefined)
      ? savedStates[fingerprint]
      : true;

    const lines = rawText.split(/\r?\n/);
    const lineCount = lines.length;
    const charCount = rawText.length;
    const firstLine = lines[0] || rawText;

    const shim = document.createElement("div");
    shim.className = "luno-prompt-shim-base";

    const header = document.createElement("div");
    header.className = "luno-prompt-shim-header";

    const label = document.createElement("span");
    label.style.fontWeight = "bold";
    label.textContent = `✍️ User Prompt (${lineCount} lines / ${charCount} chars)`;

    const btnExpand = document.createElement("button");
    btnExpand.textContent = "[+ Expand]";
    btnExpand.style.cssText = "background:#2d1200; color:#ffb74d; border:1px solid #d35400; padding:2px 6px; font-size:10px; font-family:monospace; cursor:pointer; font-weight:bold; border-radius:4px;";

    header.appendChild(label);
    header.appendChild(btnExpand);

    const preview = document.createElement("div");
    preview.className = "luno-prompt-preview";
    preview.textContent = firstLine.slice(0, 90) + (firstLine.length > 90 ? "..." : "");

    shim.appendChild(header);
    shim.appendChild(preview);

    const expandedBar = document.createElement("div");
    expandedBar.className = "luno-prompt-expanded-bar";

    const expandedLabel = document.createElement("span");
    expandedLabel.style.color = "#ffb74d";
    expandedLabel.style.fontWeight = "bold";
    expandedLabel.textContent = `✍️ User Prompt (${lineCount} lines / ${charCount} chars)`;

    const btnCollapse = document.createElement("button");
    btnCollapse.textContent = "[− Collapse]";
    btnCollapse.style.cssText = "background:#2d1200; color:#ffb74d; border:1px solid #d35400; padding:2px 6px; font-size:10px; font-family:monospace; cursor:pointer; font-weight:bold; border-radius:4px;";

    expandedBar.appendChild(expandedLabel);
    expandedBar.appendChild(btnCollapse);

    if (promptElement.parentNode) {
      promptElement.parentNode.insertBefore(shim, promptElement);
      promptElement.parentNode.insertBefore(expandedBar, promptElement);
    }

    const controller = {
      isCollapsed: startCollapsed,
      fingerprint: fingerprint,
      toggle: function() {
        this.setCollapsed(!this.isCollapsed);
      },
      setCollapsed: function(collapse) {
        this.isCollapsed = Boolean(collapse);
        PromptCollapserWidget.saveState(fingerprint, this.isCollapsed);
        if (this.isCollapsed) {
          promptElement.classList.add("luno-force-hidden");
          expandedBar.classList.add("luno-force-hidden");
          shim.classList.remove("luno-force-hidden");
        } else {
          promptElement.classList.remove("luno-force-hidden");
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
    promptElement.__lunoPromptController__ = controller;
    return controller;
  }
}

globalThis.PromptCollapserWidget = PromptCollapserWidget;
if (typeof module !== "undefined" && module.exports) module.exports = PromptCollapserWidget;