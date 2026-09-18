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