import { getBranchPool } from "../connection/connectionManager.js";

export async function getEmployeeDirectory({
    branchId,
    fromDate,
    toDate,
    connection = null
}) {
    const numericBranchId = Number(branchId);

    if (
        !Number.isInteger(numericBranchId) ||
        numericBranchId <= 0
    ) {
        throw new Error("Invalid branchId");
    }

    if (!fromDate || !toDate) {
        throw new Error(
            "Employee directory requires fromDate and toDate"
        );
    }

    const pool =
        await getBranchPool(
            numericBranchId,
            connection
        );

    const branchResult =
        await pool
            .request()
            .query(`
                SELECT TOP (1)
                    DefaultStoreID,
                    DefaultStoreName,
                    BranchName,
                    IsSelfBranch
                FROM dbo.Branches
                ORDER BY
                    CASE
                        WHEN IsSelfBranch = 1 THEN 0
                        ELSE 1
                    END;
            `);

    const branchRow =
        branchResult?.recordset?.[0];

    const storeId =
        branchRow?.DefaultStoreID;

    if (
        storeId === null ||
        storeId === undefined
    ) {
        throw new Error(
            "DefaultStoreID not found for selected branch"
        );
    }

    console.log(
        "[employeeDirectory] branch=",
        numericBranchId,
        "storeId=",
        String(storeId),
        "fromDate=",
        String(fromDate),
        "toDate=",
        String(toDate)
    );

    const result =
        await pool
            .request()
            .input(
                "storeId",
                storeId
            )
            .input(
                "fromDate",
                String(fromDate) + " 00:00:00"
            )
            .input(
                "toDate",
                String(toDate) + " 00:00:00"
            )
            .query(`
                SELECT
                    CONVERT(
                        nvarchar(100),
                        c.ID
                    ) AS employee_id,

                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                c.Name
                            )
                        )
                    ) AS employee_name

                FROM (
                    SELECT
                        t.PinNumber

                    FROM dbo.posTickets t

                    WHERE t.StoreID = @storeId

                      AND t.ztime >= @fromDate

                      AND t.ztime < DATEADD(
                          day,
                          1,
                          @toDate
                      )

                      AND t.SalesReturn = 1

                      AND t.PinNumber IS NOT NULL

                      AND CONVERT(
                          nvarchar(100),
                          t.PinNumber
                      ) NOT IN (
                          N'',
                          N'0'
                      )

                    GROUP BY
                        t.PinNumber
                ) sellers

                INNER JOIN dbo.Cards c
                    ON c.ID = sellers.PinNumber

                WHERE ISNULL(
                    c.IsEmployee,
                    0
                ) = 1

                  AND NULLIF(
                    LTRIM(
                        RTRIM(
                            CONVERT(
                                nvarchar(400),
                                c.Name
                            )
                        )
                    ),
                    ''
                  ) IS NOT NULL

                ORDER BY
                    c.Name;
            `);

    const employees =
        (
            result?.recordset || []
        ).map(
            row => ({
                employeeId:
                    String(
                        row.employee_id
                    ),

                employeeName:
                    String(
                        row.employee_name
                    )
            })
        );

    console.log(
        "[employeeDirectory] branch=",
        numericBranchId,
        "storeId=",
        String(storeId),
        "period=",
        String(fromDate),
        "->",
        String(toDate),
        "realSellingEmployees=",
        employees.length
    );

    return {
        employees
    };
}
