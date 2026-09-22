import sql from "mssql";

const pool =
    await sql.connect({
        server: "26.203.10.111",
        port: 59123,
        database: "pfx1",
        user: "sa",
        password: "123",
        options: {
            encrypt: false,
            trustServerCertificate: true
        }
    });


const result =
    await pool
        .request()
        .query(`
            SELECT
                TABLE_NAME,
                COLUMN_NAME,
                DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE
                TABLE_SCHEMA = 'dbo'
            AND
                (
                    TABLE_NAME = 'Users'
                    OR
                    TABLE_NAME = 'Sync_Users'
                )
            ORDER BY
                TABLE_NAME,
                ORDINAL_POSITION;
        `);

console.log(
    "USERS / SYNC_USERS SCHEMA:"
);

console.table(
    result.recordset
);


console.log(
    "USERS SAMPLE:"
);

try {

    const users =
        await pool
            .request()
            .query(`
                SELECT TOP 100 *
                FROM dbo.Users
                ORDER BY 1;
            `);

    console.table(
        users.recordset
    );

}
catch (
    error
) {

    console.log(
        "Users SELECT failed:",
        error.message
    );

}


console.log(
    "SYNC_USERS SAMPLE:"
);

try {

    const syncUsers =
        await pool
            .request()
            .query(`
                SELECT TOP 100 *
                FROM dbo.Sync_Users
                ORDER BY 1;
            `);

    console.table(
        syncUsers.recordset
    );

}
catch (
    error
) {

    console.log(
        "Sync_Users SELECT failed:",
        error.message
    );

}


await pool.close();

console.log(
    "DONE"
);
