class BookmarkletEncoder {
  constructor() {}

  static cleanSource(sourceCode) {
    if (!sourceCode || typeof sourceCode !== "string") return "";
    var code = sourceCode.trim();

    code = code.replace(/\/\*[\s\S]*?\*\//g, "");

    var lines = code.split(/\r?\n/);
    var cleanedLines = lines.map(function(line) {
      var trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.indexOf("//") === 0) return "";

      var inSingle = false, inDouble = false, inBacktick = false;
      var commentStart = -1;

      for (var i = 0; i < trimmed.length - 1; i++) {
        var ch = trimmed[i];
        var nextChar = trimmed[i + 1];

        if (ch === "\\") { i++; continue; }
        if (ch === "'" && !inDouble && !inBacktick) inSingle = !inSingle;
        else if (ch === '"' && !inSingle && !inBacktick) inDouble = !inDouble;
        else if (ch === "`" && !inSingle && !inDouble) inBacktick = !inBacktick;

        if (!inSingle && !inDouble && !inBacktick && ch === "/" && nextChar === "/") {
          if (i > 0 && trimmed[i - 1] === ":") {
            continue;
          }
          commentStart = i;
          break;
        }
      }

      if (commentStart !== -1) {
        trimmed = trimmed.slice(0, commentStart).trim();
      }
      return trimmed;
    }).filter(Boolean);

    return cleanedLines.join(" ");
  }

  static encode(sourceCode) {
    if (!sourceCode || typeof sourceCode !== "string") return "javascript:";
    var singleLine = BookmarkletEncoder.cleanSource(sourceCode);
    var urlSafe = singleLine.replace(/[\0-\x20\x23\x25]/g, encodeURIComponent);
    return "javascript:" + urlSafe;
  }

  static copyToClipboard(text, targetButton) {
    var button = targetButton || null;
    var success = false;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        if (button) {
          var origText = button.textContent;
          button.textContent = "Copied!";
          setTimeout(function() { button.textContent = origText; }, 1500);
        }
      }).catch(function() {});
      return true;
    }

    try {
      var dummy = document.createElement("textarea");
      dummy.value = text;
      dummy.style.position = "fixed";
      dummy.style.opacity = "0";
      document.body.appendChild(dummy);
      dummy.focus();
      dummy.select();
      document.execCommand("copy");
      document.body.removeChild(dummy);
      success = true;
    } catch (e) {}

    if (button && success) {
      var orig = button.textContent;
      button.textContent = "Copied!";
      setTimeout(function() { button.textContent = orig; }, 1500);
    }
    return success;
  }
}

globalThis.BookmarkletEncoder = BookmarkletEncoder;
if (typeof module !== "undefined" && module.exports) module.exports = BookmarkletEncoder;