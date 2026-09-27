import fs from "node:fs";
import path from "node:path";

const file = path.join(
    process.cwd(),
    "src",
    "components",
    "CustomerAnalyticsModulePanel.jsx"
);

const backup =
    `${file}.backup-before-rfm-v2-final-20260925`;

let source =
    fs.readFileSync(
        file,
        "utf8"
    );

if (
    !fs.existsSync(
        backup
    )
) {

    fs.copyFileSync(
        file,
        backup
    );

    console.log(
        `Backup created: ${backup}`
    );

} else {

    console.log(
        `Backup already exists: ${backup}`
    );

}


const marker =
    "customersApi.rfmV2(";

const markerIndex =
    source.indexOf(
        marker
    );

if (
    markerIndex <
    0
) {

    throw new Error(
        "Could not locate customersApi.rfmV2()."
    );

}


const blockEnd =
    source.indexOf(
        "});",
        markerIndex
    );

if (
    blockEnd <
    0
) {

    throw new Error(
        "Could not locate end of rfmV2 payload."
    );

}


const block =
    source.slice(
        markerIndex,
        blockEnd
    );


if (
    !block.includes(
        "fromDate"
    ) ||
    !block.includes(
        "toDate"
    )
) {

    throw new Error(
        "RFM V2 payload does not contain fromDate/toDate."
    );

}


const patchedBlock =
    block.replace(
        /fromDate\s*,\s*toDate\s*,/m,
        "analysisDate: toDate,"
    );


if (
    patchedBlock ===
    block
) {

    throw new Error(
        "Could not replace fromDate/toDate inside rfmV2 payload."
    );

}


source =
    source.slice(
        0,
        markerIndex
    ) +
    patchedBlock +
    source.slice(
        blockEnd
    );


fs.writeFileSync(
    file,
    source,
    "utf8"
);


console.log(
    "RFM V2 payload fixed successfully."
);

console.log(
    "Changed: fromDate + toDate -> analysisDate: toDate"
);

console.log(
    `Updated: ${file}`
);