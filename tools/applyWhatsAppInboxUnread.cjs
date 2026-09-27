const fs = require("fs");

const path = "./src/components/WhatsAppPage.jsx";

let source = fs.readFileSync(path, "utf8");

function assertCount(regex, expected, label) {
    const count = (source.match(regex) || []).length;

    if (count !== expected) {
        throw new Error(
            `${label}: expected ${expected}, found ${count}`
        );
    }
}

const backup =
    `${path}.backup-before-whatsapp-inbox-unread-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}`;

fs.copyFileSync(path, backup);

/*
 * ============================================================
 * 1) Add unread state
 * ============================================================
 */

if (!source.includes("conversationUnreadMap")) {

    const stateRegex =
        /(\bconst\s*\[\s*historyPhone\s*,\s*setHistoryPhone\s*\]\s*=\s*useState\(\s*""\s*\)\s*;)/;

    assertCount(
        stateRegex,
        1,
        "historyPhone state"
    );

    source = source.replace(
        stateRegex,
        `$1

    const [
        conversationUnreadMap,
        setConversationUnreadMap
    ] = useState(() => {

        try {

            const saved =
                window.localStorage.getItem(
                    "pharmabi-wa-unread-map"
                );

            return saved
                ? JSON.parse(saved)
                : {};

        }
        catch {

            return {};

        }

    });`
    );
}

/*
 * ============================================================
 * 2) Add read/unread helpers before openConversation
 * ============================================================
 */

