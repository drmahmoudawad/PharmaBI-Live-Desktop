import {
    getAllSavedConnections
} from "../settings/connectionStore.js";

import {
    getBranchPool
} from "../connection/connectionManager.js";


const TARGET_BRANCHES = [1];


function print(
    title,
    value
) {

    console.log("");
    console.log("=====================================================");
    console.log(title);
    console.log("=====================================================");

    if (
        Array.isArray(value)
    ) {

        for (
            const row
            of value
        ) {

            console.log(
                JSON.stringify(
                    row
                )
            );

        }

    }
    else {

        console.log(
            JSON.stringify(
                value,
                null,
                2
            )
        );

    }

}


async function inspectBranch(
    branch
) {

    console.log("");
    console.log(
        "######## BRANCH " +
        branch.branchId +
        " - " +
        branch.branchName +
        " ########"
    );


    const pool =
        await getBranchPool(
            Number(branch.branchId),
            branch
        );


    /*
     * =====================================================
     * CUSTOMER TYPE x CARDS FLAGS
     * =====================================================
     */

    const distribution =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT

                    t.CustomerType,

                    ISNULL(
                        c.IsCustomer,
                        0
                    ) AS IsCustomer,

                    ISNULL(
                        c.IsHDCustomer,
                        0
                    ) AS IsHDCustomer,

                    ISNULL(
                        c.IsDeliveryBoy,
                        0
                    ) AS IsDeliveryBoy,

                    COUNT(*) AS ticket_count,

                    COUNT(
                        DISTINCT
                        t.CustomerID
                    ) AS customer_count

                FROM posTickets t

                LEFT JOIN Cards c
                    ON c.ID =
                       t.CustomerID

                WHERE
                    t.CustomerID IS NOT NULL
                    AND t.CustomerID <> 0

                GROUP BY

                    t.CustomerType,

                    ISNULL(
                        c.IsCustomer,
                        0
                    ),

                    ISNULL(
                        c.IsHDCustomer,
                        0
                    ),

                    ISNULL(
                        c.IsDeliveryBoy,
                        0
                    )

                ORDER BY

                    t.CustomerType,

                    IsHDCustomer DESC,

                    IsCustomer DESC;

            `);


    print(
        "CUSTOMER TYPE x CARDS FLAGS",
        distribution?.recordset || []
    );


    /*
     * =====================================================
     * ISHDCUSTOMER DISTRIBUTION
     * =====================================================
     */

    const hd =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT

                    ISNULL(
                        c.IsHDCustomer,
                        0
                    ) AS IsHDCustomer,

                    ISNULL(
                        c.IsCustomer,
                        0
                    ) AS IsCustomer,

                    COUNT(*) AS ticket_count,

                    COUNT(
                        DISTINCT
                        t.CustomerID
                    ) AS customer_count

                FROM posTickets t

                LEFT JOIN Cards c
                    ON c.ID =
                       t.CustomerID

                WHERE
                    t.CustomerID IS NOT NULL
                    AND t.CustomerID <> 0

                GROUP BY

                    ISNULL(
                        c.IsHDCustomer,
                        0
                    ),

                    ISNULL(
                        c.IsCustomer,
                        0
                    )

                ORDER BY

                    IsHDCustomer DESC,

                    IsCustomer DESC;

            `);


    print(
        "ISHD CUSTOMER DISTRIBUTION",
        hd?.recordset || []
    );


    /*
     * =====================================================
     * REAL HD CUSTOMER SAMPLES
     * ===================================================== */

    const hdSamples =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT TOP 25

                    t.ID AS TicketID,

                    t.ztime,

                    t.SalesReturn,

                    t.CustomerID,

                    t.CustomerType,

                    c.Name AS CustomerName,

                    c.IsCustomer,

                    c.IsHDCustomer,

                    c.IsDeliveryBoy,

                    t.Total

                FROM posTickets t

                LEFT JOIN Cards c
                    ON c.ID =
                       t.CustomerID

                WHERE

                    t.CustomerID IS NOT NULL

                    AND t.CustomerID <> 0

                    AND ISNULL(
                        c.IsHDCustomer,
                        0
                    ) = 1

                ORDER BY
                    t.ID DESC;

            `);


    print(
        "SAMPLES: IsHDCustomer = 1",
        hdSamples?.recordset || []
    );


    /*
     * =====================================================
     * CUSTOMER SAMPLES WITH IsHDCustomer = 0
     * ===================================================== */

    const nonHdSamples =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT TOP 25

                    t.ID AS TicketID,

                    t.ztime,

                    t.SalesReturn,

                    t.CustomerID,

                    t.CustomerType,

                    c.Name AS CustomerName,

                    c.IsCustomer,

                    c.IsHDCustomer,

                    c.IsDeliveryBoy,

                    t.Total

                FROM posTickets t

                LEFT JOIN Cards c
                    ON c.ID =
                       t.CustomerID

                WHERE

                    t.CustomerID IS NOT NULL

                    AND t.CustomerID <> 0

                    AND ISNULL(
                        c.IsHDCustomer,
                        0
                    ) = 0

                ORDER BY
                    t.ID DESC;

            `);


    print(
        "SAMPLES: IsHDCustomer = 0",
        nonHdSamples?.recordset || []
    );


    /*
     * =====================================================
     * CUSTOMER TYPE + HD FLAG
     * ===================================================== */

    const typeSummary =
        await pool
            .request()
            .query(`

                SET NOCOUNT ON;

                SELECT

                    t.CustomerType,

                    SUM(
                        CASE
                            WHEN ISNULL(
                                c.IsHDCustomer,
                                0
                            ) = 1
                            THEN 1
                            ELSE 0
                        END
                    ) AS hd_tickets,

                    SUM(
                        CASE
                            WHEN ISNULL(
                                c.IsHDCustomer,
                                0
                            ) = 0
                            THEN 1
                            ELSE 0
                        END
                    ) AS non_hd_tickets,

                    COUNT(
                        DISTINCT
                        CASE
                            WHEN ISNULL(
                                c.IsHDCustomer,
                                0
                            ) = 1
                            THEN t.CustomerID
                            ELSE NULL
                        END
                    ) AS hd_customers,

                    COUNT(
                        DISTINCT
                        CASE
                            WHEN ISNULL(
                                c.IsHDCustomer,
                                0
                            ) = 0
                            THEN t.CustomerID
                            ELSE NULL
                        END
                    ) AS non_hd_customers

                FROM posTickets t

                LEFT JOIN Cards c
                    ON c.ID =
                       t.CustomerID

                WHERE

                    t.CustomerID IS NOT NULL

                    AND t.CustomerID <> 0

                GROUP BY
                    t.CustomerType

                ORDER BY
                    t.CustomerType;

            `);


    print(
        "CUSTOMER TYPE HD SUMMARY",
        typeSummary?.recordset || []
    );

}


export async function runDeliveryInspection() {

    const branches =
        getAllSavedConnections();


    for (
        const branchId
        of TARGET_BRANCHES
    ) {

        const branch =
            branches.find(
                item =>
                    Number(
                        item.branchId
                    ) ===
                    Number(
                        branchId
                    )
            );


        if (!branch) {

            console.log(
                "BRANCH " +
                branchId +
                ": CONNECTION NOT FOUND"
            );

            continue;

        }


        try {

            await inspectBranch(
                branch
            );

        }
        catch (
            error
        ) {

            console.error(
                "BRANCH " +
                branchId +
                " FAILED:",
                error?.message ||
                error
            );

        }

    }

}

