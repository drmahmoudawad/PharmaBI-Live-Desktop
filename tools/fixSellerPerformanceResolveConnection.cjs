const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "sellerPerformanceService.js"
);

const backup =
    file + ".backup-before-resolve-connection-final";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text =
    fs.readFileSync(
        file,
        "utf8"
    );

const start =
    text.indexOf(
        "function resolveConnection("
    );

const end =
    text.indexOf(
        "function buildCacheKey(",
        start
    );

if (
    start === -1 ||
    end === -1
) {
    throw new Error(
        "RESOLVE CONNECTION FUNCTION NOT FOUND"
    );
}

const replacement = `function resolveConnection(
    branchId,
    connection
) {
    const numericBranchId =
        Number(branchId);

    const branches =
        getAllSavedConnections();

    const saved =
        Array.isArray(branches)
            ? branches.find(
                item =>
                    Number(
                        item?.branchId
                    ) ===
                    numericBranchId
            )
            : null;

    /*
     * Prefer a complete connection supplied by the UI.
     * If it is missing or incomplete, use the saved connection
     * belonging to the SAME branch.
     */
    const providedIsValid =
        connection &&
        typeof connection === "object" &&
        String(
            connection.server ||
            ""
        ).trim();

    if (providedIsValid) {
        return {
            ...saved,
            ...connection,
            branchId:
                numericBranchId
        };
    }

    if (saved) {
        return {
            ...saved,
            branchId:
                numericBranchId
        };
    }

    throw new Error(
        \`Branch \${branchId} connection was not found.\`
    );
}

`;

text =
    text.slice(
        0,
        start
    ) +
    replacement +
    text.slice(
        end
    );

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "SELLER PERFORMANCE CONNECTION FALLBACK FIXED"
);

console.log(
    "Uses the saved connection of the SAME branch when UI connection is incomplete."
);

console.log(
    "Backup:",
    backup
);
