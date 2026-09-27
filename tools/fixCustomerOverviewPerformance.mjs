import fs from "node:fs";

const root =
    "D:/PharmaBI-Live-Desktop";

const analyticsCustomers =
    `${root}/electron/analytics/customers.js`;

const analyticsService =
    `${root}/electron/pharmfly/analytics/analyticsService.js`;

const customerUi =
    `${root}/src/components/CustomerAnalyticsModulePanel.jsx`;

const backups = [
    [
        analyticsCustomers,
        `${analyticsCustomers}.backup-before-overview-performance-20260925`
    ],
    [
        analyticsService,
        `${analyticsService}.backup-before-overview-performance-20260925`
    ],
    [
        customerUi,
        `${customerUi}.backup-before-overview-performance-20260925`
    ]
];

for (const [source, backup] of backups) {

    if (!fs.existsSync(source)) {

        throw new Error(
            `Missing file: ${source}`
        );

    }

    if (!fs.existsSync(backup)) {

        fs.copyFileSync(
            source,
            backup
        );

    }

}


/*
 * =========================================================
 * 1. LIGHTWEIGHT CUSTOMER OVERVIEW QUERY
 * =========================================================
 */

const customersSource =
    fs.readFileSync(
        analyticsCustomers,
        "utf8"
    );

if (
    !customersSource.includes(
        "export function getCustomerOverview("
    )
) {

    const overviewFunction = `

/*
 * =========================================================
 * LIGHTWEIGHT CUSTOMER OVERVIEW
 * =========================================================
 *
 * IMPORTANT:
 * Do NOT load all sales rows into JavaScript here.
 *
 * The overview needs only:
 * - total customers
 * - total net sales
 * - average customer value
 * - top 100 customers
 *
 * SQLite performs the aggregation and returns only
 * the required rows.
 */

const customerOverviewCache =
    new Map();

const CUSTOMER_OVERVIEW_CACHE_TTL_MS =
    15 * 1000;


function customerOverviewCacheKey(
    branchId,
    fromDate,
    toDate
) {

    return [
        String(branchId),
        String(fromDate),
        String(toDate)
    ].join("|");

}


function nextCustomerOverviewDate(
    dateText
) {

    const date =
        new Date(
            \`\${String(dateText)}T00:00:00.000Z\`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        throw new Error(
            "Invalid customer overview toDate"
        );

    }

    date.setUTCDate(
        date.getUTCDate() + 1
    );

    return date
        .toISOString()
        .slice(
            0,
            10
        );

}


export function getCustomerOverview(
    database,
    {
        branchId,
        fromDate,
        toDate,
        limit = 100
    } = {}
) {

    const cacheKey =
        customerOverviewCacheKey(
            branchId,
            fromDate,
            toDate
        );

    const cached =
        customerOverviewCache.get(
            cacheKey
        );

    if (
        cached &&
        Date.now() -
            cached.createdAt <
            CUSTOMER_OVERVIEW_CACHE_TTL_MS
    ) {

        return cached.result;

    }

    const normalizedLimit =
        Number.isFinite(
            Number(limit)
        )
            ? Math.min(
                100,
                Math.max(
                    1,
                    Math.floor(
                        Number(limit)
                    )
                )
            )
            : 100;

    const toDateExclusive =
        nextCustomerOverviewDate(
            toDate
        );

    const branchIsAll =
        String(
            branchId
        ).trim().toLowerCase() ===
        "all";

    const branchCondition =
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
            normalizedLimit

    };

    if (
        !branchIsAll
    ) {

        const numericBranchId =
            Number(
                branchId
            );

        if (
            !Number.isInteger(
                numericBranchId
            ) ||
            numericBranchId <= 0
        ) {

            throw new Error(
                "Invalid branchId"
            );

        }

        params.branchId =
            numericBranchId;

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

                            'غير معروف'

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

                        ${branchCondition}

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


    const firstRow =
        rows[0] || {};

    const result = {

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
                    firstRow.totalCustomers
                ) || 0,

            totalCustomers:
                Number(
                    firstRow.totalCustomers
                ) || 0,

            totalSales:
                Number(
                    firstRow.totalSales
                ) || 0,

            netSales:
                Number(
                    firstRow.totalSales
                ) || 0,

            averageMonetary:
                Number(
                    firstRow.averageMonetary
                ) || 0

        },

        customers:
            rows.map(
                row => ({

                    customerId:
                        branchIsAll
                            ? \`\${row.branch_id}:\${row.customer_code}\`
                            : row.customer_code,

                    customerCode:
                        row.customer_code,

                    customerName:
                        row.customer_name,

                    phone:
                        row.phone,

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
            ),

        segments:
            [],

        topCustomers:
            rows.map(
                row => ({

                    customerId:
                        branchIsAll
                            ? \`\${row.branch_id}:\${row.customer_code}\`
                            : row.customer_code,

                    customerName:
                        row.customer_name,

                    phone:
                        row.phone,

                    tickets:
                        Number(
                            row.tickets
                        ) || 0,

                    netSales:
                        Number(
                            row.netSales
                        ) || 0

                })
            )

    };


    customerOverviewCache.set(
        cacheKey,
        {
            createdAt:
                Date.now(),

            result

        }
    );


    while (
        customerOverviewCache.size >
        20
    ) {

        const oldestKey =
            customerOverviewCache
                .keys()
                .next()
                .value;

        if (
            oldestKey ===
            undefined
        ) {

            break;

        }

        customerOverviewCache.delete(
            oldestKey
        );

    }


    return result;

}
`;

    fs.writeFileSync(
        analyticsCustomers,
        customersSource +
        overviewFunction,
        "utf8"
    );

    console.log(
        "customer analytics overview: ADDED"
    );

}
else {

    console.log(
        "customer analytics overview: ALREADY EXISTS"
    );

}


