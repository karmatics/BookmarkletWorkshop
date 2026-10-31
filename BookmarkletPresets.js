class BookmarkletPresets {
  constructor() {}

  static getPresets() {
    return [
      {
        id: "aistudio-relay-dynamic",
        title: "⚡ AI Studio Dynamic Relay (Port 8080 - Auto-Updating)",
        desc: "Injects the complete 7-module AI Studio suite from your local Luno server. Safe, tiny URL length, auto-updates when files change on disk.",
        source: [
          "(function() {",
          "  if (window.__LUNO_RELAY_ACTIVE__) {",
          "    alert('🌙 Luno Relay is already running on this page.');",
          "    return;",
          "  }",
          "  var s = document.createElement('script');",
          "  s.src = 'http://' + (window.location.hostname || 'localhost') + ':8080/BookmarkletWorkshop/aistudio-relay.bundle.js?v=' + Date.now();",
          "  s.onerror = function() {",
          "    s.src = 'http://127.0.0.1:8080/BookmarkletWorkshop/aistudio-relay.bundle.js?v=' + Date.now();",
          "  };",
          "  document.head.appendChild(s);",
          "})();"
        ].join("\n")
      },
      {
        id: "aistudio-relay-pages",
        title: "☁️ AI Studio Production Relay (GitHub Pages)",
        desc: "Injects the bundle from GitHub Pages. Works on Safari, iPad, or any machine without requiring a local port running.",
        source: [
          "(function() {",
          "  if (window.__LUNO_RELAY_ACTIVE__) {",
          "    alert('🌙 Luno Relay is already running on this page.');",
          "    return;",
          "  }",
          "  var user = (window.location.hostname.endsWith('.github.io') ? window.location.hostname.split('.')[0] : 'karmatics');",
          "  var s = document.createElement('script');",
          "  s.src = 'https://' + user + '.github.io/BookmarkletWorkshop/aistudio-relay.bundle.js?v=' + Date.now();",
          "  document.head.appendChild(s);",
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
