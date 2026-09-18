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