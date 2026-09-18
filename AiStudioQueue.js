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