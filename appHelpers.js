export function buildTodayRange() {

    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            today.getDate()
        ).padStart(
            2,
            "0"
        );


    return {

        fromDate:
            `${year}-${month}-01`,

        toDate:
            `${year}-${month}-${day}`

    };

}


export function isValidSavedBranch(
    branch
) {

    const branchId =
        Number(
            branch?.branchId
        );


    return (

        branch &&

        Number.isInteger(
            branchId
        ) &&

        branchId > 0

    );

}


export function normalizeBranchName(
    branch
) {

    const branchId =
        Number(
            branch?.branchId
        );


    const name =
        String(
            branch?.branchName ||
            ""
        ).trim();


    return (

        name ||

        `Branch ${branchId}`

    );

}


export function sortBranches(
    branches
) {

    return [

        ...branches

    ].sort(

        (
            a,
            b
        ) =>

            Number(
                a.branchId
            ) -

            Number(
                b.branchId
            )

    );

}


export function buildConnectionPayload(
    saved
) {

    if (
        !saved
    ) {

        return null;

    }


    return {

        branchId:
            Number(
                saved.branchId
            ),

        branchName:
            normalizeBranchName(
                saved
            ),

        connection: {

            server:
                String(
                    saved.server ||
                    ""
                ).trim(),

            port:
                Number(
                    saved.port ||
                    1433
                ),

            database:
                String(
                    saved.database ||
                    ""
                ).trim(),

            user:
                String(
                    saved.user ||
                    ""
                ).trim(),

            password:
                String(
                    saved.password ||
                    ""
                )

        }

    };

}


export function buildEmptyConnection() {

    return {

        server:
            "",

        port:
            "1433",

        database:
            "",

        user:
            "",

        password:
            ""

    };

}


export function formatMoney(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(

        "en-US",

        {

            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2

        }

    );

}


export function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US"
    );

}


export function formatPercent(
    value
) {

    return `${Number(
        value || 0
    ).toFixed(
        2
    )}%`;

}


/*
 * =========================================================
 * ACTIVE BRANCH HELPER
 * =========================================================
 */

export function isBranchActive(
    activeConnections,
    branchId
) {

    if (
        !Array.isArray(
            activeConnections
        )
    ) {

        return false;

    }


    const targetId =
        Number(
            branchId
        );


    if (
        !Number.isInteger(
            targetId
        )
    ) {

        return false;

    }


    return activeConnections.some(

        item => {

            const activeId =

                typeof item ===
                "object"

                    ? Number(
                        item?.branchId ??
                        item?.branch_id
                    )

                    : Number(
                        item
                    );


            return (

                Number.isInteger(
                    activeId
                ) &&

                activeId ===
                targetId

            );

        }

    );

}


/*
 * =========================================================
 * APP
 * =========================================================
 */
