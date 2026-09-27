const fs = require("fs");

const file =
    "src/components/CustomerAnalyticsModulePanel.jsx";

let content =
    fs.readFileSync(file, "utf8");

const eol =
    content.includes("\r\n")
        ? "\r\n"
        : "\n";

content =
    content.replace(/\r\n/g, "\n");

const helperMarker =
    "export default function CustomerAnalyticsModulePanel";

if (!content.includes(helperMarker)) {
    throw new Error(
        "CUSTOMER ANALYTICS COMPONENT MARKER NOT FOUND"
    );
}

if (!content.includes("function getCustomerInterventionPriority")) {

    const helper = `
function getCustomerInterventionPriority(customer) {

    const rfm =
        customer?.rfm ||
        customer?.currentRfm ||
        customer?.rfmData ||
        {};

    const readNumber = (...values) => {

        for (const value of values) {

            const number =
                Number(value);

            if (
                Number.isFinite(number)
            ) {
                return number;
            }

        }

        return 0;
    };

    let r =
        readNumber(
            customer?.r,
            customer?.R,
            customer?.rScore,
            customer?.r_score,
            customer?.recencyScore,
            rfm?.r,
            rfm?.R,
            rfm?.rScore,
            rfm?.r_score
        );

    let f =
        readNumber(
            customer?.f,
            customer?.F,
            customer?.fScore,
            customer?.f_score,
            customer?.frequencyScore,
            rfm?.f,
            rfm?.F,
            rfm?.fScore,
            rfm?.f_score
        );

    let m =
        readNumber(
            customer?.m,
            customer?.M,
            customer?.mScore,
            customer?.m_score,
            customer?.monetaryScore,
            rfm?.m,
            rfm?.M,
            rfm?.mScore,
            rfm?.m_score
        );

    const rfmScore =
        String(
            customer?.rfmScore ||
            customer?.rfm_score ||
            rfm?.rfmScore ||
            rfm?.rfm_score ||
            ""
        ).replace(
            /[^1-5]/g,
            ""
        );

    if (
        (!r || !f || !m) &&
        rfmScore.length >= 3
    ) {

        r =
            r ||
            Number(
                rfmScore.charAt(0)
            );

        f =
            f ||
            Number(
                rfmScore.charAt(1)
            );

        m =
            m ||
            Number(
                rfmScore.charAt(2)
            );

    }

    const recencyDays =
        readNumber(
            customer?.recencyDays,
            customer?.recency_days,
            customer?.daysSinceLastPurchase,
            customer?.days_since_last_purchase,
            rfm?.recencyDays,
            rfm?.recency_days
        );

    if (!r && recencyDays > 0) {

        if (recencyDays > 90) {
            r = 1;
        } else if (recencyDays > 60) {
            r = 2;
        } else if (recencyDays > 30) {
            r = 3;
        } else if (recencyDays > 14) {
            r = 4;
        } else {
            r = 5;
        }

    }

    r =
        Math.min(
            5,
            Math.max(
                1,
                r || 1
            )
        );

    f =
        Math.min(
            5,
            Math.max(
                1,
                f || 1
            )
        );

    m =
        Math.min(
            5,
            Math.max(
                1,
                m || 1
            )
        );

    const text =
        String(
            customer?.segmentCode ||
            customer?.segment_code ||
            customer?.segment ||
            customer?.lifecycleStage ||
            customer?.lifecycle_stage ||
            customer?.recommendedAction ||
            customer?.recommended_action ||
            ""
        ).toLowerCase();

    let priority =
        (6 - r) *
        (
            1 +
            (m * 0.55) +
            (f * 0.45)
        );

    if (
        text.includes("at_risk") ||
        text.includes("at-risk") ||
        text.includes("churn") ||
        text.includes("lost") ||
        text.includes("dormant") ||
        text.includes("reactivation") ||
        text.includes("win_back")
    ) {
        priority += 10;
    }

    if (
        text.includes("retention_vip") ||
        text.includes("retention")
    ) {
        priority += 3;
    }

    return {
        score: priority,
        r,
        f,
        m,
        monetary:
            readNumber(
                customer?.monetary,
                customer?.mon,
                customer?.totalSales,
                customer?.total_sales,
                customer?.total_net_sales,
                customer?.netSales,
                customer?.net_sales
            ),
        frequency:
            readNumber(
                customer?.frequency,
                customer?.freq,
                customer?.ticketCount,
                customer?.ticket_count,
                customer?.totalTickets,
                customer?.total_tickets
            ),
        recencyScore: r
    };
}

`;

    content =
        content.replace(
            helperMarker,
            helper + helperMarker
        );
}

const stateNeedle = `
    const [
        customerProfile,
        setCustomerProfile
    ] =
        useState(
            null
        );

`;

if (!content.includes(stateNeedle)) {
    throw new Error(
        "CUSTOMER PROFILE STATE BLOCK NOT FOUND"
    );
}

const stateReplacement = `
    const [
        customerProfile,
        setCustomerProfile
    ] =
        useState(
            null
        );

    const customerSortMode =
        "intervention";

`;

content =
    content.replace(
        stateNeedle,
        stateReplacement
    );

const sortNeedle = `
                return rows;

            },
            [
                data,
                selectedSegment,
                search
            ]
`;

if (!content.includes(sortNeedle)) {
    throw new Error(
        "RFM CUSTOMERS RETURN BLOCK NOT FOUND"
    );
}

const sortReplacement = `
                rows =
                    [
                        ...rows
                    ].sort(
                        (
                            left,
                            right
                        ) => {

                            if (
                                customerSortMode ===
                                "intervention"
                            ) {

                                const a =
                                    getCustomerInterventionPriority(
                                        left
                                    );

                                const b =
                                    getCustomerInterventionPriority(
                                        right
                                    );

                                if (
                                    b.score !==
                                    a.score
                                ) {
                                    return (
                                        b.score -
                                        a.score
                                    );
                                }

                                if (
                                    b.monetary !==
                                    a.monetary
                                ) {
                                    return (
                                        b.monetary -
                                        a.monetary
                                    );
                                }

                                if (
                                    b.frequency !==
                                    a.frequency
                                ) {
                                    return (
                                        b.frequency -
                                        a.frequency
                                    );
                                }

                                return (
                                    b.recencyScore -
                                    a.recencyScore
                                );

                            }

                            return 0;

                        }
                    );

                return rows;

            },
            [
                data,
                selectedSegment,
                search,
                customerSortMode
            ]
`;

content =
    content.replace(
        sortNeedle,
        sortReplacement
    );

fs.writeFileSync(
    file,
    content.replace(/\n/g, eol),
    "utf8"
);

console.log(
    "INTERVENTION PRIORITY SORT INSTALLED"
);

