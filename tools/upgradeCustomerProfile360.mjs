import fs from "node:fs";

const root = "D:/PharmaBI-Live-Desktop";

const uiPath =
    `${root}/src/components/CustomerAnalyticsModulePanel.jsx`;

const servicePath =
    `${root}/electron/pharmfly/customers/customer360Service.js`;

const uiBackup =
    `${uiPath}.backup-before-customer360-20260925`;

const serviceBackup =
    `${servicePath}.backup-before-customer360-20260925`;

function readUtf8(path) {
    return fs.readFileSync(path, "utf8");
}

function writeUtf8(path, content) {
    fs.writeFileSync(path, content, "utf8");
}

function backup(path, backupPath) {
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(path, backupPath);
    }
}

const ui = readUtf8(uiPath);
const service = readUtf8(servicePath);

backup(uiPath, uiBackup);
backup(servicePath, serviceBackup);

/*
 * =========================================================
 * 1) Customer 360 fetch
 * =========================================================
 */

const openProfilePattern =
    /async function openCustomerProfile\([\s\S]*?\n\s*const titleMap\s*=/;

const openProfileReplacement = `async function openCustomerProfile(
        customer
    ) {

        const customerId =
            getCustomerId(
                customer
            );

        if (
            !customerId ||
            branchId ===
                "all"
        ) {

            return;

        }

        try {

            const safeFromDate =
                normalizeCustomerDate(
                    fromDate
                );

            const safeToDate =
                normalizeCustomerDate(
                    toDate
                );

            if (
                typeof customersApi?.customer360 !==
                "function"
            ) {
                throw new Error(
                    "Customer 360 API is unavailable."
                );
            }

            const result =
                await customersApi.customer360({

                    branchId,

                    customerId,

                    fromDate:
                        safeFromDate,

                    toDate:
                        safeToDate

                });

            if (
                result &&
                result.success !== false
            ) {

                setCustomerProfile(
                    result
                );

            }
            else {

                console.error(
                    "[UI] Customer 360 failed:",
                    result
                );

            }

        }
        catch (
            requestError
        ) {

            console.error(
                "[UI] Customer 360 failed:",
                requestError
            );

        }

    }


    const titleMap =`;

if (
    !openProfilePattern.test(ui)
) {
    throw new Error(
        "openCustomerProfile block not found."
    );
}

let newUi =
    ui.replace(
        openProfilePattern,
        openProfileReplacement
    );

/*
 * =========================================================
 * 2) Replace CustomerProfileModal completely
 * =========================================================
 */

const modalPattern =
    /function CustomerProfileModal\([\s\S]*\}\s*$/;

const modalReplacement = `function CustomerProfileModal(
    {
        profile,
        onClose
    }
) {

    const customer =
        profile?.profile ||
        profile?.customer ||
        {};

    const rfm =
        profile?.currentRfm ||
        {};

    const behavior =
        profile?.behavior ||
        {};

    const salesSummary =
        profile?.sales?.periodSummary ||
        {};

    const invoices =
        Array.isArray(
            profile?.sales?.recentInvoices
        )
            ? profile.sales.recentInvoices
            : (
                Array.isArray(
                    profile?.invoices
                )
                    ? profile.invoices
                    : []
            );

    const address =
        customer?.full_address ||
        customer?.address ||
        [
            customer?.street_name,
            customer?.area_name
        ]
            .filter(Boolean)
            .join(" - ") ||
        "غير مسجل";

    const phone =
        customer?.whatsapp_phone ||
        customer?.phone_numbers ||
        customer?.phone ||
        customer?.mobile ||
        "غير مسجل";

    const classification =
        rfm?.segmentCode ||
        customer?.segment_code ||
        rfm?.lifecycleStage ||
        customer?.lifecycle_stage ||
        "غير مصنف";

    const recommendedAction =
        rfm?.recommendedAction ||
        customer?.recommended_action ||
        "لا يوجد تصرف مقترح مسجل";

    const totalSales =
        salesSummary?.netSales ??
        customer?.total_net_sales ??
        customer?.total_sales ??
        0;

    const invoiceCount =
        salesSummary?.saleTickets ??
        customer?.total_tickets ??
        customer?.invoices ??
        0;

    const averageInvoice =
        invoiceCount > 0
            ? Number(
                totalSales
            ) /
              Number(
                invoiceCount
            )
            : (
                customer?.average_ticket_value ||
                0
            );

    const lastPurchase =
        salesSummary?.lastPurchaseDate ||
        customer?.last_purchase_date ||
        null;

    const firstPurchase =
        salesSummary?.firstPurchaseDate ||
        customer?.first_purchase_date ||
        null;

    return (

        <div
            style={{
                position:
                    "fixed",

                inset:
                    0,

                background:
                    "rgba(0,0,0,.40)",

                zIndex:
                    9999,

                display:
                    "flex",

                alignItems:
                    "center",

                justifyContent:
                    "center",

                padding:
                    20
            }}
        >

            <div
                style={{
                    background:
                        "#fff",

                    color:
                        "#111827",

                    width:
                        "min(1250px,96vw)",

                    maxHeight:
                        "92vh",

                    overflow:
                        "auto",

                    borderRadius:
                        18,

                    boxShadow:
                        "0 24px 70px rgba(0,0,0,.25)"
                }}
            >

                <div
                    style={{
                        padding:
                            22,

                        display:
                            "flex",

                        justifyContent:
                            "space-between",

                        alignItems:
                            "flex-start",

                        borderBottom:
                            "1px solid #e5e7eb",

                        position:
                            "sticky",

                        top:
                            0,

                        background:
                            "#fff",

                        zIndex:
                            2
                    }}
                >

                    <div>

                        <h2
                            style={{
                                margin:
                                    "0 0 8px",

                                fontSize:
                                    24
                            }}
                        >
                            {
                                getCustomerName(
                                    customer
                                ) ||
                                customer?.customer_name ||
                                "عميل"
                            }
                        </h2>

                        <div
                            style={{
                                color:
                                    "#4b5563",

                                marginBottom:
                                    5
                            }}
                        >
                            الهاتف: {phone}
                        </div>

                        <div
                            style={{
                                color:
                                    "#4b5563"
                            }}
                        >
                            كود العميل: {
                                customer?.customer_code ||
                                customer?.customer_id ||
                                profile?.customerId ||
                                "—"
                            }
                        </div>

                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        style={{
                            border:
                                "1px solid #d1d5db",

                            background:
                                "#fff",

                            borderRadius:
                                10,

                            padding:
                                "8px 14px",

                            cursor:
                                "pointer",

                            fontSize:
                                15
                        }}
                    >
                        إغلاق
                    </button>

                </div>


                <div
                    style={{
                        padding:
                            22
                    }}
                >

                    <div
                        style={{
                            display:
                                "grid",

                            gridTemplateColumns:
                                "repeat(auto-fit,minmax(220px,1fr))",

                            gap:
                                12,

                            marginBottom:
                                18
                        }}
                    >

                        <div
                            style={{
                                padding:
                                    16,

                                borderRadius:
                                    14,

                                background:
                                    "#f8fafc",

                                border:
                                    "1px solid #e5e7eb"
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        "#64748b",

                                    marginBottom:
                                        7
                                }}
                            >
                                العنوان
                            </div>

                            <strong>
                                {address}
                            </strong>
                        </div>


                        <div
                            style={{
                                padding:
                                    16,

                                borderRadius:
                                    14,

                                background:
                                    "#f8fafc",

                                border:
                                    "1px solid #e5e7eb"
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        "#64748b",

                                    marginBottom:
                                        7
                                }}
                            >
                                التصنيف
                            </div>

                            <strong>
                                {classification}
                            </strong>
                        </div>


                        <div
                            style={{
                                padding:
                                    16,

                                borderRadius:
                                    14,

                                background:
                                    "#f8fafc",

                                border:
                                    "1px solid #e5e7eb"
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        "#64748b",

                                    marginBottom:
                                        7
                                }}
                            >
                                مرحلة العميل
                            </div>

                            <strong>
                                {
                                    rfm?.lifecycleStage ||
                                    customer?.lifecycle_stage ||
                                    "غير محددة"
                                }
                            </strong>
                        </div>


                        <div
                            style={{
                                padding:
                                    16,

                                borderRadius:
                                    14,

                                background:
                                    "#f8fafc",

                                border:
                                    "1px solid #e5e7eb"
                            }}
                        >
                            <div
                                style={{
                                    color:
                                        "#64748b",

                                    marginBottom:
                                        7
                                }}
                            >
                                التصرف المقترح
                            </div>

                            <strong>
                                {recommendedAction}
                            </strong>
                        </div>

                    </div>


                    <MetricGrid
                        items={[
                            {
                                label:
                                    "إجمالي المسحوبات",

                                value:
                                    money(
                                        totalSales
                                    )
                            },

                            {
                                label:
                                    "عدد الفواتير",

                                value:
                                    num(
                                        invoiceCount
                                    )
                            },

                            {
                                label:
                                    "متوسط الفاتورة",

                                value:
                                    money(
                                        averageInvoice
                                    )
                            },

                            {
                                label:
                                    "آخر شراء",

                                value:
                                    dateOnly(
                                        lastPurchase
                                    )
                            },

                            {
                                label:
                                    "أول شراء",

                                value:
                                    dateOnly(
                                        firstPurchase
                                    )
                            }

                        ]}
                    />


                    <div
                        style={{
                            marginTop:
                                22,

                            padding:
                                18,

                            borderRadius:
                                14,

                            background:
                                "#f8fafc",

                            border:
                                "1px solid #e5e7eb"
                        }}
                    >

                        <div
                            style={{
                                fontWeight:
                                    700,

                                fontSize:
                                    18,

                                marginBottom:
                                    14
                            }}
                        >
                            تحليل RFM
                        </div>

                        <div
                            style={{
                                display:
                                    "grid",

                                gridTemplateColumns:
                                    "repeat(4,minmax(120px,1fr))",

                                gap:
                                    12
                            }}
                        >

                            <div>
                                <div
                                    style={{
                                        color:
                                            "#64748b"
                                    }}
                                >
                                    R
                                </div>

                                <strong>
                                    {rfm?.r ?? "—"}
                                </strong>
                            </div>

                            <div>
                                <div
                                    style={{
                                        color:
                                            "#64748b"
                                    }}
                                >
                                    F
                                </div>

                                <strong>
                                    {rfm?.f ?? "—"}
                                </strong>
                            </div>

                            <div>
                                <div
                                    style={{
                                        color:
                                            "#64748b"
                                    }}
                                >
                                    M
                                </div>

                                <strong>
                                    {rfm?.m ?? "—"}
                                </strong>
                            </div>

                            <div>
                                <div
                                    style={{
                                        color:
                                            "#64748b"
                                    }}
                                >
                                    RFM
                                </div>

                                <strong>
                                    {rfm?.rfmScore ?? "—"}
                                </strong>
                            </div>

                        </div>

                    </div>


                    <div
                        style={{
                            marginTop:
                                18,

                            padding:
                                18,

                            borderRadius:
                                14,

                            background:
                                "#fff7ed",

                            border:
                                "1px solid #fed7aa"
                        }}
                    >

                        <div
                            style={{
                                fontWeight:
                                    700,

                                marginBottom:
                                    7
                            }}
                        >
                            التصرف المقترح للعميل
                        </div>

                        <div>
                            {recommendedAction}
                        </div>

                    </div>


                    {
                        invoices.length >
                            0 ? (

                            <div
                                className="sales-result"
                                style={{
                                    marginTop:
                                        22
                                }}
                            >

                                <div
                                    className="result-header"
                                >

                                    <strong
                                        style={{
                                            fontSize:
                                                18
                                        }}
                                    >
                                        فواتير العميل بالتفصيل
                                    </strong>

                                    <span>
                                        إجمالي المعروض: {
                                            invoices.length
                                        }
                                    </span>

                                </div>


                                <div
                                    style={{
                                        marginTop:
                                            12
                                    }}
                                >

                                    <GenericTable
                                        rows={
                                            invoices.slice(
                                                0,
                                                300
                                            )
                                        }
                                    />

                                </div>

                            </div>

                        ) : (

                            <div
                                style={{
                                    marginTop:
                                        22,

                                    padding:
                                        18,

                                    borderRadius:
                                        14,

                                    background:
                                        "#f8fafc",

                                    border:
                                        "1px solid #e5e7eb"
                                }}
                            >
                                لا توجد فواتير مسجلة لهذا العميل في الفترة المحددة.
                            </div>

                        )
                    }


                    <div
                        style={{
                            marginTop:
                                18,

                            color:
                                "#64748b",

                            fontSize:
                                13
                        }}
                    >
                        نطاق البيانات:
                        {" "}
                        {
                            profile?.period?.fromDate ||
                            "—"
                        }
                        {" "}
                        إلى
                        {" "}
                        {
                            profile?.period?.toDate ||
                            "—"
                        }
                    </div>

                </div>

            </div>

        </div>

    );

}`;

if (
    !modalPattern.test(newUi)
) {
    throw new Error(
        "CustomerProfileModal block not found."
    );
}

newUi =
    newUi.replace(
        modalPattern,
        modalReplacement
    );

/*
 * =========================================================
 * 3) Customer 360 returns more invoices
 * =========================================================
 */

const invoiceCallPattern =
    /getRecentInvoices\(\s*db,\s*numericBranchId,\s*normalizedCustomerId,\s*20\s*\)/;

if (
    !invoiceCallPattern.test(service)
) {
    throw new Error(
        "Customer 360 recent invoice call not found."
    );
}

const newService =
    service.replace(
        invoiceCallPattern,
        `getRecentInvoices(
            db,
            numericBranchId,
            normalizedCustomerId,
            300
        )`
    );

writeUtf8(
    uiPath,
    newUi
);

writeUtf8(
    servicePath,
    newService
);

console.log(
    "Customer 360 UI + service updated successfully."
);

console.log(
    `UI backup: ${uiBackup}`
);

console.log(
    `Service backup: ${serviceBackup}`
);