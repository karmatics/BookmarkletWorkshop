class BookmarkletPresets {
  constructor() {}

  static getPresets() {
    return [
      {
        id: "aistudio-relay",
        title: "🤖 AI Studio Relay & Collapser Suite",
        desc: "Wraps code blocks and user prompts in collapsible shims on aistudio.google.com with 1-tap dispatch to Luno Inbox.",
        source: [
          "(function() {",
          "  if (window.__LUNO_RELAY_ACTIVE__) {",
          "    alert('🌙 Luno Relay is already running on this page.');",
          "    return;",
          "  }",
          "  window.__LUNO_RELAY_ACTIVE__ = true;",
          "  console.log('[Luno] AI Studio Bookmarklet Relay Active');",
          "",
          "  function notifyLuno(text, lines) {",
          "    var hostWin = window.opener || window.parent;",
          "    if (hostWin && typeof hostWin.postMessage === 'function') {",
          "      hostWin.postMessage({",
          "        type: 'LUNO_SEND_INBOX',",
          "        target: 'aistudio.google.com',",
          "        payload: { rawText: text, lines: lines || text.split('\\n').length }",
          "      }, '*');",
          "    } else {",
          "      navigator.clipboard.writeText(text);",
          "      alert('📋 Code snippet copied to clipboard! Switch to Luno and tap Paste.');",
          "    }",
          "  }",
          "",
          "  function scanBlocks() {",
          "    var blocks = document.querySelectorAll('ms-code-block, pre');",
          "    blocks.forEach(function(el) {",
          "      if (el.dataset.lunoWrapped) return;",
          "      el.dataset.lunoWrapped = 'true';",
          "      var text = (el.innerText || el.textContent || '').trim();",
          "      if (!text || text.length < 15) return;",
          "",
          "      var bar = document.createElement('div');",
          "      bar.style.cssText = 'background:#271052; border:1px solid #8257e5; color:#d2a8ff; padding:3px 8px; font-size:11px; font-family:monospace; display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; border-radius:4px;';",
          "      bar.innerHTML = '<span>⚡ Luno Code Block</span><button style=\"background:#238636; color:#fff; border:none; border-radius:3px; padding:2px 6px; cursor:pointer; font-weight:bold; font-size:10px;\">📥 Send to Luno</button>';",
          "",
          "      bar.querySelector('button').onclick = function(e) {",
          "        e.stopPropagation();",
          "        notifyLuno(text);",
          "        this.textContent = '✓ Sent!';",
          "        var b = this; setTimeout(function() { b.textContent = '📥 Send to Luno'; }, 1500);",
          "      };",
          "      el.parentNode.insertBefore(bar, el);",
          "    });",
          "  }",
          "",
          "  scanBlocks();",
          "  setInterval(scanBlocks, 2000);",
          "  alert('🌙 Luno AI Studio Relay connected! Code blocks now have Send to Luno buttons.');",
          "})();"
        ].join("\n")
      },
      {
        id: "quick-inbox-sender",
        title: "📥 Selection ➔ Luno Inbox Sender",
        desc: "Sends any selected text on any webpage directly to Luno via clipboard.",
        source: [
          "(function() {",
          "  var sel = window.getSelection ? window.getSelection().toString() : '';",
          "  if (!sel || !sel.trim()) {",
          "    alert('Please select some text or code first.');",
          "    return;",
          "  }",
          "  navigator.clipboard.writeText(sel).then(function() {",
          "    alert('📋 Selected text copied! Switch to Luno and tap Paste from Chatbot.');",
          "  });",
          "})();"
        ].join("\n")
      }
    ];
  }
}

globalThis.BookmarkletPresets = BookmarkletPresets;
if (typeof module !== "undefined" && module.exports) module.exports = BookmarkletPresets;