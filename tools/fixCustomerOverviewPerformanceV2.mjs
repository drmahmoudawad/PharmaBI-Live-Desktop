import fs from "node:fs";

const root =
    "D:/PharmaBI-Live-Desktop";

const analyticsService =
    `${root}/electron/pharmfly/analytics/analyticsService.js`;

const customerUi =
    `${root}/src/components/CustomerAnalyticsModulePanel.jsx`;

const analyticsBackup =
    `${analyticsService}.backup-before-customer-overview-light-v2-20260925`;

const uiBackup =
    `${customerUi}.backup-before-customer-overview-light-v2-20260925`;

for (const [file, backup] of [
    [analyticsService, analyticsBackup],
    [customerUi, uiBackup]
]) {

    if (!fs.existsSync(file)) {

        throw new Error(
            `Missing file: ${file}`
        );

    }

    if (!fs.existsSync(backup)) {

        fs.copyFileSync(
            file,
            backup
        );

    }

}


/*
 * =========================================================
 * ANALYTICS SERVICE
 * =========================================================
 */

let service =
    fs.readFileSync(
        analyticsService,
        "utf8"
    );

const localDbImport =
    "import { getLocalSalesDatabase } from '../../localdb/localSalesDb.js';";

if (
    !service.includes(
        localDbImport
    )
) {

    const importAnchor =
        "import { getGroupSalesOverview } from '../group/groupAnalyticsService.js';";

    if (
        !service.includes(
            importAnchor
        )
    ) {

        throw new Error(
            "analyticsService import anchor not found."
        );

    }

    service =
        service.replace(
            importAnchor,
            `${importAnchor}
${localDbImport}`
        );

}


/*
 * Lightweight overview function.
 */

