const fs = require("fs");

const path = "./src/components/WhatsAppPage.jsx";

let source = fs.readFileSync(path, "utf8");

function count(regex) {
    return (source.match(regex) || []).length;
}

function requireCount(regex, expected, label) {
    const actual = count(regex);

    if (actual !== expected) {
        throw new Error(
            `${label}: expected ${expected}, found ${actual}`
        );
    }
}

const backup =
    `${path}.backup-before-final-whatsapp-inbox-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}`;

/*
 * ============================================================
 * 1) UNREAD STATE
 * ============================================================
 */

if (!source.includes("conversationUnreadMap")) {

    const stateRegex =
        /const\s*\[\s*conversationReadMap\s*,\s*setConversationReadMap\s*\]\s*=\s*useState\(\{\}\);/;

    requireCount(
        stateRegex,
        1,
        "conversationReadMap state"
    );

    source = source.replace(
        stateRegex,
        `$&
        
    const [
        conversationUnreadMap,
        setConversationUnreadMap
    ] = useState({});`
    );
}

/*
 * ============================================================
 * 2) READ / UNREAD HELPERS
 * ============================================================
 */

if (!source.includes("function markConversationUnread")) {

    const openRegex =
        /\s*async function openConversation\s*\(\s*row\s*\)\s*\{/;

    requireCount(
        openRegex,
        1,
        "openConversation"
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
                      // Optional local persistence.
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
        `${helpers}$&`
    );
}

/*
 * ============================================================
 * 3) LOADING READ STATE FROM LOCAL STORAGE
 *    AND MARKING OPEN CONVERSATION AS READ
 * ============================================================
 */

const setPhoneRegex =
    /setConversationPhone\(\s*selectedPhone\s*\);/;

requireCount(
    setPhoneRegex,
    1,
    "setConversationPhone(selectedPhone)"
);

if (!source.includes("markConversationRead(selectedPhone)")) {

    source = source.replace(
        setPhoneRegex,
        `$&

          markConversationRead(
              selectedPhone
          );`,
        1
    );
}

/*
 * ============================================================
 * 4) REPLACE INBOUND EFFECT
 * ============================================================
 */

const inboundRegex =
    /\/\*\s*pharmabi-wa-inbound-refresh-v2\s*\*\/[\s\S]*?(?=\s*async function sendConversationMessage\s*\(\s*\)\s*\{)/;

requireCount(
    inboundRegex,
    1,
    "existing inbound effect"
);

const inboundEffect = `

    /*
     * ========================================================
     * FINAL WHATSAPP INBOX BEHAVIOR
     * ========================================================
     *
     * Incoming message:
     *
     * - updates the sidebar immediately
     * - moves that conversation to the top
     * - marks other conversations unread
     * - NEVER changes the currently open conversation
     * - refreshes the open chat only when the message belongs
     *   to that same customer
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
                     * Sidebar update happens immediately.
                     */

                    setHistory(
                        current => {

                            const rows =
                                Array.isArray(
                                    current
                                )
                                    ? current
                                    : [];


                            const existingIndex =
                                rows.findIndex(
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
                                    rows[
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
                                    ...rows.filter(
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
                                ...rows
                            ];

                        }
                    );


                    const currentPhone =
                        String(
                            conversationPhone ||
                            ""
                        ).trim();


                    /*
                     * Another customer sent the message:
                     * keep current chat exactly as it is.
                     */

                    if (
                        !currentPhone ||
                        incomingPhone !==
                            currentPhone
                    ) {

                        markConversationUnread(
                            incomingPhone
                        );

                        /*
                         * Refresh full sidebar data as a
                         * background consistency check.
                         */
                        void loadHistory();

                        return;

                    }


                    /*
                     * Same customer as the currently open chat.
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


                                        if (element) {

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
            conversationPhone
        ]
    );

`;

source = source.replace(
    inboundRegex,
    inboundEffect
);

/*
 * ============================================================
 * 5) SIDEBAR: READ / UNREAD STATE
 * ============================================================
 */

const sidebarStart =
    source.indexOf(
        "return contacts.map("
    );

if (sidebarStart < 0) {
    throw new Error(
        "SIDEBAR contacts.map NOT FOUND"
    );
}

if (!source.includes("const unread =")) {

    const activeIndex =
        source.indexOf(
            "const active =",
            sidebarStart
        );

    if (activeIndex < 0) {
        throw new Error(
            "SIDEBAR active declaration NOT FOUND"
        );
    }

    const returnIndex =
        source.indexOf(
            "return (",
            activeIndex
        );

    if (returnIndex < 0) {
        throw new Error(
            "SIDEBAR return NOT FOUND"
        );
    }

    const unreadDeclaration = `

                                                    const unread =
                                                        Boolean(
                                                            conversationUnreadMap?.[
                                                                String(
                                                                    phone ||
                                                                    ""
                                                                ).trim()
                                                            ]
                                                        );

`;

    source =
        source.slice(
            0,
            returnIndex
        ) +
        unreadDeclaration +
        source.slice(
            returnIndex
        );
}

/*
 * ============================================================
 * 6) SIDEBAR STATUS UNDER LAST MESSAGE
 * ============================================================
 */

if (!source.includes("pharmabi-wa-sidebar-read-state")) {

    const bodyIndex =
        source.indexOf(
            "row.body_text ||",
            sidebarStart
        );

    if (bodyIndex < 0) {
        throw new Error(
            "SIDEBAR BODY TEXT NOT FOUND"
        );
    }

    const bodyEnd =
        source.indexOf(
            "</div>",
            bodyIndex
        );

    if (bodyEnd < 0) {
        throw new Error(
            "SIDEBAR BODY DIV END NOT FOUND"
        );
    }

    const sidebarStatus = `

                                                                    {/* pharmabi-wa-sidebar-read-state */}

                                                                    {/* pharmabi-wa-sidebar-read-state */}

                                                                    <div
                                                                        style={{
                                                                            marginTop:
                                                                                3,
                                                                            fontSize:
                                                                                8,
                                                                            fontWeight:
                                                                                900,
                                                                            color:
                                                                                unread
                                                                                    ? "#facc15"
                                                                                    : "#22c55e"
                                                                        }}
                                                                    >
                                                                        {
                                                                            unread
                                                                                ? "● غير مقروءة"
                                                                                : "✓ مقروءة"
                                                                        }
                                                                    </div>

`;

    source =
        source.slice(
            0,
            bodyEnd + "</div>".length
        ) +
        sidebarStatus +
        source.slice(
            bodyEnd + "</div>".length
        );
}

/*
 * ============================================================
 * 7) REMOVE / HIDE OLD READ STATUS INSIDE CHAT
 * ============================================================
 */

const chatStatusRegex =
    /\s*\{\s*message\.direction\s*!==\s*"OUTBOUND"\s*&&\s*\(\s*<div[\s\S]*?"✓\s*مقروءة"[\s\S]*?"●\s*غير\s*مقروءة"[\s\S]*?<\/div>\s*\)\s*\}\s*/;

requireCount(
    chatStatusRegex,
    1,
    "old in-chat read/unread status"
);

source = source.replace(
    chatStatusRegex,
    "\n"
);

/*
 * ============================================================
 * 8) VALIDATION
 * ============================================================
 */

const required = [
    "conversationUnreadMap",
    "setConversationUnreadMap",
    "markConversationUnread",
    "markConversationRead",
    "pharmabi-wa-unread-map",
    "● غير مقروءة",
    "✓ مقروءة",
    "pharmabi-wa-conversation-messages",
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
 * Read/unread labels must exist in sidebar only.
 */

const unreadOccurrences =
    (source.match(/● غير مقروءة/g) || []).length;

if (unreadOccurrences !== 1) {
    throw new Error(
        `VALIDATION FAILED: unread label occurrences=${unreadOccurrences}`
    );
}

const readOccurrences =
    (source.match(/✓ مقروءة/g) || []).length;

if (readOccurrences !== 1) {
    throw new Error(
        `VALIDATION FAILED: read label occurrences=${readOccurrences}`
    );
}

/*
 * Only write after every validation passes.
 */

fs.copyFileSync(
    path,
    backup
);

fs.writeFileSync(
    path,
    source,
    "utf8"
);

console.log("");
console.log("==============================================");
console.log("FINAL WHATSAPP INBOX / UNREAD FIX APPLIED");
console.log("==============================================");
console.log(`BACKUP: ${backup}`);



