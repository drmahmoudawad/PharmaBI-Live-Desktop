const fs = require("fs");

const servicePath = "electron/pharmfly/customers/crm/whatsappService.js";

let service = fs.readFileSync(servicePath, "utf8");

if (service.includes("/* pharmabi-wa-unread-polling-v1 */")) {
  throw new Error("Unread polling patch already exists.");
}

/* ---------------------------------------------------------
   1) Add watched phone/identity tracking inside inbound flow
--------------------------------------------------------- */

const inboundAnchor = `console.log("[WhatsApp INBOUND IDENTITY]", {
  rawFrom,
  rawAuthor,
  resolvedPhone: from
});`;

if (!service.includes(inboundAnchor)) {
  throw new Error("INBOUND IDENTITY anchor not found.");
}

const inboundReplacement = `${inboundAnchor}

  /* pharmabi-wa-unread-polling-v1 */
  try {
    if (typeof unreadSyncWatchedPhones !== "undefined" && from) {
      unreadSyncWatchedPhones.add(String(from).trim());
    }

    if (
      typeof unreadSyncWatchedIdentities !== "undefined" &&
      rawFrom
    ) {
      unreadSyncWatchedIdentities.add(String(rawFrom).trim());
    }
  } catch (watchError) {
    console.warn("[WA-UNREAD-SYNC-POLL] watch registration failed:", watchError?.message || watchError);
  }`;

service = service.replace(inboundAnchor, inboundReplacement);


/* ---------------------------------------------------------
   2) Add polling engine before final return client;
--------------------------------------------------------- */

const returnAnchor = "return client;";
const returnIndex = service.lastIndexOf(returnAnchor);

if (returnIndex < 0) {
  throw new Error("FINAL return client; anchor not found.");
}

const pollingBlock = `

  /* pharmabi-wa-unread-polling-v1 */
  const unreadSyncWatchedPhones = new Set();
  const unreadSyncWatchedIdentities = new Set();
  const unreadSyncIdentityToPhone = new Map();

  let unreadSyncPollTimer = null;
  let unreadSyncPollBusy = false;
  let unreadSyncPollStarted = false;

  const normalizeUnreadSyncPhone = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;

    const digits = raw.replace(/\\\\D/g, "");
    if (!digits) return null;

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

  const resolveUnreadSyncPhone = async (identity) => {
    const key = String(identity ?? "").trim();

    if (!key) {
      return null;
    }

    const cached = unreadSyncIdentityToPhone.get(key);
    if (cached) {
      return cached;
    }

    const direct = normalizeUnreadSyncPhone(
      key.endsWith("@c.us") ? key.slice(0, -5) : key
    );

    if (direct) {
      unreadSyncIdentityToPhone.set(key, direct);
      return direct;
    }

    if (
      typeof client.getContactLidAndPhone === "function" &&
      key.includes("@lid")
    ) {
      try {
        const result = await client.getContactLidAndPhone([key]);
        const mapping = Array.isArray(result) ? result[0] : result;

        const phone = normalizeUnreadSyncPhone(
          mapping?.pn ||
          mapping?.phone ||
          mapping?.phoneNumber ||
          mapping?.id
        );

        if (phone) {
          unreadSyncIdentityToPhone.set(key, phone);
          return phone;
        }
      } catch (error) {
        console.warn(
          "[WA-UNREAD-SYNC-POLL] LID resolve failed:",
          key,
          error?.message || error
        );
      }
    }

    return null;
  };

  const pollUnreadSync = async () => {
    if (unreadSyncPollBusy) {
      return;
    }

    unreadSyncPollBusy = true;

    try {
      if (
        !client ||
        typeof client.getChats !== "function" ||
        !unreadSyncWatchedPhones.size &&
        !unreadSyncWatchedIdentities.size
      ) {
        return;
      }

      const chats = await client.getChats();

      if (!Array.isArray(chats) || !chats.length) {
        return;
      }

      for (const chat of chats) {
        try {
          const chatId = chat?.id;
          const identity = String(
            chatId?._serialized ||
            ""
          ).trim();

          if (!identity) {
            continue;
          }

          if (chatId?.server && chatId.server !== "c.us" && chatId.server !== "lid") {
            continue;
          }

          let phone = await resolveUnreadSyncPhone(identity);

          const watchedByIdentity =
            unreadSyncWatchedIdentities.has(identity);

          const watchedByPhone =
            phone &&
            unreadSyncWatchedPhones.has(phone);

          if (!watchedByIdentity && !watchedByPhone) {
            continue;
          }

          if (!phone && watchedByPhone) {
            phone = watchedByPhone;
          }

          if (!phone) {
            continue;
          }

          unreadSyncWatchedPhones.add(phone);
          unreadSyncIdentityToPhone.set(identity, phone);

          const unreadCount = Math.max(
            0,
            Number(chat?.unreadCount || 0)
          );

          const previousCount =
            unreadSyncLastCounts.get(phone);

          if (
            previousCount !== undefined &&
            previousCount === unreadCount
          ) {
            continue;
          }

          unreadSyncLastCounts.set(phone, unreadCount);

          console.log(
            "[WA-UNREAD-SYNC-POLL]",
            {
              phone,
              identity,
              unreadCount,
              previousCount
            }
          );

          emitEvent("unread_count", {
            phone,
            unreadCount,
            chatId: identity,
            source: "poll"
          });
        } catch (chatError) {
          console.warn(
            "[WA-UNREAD-SYNC-POLL] chat failed:",
            chatError?.message || chatError
          );
        }
      }
    } catch (error) {
      console.warn(
        "[WA-UNREAD-SYNC-POLL] poll failed:",
        error?.message || error
      );
    } finally {
      unreadSyncPollBusy = false;
    }
  };

  const unreadSyncLastCounts = new Map();

  const startUnreadSyncPolling = () => {
    if (unreadSyncPollStarted) {
      return;
    }

    unreadSyncPollStarted = true;

    console.log(
      "[WA-UNREAD-SYNC-POLL] STARTED interval=3000ms"
    );

    pollUnreadSync();

    unreadSyncPollTimer = setInterval(
      pollUnreadSync,
      3000
    );
  };

  client.on("ready", () => {
    startUnreadSyncPolling();
  });

  client.on("disconnected", () => {
    if (unreadSyncPollTimer) {
      clearInterval(unreadSyncPollTimer);
      unreadSyncPollTimer = null;
    }

    unreadSyncPollStarted = false;

    console.log(
      "[WA-UNREAD-SYNC-POLL] STOPPED"
    );
  });

`;

service =
  service.slice(0, returnIndex) +
  pollingBlock +
  service.slice(returnIndex);


/* ---------------------------------------------------------
   Save
--------------------------------------------------------- */

const backupPath =
  servicePath +
  ".backup-before-unread-polling-v1";

fs.copyFileSync(servicePath, backupPath);

fs.writeFileSync(
  servicePath,
  service,
  "utf8"
);

console.log("WHATSAPP UNREAD POLLING PATCH APPLIED");
console.log("Backup:", backupPath);
