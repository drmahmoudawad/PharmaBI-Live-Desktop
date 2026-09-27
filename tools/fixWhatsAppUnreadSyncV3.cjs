const fs = require("fs");

const servicePath = "electron/pharmfly/customers/crm/whatsappService.js";
const reactPath = "src/components/WhatsAppPage.jsx";

function backup(file, suffix) {
  const b = file + suffix;
  if (!fs.existsSync(b)) {
    fs.copyFileSync(file, b);
  }
}


/* =========================================================
   SERVICE
   Replace the complete unread polling block.
========================================================= */

let service = fs.readFileSync(servicePath, "utf8");

const marker = "/* pharmabi-wa-unread-polling-final */";
const markerIndex = service.indexOf(marker);

if (markerIndex < 0) {
  throw new Error("Unread polling marker not found.");
}

const returnIndex = service.indexOf(
  "return client;",
  markerIndex
);

if (returnIndex < 0) {
  throw new Error("return client; not found.");
}

const newBlock = `
/* pharmabi-wa-unread-polling-final */

const unreadSyncWatchedIdentities = new Set();
const unreadSyncIdentityToPhone = new Map();
const unreadSyncLastCounts = new Map();

let unreadSyncPollTimer = null;
let unreadSyncPollBusy = false;
let unreadSyncReady = false;


/* ---------------------------------------------------------
   Remember inbound chat identity without touching the
   existing inbound-message handler.
--------------------------------------------------------- */

const rememberUnreadSyncIdentity = async (message) => {
  try {
    if (!message || message.fromMe) {
      return;
    }

    const rawFrom =
      String(message.from || "").trim();

    if (!rawFrom) {
      return;
    }

    unreadSyncWatchedIdentities.add(rawFrom);

    if (unreadSyncIdentityToPhone.has(rawFrom)) {
      return;
    }

    let phone = null;

    if (
      rawFrom.endsWith("@c.us")
    ) {
      phone =
        rawFrom
          .replace("@c.us", "")
          .replace(/\\\\D/g, "");
    }

    if (
      !phone &&
      rawFrom.endsWith("@lid") &&
      typeof client.getContactLidAndPhone === "function"
    ) {
      try {
        const result =
          await client.getContactLidAndPhone([rawFrom]);

        const mapping =
          Array.isArray(result)
            ? result[0]
            : result;

        const candidate =
          mapping?.pn ||
          mapping?.phone ||
          mapping?.phoneNumber ||
          "";

        phone =
          String(candidate)
            .replace(/\\\\D/g, "");
      } catch (error) {
        console.warn(
          "[WA-UNREAD-SYNC] LID MAP ERROR:",
          rawFrom,
          error?.message || error
        );
      }
    }

    if (phone) {
      unreadSyncIdentityToPhone.set(
        rawFrom,
        phone
      );

      console.log(
        "[WA-UNREAD-SYNC] WATCH:",
        {
          identity: rawFrom,
          phone
        }
      );
    }

  } catch (error) {
    console.warn(
      "[WA-UNREAD-SYNC] WATCH ERROR:",
      error?.message || error
    );
  }
};

client.on(
  "message",
  rememberUnreadSyncIdentity
);


/* ---------------------------------------------------------
   Resolve phone for a watched identity.
--------------------------------------------------------- */

const unreadSyncResolvePhone = async (identity) => {
  const key =
    String(identity || "").trim();

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
      key
        .replace("@c.us", "")
        .replace(/\\\\D/g, "");

    if (phone) {
      unreadSyncIdentityToPhone.set(
        key,
        phone
      );
    }

    return phone || null;
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

      const candidate =
        mapping?.pn ||
        mapping?.phone ||
        mapping?.phoneNumber ||
        "";

      const phone =
        String(candidate)
          .replace(/\\\\D/g, "");

      if (phone) {
        unreadSyncIdentityToPhone.set(
          key,
          phone
        );
      }

      return phone || null;

    } catch (error) {
      console.warn(
        "[WA-UNREAD-SYNC] RESOLVE ERROR:",
        key,
        error?.message || error
      );

      return null;
    }
  }

  return null;
};


/* ---------------------------------------------------------
   Poll only watched customer chats.
--------------------------------------------------------- */

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
    for (
      const identity
      of unreadSyncWatchedIdentities
    ) {
      try {

        const phone =
          unreadSyncIdentityToPhone.get(identity) ||
          await unreadSyncResolvePhone(identity);

        if (!phone) {
          continue;
        }

        const ids = [
          phone + "@c.us",
          identity
        ];

        let chat = null;
        let usedId = null;

        for (const id of ids) {
          if (
            !id ||
            typeof client.getChatById !== "function"
          ) {
            continue;
          }

          try {
            const candidate =
              await client.getChatById(id);

            if (candidate) {
              chat = candidate;
              usedId = id;
              break;
            }

          } catch (_) {
          }
        }

        if (!chat) {
          continue;
        }

        const unreadCount =
          Math.max(
            0,
            Number(chat.unreadCount || 0)
          );

        const previous =
          unreadSyncLastCounts.get(identity);

        unreadSyncLastCounts.set(
          identity,
          unreadCount
        );

        if (previous === undefined) {
          console.log(
            "[WA-UNREAD-SYNC] INITIAL:",
            {
              phone,
              identity,
              usedId,
              unreadCount
            }
          );

          continue;
        }

        if (previous === unreadCount) {
          continue;
        }

        console.log(
          "[WA-UNREAD-SYNC] CHANGE:",
          {
            phone,
            identity,
            usedId,
            previous,
            unreadCount
          }
        );

        emitEvent(
          "unread_count",
          {
            phone,
            unreadCount,
            chatId: usedId || identity,
            source: "targeted-phone-first-v3"
          }
        );

      } catch (error) {
        console.warn(
          "[WA-UNREAD-SYNC] CHAT ERROR:",
          error?.message || error
        );
      }
    }

  } catch (error) {
    console.warn(
      "[WA-UNREAD-SYNC] POLL ERROR:",
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
    "[WA-UNREAD-SYNC] POLLING STARTED interval=3000ms"
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
    "[WA-UNREAD-SYNC] READY"
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
    "[WA-UNREAD-SYNC] STOPPED"
  );
});

`;

