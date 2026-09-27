const fs = require("fs");

const ipcPath = "electron/ipc/whatsapp.ipc.js";
const preloadPath = "electron/preload.js";
const reactPath = "src/components/WhatsAppPage.jsx";

function backup(file) {
  const backup = file + ".backup-before-unread-sync-final";
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
  }
}

function save(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

/* =========================================================
   IPC
========================================================= */

{
  let s = fs.readFileSync(ipcPath, "utf8");

  if (!s.includes('case "unread_count":')) {
    const match = s.match(/^([ \t]*)default\s*:/m);

    if (!match) {
      throw new Error("IPC default case not found.");
    }

    const indent = match[1];

    const block =
      indent + 'case "unread_count":\n' +
      indent + '  sendToRenderer("whatsapp:unread-count", payload);\n' +
      indent + '  break;\n\n';

    backup(ipcPath);

    s =
      s.slice(0, match.index) +
      block +
      s.slice(match.index);

    save(ipcPath, s);

    console.log("IPC: ADDED");
  } else {
    console.log("IPC: EXISTS");
  }
}


/* =========================================================
   PRELOAD
========================================================= */

{
  let s = fs.readFileSync(preloadPath, "utf8");

  if (!s.includes("onUnreadCount")) {
    const marker = "onMessageAck:";

    const index = s.indexOf(marker);

    if (index < 0) {
      throw new Error("preload onMessageAck not found.");
    }

    const lineStart = s.lastIndexOf("\n", index) + 1;

    const block =
      '    onUnreadCount: callback => ipcRenderer.on("whatsapp:unread-count", callback),\n' +
      '    offUnreadCount: callback => ipcRenderer.removeListener("whatsapp:unread-count", callback),\n';

    backup(preloadPath);

    s =
      s.slice(0, lineStart) +
      block +
      s.slice(lineStart);

    save(preloadPath, s);

    console.log("PRELOAD: ADDED");
  } else {
    console.log("PRELOAD: EXISTS");
  }
}


/* =========================================================
   REACT
========================================================= */

{
  let s = fs.readFileSync(reactPath, "utf8");

  if (!s.includes("/* pharmabi-wa-unread-sync-final */")) {

    const preferred =
      "/* pharmabi-wa-message-ack-reader */";

    let index = s.indexOf(preferred);

    if (index >= 0) {
      index = s.lastIndexOf("\n", index) + 1;
    } else {
      index = s.indexOf("useEffect(() => {");

      if (index < 0) {
        throw new Error("React useEffect anchor not found.");
      }
    }

    const effect =
`  useEffect(() => {
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

    backup(reactPath);

    s =
      s.slice(0, index) +
      effect +
      s.slice(index);

    save(reactPath, s);

    console.log("REACT: ADDED");
  } else {
    console.log("REACT: EXISTS");
  }
}

console.log("");
console.log("=== UNREAD SYNC FINISHED ===");
