import fs from "node:fs";

const file =
    "D:/PharmaBI-Live-Desktop/src/components/WhatsAppPage.jsx";

const content =
    fs.readFileSync(
        file,
        "utf8"
    );

const backup =
    `${file}.backup-before-conversation-final-${new Date().toISOString().replace(/[:.]/g, "-")}`;

fs.copyFileSync(
    file,
    backup
);

let next =
    content;


/*
 * ============================================================
 * 1. State
 * ============================================================
 */

const stateRegex =
    /const\s*\[\s*historyLoading\s*,\s*setHistoryLoading\s*\]\s*=\s*useState\(false\);/m;

if (
    !next.includes("conversationPhone")
) {

    if (!stateRegex.test(next)) {

        throw new Error(
            "historyLoading state not found."
        );

    }


    next =
        next.replace(
            stateRegex,
            match =>
                `${match}

      const [
          conversationPhone,
          setConversationPhone
      ] = useState("");

      const [
          conversationCustomerName,
          setConversationCustomerName
      ] = useState("");

      const [
          conversationBranchId,
          setConversationBranchId
      ] = useState(null);

      const [
          conversationCustomerId,
          setConversationCustomerId
      ] = useState("");

      const [
          conversationMessages,
          setConversationMessages
      ] = useState([]);

      const [
          conversationLoading,
          setConversationLoading
      ] = useState(false);

      const [
          conversationDraft,
          setConversationDraft
      ] = useState("");`
        );

    console.log(
        "STATE ADDED"
    );

}


/*
 * ============================================================
 * 2. Open conversation
 * ============================================================
 */

if (
    !next.includes(
        "async function openConversation"
    )
) {

    const anchor = "const loadHistory";

    const block = `
      async function openConversation(
          row
      ) {

          const selectedPhone =
              String(
                  row?.recipient_phone ||
                  row?.phone ||
                  ""
              ).trim();


          if (!selectedPhone) {
              return;
          }


          const rawName =
              String(
                  row?.customer_name ||
                  ""
              ).trim();


          const displayName =
              row?.is_unmatched ||
              !rawName ||
              /^\\\\d+$/.test(rawName)
                  ? "عميل جديد"
                  : rawName;


          const selectedBranchId =
              Number(
                  row?.branch_id
              ) > 0
                  ? Number(row.branch_id)
                  : null;


          const selectedCustomerId =
              row?.customer_id !== null &&
              row?.customer_id !== undefined
                  ? String(row.customer_id)
                  : "";


          setConversationPhone(
              selectedPhone
          );

          setConversationCustomerName(
              displayName
          );

          setConversationBranchId(
              selectedBranchId
          );

          setConversationCustomerId(
              selectedCustomerId
          );

          setConversationMessages(
              []
          );

          setConversationDraft(
              ""
          );

          setConversationLoading(
              true
          );


          try {

              const result =
                  await window
                      .pharmaBI
                      ?.whatsapp
                      ?.history?.({
                          phone:
                              selectedPhone,
                          limit:
                              200
                      });


              const rows =
                  Array.isArray(
                      result?.history
                  )
                      ? result.history
                      : Array.isArray(result)
                          ? result
                          : [];


              setConversationMessages(
                  [...rows].reverse()
              );

          }
          catch (
              error
          ) {

              console.error(
                  "[WhatsApp] Conversation load error:",
                  error
              );

              setActionError(
                  error?.message ||
                  "تعذر فتح المحادثة."
              );

          }
          finally {

              setConversationLoading(
                  false
              );

          }

      }


`;

    if (!next.includes(anchor)) {

        throw new Error(
            "loadHistory anchor not found."
        );

    }


    next =
        next.replace(
            anchor,
            block + anchor
        );


    console.log(
        "OPEN CONVERSATION ADDED"
    );

}


/*
 * ============================================================
 * 3. Send reply
 * ============================================================
 */

if (
    !next.includes(
        "async function sendConversationMessage"
    )
) {

    const anchor = "async function initializeWhatsApp() {";

    const block = `
      async function sendConversationMessage() {

          const messageText =
              conversationDraft.trim();


          if (
              !conversationPhone ||
              !messageText
          ) {

              return;

          }


          setActionError(
              ""
          );


          try {

              const result =
                  await window
                      .pharmaBI
                      ?.whatsapp
                      ?.send?.({

                          phone:
                              conversationPhone,

                          message:
                              messageText,

                          type:
                              "TEXT",

                          customerId:
                              conversationCustomerId ||
                              null,

                          branchId:
                              conversationBranchId ||
                              branchId

                      });


              if (
                  result?.success === false
              ) {

                  throw new Error(
                      result.error ||
                      "فشل إرسال الرسالة."
                  );

              }


              setConversationDraft(
                  ""
              );


              const historyResult =
                  await window
                      .pharmaBI
                      ?.whatsapp
                      ?.history?.({

                          phone:
                              conversationPhone,

                          limit:
                              200

                      });


              const rows =
                  Array.isArray(
                      historyResult?.history
                  )
                      ? historyResult.history
                      : Array.isArray(
                          historyResult
                      )
                          ? historyResult
                          : [];


              setConversationMessages(
                  [...rows].reverse()
              );


              await loadHistory();


          }
          catch (
              error
          ) {

              console.error(
                  "[WhatsApp] Conversation send error:",
                  error
              );

              setActionError(
                  error?.message ||
                  "تعذر إرسال الرسالة."
              );

          }

      }


`;

    if (!next.includes(anchor)) {

        throw new Error(
            "initializeWhatsApp anchor not found."
        );

    }


    next =
        next.replace(
            anchor,
            block + anchor
        );


    console.log(
        "SEND REPLY ADDED"
    );

}


