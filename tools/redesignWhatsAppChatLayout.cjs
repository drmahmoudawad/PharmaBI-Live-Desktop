const fs = require("fs");

const file = "src/components/WhatsAppPage.jsx";

let s = fs.readFileSync(file, "utf8");

const conversationOpenRe =
    /<div\s+className="pharmabi-wa-conversation"\s+style=\{\{[\s\S]*?\}\}\s*>/;

if (!conversationOpenRe.test(s)) {
    throw new Error("CONVERSATION OPENING NOT FOUND");
}

s = s.replace(
    conversationOpenRe,
    String.raw`<div
                              className="pharmabi-wa-chat-layout"
                              style={{
                                  direction: "ltr",
                                  width: "100%",
                                  height: "calc(100vh - 175px)",
                                  minHeight: 620,
                                  display: "grid",
                                  gridTemplateColumns: "340px minmax(0, 1fr)",
                                  background: "#020617",
                                  borderRadius: 14,
                                  overflow: "hidden"
                              }}
                          >

                              <style id="wa-chat-layout-style">{`
                                  section.page-card:has(.pharmabi-wa-chat-layout) {
                                      padding: 0 !important;
                                      overflow: hidden !important;
                                  }

                                  section.page-card:has(.pharmabi-wa-chat-layout) > *:not(.pharmabi-wa-chat-layout) {
                                      display: none !important;
                                  }

                                  .pharmabi-wa-chat-list {
                                      direction: rtl;
                                      min-width: 0;
                                      min-height: 0;
                                      display: flex;
                                      flex-direction: column;
                                      background: #0f172a;
                                      border-right: 1px solid rgba(148,163,184,0.14);
                                  }

                                  .pharmabi-wa-chat-pane {
                                      direction: rtl;
                                      min-width: 0;
                                      min-height: 0;
                                      display: flex;
                                      flex-direction: column;
                                      background: #020617;
                                  }

                                  .pharmabi-wa-chat-message-area {
                                      flex: 1 !important;
                                      min-height: 0 !important;
                                      max-height: none !important;
                                      overflow-y: auto !important;
                                  }

                                  @media (max-width: 900px) {
                                      .pharmabi-wa-chat-layout {
                                          grid-template-columns: 280px minmax(0, 1fr) !important;
                                      }
                                  }
                              `}</style>


                              <aside
                                  className="pharmabi-wa-chat-list"
                              >

                                  <div
                                      style={{
                                          flexShrink: 0,
                                          padding: "14px 13px",
                                          borderBottom:
                                              "1px solid rgba(148,163,184,0.12)"
                                      }}
                                  >

                                      <div
                                          style={{
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "space-between",
                                              marginBottom: 10
                                          }}
                                      >

                                          <div>

                                              <div
                                                  style={{
                                                      color: "#f8fafc",
                                                      fontSize: 17,
                                                      fontWeight: 900
                                                  }}
                                              >
                                                  المحادثات
                                              </div>

                                              <div
                                                  style={{
                                                      marginTop: 3,
                                                      color: "#64748b",
                                                      fontSize: 10
                                                  }}
                                              >
                                                  WhatsApp CRM
                                              </div>

                                          </div>

                                          <div
                                              style={{
                                                  width: 34,
                                                  height: 34,
                                                  borderRadius: "50%",
                                                  display: "grid",
                                                  placeItems: "center",
                                                  background:
                                                      "rgba(37,211,102,0.12)",
                                                  color: "#4ade80",
                                                  fontWeight: 900
                                              }}
                                          >
                                              W
                                          </div>

                                      </div>


                                      <input
                                          value={
                                              historyPhone
                                          }
                                          onChange={
                                              event =>
                                                  setHistoryPhone(
                                                      event.target.value
                                                  )
                                          }
                                          placeholder="بحث بالهاتف..."
                                          style={{
                                              width: "100%",
                                              boxSizing: "border-box",
                                              padding:
                                                  "10px 11px",
                                              borderRadius: 10,
                                              border:
                                                  "1px solid rgba(148,163,184,0.16)",
                                              background:
                                                  "#020617",
                                              color:
                                                  "#f8fafc",
                                              outline: "none",
                                              fontFamily:
                                                  "inherit"
                                          }}
                                      />

                                  </div>


                                  <div
                                      style={{
                                          flex: 1,
                                          minHeight: 0,
                                          overflowY: "auto"
                                      }}
                                  >

                                      {
                                          (() => {

                                              const grouped =
                                                  new Map();

                                              for (
                                                  const row of
                                                      Array.isArray(history)
                                                          ? history
                                                          : []
                                              ) {

                                                  const phone =
                                                      row.recipient_phone ||
                                                      row.phone ||
                                                      (
                                                          /^01(0|1|2|5)\d{8}$/.test(
                                                              String(
                                                                  row.customer_id ||
                                                                  ""
                                                              )
                                                          )
                                                              ? "20" +
                                                                String(
                                                                    row.customer_id
                                                                ).slice(1)
                                                              : ""
                                                      );

                                                  if (!phone) {
                                                      continue;
                                                  }

                                                  const key =
                                                      String(phone);

                                                  const current =
                                                      grouped.get(
                                                          key
                                                      );

                                                  if (
                                                      !current ||
                                                      new Date(
                                                          row.created_at ||
                                                          row.sent_at ||
                                                          row.queued_at ||
                                                          0
                                                      ).getTime() >=
                                                          new Date(
                                                              current.created_at ||
                                                              current.sent_at ||
                                                              current.queued_at ||
                                                              0
                                                          ).getTime()
                                                  ) {

                                                      grouped.set(
                                                          key,
                                                          row
                                                      );

                                                  }

                                              }

                                              const contacts =
                                                  Array.from(
                                                      grouped.values()
                                                  ).sort(
                                                      (a, b) =>
                                                          new Date(
                                                              b.created_at ||
                                                              b.sent_at ||
                                                              b.queued_at ||
                                                              0
                                                          ).getTime() -
                                                          new Date(
                                                              a.created_at ||
                                                              a.sent_at ||
                                                              a.queued_at ||
                                                              0
                                                          ).getTime()
                                                  );

                                              if (
                                                  contacts.length === 0
                                              ) {

                                                  return (
                                                      <div
                                                          style={{
                                                              padding: 30,
                                                              textAlign:
                                                                  "center",
                                                              color:
                                                                  "#64748b"
                                                          }}
                                                      >
                                                          لا توجد محادثات
                                                      </div>
                                                  );

                                              }

                                              return contacts.map(
                                                  row => {

                                                      const phone =
                                                          row.recipient_phone ||
                                                          row.phone ||
                                                          (
                                                              /^01(0|1|2|5)\d{8}$/.test(
                                                                  String(
                                                                      row.customer_id ||
                                                                      ""
                                                                  )
                                                              )
                                                                  ? "20" +
                                                                    String(
                                                                        row.customer_id
                                                                    ).slice(1)
                                                                  : "—"
                                                          );

                                                      const customerName =
                                                          (
                                                              row.is_unmatched ||
                                                              !row.customer_name ||
                                                              /^\d+$/.test(
                                                                  String(
                                                                      row.customer_name
                                                                  )
                                                              )
                                                          )
                                                              ? "عميل جديد"
                                                              : row.customer_name;

                                                      const active =
                                                          String(
                                                              conversationPhone ||
                                                              ""
                                                          ) ===
                                                          String(
                                                              phone ||
                                                              ""
                                                          );

                                                      return (
                                                          <button
                                                              key={
                                                                  String(
                                                                      phone
                                                                  )
                                                              }
                                                              type="button"
                                                              onClick={() =>
                                                                  void openConversation(
                                                                      row
                                                                  )
                                                              }
                                                              style={{
                                                                  width:
                                                                      "100%",
                                                                  border:
                                                                      "none",
                                                                  borderBottom:
                                                                      "1px solid rgba(148,163,184,0.08)",
                                                                  background:
                                                                      active
                                                                          ? "rgba(14,165,233,0.16)"
                                                                          : "transparent",
                                                                  color:
                                                                      "#f8fafc",
                                                                  textAlign:
                                                                      "right",
                                                                  padding:
                                                                      "11px 13px",
                                                                  cursor:
                                                                      "pointer",
                                                                  fontFamily:
                                                                      "inherit"
                                                              }}
                                                          >

                                                              <div
                                                                  style={{
                                                                      display:
                                                                          "flex",
                                                                      alignItems:
                                                                          "center",
                                                                      gap: 10
                                                                  }}
                                                              >

                                                                  <div
                                                                      style={{
                                                                          width:
                                                                              40,
                                                                          height:
                                                                              40,
                                                                          flexShrink:
                                                                              0,
                                                                          borderRadius:
                                                                              "50%",
                                                                          display:
                                                                              "grid",
                                                                          placeItems:
                                                                              "center",
                                                                          background:
                                                                              active
                                                                                  ? "rgba(14,165,233,0.24)"
                                                                                  : "rgba(148,163,184,0.10)",
                                                                          color:
                                                                              active
                                                                                  ? "#7dd3fc"
                                                                                  : "#cbd5e1",
                                                                          fontWeight:
                                                                              900
                                                                      }}
                                                                  >
                                                                      {
                                                                          String(
                                                                              customerName ||
                                                                              "ع"
                                                                          ).slice(
                                                                              0,
                                                                              1
                                                                          )
                                                                      }
                                                                  </div>


                                                                  <div
                                                                      style={{
                                                                          minWidth:
                                                                              0,
                                                                          flex:
                                                                              1
                                                                      }}
                                                                  >

                                                                      <div
                                                                          style={{
                                                                              display:
                                                                                  "flex",
                                                                              alignItems:
                                                                                  "center",
                                                                              justifyContent:
                                                                                  "space-between",
                                                                              gap: 8
                                                                          }}
                                                                      >

                                                                          <strong
                                                                              style={{
                                                                                  minWidth:
                                                                                      0,
                                                                                  overflow:
                                                                                      "hidden",
                                                                                  textOverflow:
                                                                                      "ellipsis",
                                                                                  whiteSpace:
                                                                                      "nowrap",
                                                                                  fontSize:
                                                                                      12
                                                                              }}
                                                                          >
                                                                              {
                                                                                  customerName
                                                                              }
                                                                          </strong>

                                                                          <span
                                                                              style={{
                                                                                  flexShrink:
                                                                                      0,
                                                                                  color:
                                                                                      "#64748b",
                                                                                  fontSize:
                                                                                      9
                                                                              }}
                                                                          >
                                                                              {
                                                                                  formatDate(
                                                                                      row.created_at ||
                                                                                      row.sent_at ||
                                                                                      row.queued_at
                                                                                  )
                                                                              }
                                                                          </span>

                                                                      </div>


                                                                      <div
                                                                          style={{
                                                                              marginTop:
                                                                                  4,
                                                                              color:
                                                                                  "#64748b",
                                                                              fontSize:
                                                                                  9,
                                                                              direction:
                                                                                  "ltr",
                                                                              textAlign:
                                                                                  "right",
                                                                              overflow:
                                                                                  "hidden",
                                                                              textOverflow:
                                                                                  "ellipsis",
                                                                              whiteSpace:
                                                                                  "nowrap"
                                                                          }}
                                                                      >
                                                                          {
                                                                              phone
                                                                          }
                                                                      </div>


                                                                      <div
                                                                          style={{
                                                                              marginTop:
                                                                                  4,
                                                                              color:
                                                                                  "#94a3b8",
                                                                              fontSize:
                                                                                  10,
                                                                              overflow:
                                                                                  "hidden",
                                                                              textOverflow:
                                                                                  "ellipsis",
                                                                              whiteSpace:
                                                                                  "nowrap"
                                                                          }}
                                                                      >
                                                                          {
                                                                              row.body_text ||
                                                                              "—"
                                                                          }
                                                                      </div>

                                                                  </div>

                                                              </div>

                                                          </button>
                                                      );

                                                  }
                                              );

                                          })()
                                      }

                                  </div>

                              </aside>


                              <div
                                  className="pharmabi-wa-chat-pane"
                              >

                                  <div
                                      className="pharmabi-wa-conversation"
                                      style={{
                                          width: "100%",
                                          height: "100%",
                                          minHeight: 0,
                                          flex: 1,
                                          display: "flex",
                                          flexDirection: "column",
                                          overflow: "hidden"
                                      }}
                                  >`
);

s = s.replace(
    /<style id="wa-conversation-compact-style">[\s\S]*?<\/style>\s*/,
    ""
);

s = s.replace(
    /maxHeight:\s*420,\s*overflowY:\s*"auto"/,
    'maxHeight: "none",\n                                      flex: 1,\n                                      minHeight: 0,\n                                      overflowY: "auto"'
);

const closeRe =
    /(\n\s*<\/div>\s*\n\s*\)\s*\n\s*\}\s*\n\s*\{\s*historyLoading)/;

if (!closeRe.test(s)) {
    throw new Error("CONVERSATION CLOSING POINT NOT FOUND");
}

s = s.replace(
    closeRe,
    `\n                              </div>\n\n                          </div>\n\n                      )\n                  }\n\n{\n                    historyLoading`
);

fs.writeFileSync(file, s, "utf8");

console.log(
    "WHATSAPP CHAT LAYOUT APPLIED: SIDEBAR + FULL CONVERSATION"
);
