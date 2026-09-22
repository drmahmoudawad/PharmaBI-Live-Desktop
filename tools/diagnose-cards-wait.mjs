import { app } from "electron";

import {
    getAllSavedConnections
} from "../electron/settings/connectionStore.js";

import {
    getBranchPool,
    closeAllConnections
} from "../electron/connection/connectionManager.js";


const BRANCH_ID = 2;

const FROM_DATE = "2026-09-01";
const TO_DATE_EXCLUSIVE = "2026-09-18";

const POLL_MS = 2000;
const MAX_MS = 20000;


function log(message) {
    console.log(message);
}


async function main() {

    await app.whenReady();

    app.setPath(
        "userData",
        "C:\\Users\\SHIKO\\AppData\\Roaming\\pharmabi-live"
    );


    const savedConnections =
        getAllSavedConnections();


    /*
     * Diagnostic only.
     * The standalone Electron process cannot decrypt the stored
     * safeStorage password, so use the known password here only.
     */
    for (
        const branch of savedConnections
    ) {
        branch.password = "123";
    }


    const branch =
        savedConnections.find(
            item =>
                Number(item.branchId) === BRANCH_ID
        );


    if (!branch) {
        throw new Error(
            `Branch ${BRANCH_ID} not found.`
        );
    }


    log("");
    log(
        "============================================================"
    );
    log(
        "BRANCH 2 - CARDS JOIN WAIT / BLOCKING DIAGNOSTIC"
    );
    log(
        `SERVER=${branch.server}`
    );
    log(
        `DATABASE=${branch.database}`
    );
    log(
        `PORT=${branch.port}`
    );
    log(
        `${FROM_DATE} -> 2026-09-17`
    );
    log(
        "============================================================"
    );


    const pool =
        await getBranchPool(
            BRANCH_ID,
            branch
        );


    log(
        "[CONNECTED]"
    );


    /*
     * Give the query a unique comment so the polling connection
     * can find exactly this request.
     */
    const tag =
        "/* PHARMABI_DIAG_CARDS_JOIN_20260917 */";


    const queryText = `
        SET NOCOUNT ON;

        ${tag}

        SELECT
            COUNT_BIG(*) AS joined_rows

        FROM posTickets t

        INNER JOIN posItems pi
            ON pi.TicketID = t.ID

        LEFT JOIN Cards c
            ON c.Id = t.CustomerID

        WHERE
            t.ztime >= @fromDate
            AND t.ztime < @toDateExclusive;
    `;


    const queryRequest =
        pool.request();

    queryRequest.input(
        "fromDate",
        `${FROM_DATE} 00:00:00`
    );

    queryRequest.input(
        "toDateExclusive",
        `${TO_DATE_EXCLUSIVE} 00:00:00`
    );


    log(
        "[QUERY] Starting exact Cards JOIN..."
    );


    const queryStarted =
        Date.now();


    let queryFinished =
        false;


    let queryResult =
        null;


    let queryError =
        null;


    const queryPromise =
        queryRequest
            .query(
                queryText
            )
            .then(
                result => {

                    queryFinished =
                        true;

                    queryResult =
                        result;
                }
            )
            .catch(
                error => {

                    queryFinished =
                        true;

                    queryError =
                        error;
                }
            );


    /*
     * Poll SQL Server from a SECOND request while the JOIN runs.
     */
    const monitorStarted =
        Date.now();


    while (
        !queryFinished &&
        Date.now() - monitorStarted < MAX_MS
    ) {

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    POLL_MS
                )
        );


        if (queryFinished) {
            break;
        }


        try {

            const monitor =
                await pool
                    .request()
                    .input(
                        "tag",
                        tag
                    )
                    .query(`
                        SET NOCOUNT ON;

                        SELECT TOP 20

                            r.session_id,
                            r.status,
                            r.command,
                            r.blocking_session_id,
                            r.wait_type,
                            r.last_wait_type,
                            r.wait_time,
                            r.cpu_time,
                            r.total_elapsed_time,
                            r.reads,
                            r.logical_reads,
                            r.writes,
                            r.row_count,
                            DB_NAME(
                                r.database_id
                            ) AS database_name,

                            t.text AS sql_text

                        FROM sys.dm_exec_requests r

                        CROSS APPLY sys.dm_exec_sql_text(
                            r.sql_handle
                        ) t

                        WHERE
                            t.text LIKE '%' + @tag + '%'

                        ORDER BY
                            r.total_elapsed_time DESC;
                    `);


            const rows =
                monitor?.recordset || [];


            if (
                rows.length === 0
            ) {

                log(
                    "[MONITOR] Target request not visible yet."
                );

                continue;
            }


            for (
                const row of rows
            ) {

                log("");
                log(
                    "[MONITOR]"
                );
                log(
                    `session_id        = ${row.session_id}`
                );
                log(
                    `status             = ${row.status}`
                );
                log(
                    `command            = ${row.command}`
                );
                log(
                    `blocking_session   = ${row.blocking_session_id}`
                );
                log(
                    `wait_type          = ${row.wait_type}`
                );
                log(
                    `last_wait_type     = ${row.last_wait_type}`
                );
                log(
                    `wait_time_ms       = ${row.wait_time}`
                );
                log(
                    `cpu_time_ms        = ${row.cpu_time}`
                );
                log(
                    `elapsed_ms         = ${row.total_elapsed_time}`
                );
                log(
                    `reads              = ${row.reads}`
                );
                log(
                    `logical_reads      = ${row.logical_reads}`
                );
                log(
                    `writes             = ${row.writes}`
                );
                log(
                    `row_count          = ${row.row_count}`
                );
                log(
                    `database           = ${row.database_name}`
                );
            }

        }
        catch (monitorError) {

            log(
                `[MONITOR ERROR] ${monitorError?.message || monitorError}`
            );
        }
    }


    /*
     * If query is still running, cancel it.
     */
    if (!queryFinished) {

        log("");
        log(
            `[QUERY] Still running after ${MAX_MS} ms. Cancelling...`
        );


        try {

            queryRequest.cancel();

            log(
                "[QUERY] Cancel requested."
            );

        }
        catch (cancelError) {

            log(
                `[QUERY CANCEL ERROR] ${cancelError?.message || cancelError}`
            );
        }


        await queryPromise;
    }


    const totalElapsed =
        Date.now() - queryStarted;


    log("");
    log(
        "============================================================"
    );


    if (
        queryResult
    ) {

        const row =
            queryResult
                ?.recordset
                ?.[
                    0
                ];


        log(
            `[QUERY RESULT] joined_rows=${row?.joined_rows}`
        );

        log(
            `[QUERY RESULT] elapsed=${totalElapsed} ms`
        );

    }
    else if (
        queryError
    ) {

        log(
            `[QUERY ERROR] ${queryError?.message || queryError}`
        );

        log(
            `[QUERY ERROR] elapsed=${totalElapsed} ms`
        );

    }
    else {

        log(
            `[QUERY] No final result after ${totalElapsed} ms`
        );
    }


    log(
        "============================================================"
    );


    try {
        await closeAllConnections();
    }
    catch {}


    app.quit();
}


main().catch(
    async error => {

        console.error(
            error?.stack || error
        );

        try {
            await closeAllConnections();
        }
        catch {}

        app.quit();

        process.exitCode = 1;
    }
);