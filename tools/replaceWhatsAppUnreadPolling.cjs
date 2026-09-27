const fs = require("fs");

const servicePath =
  "electron/pharmfly/customers/crm/whatsappService.js";

let service = fs.readFileSync(servicePath, "utf8");

const marker =
  "/* pharmabi-wa-unread-polling-final */";

const markerIndex =
  service.indexOf(marker);

if (markerIndex < 0) {
  throw new Error("Unread polling marker not found.");
}

const returnIndex =
  service.indexOf("return client;", markerIndex);

if (returnIndex < 0) {
  throw new Error("return client; after polling marker not found.");
}


/* =========================================================
   WATCH INBOUND IDENTITY
========================================================= */

if (!service.includes("unreadSyncWatchedIdentities.add(rawFrom)")) {

  const rawFromPattern =
    /(\s*const rawFrom = String\(message\.from \|\| ""\)\.trim\(\);\r?\n)/;

  const match =
    service.match(rawFromPattern);

  if (!match) {
    throw new Error(
      "rawFrom declaration not found."
    );
  }

  const replacement =
    match[1] +
    `
  try {
    unreadSyncWatchedIdentities.add(rawFrom);
  } catch (_) {}
`;

  service =
    service.replace(
      rawFromPattern,
      replacement
    );
}


/* =========================================================
   REPLACE BROKEN getChats() POLLING
========================================================= */

const pollingBlock = `
  /* pharmabi-wa-unread-polling-final */

  /*
   * We only monitor chats from which PharmaBI actually
   * received an inbound message.
   *
   * This avoids client.getChats(), which is failing with
   * the current WhatsApp Web session.
   */
  const unreadSyncWatchedIdentities = new Set();
  const unreadSyncLastCounts = new Map();

  let unreadSyncPollTimer = null;
  let unreadSyncPollBusy = false;
  let unreadSyncReady = false;

  const unreadSyncResolvePhone = async (identity) => {
    const key = String(identity || "").trim();

    if (!key) {
      return null;
    }

    if (key.endsWith("@c.us")) {
      return key.slice(0, -5);
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

        const phone =
          mapping?.pn ||
          mapping?.phone ||
          mapping?.phoneNumber ||
          "";

        const normalized =
          String(phone)
            .replace(/\\\\D/g, "");

        if (normalized) {
          return normalized;
        }
      } catch (error) {
        console.warn(
          "[WA-UNREAD-SYNC-POLL] LID RESOLVE ERROR:",
          key,
          error?.message || error
        );
      }
    }

    return null;
  };

  const pollWhatsAppUnreadCounts = async () => {
    if (!unreadSyncReady) {
      return;
    }

    if (unreadSyncPollBusy) {
      return;
    }

    if (!unreadSyncWatchedIdentities.size) {
      return;
    }

    unreadSyncPollBusy = true;

    try {
      for (const identity of unreadSyncWatchedIdentities) {
        try {
          let chat = null;

          if (
            typeof client.getChatById === "function"
          ) {
            chat =
              await client.getChatById(identity);
          }

          if (!chat) {
            continue;
          }

          const unreadCount = Math.max(
            0,
            Number(chat.unreadCount || 0)
          );

          const previousCount =
            unreadSyncLastCounts.get(identity);

          unreadSyncLastCounts.set(
            identity,
            unreadCount
          );

          const phone =
            await unreadSyncResolvePhone(identity);

          if (!phone) {
            continue;
          }

          /*
           * IMPORTANT:
           * We only need the transition to ZERO.
           *
           * A value > 0 must NOT mark the PharmaBI
           * conversation unread again after the user
           * already opened it inside PharmaBI.
           */
          if (unreadCount === 0) {

            if (
              previousCount !== 0
            ) {
              console.log(
                "[WA-UNREAD-SYNC-POLL] READ",
                {
                  phone,
                  identity,
                  previousCount,
                  unreadCount
                }
              );
            }

            emitEvent(
              "unread_count",
              {
                phone,
                unreadCount: 0,
                chatId: identity,
                source: "targeted-getChatById"
              }
            );
          }

        } catch (chatError) {
          console.warn(
            "[WA-UNREAD-SYNC-POLL] CHAT ERROR:",
            identity,
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

    unreadSyncPollTimer =
      setInterval(
        pollWhatsAppUnreadCounts,
        3000
      );

    pollWhatsAppUnreadCounts();
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

const backupPath =
  servicePath +
  ".backup-before-targeted-unread-polling";

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(
    servicePath,
    backupPath
  );
}

service =
  service.slice(0, markerIndex) +
  pollingBlock +
  service.slice(returnIndex);

fs.writeFileSync(
  servicePath,
  service,
  "utf8"
);

console.log("");
console.log(
  "=== TARGETED WHATSAPP UNREAD POLLING APPLIED ==="
);
console.log(
  "Backup:",
  backupPath
);