/*
 * =========================================================
 * 2. USE LIGHT OVERVIEW IN ANALYTICS SERVICE
 * =========================================================
 */

let serviceSource =
    fs.readFileSync(
        analyticsService,
        "utf8"
    );

const importAnchor =
    "import { getCustomerRfm } from '../customers/customerRfmService.js';";

if (
    !serviceSource.includes(
        "import { getCustomerOverview } from '../../analytics/customers.js';"
    )
) {

    if (
        !serviceSource.includes(
            importAnchor
        )
    ) {

        throw new Error(
            "Customer RFM import anchor not found."
        );

    }

    serviceSource =
        serviceSource.replace(
            importAnchor,
            `${importAnchor}
import { getCustomerOverview } from '../../analytics/customers.js';`
        );

}


const customerBlockPattern =
    /    if \(moduleId === 'customer-rfm' \|\| moduleId === 'customer-overview'\) \{[\s\S]*?    \}\r?\n    if \(moduleId === 'customer-retention'\)/;

const customerBlockMatch =
    serviceSource.match(
        customerBlockPattern
    );

if (
    !customerBlockMatch
) {

    throw new Error(
        "Customer module block not found in analyticsService.js."
    );

}

const replacementBlock = `    if (moduleId === 'customer-overview') {

        const overview =
            getCustomerOverview(
                (await import('../../database/database.js')).default
                    ? (await import('../../database/database.js')).default()
                    : null,
                {
                    branchId:
                        ctx.branchId,

                    fromDate:
                        ctx.fromDate,

                    toDate:
                        ctx.toDate,

                    limit:
                        100
                }
            );

        return overview;

    }

    if (moduleId === 'customer-rfm') {

        const rfm =
            await getCustomerRfm({
                ...ctx,
                limit:
                    30
            });

        return {
            title:
                'Customer Intelligence — RFM',

            subtitle:
                'Recency / Frequency / Monetary وتقسيم العملاء',

            kpis: [

                k(
                    'العملاء',
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

    if (moduleId === 'customer-retention')`;

serviceSource =
    serviceSource.replace(
        customerBlockPattern,
        replacementBlock
    );

fs.writeFileSync(
    analyticsService,
    serviceSource,
    "utf8"
);

console.log(
    "analytics service: CUSTOMER OVERVIEW SWITCHED TO LIGHT QUERY"
);


/*
 * =========================================================
 * 3. CUSTOMER OVERVIEW UI
 * =========================================================
 */

let uiSource =
    fs.readFileSync(
        customerUi,
        "utf8"
    );

const overviewMetricBlock =
`                        {
                            label:
                                "فئات RFM",
                            value:
                                num(
                                    segments.length
                                )
                        }`;

if (
    !uiSource.includes(
        overviewMetricBlock
    )
) {

    throw new Error(
        "Customer Overview RFM metric block not found."
    );

}

uiSource =
    uiSource.replace(
        overviewMetricBlock,
`                        {
                            label:
                                "أفضل العملاء المعروضين",
                            value:
                                num(
                                    topCustomers.length
                                )
                        }`
    );

fs.writeFileSync(
    customerUi,
    uiSource,
    "utf8"
);

console.log(
    "customer UI: OVERVIEW METRIC UPDATED"
);

console.log("");
console.log(
    "CUSTOMER OVERVIEW PERFORMANCE FIX COMPLETED"
);