backup(
  servicePath,
  ".backup-before-unread-sync-v3"
);

service =
  service.slice(0, markerIndex) +
  newBlock +
  service.slice(returnIndex);

fs.writeFileSync(
  servicePath,
  service,
  "utf8"
);

console.log("SERVICE: V3 APPLIED");


/* =========================================================
   REACT
   Remove duplicate unread-sync effect(s), then add exactly
   one stable subscription.
========================================================= */

let react = fs.readFileSync(
  reactPath,
  "utf8"
);

const reactMarker =
  "/* pharmabi-wa-unread-sync-final */";

let first = react.indexOf(reactMarker);

if (first >= 0) {

  const effectStart =
    react.lastIndexOf(
      "useEffect(() => {",
      first
    );

  const depsEnd =
    react.indexOf(
      "}, [markConversationRead, markConversationUnread]);",
      first
    );

  if (
    effectStart >= 0 &&
    depsEnd >= 0
  ) {
    const end =
      depsEnd +
      "}, [markConversationRead, markConversationUnread]);"
        .length;

    react =
      react.slice(0, effectStart) +
      react.slice(end);

    console.log(
      "REACT: OLD UNREAD EFFECT REMOVED"
    );
  }
}


/* Remove any duplicate V3/final unread effects. */

let safety = 0;

while (
  react.includes("/* pharmabi-wa-unread-sync-final */") &&
  safety < 20
) {
  const m =
    react.indexOf(
      "/* pharmabi-wa-unread-sync-final */"
    );

  const start =
    react.lastIndexOf(
      "useEffect(() => {",
      m
    );

  const end =
    react.indexOf(
      "}, []);",
      m
    );

  if (
    start < 0 ||
    end < 0
  ) {
    break;
  }

  react =
    react.slice(0, start) +
    react.slice(
      end + "}, []);".length
    );

  safety++;
}


const ackMarker =
  "/* pharmabi-wa-message-ack-reader */";

let insertAt =
  react.indexOf(ackMarker);

if (insertAt < 0) {
  insertAt =
    react.indexOf("useEffect(() => {");
}

if (insertAt < 0) {
  throw new Error(
    "React useEffect insertion point not found."
  );
}

insertAt =
  react.lastIndexOf(
    "\n",
    insertAt
  ) + 1;


const stableEffect =
`  useEffect(() => {
    /* pharmabi-wa-unread-sync-final */

    const unreadHandler = (first, second) => {
      const payload =
        second &&
        typeof second === "object"
          ? second
          : first &&
            typeof first === "object"
            ? first
            : {};

      const phone =
        String(
          payload.phone ||
          payload.recipient_phone ||
          ""
        ).trim();

      const unreadCount =
        Math.max(
          0,
          Number(
            payload.unreadCount || 0
          )
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
  }, []);

`;

backup(
  reactPath,
  ".backup-before-unread-sync-v3"
);

react =
  react.slice(0, insertAt) +
  stableEffect +
  react.slice(insertAt);

fs.writeFileSync(
  reactPath,
  react,
  "utf8"
);

console.log(
  "REACT: SINGLE STABLE LISTENER INSTALLED"
);

console.log("");
console.log(
  "=== WHATSAPP UNREAD SYNC V3 COMPLETE ==="
);
