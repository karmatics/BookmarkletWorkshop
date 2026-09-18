class BookmarkletApp {
  constructor() {
    this.source = "";
    this.targetWindowRef = null;
    this.connectedTargetOrigin = "*";
    this.messageLogs = [];
    this.stagedQueue = [];
    this.setupHostMessageListener();
  }

  handleIncomingRelayMessage(e) {
    if (!e || !e.data || typeof e.data !== "object") return;
    var type = e.data.type;
    if (!type || typeof type !== "string") return;

    if (type.startsWith("LUNO_GUEST_") || type.startsWith("LUNO_") || type === "LUNO_PONG") {
      if (e.source) {
        this.targetWindowRef = e.source;
      }

      var card = document.getElementById("relay-terminal-card");
      if (card) card.style.display = "flex";

      var badge = document.getElementById("relay-status-badge");
      if (badge) {
        badge.textContent = "AI Studio Connected";
        badge.style.background = "#0d2818";
        badge.style.color = "#3fb950";
        badge.style.borderColor = "#238636";
      }

      if (type === "LUNO_QUEUE_RESPONSE" && e.data.payload && Array.isArray(e.data.payload.queue)) {
        this.stagedQueue = e.data.payload.queue;
        this.logRelaySystem("Fetched " + this.stagedQueue.length + " JS block(s) from AI Studio Queue.");
        this.renderQueueInspectorUI();
        return;
      }

      if (type === "LUNO_SEND_INBOX" && e.data.payload && e.data.payload.rawText) {
        this.applyTextToLunoInbox(e.data.payload.rawText, e.data.payload.fingerprint);
        this.logRelaySystem("1-Tap Action: Sent JS snippet directly to Luno Inbox!");
        return;
      }

      var bodyText = e.data.text || e.data.body || "";
      if (e.data.payload && e.data.payload.rawText) {
        bodyText = e.data.payload.rawText.slice(0, 120) + (e.data.payload.rawText.length > 120 ? "..." : "");
      } else if (e.data.payload && e.data.payload.count !== undefined) {
        bodyText = "Discovered " + e.data.payload.count + " code block(s)";
      }

      var msgItem = {
        time: e.data.timeString || new Date().toLocaleTimeString(),
        title: type.replace("LUNO_", ""),
        url: "AI Studio Target",
        body: bodyText || type
      };

      this.messageLogs.push(msgItem);
      if (this.messageLogs.length > 30) this.messageLogs.shift();

      this.updateRelayLogUI();
    }
  }

  setupHostMessageListener() {
    if (typeof window === "undefined") return;
    var self = this;
    window.addEventListener("message", function(e) {
      self.handleIncomingRelayMessage(e);
    });
  }

  requestTargetScan() {
    this.sendHostMessageToTarget("Scan for code blocks", "LUNO_CMD_SCAN");
  }

  requestTargetQueue() {
    this.sendHostMessageToTarget("Fetch queue", "LUNO_CMD_GET_QUEUE");
  }

  clearTargetQueue() {
    this.sendHostMessageToTarget("Clear queue", "LUNO_CMD_CLEAR_QUEUE");
    this.stagedQueue = [];
    this.renderQueueInspectorUI();
  }

  notifyBlockAppliedToTarget(fingerprint) {
    if (!fingerprint) return;
    this.sendHostMessageToTarget("Block applied to disk", "LUNO_BLOCK_APPLIED", { fingerprint: fingerprint });
  }

  applyTextToLunoInbox(rawText, fingerprint) {
    if (!rawText) return;

    if (typeof window !== "undefined" && window.LunoSpaDock && typeof window.LunoSpaDock.mountView === "function") {
      window.LunoSpaDock.mountView("workspace");
    }

    if (typeof ClientAppPaster !== "undefined" && typeof ClientAppPaster.processPastedText === "function") {
      ClientAppPaster.processPastedText(rawText);
    } else if (typeof ClientApp !== "undefined" && typeof ClientApp.processPastedText === "function") {
      ClientApp.processPastedText(rawText);
    } else {
      var input = document.getElementById("payload-input") || document.getElementById("code-input");
      if (input) input.value = rawText;
      alert("📥 Loaded snippet into Luno Inbox!");
    }

    if (fingerprint) {
      this.notifyBlockAppliedToTarget(fingerprint);
    }
  }

  buildQueueInspectorRow(item, index) {
    var self = this;
    var row = document.createElement("div");
    row.style.cssText = "background:#0d1117; border:1px solid " + (item.isApplied ? "#238636" : "#21262d") + "; border-radius:4px; padding:6px; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;";

    var badgeText = (item.classification && item.classification.badgeLabel) ? item.classification.badgeLabel : "JS Block";
    var isAppliedText = item.isApplied ? "[✓ APPLIED] " : "";
    var previewSnippet = item.rawText ? item.rawText.slice(0, 35) + "..." : "";
    var itemLabelText = "#" + (index + 1) + " " + isAppliedText + badgeText + " (" + item.lineCount + " lines) - " + previewSnippet;

    var info = document.createElement("div");
    info.style.cssText = "font-size:11px; color:" + (item.isApplied ? "#3fb950" : "#7ee787") + "; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin-right:8px;";
    info.appendChild(document.createTextNode(itemLabelText));

    var btn = document.createElement("button");
    btn.appendChild(document.createTextNode(item.isApplied ? "✓ Applied" : "📥 Apply to Inbox"));
    btn.style.cssText = item.isApplied
      ? "background:#0d2818; color:#3fb950; border:1px solid #238636; border-radius:4px; padding:2px 6px; font-size:10px; font-weight:bold; cursor:pointer; font-family:monospace;"
      : "background:#238636; color:#fff; border:none; border-radius:4px; padding:2px 6px; font-size:10px; font-weight:bold; cursor:pointer; font-family:monospace;";

    btn.onclick = function() {
      self.applyTextToLunoInbox(item.rawText, item.fingerprint);
      item.isApplied = true;
      self.renderQueueInspectorUI();
    };

    row.appendChild(info);
    row.appendChild(btn);
    return row;
  }

  renderQueueInspectorUI() {
    var container = document.getElementById("relay-queue-inspector-box");
    if (!container) return;

    container.innerHTML = "";
    if (!this.stagedQueue || this.stagedQueue.length === 0) {
      container.appendChild(document.createTextNode("No queued blocks from AI Studio. Click 'Request Queue' to fetch."));
      return;
    }

    for (var i = 0; i < this.stagedQueue.length; i++) {
      container.appendChild(this.buildQueueInspectorRow(this.stagedQueue[i], i));
    }
  }

  sendHostMessageToTarget(messageText, msgType, extraPayload) {
    var type = msgType || "LUNO_HOST_MSG";
    if (!messageText || !messageText.trim()) return false;

    var win = this.targetWindowRef || window.opener;
    if (!win || typeof win.postMessage !== "function") {
      this.logRelaySystem("No active AI Studio target window connected.");
      return false;
    }

    try {
      var payloadObj = Object.assign({ text: messageText }, extraPayload || {});
      var envelope = typeof LunoRelayProtocol !== "undefined"
        ? LunoRelayProtocol.createEnvelope(type, payloadObj)
        : { type: type, text: messageText, payload: payloadObj, timestamp: new Date().toLocaleTimeString() };

      win.postMessage(envelope, "*");
      this.logRelaySystem("Sent (" + type + "): " + messageText);
      return true;
    } catch (err) {
      this.logRelaySystem("Send Error: " + err.message);
      return false;
    }
  }

  logRelaySystem(text) {
    this.messageLogs.push({
      time: new Date().toLocaleTimeString(),
      title: "System",
      url: "Luno Host",
      body: text
    });
    this.updateRelayLogUI();
  }

  buildRelayLogRow(item) {
    var row = document.createElement("div");
    row.style.marginBottom = "4px";
    row.style.borderBottom = "1px solid #21262d";
    row.style.paddingBottom = "3px";

    var timeSpan = document.createElement("span");
    timeSpan.style.color = "#8b949e";
    timeSpan.appendChild(document.createTextNode("[" + item.time + "] "));

    var titleStrong = document.createElement("strong");
    titleStrong.style.color = "#00f2fe";
    titleStrong.appendChild(document.createTextNode(item.title + ": "));

    var bodySpan = document.createElement("span");
    bodySpan.style.color = "#7ee787";
    bodySpan.appendChild(document.createTextNode(item.body));

    row.appendChild(timeSpan);
    row.appendChild(titleStrong);
    row.appendChild(bodySpan);
    return row;
  }

  updateRelayLogUI() {
    var logBox = document.getElementById("relay-log-box");
    var badge = document.getElementById("relay-status-badge");

    if (badge && this.targetWindowRef) {
      badge.textContent = "AI Studio Connected";
      badge.style.background = "#0d2818";
      badge.style.color = "#3fb950";
      badge.style.borderColor = "#238636";
    }

    if (!logBox) return;
    logBox.innerHTML = "";
    for (var i = 0; i < this.messageLogs.length; i++) {
      logBox.appendChild(this.buildRelayLogRow(this.messageLogs[i]));
    }
    logBox.scrollTop = logBox.scrollHeight;
  }

  init(container) {
    var presets = typeof BookmarkletPresets !== "undefined" ? BookmarkletPresets.getPresets() : [];
    if (!this.source && presets.length > 0) {
      this.source = presets[0].source;
    }
    if (typeof BookmarkletUI !== "undefined" && BookmarkletUI.renderWorkshop) {
      BookmarkletUI.renderWorkshop(container, this);
    }
  }

  getSource() {
    if (!this.source) {
      var presets = typeof BookmarkletPresets !== "undefined" ? BookmarkletPresets.getPresets() : [];
      this.source = presets.length > 0 ? presets[0].source : "alert('Luno Bookmarklet Online!');";
    }
    return this.source;
  }

  onSourceChanged(newSource) {
    this.source = newSource || "";
    this.generate();
  }

  generate() {
    var code = this.getSource();
    var encoded = (typeof BookmarkletEncoder !== "undefined")
      ? BookmarkletEncoder.encode(code)
      : "javascript:" + encodeURIComponent(code);

    var outputEl = document.getElementById("bookmarklet-encoded");
    if (outputEl) outputEl.value = encoded;

    var dragLink = document.getElementById("bookmarklet-drag-link");
    if (dragLink) {
      dragLink.href = encoded;
    }
    return encoded;
  }

  copyBookmarklet(targetButton) {
    var encoded = this.generate();
    if (typeof BookmarkletEncoder !== "undefined" && BookmarkletEncoder.copyToClipboard) {
      BookmarkletEncoder.copyToClipboard(encoded, targetButton);
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(encoded);
      if (targetButton) {
        var orig = targetButton.textContent;
        targetButton.textContent = "Copied!";
        setTimeout(function() { targetButton.textContent = orig; }, 1500);
      }
    }
  }
}

globalThis.BookmarkletApp = BookmarkletApp;
if (typeof module !== "undefined" && module.exports) module.exports = BookmarkletApp;