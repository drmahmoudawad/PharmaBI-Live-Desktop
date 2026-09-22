const BATCH_SIZE = 1800;

export async function enrichCustomerNames({ pool, rows }) {
    if (!Array.isArray(rows) || rows.length === 0) {
        return rows;
    }

    const ids = [];
    const seen = new Set();

    for (const row of rows) {
        const id = Number(row.customerId);

        if (!Number.isInteger(id) || id <= 0 || seen.has(id)) {
            continue;
        }

        seen.add(id);
        ids.push(id);
    }

    const names = new Map();

    for (let offset = 0; offset < ids.length; offset += BATCH_SIZE) {
        const batch = ids.slice(offset, offset + BATCH_SIZE);
        const request = pool.request();
        const placeholders = batch.map((id, index) => {
            const name = `customerId${index}`;
            request.input(name, id);
            return `@${name}`;
        });

        const result = await request.query(`
            SELECT Id, Name
            FROM Cards
            WHERE Id IN (${placeholders.join(",")})
        `);

        for (const customer of result.recordset || []) {
            const id = Number(customer.Id);
            if (Number.isInteger(id)) {
                names.set(id, customer.Name == null ? null : String(customer.Name).trim());
            }
        }
    }

    for (const row of rows) {
        const id = Number(row.customerId);
        row.customerName = Number.isInteger(id) ? (names.get(id) ?? null) : null;
    }

    return rows;
}
