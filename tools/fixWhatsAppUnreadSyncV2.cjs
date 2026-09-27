const fs = require("fs");

const servicePath = "electron/pharmfly/customers/crm/whatsappService.js";
const reactPath = "src/components/WhatsAppPage.jsx";

function backup(file, suffix) {
  const path = file + suffix;
  if (!fs.existsSync(path)) {
    fs.copyFileSync(file, path);
  }
}


/* =========================================================
   SERVICE
   ========================================================= */

let service = fs.readFileSync(servicePath, "utf8");

const marker = "/* pharmabi-wa-unread-polling-final */";
const markerIndex = service.indexOf(marker);

if (markerIndex < 0) {
  throw new Error("Unread polling marker not found.");
}

const returnIndex = service.indexOf("return client;", markerIndex);

if (returnIndex < 0) {
  throw new Error("return client; after unread polling not found.");
}


/* ---------- Save inbound LID -> real phone ---------- */

const identityBlock =
`console.log("[WhatsApp INBOUND IDENTITY]", {
  rawFrom,
  rawAuthor,
  resolvedPhone: from
});`;

if (!service.includes("unreadSyncIdentityToPhone.set(String(rawFrom).trim()")) {
  if (!service.includes(identityBlock)) {
    throw new Error("WhatsApp INBOUND IDENTITY block not found.");
  }

  const replacement =
identityBlock + `

  try {
    if (from) {
      const resolvedUnreadPhone = String(from).trim();

      if (resolvedUnreadPhone) {
        unreadSyncIdentityToPhone.set(
          String(rawFrom || "").trim(),
          resolvedUnreadPhone
        );

        if (rawFrom) {
          unreadSyncWatchedIdentities.add(
            String(rawFrom).trim()
          );
        }
      }
    }
  } catch (watchError) {
    console.warn(
      "[WA-UNREAD-SYNC-POLL] WATCH ERROR:",
      watchError?.message || watchError
    );
  }`;

  service = service.replace(
    identityBlock,
    replacement
  );
}


/* ---------- Replace polling implementation ---------- */

const newPolling = `
/* pharmabi-wa-unread-polling-final */

const unreadSyncWatchedIdentities = new Set();
const unreadSyncIdentityToPhone = new Map();
const unreadSyncLastCounts = new Map();

let unreadSyncPollTimer = null;
let unreadSyncPollBusy = false;
let unreadSyncReady = false;

const unreadSyncNormalizePhone = (value) => {
  const raw = String(value || "").trim();

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

  return digits;
};

const unreadSyncResolvePhone = async (identity) => {
  const key = String(identity || "").trim();

  if (!key) {
    return null;
  }

  const cached =
    unreadSyncIdentityToPhone.get(key);

  if (cached) {
    return cached;
  }

  if (key.endsWith("@c.us")) {
    const phone =
      unreadSyncNormalizePhone(
        key.slice(0, -5)
      );

    if (phone) {
      unreadSyncIdentityToPhone.set(
        key,
        phone
      );
    }

    return phone;
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
        unreadSyncNormalizePhone(
          mapping?.pn ||
          mapping?.phone ||
          mapping?.phoneNumber ||
          ""
        );

      if (phone) {
        unreadSyncIdentityToPhone.set(
          key,
          phone
        );
      }

      return phone;
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
        const phone =
          unreadSyncIdentityToPhone.get(identity) ||
          await unreadSyncResolvePhone(identity);

        if (!phone) {
          console.log(
            "[WA-UNREAD-SYNC-POLL] NO PHONE:",
            identity
          );
          continue;
        }

        const candidates = [
          phone + "@c.us",
          identity
        ];

        let chat = null;
        let usedChatId = null;

        for (const chatId of candidates) {
          if (
            !chatId ||
            typeof client.getChatById !== "function"
          ) {
            continue;
          }

          try {
            chat =
              await client.getChatById(chatId);

            if (chat) {
              usedChatId = chatId;
              break;
            }
          } catch (_) {
          }
        }

        if (!chat) {
          console.log(
            "[WA-UNREAD-SYNC-POLL] CHAT NOT FOUND:",
            {
              phone,
              identity,
              candidates
            }
          );
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

        if (previousCount === undefined) {
          console.log(
            "[WA-UNREAD-SYNC-POLL] INITIAL:",
            {
              phone,
              identity,
              usedChatId,
              unreadCount
            }
          );
          continue;
        }

        if (previousCount === unreadCount) {
          continue;
        }

        console.log(
          "[WA-UNREAD-SYNC-POLL] CHANGE:",
          {
            phone,
            identity,
            usedChatId,
            previousCount,
            unreadCount
          }
        );

        emitEvent(
          "unread_count",
          {
            phone,
            unreadCount,
            chatId: usedChatId || identity,
            source: "targeted-phone-first"
          }
        );

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

  unreadSyncPollTimer = setInterval(
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

backup(
  servicePath,
  ".backup-before-unread-sync-v2"
);

service =
  service.slice(0, markerIndex) +
  newPolling +
  service.slice(returnIndex);

fs.writeFileSync(
  servicePath,
  service,
  "utf8"
);

console.log("SERVICE: UPDATED");


/* =========================================================
   REACT — FIX 11 LISTENERS
   ========================================================= */

let react = fs.readFileSync(reactPath, "utf8");

const reactMarker =
  "/* pharmabi-wa-unread-sync-final */";

const reactMarkerIndex =
  react.indexOf(reactMarker);

if (reactMarkerIndex < 0) {
  throw new Error("React unread sync marker not found.");
}

const reactTail =
  react.slice(reactMarkerIndex);

const depsPattern =
  /},\s*\[markConversationRead,\s*markConversationUnread\]\);/;

if (depsPattern.test(reactTail)) {
  const fixedTail =
    reactTail.replace(
      depsPattern,
      "}, []);"
    );

  backup(
    reactPath,
    ".backup-before-unread-sync-v2"
  );

  react =
    react.slice(0, reactMarkerIndex) +
    fixedTail;

  fs.writeFileSync(
    reactPath,
    react,
    "utf8"
  );

  console.log(
    "REACT: LISTENER FIXED TO SINGLE SUBSCRIPTION"
  );
} else {
  console.log(
    "REACT: DEPENDENCY LINE ALREADY FIXED"
  );
}

console.log("");
console.log("=== WHATSAPP UNREAD SYNC V2 COMPLETE ===");
