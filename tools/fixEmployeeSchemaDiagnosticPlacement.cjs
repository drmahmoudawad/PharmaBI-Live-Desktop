const fs = require("fs");
const path = require("path");

const file = path.join(
    process.cwd(),
    "electron",
    "pharmfly",
    "employeeDirectoryService.js"
);

const backup =
    file + ".backup-before-schema-diagnostic-move";

if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
}

let text = fs.readFileSync(file, "utf8");

const startMarker =
    '    console.log("");\n    console.log("==============================================");\n    console.log("[employeeSchema] START");';

const endMarker =
    '    console.log("==============================================");\n    console.log("");\n\n';

const start = text.indexOf(startMarker);

if (start === -1) {
    throw new Error("EMPLOYEE SCHEMA DIAGNOSTIC START NOT FOUND");
}

const end = text.indexOf(endMarker, start);

if (end === -1) {
    throw new Error("EMPLOYEE SCHEMA DIAGNOSTIC END NOT FOUND");
}

const diagnostic =
    text.slice(
        start,
        end + endMarker.length
    );

text =
    text.slice(0, start) +
    text.slice(end + endMarker.length);

const poolMarker =
    '    let pool =\n        await getBranchPool(';

const poolPos = text.indexOf(poolMarker);

if (poolPos === -1) {
    throw new Error("POOL INITIALIZATION NOT FOUND");
}

const poolEndMarker =
    '    );\n\n    /*';

const poolEnd = text.indexOf(
    poolEndMarker,
    poolPos
);

if (poolEnd === -1) {
    throw new Error("POOL INITIALIZATION END NOT FOUND");
}

const insertPos =
    poolEnd + '    );\n\n'.length;

text =
    text.slice(0, insertPos) +
    diagnostic +
    text.slice(insertPos);

fs.writeFileSync(
    file,
    text,
    "utf8"
);

console.log(
    "EMPLOYEE SCHEMA DIAGNOSTIC MOVED AFTER POOL INITIALIZATION"
);

console.log(
    "Backup:",
    backup
);
