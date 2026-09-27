const fs = require("fs");

const file =
  "electron/pharmfly/customers/crm/whatsappService.js";

let s = fs.readFileSync(file, "utf8");

const marker =
  "/* pharmabi-wa-unread-polling-final */";

const markerIndex =
  s.indexOf(marker);

if (markerIndex < 0) {
  throw new Error(
    "Unread polling marker not found."
  );
}

const returnIndex =
  s.indexOf(
    "return client;",
    markerIndex
  );

if (returnIndex < 0) {
  throw new Error(
    "return client; not found."
  );
}


/* =========================================================
   V4
   Monitor the actual Chat object returned by message.getChat()
========================================================= */

const block = `
/* pharmabi-wa-unread-polling-final */

const unreadSyncChats = new Map();
const unreadSyncLastCounts = new Map();

let unreadSyncPollTimer = null;
let unreadSyncPollBusy = false;
let unreadSyncReady = false;


/* ---------------------------------------------------------
   Save the exact WhatsApp Chat object when a customer
   message arrives.
--------------------------------------------------------- */

const unreadSyncRememberChat = async (message) => {
  try {

    if (!message || message.fromMe) {
      return;
    }

    if (
      typeof message.getChat !== "function"
    ) {
      return;
    }

    const chat =
      await message.getChat();

    if (!chat) {
      return;
    }

    const identity =
      String(
        chat?.id?._serialized ||
        message?.from ||
        ""
      ).trim();

    if (!identity) {
      return;
    }

    let phone = "";

    const rawFrom =
      String(
        message?.from ||
        ""
      ).trim();

    if (
      rawFrom.endsWith("@c.us")
    ) {
      phone =
        rawFrom
          .replace("@c.us", "")
          .replace(/\\D/g, "");
    }

    if (
      !phone &&
      rawFrom.endsWith("@lid") &&
      typeof client.getContactLidAndPhone === "function"
    ) {
      try {

        const result =
          await client.getContactLidAndPhone(
            [rawFrom]
          );

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
            .replace("@c.us", "")
            .replace(/\\D/g, "");

      } catch (error) {

        console.warn(
          "[WA-UNREAD-SYNC] PHONE MAP ERROR:",
          error?.message || error
        );
      }
    }

    if (!phone) {
      phone =
        String(
          chat?.id?.user ||
          ""
        )
        .replace(/\\D/g, "");
    }

    unreadSyncChats.set(
      identity,
      {
        chat,
        phone
      }
    );

    console.log(
      "[WA-UNREAD-SYNC] CHAT WATCHED:",
      {
        identity,
        phone,
        unreadCount:
          Number(chat?.unreadCount || 0)
      }
    );

  } catch (error) {

    console.warn(
      "[WA-UNREAD-SYNC] WATCH ERROR:",
      error?.message || error
    );
  }
};

client.on(
  "message",
  unreadSyncRememberChat
);


/* ---------------------------------------------------------
   Poll the SAME Chat object.
--------------------------------------------------------- */

const pollWhatsAppUnreadCounts = async () => {

  if (!unreadSyncReady) {
    return;
  }

  if (unreadSyncPollBusy) {
    return;
  }

  if (!unreadSyncChats.size) {
    return;
  }

  unreadSyncPollBusy = true;

  try {

    for (
      const [identity, entry]
      of unreadSyncChats
    ) {

      try {

        const chat =
          entry?.chat;

        const phone =
          String(
            entry?.phone ||
            ""
          ).trim();

        if (!chat || !phone) {
          continue;
        }

        const unreadCount =
          Math.max(
            0,
            Number(
              chat.unreadCount || 0
            )
          );

        const previous =
          unreadSyncLastCounts.get(
            identity
          );

        if (
          previous === undefined
        ) {

          unreadSyncLastCounts.set(
            identity,
            unreadCount
          );

          console.log(
            "[WA-UNREAD-SYNC] INITIAL:",
            {
              identity,
              phone,
              unreadCount
            }
          );

          continue;
        }

        if (
          previous === unreadCount
        ) {
          continue;
        }

        unreadSyncLastCounts.set(
          identity,
          unreadCount
        );

        console.log(
          "[WA-UNREAD-SYNC] CHANGE:",
          {
            identity,
            phone,
            previous,
            unreadCount
          }
        );

        emitEvent(
          "unread_count",
          {
            phone,
            unreadCount,
            chatId: identity,
            source:
              "message-getChat-v4"
          }
        );

      } catch (chatError) {

        console.warn(
          "[WA-UNREAD-SYNC] CHAT ERROR:",
          chatError?.message ||
          chatError
        );
      }
    }

  } catch (error) {

    console.warn(
      "[WA-UNREAD-SYNC] POLL ERROR:",
      error?.message ||
      error
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

    clearInterval(
      unreadSyncPollTimer
    );

    unreadSyncPollTimer = null;
  }

  unreadSyncChats.clear();
  unreadSyncLastCounts.clear();

  console.log(
    "[WA-UNREAD-SYNC] STOPPED"
  );
});

`;


const backup =
  file +
  ".backup-before-unread-sync-v4";

if (!fs.existsSync(backup)) {
  fs.copyFileSync(
    file,
    backup
  );
}

s =
  s.slice(0, markerIndex) +
  block +
  s.slice(returnIndex);

fs.writeFileSync(
  file,
  s,
  "utf8"
);

console.log(
  "=== WHATSAPP UNREAD SYNC V4 APPLIED ==="
);

console.log(
  "Checking syntax..."
);
