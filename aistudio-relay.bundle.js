/**
 * 🌙 Luno AI Studio Relay & Collapser Suite (Compiled Bundle)
 * Target: https://aistudio.google.com
 * Injected via bookmarklet or extension to collapse code/prompts and stream directly to Luno.
 */
(function() {
  if (window.__LUNO_RELAY_ACTIVE__) {
    console.log('[Luno Relay] Already running.');
    return;
  }
  window.__LUNO_RELAY_ACTIVE__ = true;

/* --- MODULE: LunoRelayProtocol.js --- */
class LunoRelayProtocol {
  constructor() {}

  static TARGET_DOMAIN = "aistudio.google.com";
  static MSG_TYPES = {
    PING: "LUNO_PING",
    PONG: "LUNO_PONG",
    CMD_SCAN: "LUNO_CMD_SCAN",
    CMD_GET_QUEUE: "LUNO_CMD_GET_QUEUE",
    CMD_CLEAR_QUEUE: "LUNO_CMD_CLEAR_QUEUE",
    CODE_DISCOVERED: "LUNO_CODE_DISCOVERED",
    QUEUE_RESPONSE: "LUNO_QUEUE_RESPONSE",
    SEND_INBOX: "LUNO_SEND_INBOX",
    OUTBOX_NOTIFY: "LUNO_OUTBOX_NOTIFY",
    BLOCK_APPLIED: "LUNO_BLOCK_APPLIED"
  };

  static createEnvelope(type, payload, targetDomain) {
    var tgt = targetDomain || LunoRelayProtocol.TARGET_DOMAIN;
    var p = payload || {};
    return {
      type: type,
      target: tgt,
      timestamp: new Date().toISOString(),
      timeString: new Date().toLocaleTimeString(),
      payload: p
    };
  }

  static createCodeBlockSchema(id, rawText, options) {
    var opts = options || {};
    var text = rawText || "";
    var lines = text ? text.split(/\r?\n/).length : 0;
    return {
      blockId: id || ("block_aistudio_" + Date.now() + "_" + Math.floor(Math.random() * 1000)),
      rawText: text,
      lineCount: lines,
      isCollapsed: opts.isCollapsed !== undefined ? opts.isCollapsed : true,
      hasJavaScript: opts.hasJavaScript !== undefined ? opts.hasJavaScript : true,
      selectorUsed: opts.selectorUsed || "",
      elementIndex: opts.elementIndex || 0,
      timestamp: new Date().toISOString()
    };
  }

  static verifyConnection(targetWindow) {
    if (!targetWindow || typeof targetWindow.postMessage !== "function") return false;
    try {
      var pingEnv = LunoRelayProtocol.createEnvelope(LunoRelayProtocol.MSG_TYPES.PING, { status: "checking" });
      targetWindow.postMessage(pingEnv, "*");
      return true;
    } catch (e) {
      return false;
    }
  }

  static parseMessageData(data) {
    if (!data || typeof data !== "object") return null;
    if (data.type && typeof data.type === "string" && data.type.startsWith("LUNO_")) {
      return {
        type: data.type,
        payload: data.payload || {},
        timeString: data.timeString || new Date().toLocaleTimeString(),
        rawText: data.text || data.body || ""
      };
    }
    return null;
  }
}

globalThis.LunoRelayProtocol = LunoRelayProtocol;
if (typeof module !== "undefined" && module.exports) module.exports = LunoRelayProtocol;

/* --- MODULE: JsLanguageDetector.js --- */
class JsLanguageDetector {
  constructor() {}

  static isBlockElement(el) {
    if (!el || el.nodeType !== 1) return false;
    const tagName = el.tagName.toLowerCase();
    if (tagName === "ms-code-block") return true;

    const parentTag = el.parentElement ? el.parentElement.tagName.toLowerCase() : "";
    const inlineParents = ["p", "span", "li", "td", "a", "b", "i", "strong", "em", "label"];
    if (inlineParents.includes(parentTag)) {
      return false;
    }

    try {
      if (typeof window !== "undefined" && window.getComputedStyle) {
        const style = window.getComputedStyle(el);
        if (style.display === "inline") return false;
      }
    } catch (e) {}

    return true;
  }

  static classifyBlock(codeText, element) {
    if (!codeText || typeof codeText !== "string") {
      return { type: "REJECT", isProtocol: false };
    }

    const text = codeText.trim();
    if (text.length === 0) {
      return { type: "REJECT", isProtocol: false };
    }

    // 1. Strict HTML Container Directive Tags
    const tagMatch = text.match(/<(script|style|template|svg)\b([^>]*)>/i);
    if (tagMatch) {
      const attrString = tagMatch[2];
      const isSurgical = attrString.includes('data-method=') || attrString.includes('action="patch"');
      const isServer = attrString.includes('action="run-server"') || attrString.includes('RUN: SERVER');

      return {
        type: "PROTOCOL_STRICT",
        isProtocol: true,
        targetHeader: "HTML Container Tag",
        badgeLabel: isSurgical ? "✂️ AST Surgical Patch" : (isServer ? "⚡ Server Script" : "⚡ HTML Container Ready"),
        badgeColor: isSurgical ? "#00f2fe" : (isServer ? "#a371f7" : "#3fb950")
      };
    }

    // 2. Reject Shell / CLI Commands & Package Managers
    if (/^\s*(npm|git|sudo|apt-get|pip|cd|mkdir|rm|npx|yarn|pnpm|curl|wget)\s+/i.test(text)) {
      return { type: "REJECT", isProtocol: false };
    }

    // 3. Structural JavaScript / TypeScript Tokens
    const jsTokens = [
      /\bconst\s+[a-zA-Z_$]/,
      /\blet\s+[a-zA-Z_$]/,
      /\bvar\s+[a-zA-Z_$]/,
      /\bfunction\s*\w*\s*\(/,
      /=>\s*\{/,
      /\basync\s+function\b/,
      /\bawait\s+[a-zA-Z_$]/,
      /\bimport\s+.*?\s+from\b/,
      /\bexport\s+(default|const|let|var|function|class)\b/,
      /\bclass\s+[a-zA-Z_$]/,
      /\brequire\s*\(\s*['"]/,
      /\bmodule\.exports\b/,
      /\bconsole\.(log|error|warn)\b/
    ];

    const hasJsToken = jsTokens.some(regex => regex.test(text));
    if (hasJsToken) {
      return {
        type: "JS_CODE",
        isProtocol: false,
        badgeLabel: "📄 JS Code Block",
        badgeColor: "#d2a8ff"
      };
    }

    return { type: "REJECT", isProtocol: false };
  }

  static isJavaScript(codeText, element) {
    const classification = JsLanguageDetector.classifyBlock(codeText, element);
    return classification.type !== "REJECT";
  }
}

globalThis.JsLanguageDetector = JsLanguageDetector;
if (typeof module !== "undefined" && module.exports) module.exports = JsLanguageDetector;

/* --- MODULE: CodeCollapserWidget.js --- */
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

/* --- MODULE: PromptCollapserWidget.js --- */
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

/* --- MODULE: ResponseGroupWidget.js --- */
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

/* --- MODULE: AiStudioQueue.js --- */
class AiStudioQueue {
  constructor() {}

  static MAX_QUEUE_SIZE = 50;

  static computeFingerprint(text) {
    if (!text) return "";
    const trimmed = text.trim();
    const len = trimmed.length;
    const lines = trimmed.split(/\r?\n/).length;
    const head = trimmed.slice(0, 30).replace(/\s+/g, "");
    const tail = trimmed.slice(-30).replace(/\s+/g, "");
    return `fp_${lines}_${len}_${head}_${tail}`;
  }

  static getRegistry() {
    if (typeof globalThis === "undefined") return new Map();
    globalThis.__LUNO_BLOCK_REGISTRY__ = globalThis.__LUNO_BLOCK_REGISTRY__ || new Map();
    return globalThis.__LUNO_BLOCK_REGISTRY__;
  }

  static getQueue() {
    if (typeof globalThis === "undefined") return [];
    globalThis.__LUNO_AI_STUDIO_QUEUE__ = globalThis.__LUNO_AI_STUDIO_QUEUE__ || [];
    return globalThis.__LUNO_AI_STUDIO_QUEUE__;
  }

  static push(blockItem) {
    if (!blockItem || typeof blockItem !== "object") return null;
    const queue = AiStudioQueue.getQueue();
    const registry = AiStudioQueue.getRegistry();

    const fingerprint = blockItem.fingerprint || AiStudioQueue.computeFingerprint(blockItem.rawText);
    blockItem.fingerprint = fingerprint;

    const isRequest = /<script\b[^>]*type=["']application\/luno-request["']/i.test(blockItem.rawText || "");
    if (isRequest) {
      blockItem.isContextRequest = true;
      if (blockItem.classification) {
        blockItem.classification.badgeLabel = "🧠 Context Request";
        blockItem.classification.badgeColor = "#a371f7";
      }
    }

    let existingIndex = -1;
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].fingerprint === fingerprint || queue[i].blockId === blockItem.blockId) {
        existingIndex = i;
        break;
      }
    }

    if (existingIndex !== -1) {
      queue[existingIndex] = blockItem;
    } else {
      queue.push(blockItem);
      if (queue.length > AiStudioQueue.MAX_QUEUE_SIZE) {
        queue.shift();
      }
    }

    registry.set(fingerprint, blockItem);
    return blockItem;
  }

  static markApplied(fingerprint) {
    if (!fingerprint) return;
    const registry = AiStudioQueue.getRegistry();
    const queue = AiStudioQueue.getQueue();

    if (registry.has(fingerprint)) {
      const item = registry.get(fingerprint);
      item.isApplied = true;
    }

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].fingerprint === fingerprint) {
        queue[i].isApplied = true;
      }
    }
  }

  static clear() {
    if (typeof globalThis === "undefined") return;
    globalThis.__LUNO_AI_STUDIO_QUEUE__ = [];
    if (globalThis.__LUNO_BLOCK_REGISTRY__) {
      globalThis.__LUNO_BLOCK_REGISTRY__.clear();
    }
  }

  static setupQueueListener() {
    if (typeof globalThis === "undefined" || globalThis.__LUNO_QUEUE_LISTENER_ACTIVE__) return;
    globalThis.__LUNO_QUEUE_LISTENER_ACTIVE__ = true;

    if (typeof window !== "undefined") {
      window.addEventListener("message", function(e) {
        if (!e || !e.data || typeof e.data !== "object") return;
        const type = e.data.type;
        const payload = e.data.payload || {};

        if (type === "LUNO_CMD_GET_QUEUE") {
          const queue = AiStudioQueue.getQueue();
          const hostWin = e.source || window.opener || window.parent;
          if (hostWin && typeof hostWin.postMessage === "function") {
            hostWin.postMessage({
              type: "LUNO_QUEUE_RESPONSE",
              target: "aistudio.google.com",
              timestamp: new Date().toISOString(),
              timeString: new Date().toLocaleTimeString(),
              payload: { queue: queue, count: queue.length }
            }, "*");
          }
        } else if (type === "LUNO_CMD_CLEAR_QUEUE") {
          AiStudioQueue.clear();
        } else if ((type === "LUNO_BLOCK_APPLIED" || type === "LUNO_REQUEST_FULFILLED") && payload.fingerprint) {
          AiStudioQueue.markApplied(payload.fingerprint);
        }
      });
    }
  }
}

globalThis.AiStudioQueue = AiStudioQueue;
if (typeof module !== "undefined" && module.exports) module.exports = AiStudioQueue;

/* --- MODULE: OutboxNotifier.js --- */
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

/* --- RUNNER: AI Studio In-Page Scanner & Relay --- */
(function initAiStudioRelayRunner() {
  console.log('🌙 [Luno Relay] Initializing AI Studio scanner...');

  AiStudioQueue.setupQueueListener();
  OutboxNotifier.setupOutboxListener();

  function scanAiStudioPage() {
    // 1. Wrap Prompts
    const promptElements = document.querySelectorAll('ms-prompt-input, .prompt-input-area, ms-chat-turn[role="user"]');
    promptElements.forEach(el => {
      if (!el.__lunoPromptController__) {
        PromptCollapserWidget.wrapPrompt(el);
      }
    });

    // 2. Wrap Response Turn Groups
    const turns = document.querySelectorAll('ms-chat-turn, .chat-turn');
    turns.forEach(turn => {
      if (!turn.__lunoGroupController__) {
        ResponseGroupWidget.wrapTurnGroup(turn);
      }
    });

    // 3. Wrap Code Blocks
    const codeBlocks = document.querySelectorAll('ms-code-block, pre, .code-block-container');
    codeBlocks.forEach((el, idx) => {
      if (el.dataset.lunoScanned) return;
      el.dataset.lunoScanned = 'true';

      const rawText = (el.innerText || el.textContent || '').trim();
      if (!rawText || rawText.length < 15) return;

      const classification = JsLanguageDetector.classifyBlock(rawText, el);
      if (classification.type === 'REJECT') return;

      const fingerprint = AiStudioQueue.computeFingerprint(rawText);
      const queueItem = LunoRelayProtocol.createCodeBlockSchema('block_' + idx, rawText, {
        fingerprint,
        classification,
        elementIndex: idx
      });

      AiStudioQueue.push(queueItem);
      CodeCollapserWidget.wrapElement(el, { fingerprint, classification, startCollapsed: true });
    });
  }

  // Initial Scan & Heartbeat
  scanAiStudioPage();
  setInterval(scanAiStudioPage, 1500);

  // Floating Confirmation Toast on AI Studio
  const toast = document.createElement('div');
  toast.style.cssText = [
    'position: fixed;',
    'top: 12px;',
    'right: 12px;',
    'z-index: 2147483647;',
    'background: #271052;',
    'color: #00f2fe;',
    'border: 1.5px solid #00f2fe;',
    'border-radius: 8px;',
    'padding: 8px 14px;',
    'font-family: monospace;',
    'font-size: 11px;',
    'font-weight: bold;',
    'box-shadow: 0 8px 24px rgba(0,0,0,0.8), 0 0 14px rgba(0,242,254,0.3);',
    'display: flex;',
    'align-items: center;',
    'gap: 8px;'
  ].join(' ');
  toast.innerHTML = '<span>🌙</span><span>Luno AI Studio Relay Connected!</span>';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
})();
})();
