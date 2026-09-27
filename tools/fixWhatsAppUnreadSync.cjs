const fs = require("fs");

const servicePath = "electron/pharmfly/customers/crm/whatsappService.js";
const ipcPath = "electron/pharmfly/customers/crm/whatsapp.ipc.js";
const preloadPath = "electron/preload.js";
const reactPath = "src/components/WhatsAppPage.jsx";

function backupOnce(file) {
  const backup = file + ".backup-before-unread-sync-final";
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
  }
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

console.log("=== WHATSAPP UNREAD SYNC FINAL FIX ===");


/* =========================================================
   1. SERVICE
========================================================= */

let service = fs.readFileSync(servicePath, "utf8");

if (!service.includes("/* pharmabi-wa-unread-polling-final */")) {
  const returnIndex = service.lastIndexOf("return client;");

  if (returnIndex < 0) {
    throw new Error("Final return client; not found.");
  }

  const pollingBlock = `
  
  /* pharmabi-wa-unread-polling-final */

  const unreadSyncLastCounts = new Map();
  let unreadSyncPollTimer = null;
  let unreadSyncPollBusy = false;
  let unreadSyncReady = false;

  const unreadSyncNormalizePhone = (value) => {
    const raw = String(value ?? "").trim();

    if (!raw) {
      return null;
    }

    const digits = raw.replace(/\\\\D/g, "");

    if (!digits) {
      return null;
    }

    if (digits.startsWith("0020")) {
      return digits.slice(2);
    }

    if (digits.startsWith("20")) {
      return digits;
    }

    if (digits.startsWith("0")) {
      return "20" + digits.slice(1);
    }

    return digits.length >= 10 ? digits : null;
  };

  const unreadSyncResolvePhone = async (identity) => {
    const key = String(identity ?? "").trim();

    if (!key) {
      return null;
    }

    if (key.endsWith("@c.us")) {
      return unreadSyncNormalizePhone(
        key.slice(0, -5)
      );
    }

    if (
      key.endsWith("@lid") &&
      typeof client.getContactLidAndPhone === "function"
    ) {
      try {
        const result =
          await client.getContactLidAndPhone([key]);

        const mapping =
          Array.isArray(result)
            ? result[0]
            : result;

        return unreadSyncNormalizePhone(
          mapping?.pn ||
          mapping?.phone ||
          mapping?.phoneNumber ||
          ""
        );
      } catch (error) {
        console.warn(
          "[WA-UNREAD-SYNC-POLL] LID resolve failed:",
          key,
          error?.message || error
        );

        return null;
      }
    }

    return unreadSyncNormalizePhone(key);
  };

  const pollWhatsAppUnreadCounts = async () => {
    if (!unreadSyncReady) {
      return;
    }

    if (unreadSyncPollBusy) {
      return;
    }

    unreadSyncPollBusy = true;

    try {
      if (
        !client ||
        typeof client.getChats !== "function"
      ) {
        return;
      }

      const chats = await client.getChats();

      if (!Array.isArray(chats)) {
        return;
      }

      for (const chat of chats) {
        try {
          const chatId = chat?.id;

          const identity = String(
            chatId?._serialized || ""
          ).trim();

          if (!identity) {
            continue;
          }

          const server = String(
            chatId?.server || ""
          ).trim();

          if (
            server &&
            server !== "c.us" &&
            server !== "lid"
          ) {
            continue;
          }

          const unreadCount = Math.max(
            0,
            Number(chat?.unreadCount || 0)
          );

          const previousCount =
            unreadSyncLastCounts.get(identity);

          unreadSyncLastCounts.set(
            identity,
            unreadCount
          );

          /*
           * First observation only initializes state.
           */
          if (previousCount === undefined) {
            continue;
          }

          /*
           * No change.
           */
          if (previousCount === unreadCount) {
            continue;
          }

          const phone =
            await unreadSyncResolvePhone(identity);

          if (!phone) {
            console.log(
              "[WA-UNREAD-SYNC-POLL] CHANGED WITHOUT PHONE",
              {
                identity,
                previousCount,
                unreadCount
              }
            );

            continue;
          }

          console.log(
            "[WA-UNREAD-SYNC-POLL] CHANGE",
            {
              phone,
              identity,
              previousCount,
              unreadCount
            }
          );

          emitEvent(
            "unread_count",
            {
              phone,
              unreadCount,
              chatId: identity,
              source: "getChats"
            }
          );
        } catch (chatError) {
          console.warn(
            "[WA-UNREAD-SYNC-POLL] CHAT ERROR:",
            chatError?.message || chatError
          );
        }
      }
    } catch (error) {
      console.warn(
        "[WA-UNREAD-SYNC-POLL] POLL ERROR:",
        error?.message || error
      );
    } finally {
      unreadSyncPollBusy = false;
    }
  };

  const startWhatsAppUnreadPolling = () => {
    if (unreadSyncPollTimer) {
      return;
    }

    console.log(
      "[WA-UNREAD-SYNC-POLL] STARTED interval=3000ms"
    );

    pollWhatsAppUnreadCounts();

    unreadSyncPollTimer =
      setInterval(
        pollWhatsAppUnreadCounts,
        3000
      );
  };

  client.on("ready", () => {
    unreadSyncReady = true;

    console.log(
      "[WA-UNREAD-SYNC-POLL] READY"
    );

    startWhatsAppUnreadPolling();
  });

  client.on("disconnected", () => {
    unreadSyncReady = false;

    if (unreadSyncPollTimer) {
      clearInterval(unreadSyncPollTimer);
      unreadSyncPollTimer = null;
    }

    unreadSyncLastCounts.clear();

    console.log(
      "[WA-UNREAD-SYNC-POLL] STOPPED"
    );
  });

`;

  backupOnce(servicePath);

  service =
    service.slice(0, returnIndex) +
    pollingBlock +
    service.slice(returnIndex);

  write(servicePath, service);

  console.log("SERVICE: polling added.");
} else {
  console.log("SERVICE: polling already exists.");
}