if (
    !service.includes(
        "function getLightweightCustomerOverview("
    )
) {

    const functionAnchor =
        "async function moduleCustomers(ctx, moduleId) {";

    if (
        !service.includes(
            functionAnchor
        )
    ) {

        throw new Error(
            "moduleCustomers anchor not found."
        );

    }

    const helper = `function getLightweightCustomerOverview(
    {
        branchId,
        fromDate,
        toDate
    }
) {

    const database =
        getLocalSalesDatabase();

    const branchIsAll =
        String(
            branchId
        ).trim().toLowerCase() === "all";

    const dateEnd =
        new Date(
            String(
                toDate
            ) +
            "T00:00:00.000Z"
        );

    if (
        Number.isNaN(
            dateEnd.getTime()
        )
    ) {

        throw new Error(
            "Invalid customer overview toDate."
        );

    }

    dateEnd.setUTCDate(
        dateEnd.getUTCDate() + 1
    );

    const toDateExclusive =
        dateEnd
            .toISOString()
            .slice(
                0,
                10
            );

    const branchWhere =
        branchIsAll
            ? ""
            : "AND s.branch_id = @branchId";

    const params = {

        fromDate:
            String(
                fromDate
            ),

        toDateExclusive,

        limit:
            100

    };

    if (
        !branchIsAll
    ) {

        params.branchId =
            Number(
                branchId
            );

    }

    const rows =
        database
            .prepare(
                \`
                WITH customer_totals AS (

                    SELECT

                        s.branch_id,

                        s.customer_code,

                        COALESCE(

                            NULLIF(
                                MAX(
                                    TRIM(
                                        s.customer_name
                                    )
                                ),
                                ''
                            ),

                            MAX(
                                TRIM(
                                    bc.customer_name
                                )
                            ),

                            s.customer_code,

                            'ط؛ظٹط± ظ…ط¹ط±ظˆظپ'

                        ) AS customer_name,

                        COALESCE(
                            MAX(
                                TRIM(
                                    bc.phone_numbers
                                )
                            ),
                            ''
                        ) AS phone,

                        COUNT(
                            DISTINCT
                            s.invoice_no
                        ) AS tickets,

                        COALESCE(
                            SUM(
                                s.net_amount
                            ),
                            0
                        ) AS netSales,

                        MAX(
                            s.invoice_date
                        ) AS lastPurchase

                    FROM branch_sales s

                    LEFT JOIN branch_customers bc

                        ON bc.branch_id =
                           s.branch_id

                       AND bc.customer_code =
                           s.customer_code

                    WHERE

                        s.invoice_date >=
                            @fromDate

                        AND

                        s.invoice_date <
                            @toDateExclusive

                        \${branchWhere}

                        AND

                        s.customer_code IS NOT NULL

                        AND

                        TRIM(
                            s.customer_code
                        ) <> ''

                    GROUP BY

                        s.branch_id,

                        s.customer_code

                ),

                ranked AS (

                    SELECT

                        customer_totals.*,

                        COUNT(*) OVER()
                            AS totalCustomers,

                        COALESCE(
                            SUM(
                                netSales
                            ) OVER(),
                            0
                        ) AS totalSales,

                        COALESCE(
                            AVG(
                                netSales
                            ) OVER(),
                            0
                        ) AS averageMonetary

                    FROM customer_totals

                )

                SELECT

                    branch_id,

                    customer_code,

                    customer_name,

                    phone,

                    tickets,

                    netSales,

                    lastPurchase,

                    totalCustomers,

                    totalSales,

                    averageMonetary

                FROM ranked

                ORDER BY
                    netSales DESC

                LIMIT
                    @limit
                \`
            )
            .all(
                params
            );

    const first =
        rows[0] || {};

    const customers =
        rows.map(
            row => ({

                customerId:
                    branchIsAll
                        ? \`\${row.branch_id}:\${row.customer_code}\`
                        : String(
                            row.customer_code
                        ),

                customerCode:
                    String(
                        row.customer_code
                    ),

                customerName:
                    row.customer_name ||
                    row.customer_code ||
                    "ط؛ظٹط± ظ…ط¹ط±ظˆظپ",

                phone:
                    row.phone || "",

                tickets:
                    Number(
                        row.tickets
                    ) || 0,

                invoices:
                    Number(
                        row.tickets
                    ) || 0,

                netSales:
                    Number(
                        row.netSales
                    ) || 0,

                monetary:
                    Number(
                        row.netSales
                    ) || 0,

                total_sales:
                    Number(
                        row.netSales
                    ) || 0,

                averageInvoice:
                    Number(
                        row.tickets
                    ) > 0
                        ? Number(
                            row.netSales
                        ) /
                          Number(
                            row.tickets
                        )
                        : 0,

                lastPurchase:
                    row.lastPurchase ||
                    null,

                branchId:
                    Number(
                        row.branch_id
                    ) || null

            })
        );

    return {

        success:
            true,

        branchId:
            branchIsAll
                ? "all"
                : Number(
                    branchId
                ),

        fromDate:
            String(
                fromDate
            ),

        toDate:
            String(
                toDate
            ),

        summary: {

            customers:
                Number(
                    first.totalCustomers
                ) || 0,

            totalCustomers:
                Number(
                    first.totalCustomers
                ) || 0,

            totalSales:
                Number(
                    first.totalSales
                ) || 0,

            netSales:
                Number(
                    first.totalSales
                ) || 0,

            averageMonetary:
                Number(
                    first.averageMonetary
                ) || 0,

            segments:
                []

        },

        customers

    };

}


`;

    service =
        service.replace(
            functionAnchor,
            helper +
            functionAnchor
        );

}


/*
 * Replace ONLY customer-overview/customer-rfm block.
 */

const blockPattern =
    /async function moduleCustomers\(ctx, moduleId\) \{[\s\S]*?\n\}\r?\n\r?\nasync function moduleStaff/;

const match =
    service.match(
        blockPattern
    );

if (
    !match
) {

    throw new Error(
        "moduleCustomers block not found."
    );

}