if (!source.includes("function markConversationUnread")) {

    const openRegex =
        /(\s*async function openConversation\s*\(\s*row\s*\)\s*\{)/;

    assertCount(
        openRegex,
        1,
        "openConversation function"
    );

    const helpers = `

      function setConversationUnreadState(
          phone,
          unread
      ) {

          const normalizedPhone =
              String(
                  phone || ""
              ).trim();

          if (!normalizedPhone) {
              return;
          }

          setConversationUnreadMap(
              current => {

                  const next = {
                      ...current
                  };

                  if (unread) {

                      next[
                          normalizedPhone
                      ] = true;

                  }
                  else {

                      delete next[
                          normalizedPhone
                      ];

                  }

                  try {

                      window.localStorage.setItem(
                          "pharmabi-wa-unread-map",
                          JSON.stringify(next)
                      );

                  }
                  catch {
                      // Local read-state persistence is optional.
                  }

                  return next;

              }
          );

      }


      function markConversationUnread(
          phone
      ) {

          setConversationUnreadState(
              phone,
              true
          );

      }


      function markConversationRead(
          phone
      ) {

          setConversationUnreadState(
              phone,
              false
          );

      }

`;

    source = source.replace(
        openRegex,
        `${helpers}$1`
    );
}

/*
 * ============================================================
 * 3) Opening a conversation marks it as read
 * ============================================================
 */

const setPhoneRegex =
    /(setConversationPhone\(\s*selectedPhone\s*\);)/;

assertCount(
    setPhoneRegex,
    1,
    "setConversationPhone(selectedPhone)"
);

if (!source.includes("markConversationRead(selectedPhone);")) {

    source = source.replace(
        setPhoneRegex,
        `$1

          markConversationRead(
              selectedPhone
          );`
    );
}

/*
 * ============================================================
 * 4) Replace the current inbound effect completely
 * ============================================================
 */

const currentInboundEffectRegex =
    /\s*\/\*\s*pharmabi-wa-inbound-refresh-v2\s*\*\/[\s\S]*?(?=\s*async function sendConversationMessage\s*\(\s*\)\s*\{)/;

assertCount(
    currentInboundEffectRegex,
    1,
    "current inbound effect"
);

const newInboundEffect = `

    /*
     * ========================================================
     * INBOUND WHATSAPP -> INBOX + OPEN CONVERSATION
     * ========================================================
     *
     * Rules:
     *
     * 1) Never change conversationPhone automatically.
     * 2) Every incoming message updates the sidebar immediately.
     * 3) A message for another customer becomes unread.
     * 4) A message for the currently open customer only refreshes
     *    that conversation.
     * 5) The current conversation stays open.
     */

    useEffect(
        () => {

            const messageHandler =
                (
                    first,
                    second
                ) => {

                    const payload =
                        getEventPayload(
                            first,
                            second
                        );

                    if (
                        !payload ||
                        typeof payload !== "object"
                    ) {
                        return;
                    }


                    const incomingPhone =
                        String(
                            payload.phone ||
                            payload.recipient_phone ||
                            payload.from ||
                            ""
                        ).trim();


                    if (!incomingPhone) {
                        return;
                    }


                    const incomingRow = {

                        phone:
                            incomingPhone,

                        recipient_phone:
                            incomingPhone,

                        body_text:
                            payload.body_text ||
                            payload.body ||
                            "—",

                        created_at:
                            payload.created_at ||
                            payload.timestamp ||
                            new Date().toISOString(),

                        sent_at:
                            payload.sent_at ||
                            null,

                        queued_at:
                            payload.queued_at ||
                            null,

                        customer_name:
                            payload.customerName ||
                            payload.customer_name ||
                            "",

                        customer_id:
                            payload.customerId ||
                            null,

                        branch_id:
                            payload.branchId ||
                            null,

                        direction:
                            "INBOUND",

                        status:
                            payload.status ||
                            "received",

                        provider_message_id:
                            payload.providerMessageId ||
                            "",

                        is_unmatched:
                            Boolean(
                                payload.unmatchedMessageId
                            )

                    };


                    /*
                     * Update the sidebar optimistically first.
                     * This makes the new message appear immediately.
                     */

                    setHistory(
                        current => {

                            const existingRows =
                                Array.isArray(
                                    current
                                )
                                    ? current
                                    : [];


                            const existingIndex =
                                existingRows.findIndex(
                                    row =>
                                        String(
                                            row?.recipient_phone ||
                                            row?.phone ||
                                            ""
                                        ).trim() ===
                                        incomingPhone
                                );


                            if (
                                existingIndex >= 0
                            ) {

                                const existing =
                                    existingRows[
                                        existingIndex
                                    ];


                                const merged = {

                                    ...existing,

                                    ...incomingRow,

                                    customer_name:
                                        incomingRow.customer_name ||
                                        existing.customer_name ||
                                        "",

                                    customer_id:
                                        incomingRow.customer_id ||
                                        existing.customer_id ||
                                        null,

                                    branch_id:
                                        incomingRow.branch_id ||
                                        existing.branch_id ||
                                        null

                                };


                                return [

                                    merged,

                                    ...existingRows.filter(
                                        (
                                            _row,
                                            index
                                        ) =>
                                            index !==
                                            existingIndex
                                    )

                                ];

                            }


                            return [
                                incomingRow,
                                ...existingRows
                            ];

                        }
                    );


                    const currentPhone =
                        String(
                            conversationPhone ||
                            ""
                        ).trim();


                    /*
                     * Message belongs to another customer:
                     * keep current chat open and mark only the
                     * sidebar conversation unread.
                     */

                    if (
                        !currentPhone ||
                        incomingPhone !==
                            currentPhone
                    ) {

                        markConversationUnread(
                            incomingPhone
                        );


                        void loadHistory();


                        return;

                    }


                    /*
                     * Message belongs to the currently open
                     * customer: keep the same customer and
                     * refresh only its messages.
                     */

                    markConversationRead(
                        incomingPhone
                    );


                    void (
                        async () => {

                            try {

                                const result =
                                    await window
                                        .pharmaBI
                                        ?.whatsapp
                                        ?.history?.({
                                            phone:
                                                currentPhone,

                                            limit:
                                                200

                                        });


                                const rows =
                                    Array.isArray(
                                        result?.history
                                    )
                                        ? result.history

                                        : Array.isArray(
                                            result
                                        )
                                            ? result

                                            : [];


                                setConversationMessages(
                                    [...rows].reverse()
                                );


                                window.requestAnimationFrame(
                                    () => {

                                        const element =
                                            document.getElementById(
                                                "pharmabi-wa-conversation-messages"
                                            );


                                        if (
                                            element
                                        ) {

                                            element.scrollTop =
                                                element.scrollHeight;

                                        }

                                    }
                                );

                            }
                            catch (
                                error
                            ) {

                                console.error(
                                    "[WhatsApp] Open conversation refresh error:",
                                    error
                                );

                            }

                        }
                    )();

                };


            try {

                window
                    .pharmaBI
                    ?.whatsapp
                    ?.onMessage?.(
                        messageHandler
                    );

            }
            catch (
                error
            ) {

                console.warn(
                    "[WhatsApp] Inbound listener setup failed:",
                    error
                );

            }


            return () => {

                try {

                    window
                        .pharmaBI
                        ?.whatsapp
                        ?.offMessage?.(
                            messageHandler
                        );

                }
                catch {
                    // Optional cleanup.
                }

            };

        },
        [
            conversationPhone,
            loadHistory
        ]
    );

`;

source = source.replace(
    currentInboundEffectRegex,
    newInboundEffect
);

/*
 * ============================================================
 * 5) Add unread state to sidebar rows
 * ============================================================
 */

if (!source.includes("const unread =")) {

    const activeRegex =
        /(const\s+active\s*=\s*String\(\s*conversationPhone\s*\|\|\s*""\s*\)\s*===\s*String\(\s*phone\s*\|\|\s*""\s*\)\s*;)/;

    assertCount(
        activeRegex,
        1,
        "sidebar active expression"
    );

    source = source.replace(
        activeRegex,
        `$1

                                                    const unread =
                                                        Boolean(
                                                            conversationUnreadMap?.[
                                                                String(
                                                                    phone ||
                                                                    ""
                                                                ).trim()
                                                            ]
                                                        );`
    );
}

/*
 * ============================================================
 * 6) Show unread indicator beside customer name
 * ============================================================
 */

if (!source.includes("● غير مقروءة")) {

    const nameEndRegex =
        /(\s*<\/strong>)\s*(<span\s+style=\{\{\s*color:\s*"#64748b",\s*fontSize:\s*9,)/;

    assertCount(
        nameEndRegex,
        1,
        "sidebar customer name/date row"
    );

    const unreadBadge = `

                                                                        {
                                                                            unread &&
                                                                            (
                                                                                <span
                                                                                    style={{
                                                                                        color:
                                                                                            "#facc15",
                                                                                        fontSize:
                                                                                            8,
                                                                                        fontWeight:
                                                                                            900,
                                                                                        flexShrink:
                                                                                            0
                                                                                    }}
                                                                                >
                                                                                    ● غير مقروءة
                                                                                </span>
                                                                            )
                                                                        }

`;

    source = source.replace(
        nameEndRegex,
        `$1${unreadBadge}$2`
    );
}

/*
 * ============================================================
 * 7) Final validation
 * ============================================================
 */

const required = [
    "conversationUnreadMap",
    "setConversationUnreadMap",
    "markConversationUnread",
    "markConversationRead",
    "pharmabi-wa-unread-map",
    "● غير مقروءة",
    "setHistory",
    "conversationPhone",
    "loadHistory",
    "onMessage"
];

for (const item of required) {

    if (!source.includes(item)) {

        throw new Error(
            `VALIDATION FAILED: ${item}`
        );

    }

}

/*
 * Ensure only one inbound listener marker exists.
 */

const inboundCount =
    (
        source.match(
            /INBOUND WHATSAPP -> INBOX \+ OPEN CONVERSATION/g
        ) || []
    ).length;

if (inboundCount !== 1) {
    throw new Error(
        `VALIDATION FAILED: inbound effect count=${inboundCount}`
    );
}

fs.writeFileSync(
    path,
    source,
    "utf8"
);

console.log("");
console.log("==============================================");
console.log("WHATSAPP INBOX + UNREAD FIX APPLIED");
console.log("==============================================");
console.log(`BACKUP: ${backup}`);