/* =========================================================
   2. IPC
========================================================= */

let ipc = fs.readFileSync(ipcPath, "utf8");

if (!ipc.includes('case "unread_count":')) {
  const defaultIndex = ipc.indexOf("default:");

  if (defaultIndex < 0) {
    throw new Error("IPC default: not found.");
  }

  const block = `case "unread_count":
    sendToRenderer("whatsapp:unread-count", payload);
    break;

  `;

  backupOnce(ipcPath);

  ipc =
    ipc.slice(0, defaultIndex) +
    block +
    ipc.slice(defaultIndex);

  write(ipcPath, ipc);

  console.log("IPC: unread_count added.");
} else {
  console.log("IPC: unread_count already exists.");
}


/* =========================================================
   3. PRELOAD
========================================================= */

let preload = fs.readFileSync(preloadPath, "utf8");

if (!preload.includes("onUnreadCount")) {
  const marker =
    "onMessageAck: callback => ipcRenderer.on";

  const markerIndex =
    preload.indexOf(marker);

  if (markerIndex < 0) {
    throw new Error(
      "preload onMessageAck anchor not found."
    );
  }

  const insertIndex =
    preload.lastIndexOf("\n", markerIndex);

  const block = `
    onUnreadCount: callback =>
      ipcRenderer.on(
        "whatsapp:unread-count",
        callback
      ),
    offUnreadCount: callback =>
      ipcRenderer.removeListener(
        "whatsapp:unread-count",
        callback
      ),`;

  backupOnce(preloadPath);

  preload =
    preload.slice(0, insertIndex + 1) +
    block +
    preload.slice(insertIndex + 1);

  write(preloadPath, preload);

  console.log("PRELOAD: unread_count added.");
} else {
  console.log("PRELOAD: unread_count already exists.");
}


/* =========================================================
   4. REACT
========================================================= */

let react = fs.readFileSync(reactPath, "utf8");

if (!react.includes("/* pharmabi-wa-unread-sync-final */")) {
  const handlerIndex =
    react.indexOf(
      "window.pharmaBI?.whatsapp?.onMessage?.("
    );

  if (handlerIndex < 0) {
    throw new Error(
      "React onMessage handler not found."
    );
  }

  const effectStart =
    react.lastIndexOf(
      "useEffect(() => {",
      handlerIndex
    );

  if (effectStart < 0) {
    throw new Error(
      "React inbound useEffect not found."
    );
  }

  const effect = `useEffect(() => {
    /* pharmabi-wa-unread-sync-final */

    const unreadHandler = (first, second) => {
      const payload =
        second && typeof second === "object"
          ? second
          : first && typeof first === "object"
            ? first
            : {};

      const phone = String(
        payload.phone ||
        payload.recipient_phone ||
        ""
      ).trim();

      const unreadCount = Math.max(
        0,
        Number(payload.unreadCount || 0)
      );

      if (!phone) {
        return;
      }

      if (unreadCount === 0) {
        console.log(
          "[WA-UNREAD-SYNC] MARK READ",
          phone
        );

        markConversationRead(phone);
      } else {
        console.log(
          "[WA-UNREAD-SYNC] MARK UNREAD",
          phone,
          unreadCount
        );

        markConversationUnread(phone);
      }
    };

    window.pharmaBI?.whatsapp?.onUnreadCount?.(
      unreadHandler
    );

    return () => {
      window.pharmaBI?.whatsapp?.offUnreadCount?.(
        unreadHandler
      );
    };
  }, [markConversationRead, markConversationUnread]);

`;

  backupOnce(reactPath);

  react =
    react.slice(0, effectStart) +
    effect +
    react.slice(effectStart);

  write(reactPath, react);

  console.log("REACT: unread sync added.");
} else {
  console.log("REACT: unread sync already exists.");
}


console.log("");
console.log("=== PATCH COMPLETE ===");