/*
 * ============================================================
 * 4. Make history rows clickable
 * ============================================================
 */

if (
    !next.includes(
        "void openConversation("
    )
) {

    const marker =
        "history.map(";

    const mapIndex =
        next.indexOf(
            marker
        );


    if (
        mapIndex < 0
    ) {

        throw new Error(
            "history.map not found."
        );

    }


    const rowStart =
        next.indexOf(
            "<tr",
            mapIndex
        );


    if (
        rowStart < 0
    ) {

        throw new Error(
            "History table row not found."
        );

    }


    const rowClose =
        next.indexOf(
            ">",
            rowStart
        );


    if (
        rowClose < 0
    ) {

        throw new Error(
            "History table row close not found."
        );

    }


    const clickCode = `
                                                              onClick={() =>
                                                                  void openConversation(
                                                                      row
                                                                  )
                                                              }
                                                              style={{
                                                                  cursor:
                                                                      "pointer"
                                                              }}`;


    next =
        next.slice(
            0,
            rowClose
        ) +
        clickCode +
        next.slice(
            rowClose
        );


    console.log(
        "ROWS MADE CLICKABLE"
    );

}


/*
 * ============================================================
 * 5. Conversation panel
 * ============================================================
 */

if (
    !next.includes(
        "conversationMessages.map"
    )
) {

    const historyMarkerRegex =
        /\{\s*historyLoading\s*\?\s*\(/m;

    const panel = `
                  {
                      conversationPhone && (

                          <div
                              style={{
                                  marginBottom: 18,
                                  border:
                                      "1px solid rgba(56,189,248,0.22)",
                                  borderRadius: 14,
                                  background:
                                      "rgba(15,23,42,0.92)",
                                  overflow:
                                      "hidden"
                              }}
                          >

                              <div
                                  style={{
                                      display:
                                          "flex",
                                      justifyContent:
                                          "space-between",
                                      alignItems:
                                          "center",
                                      padding:
                                          "14px 16px",
                                      borderBottom:
                                          "1px solid rgba(148,163,184,0.12)"
                                  }}
                              >

                                  <div>

                                      <strong
                                          style={{
                                              display:
                                                  "block",
                                              color:
                                                  "#f8fafc",
                                              fontSize:
                                                  16
                                          }}
                                      >
                                          {
                                              conversationCustomerName ||
                                              "عميل جديد"
                                          }
                                      </strong>

                                      <span
                                          style={{
                                              display:
                                                  "block",
                                              marginTop:
                                                  3,
                                              color:
                                                  "#94a3b8",
                                              fontSize:
                                                  12
                                          }}
                                      >
                                          {
                                              conversationPhone
                                          }
                                      </span>

                                  </div>


                                  <button
                                      type="button"
                                      onClick={() => {

                                          setConversationPhone(
                                              ""
                                          );

                                          setConversationCustomerName(
                                              ""
                                          );

                                          setConversationBranchId(
                                              null
                                          );

                                          setConversationCustomerId(
                                              ""
                                          );

                                          setConversationMessages(
                                              []
                                          );

                                          setConversationDraft(
                                              ""
                                          );

                                      }}
                                      style={{
                                          border:
                                              "1px solid rgba(148,163,184,0.22)",
                                          background:
                                              "rgba(148,163,184,0.08)",
                                          color:
                                              "#e2e8f0",
                                          padding:
                                              "8px 12px",
                                          borderRadius:
                                              9,
                                          cursor:
                                              "pointer",
                                          fontWeight:
                                              700
                                      }}
                                  >
                                      عودة للسجل
                                  </button>

                              </div>


                              <div
                                  style={{
                                      padding:
                                          16,
                                      maxHeight:
                                          420,
                                      overflowY:
                                          "auto",
                                      display:
                                          "flex",
                                      flexDirection:
                                          "column",
                                      gap:
                                          10
                                  }}
                              >

                                  {
                                      conversationLoading
                                          ? (

                                              <div
                                                  style={{
                                                      padding:
                                                          24,
                                                      textAlign:
                                                          "center",
                                                      color:
                                                          "#94a3b8"
                                                  }}
                                              >
                                                  جارٍ تحميل المحادثة...
                                              </div>

                                          )
                                          : conversationMessages.length === 0
                                              ? (

                                                  <div
                                                      style={{
                                                          padding:
                                                              24,
                                                          textAlign:
                                                              "center",
                                                          color:
                                                              "#94a3b8"
                                                      }}
                                                  >
                                                      لا توجد رسائل سابقة.
                                                  </div>

                                              )
                                              : (

                                                  conversationMessages.map(
                                                      message => (

                                                          <div
                                                              key={
                                                                  message.id ||
                                                                  message.unmatched_message_id ||
                                                                  String(
                                                                      message.provider_message_id ||
                                                                      ""
                                                                  ) +
                                                                  String(
                                                                      message.created_at ||
                                                                      ""
                                                                  )
                                                              }
                                                              style={{
                                                                  display:
                                                                      "flex",
                                                                  justifyContent:
                                                                      message.direction ===
                                                                      "OUTBOUND"
                                                                          ? "flex-start"
                                                                          : "flex-end"
                                                              }}
                                                          >

                                                              <div
                                                                  style={{
                                                                      maxWidth:
                                                                          "78%",
                                                                      padding:
                                                                          "10px 12px",
                                                                      borderRadius:
                                                                          12,
                                                                      background:
                                                                          message.direction ===
                                                                          "OUTBOUND"
                                                                              ? "rgba(56,189,248,0.10)"
                                                                              : "rgba(251,191,36,0.10)",
                                                                      border:
                                                                          "1px solid rgba(148,163,184,0.14)"
                                                                  }}
                                                              >

                                                                  <div
                                                                      style={{
                                                                          fontSize:
                                                                              11,
                                                                          color:
                                                                              "#94a3b8",
                                                                          marginBottom:
                                                                              4,
                                                                          fontWeight:
                                                                              700
                                                                      }}
                                                                  >
                                                                      {
                                                                          message.direction ===
                                                                          "OUTBOUND"
                                                                              ? "أنت"
                                                                              : "العميل"
                                                                      }
                                                                  </div>

                                                                  <div
                                                                      style={{
                                                                          color:
                                                                              "#f8fafc",
                                                                          whiteSpace:
                                                                              "pre-wrap",
                                                                          lineHeight:
                                                                              1.55
                                                                      }}
                                                                  >
                                                                      {
                                                                          message.body_text ||
                                                                          "—"
                                                                      }
                                                                  </div>

                                                                  <div
                                                                      style={{
                                                                          marginTop:
                                                                              6,
                                                                          fontSize:
                                                                              10,
                                                                          color:
                                                                              "#64748b"
                                                                      }}
                                                                  >
                                                                      {
                                                                          formatDate(
                                                                              message.created_at
                                                                          )
                                                                      }
                                                                  </div>

                                                              </div>

                                                          </div>

                                                      )
                                                  )

                                              )
                                  }

                              </div>


                              <div
                                  style={{
                                      display:
                                          "flex",
                                      gap:
                                          10,
                                      padding:
                                          14,
                                      borderTop:
                                          "1px solid rgba(148,163,184,0.12)"
                                  }}
                              >

                                  <textarea
                                      value={
                                          conversationDraft
                                      }
                                      onChange={
                                          event =>
                                              setConversationDraft(
                                                  event.target.value
                                              )
                                      }
                                      placeholder="اكتب ردك على العميل..."
                                      rows={
                                          3
                                      }
                                      onKeyDown={
                                          event => {

                                              if (
                                                  event.key ===
                                                      "Enter" &&
                                                  !event.shiftKey
                                              ) {

                                                  event.preventDefault();

                                                  void sendConversationMessage();

                                              }

                                          }
                                      }
                                      style={{
                                          flex:
                                              1,
                                          minHeight:
                                              72,
                                          resize:
                                              "vertical",
                                          padding:
                                              "11px 12px",
                                          borderRadius:
                                              10,
                                          border:
                                              "1px solid rgba(148,163,184,0.22)",
                                          background:
                                              "#0f172a",
                                          color:
                                              "#f8fafc",
                                          fontFamily:
                                              "inherit"
                                      }}
                                  />


                                  <button
                                      type="button"
                                      onClick={() =>
                                          void sendConversationMessage()
                                      }
                                      style={{
                                          alignSelf:
                                              "flex-end",
                                          border:
                                              "none",
                                          background:
                                              "#0ea5e9",
                                          color:
                                              "#ffffff",
                                          padding:
                                              "11px 18px",
                                          borderRadius:
                                              10,
                                          fontWeight:
                                              800,
                                          cursor:
                                              "pointer"
                                      }}
                                  >
                                      إرسال
                                  </button>

                              </div>

                          </div>

                      )
                  }

`;


    const match =
        next.match(
            historyMarkerRegex
        );


    if (!match) {

        throw new Error(
            "History loading render anchor not found."
        );

    }


    next =
        next.replace(
            historyMarkerRegex,
            panel + match[0]
        );


    console.log(
        "CONVERSATION PANEL ADDED"
    );

}


/*
 * ============================================================
 * Save
 * ============================================================
 */

fs.writeFileSync(
    file,
    next,
    "utf8"
);


console.log(
    ""
);

console.log(
    "========================================"
);

console.log(
    "WHATSAPP CONVERSATION PATCH COMPLETE"
);

console.log(
    "========================================"
);

console.log(
    `Backup: ${backup}`
);

