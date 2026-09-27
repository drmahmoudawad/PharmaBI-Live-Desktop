const fs = require("fs");

const jsxFile =
    "src/components/CustomerAnalyticsModulePanel.jsx";

const helperFile =
    "tools/linkRfmCrmWhatsApp.cjs";

let jsx =
    fs.readFileSync(
        jsxFile,
        "utf8"
    ).replace(/\r\n/g, "\n");

const helper =
    fs.readFileSync(
        helperFile,
        "utf8"
    ).replace(/\r\n/g, "\n");

/* =========================================================
 * EXTRACT THE ALREADY PREPARED PANEL
 * ========================================================= */

const componentMarker =
    "function CustomerCrmWhatsAppPanel(";

if (
    !helper.includes(
        componentMarker
    )
) {
    throw new Error(
        "CRM WHATSAPP PANEL IS NOT PRESENT IN HELPER"
    );
}

if (
    jsx.includes(
        componentMarker
    )
) {
    console.log(
        "CRM WHATSAPP PANEL ALREADY EXISTS IN JSX"
    );
}
else {

    const componentStart =
        helper.indexOf(
            "const component ="
        );

    if (
        componentStart === -1
    ) {
        throw new Error(
            "COMPONENT DEFINITION NOT FOUND IN HELPER"
        );
    }

    const literalStart =
        helper.indexOf(
            "`",
            componentStart
        );

    if (
        literalStart === -1
    ) {
        throw new Error(
            "COMPONENT TEMPLATE START NOT FOUND"
        );
    }

    const literalEnd =
        helper.indexOf(
            "`;\n\n    content =",
            literalStart + 1
        );

    if (
        literalEnd === -1
    ) {
        throw new Error(
            "COMPONENT TEMPLATE END NOT FOUND"
        );
    }

    const componentText =
        helper.slice(
            literalStart + 1,
            literalEnd
        );

    const modalMarker =
        "function CustomerProfileModal(";

    const modalIndex =
        jsx.indexOf(
            modalMarker
        );

    if (
        modalIndex === -1
    ) {
        throw new Error(
            "CUSTOMER PROFILE MODAL NOT FOUND"
        );
    }

    jsx =
        jsx.slice(
            0,
            modalIndex
        ) +
        componentText +
        "\n\n" +
        jsx.slice(
            modalIndex
        );

    console.log(
        "CRM WHATSAPP PANEL COPIED INTO JSX"
    );
}

/* =========================================================
 * INSERT PANEL AFTER CUSTOMER STICKY HEADER
 * ========================================================= */

if (
    !jsx.includes(
        "<CustomerCrmWhatsAppPanel"
    )
) {

    const stickyHeader =
        jsx.indexOf(
            'className="customer-profile-sticky-header"'
        );

    if (
        stickyHeader === -1
    ) {
        throw new Error(
            "CUSTOMER STICKY HEADER NOT FOUND"
        );
    }

    const insertionPoint =
        jsx.indexOf(
            "\n                <div",
            stickyHeader
        );

    if (
        insertionPoint === -1
    ) {
        throw new Error(
            "MODAL BODY INSERTION POINT NOT FOUND"
        );
    }

    const panelUsage =
`
                <CustomerCrmWhatsAppPanel
                    customer={
                        customer
                    }
                    customerSource={
                        customerSource
                    }
                    profile={
                        profile
                    }
                    recommendedAction={
                        customer?.recommended_action
                    }
                />

`;

    jsx =
        jsx.slice(
            0,
            insertionPoint + 1
        ) +
        panelUsage +
        jsx.slice(
            insertionPoint + 1
        );

    console.log(
        "CRM WHATSAPP PANEL INSERTED INTO MODAL"
    );

}
else {

    console.log(
        "CRM WHATSAPP PANEL USAGE ALREADY EXISTS"
    );

}

fs.writeFileSync(
    jsxFile,
    jsx.replace(/\n/g, "\r\n"),
    "utf8"
);

console.log(
    "DIRECT CRM WHATSAPP PATCH COMPLETE"
);