const newModuleCustomers = `async function moduleCustomers(ctx, moduleId) {

    /*
     * CUSTOMER OVERVIEW
     *
     * Lightweight local SQLite aggregation.
     * No getSales().
     * No RFM calculation.
     * No full sales-row transfer to the renderer.
     */

    if (
        moduleId ===
        'customer-overview'
    ) {

        return getLightweightCustomerOverview({
            branchId:
                ctx.branchId,

            fromDate:
                ctx.fromDate,

            toDate:
                ctx.toDate
        });

    }


    /*
     * RFM
     *
     * RFM page keeps the existing RFM calculation.
     */

    if (
        moduleId ===
        'customer-rfm'
    ) {

        const rfm =
            await getCustomerRfm({

                ...ctx,

                limit:
                    30

            });

        return {

            title:
                'Customer Intelligence â€” RFM',

            subtitle:
                'Recency / Frequency / Monetary ظˆطھظ‚ط³ظٹظ… ط§ظ„ط¹ظ…ظ„ط§ط،',

            kpis: [

                k(
                    'ط§ظ„ط¹ظ…ظ„ط§ط،',
                    rfm.summary?.customers || 0,
                    'number'
                ),

                k(
                    'Avg Recency',
                    rfm.summary?.averageRecencyDays || 0,
                    'number'
                ),

                k(
                    'Avg Frequency',
                    rfm.summary?.averageFrequency || 0,
                    'number'
                ),

                k(
                    'Avg Monetary',
                    rfm.summary?.averageMonetary || 0,
                    'money'
                )

            ],

            tables: [

                {
                    title:
                        'Segments',

                    columns:
                        [
                            'Segment',
                            'Customers'
                        ],

                    rows:
                        Object.entries(
                            rfm.summary?.segments || {}
                        ).map(
                            ([name, value]) =>
                                [
                                    name,
                                    value?.customers ??
                                    value
                                ]
                        )

                },

                {
                    title:
                        'Top Customers',

                    columns:
                        [
                            'Customer',
                            'Recency',
                            'Frequency',
                            'Monetary',
                            'Segment'
                        ],

                    rows:
                        (
                            rfm.customers || []
                        )
                            .slice(
                                0,
                                30
                            )
                            .map(
                                customer =>
                                    [
                                        customer.customerName ||
                                            customer.customerId,

                                        customer.recencyDays,

                                        customer.tickets,

                                        customer.netSales,

                                        customer.segment ||
                                            customer.segmentName
                                    ]
                            )

                }

            ],

            diagnosis:
                []

        };

    }


    throw new Error(
        \`Unsupported customer module: \${moduleId}\`
    );

}


async function moduleStaff`;

service =
    service.replace(
        blockPattern,
        newModuleCustomers
    );

fs.writeFileSync(
    analyticsService,
    service,
    "utf8"
);

console.log(
    "analyticsService: CUSTOMER OVERVIEW -> LIGHTWEIGHT SQLITE"
);


/*
 * =========================================================
 * UI
 * =========================================================
 */

let ui =
    fs.readFileSync(
        customerUi,
        "utf8"
    );


/*
 * Avoid sorting again on every render.
 * SQL already returns Top 100 ordered by netSales.
 */

const oldSortBlock =
`        const topCustomers =
            [
                ...customers
            ]
                .sort(
                    (
                        a,
                        b
                    ) =>
                        n(
                            b?.netSales ??
                            b?.monetary ??
                            b?.total_sales
                        ) -
                        n(
                            a?.netSales ??
                            a?.monetary ??
                            a?.total_sales
                        )
                )
                .slice(
                    0,
                    100
                );`;

const newSortBlock =
`        const topCustomers =
            Array.isArray(
                customers
            )
                ? customers.slice(
                    0,
                    100
                )
                : [];`;

if (
    !ui.includes(
        oldSortBlock
    )
) {

    throw new Error(
        "Customer Overview render sort block not found."
    );

}

ui =
    ui.replace(
        oldSortBlock,
        newSortBlock
    );

fs.writeFileSync(
    customerUi,
    ui,
    "utf8"
);

console.log(
    "Customer UI: removed full-list sort"
);

console.log("");
console.log(
    "CUSTOMER OVERVIEW PERFORMANCE V2 COMPLETED"
);
