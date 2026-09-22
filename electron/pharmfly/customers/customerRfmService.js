import {
    getSales
} from "../sales/salesService.js";


function toNumber(
    value
) {

    const number =
        Number(
            value
        );


    return Number.isFinite(
        number
    )
        ? number
        : 0;

}


function round2(
    value
) {

    return Math.round(
        (
            toNumber(
                value
            ) +
            Number.EPSILON
        ) * 100
    ) / 100;

}


function parseDate(
    value
) {

    if (
        !value
    ) {

        return null;

    }


    const date =
        new Date(
            value
        );


    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;

}


function createAnalysisDate(
    toDate
) {

    const text =
        String(
            toDate ||
            ""
        ).trim();


    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            text
        )
    ) {

        throw new Error(
            "Invalid toDate. Expected YYYY-MM-DD"
        );

    }


    return new Date(
        `${text}T23:59:59.999Z`
    );

}


function calculateRecencyDays(
    lastPurchaseDate,
    analysisDate
) {

    if (
        !lastPurchaseDate ||
        !analysisDate
    ) {

        return null;

    }


    const difference =
        analysisDate.getTime() -
        lastPurchaseDate.getTime();


    return Math.max(
        0,
        Math.floor(
            difference /
            (
                1000 *
                60 *
                60 *
                24
            )
        )
    );

}


function percentileRank(
    values,
    value
) {

    if (
        values.length === 0
    ) {

        return 0.5;

    }


    let less =
        0;


    let equal =
        0;


    for (
        const item
        of values
    ) {

        if (
            item < value
        ) {

            less +=
                1;

        }
        else if (
            item === value
        ) {

            equal +=
                1;

        }

    }


    return (
        less +
        equal / 2
    ) /
    values.length;

}


function scoreRecency(
    values,
    value
) {

    const rank =
        percentileRank(
            values,
            value
        );


    /*
     * Lower recency is better.
     */

    if (
        rank <= 0.20
    ) {

        return 5;

    }


    if (
        rank <= 0.40
    ) {

        return 4;

    }


    if (
        rank <= 0.60
    ) {

        return 3;

    }


    if (
        rank <= 0.80
    ) {

        return 2;

    }


    return 1;

}


function scoreHigherIsBetter(
    values,
    value
) {

    const rank =
        percentileRank(
            values,
            value
        );


    if (
        rank > 0.80
    ) {

        return 5;

    }


    if (
        rank > 0.60
    ) {

        return 4;

    }


    if (
        rank > 0.40
    ) {

        return 3;

    }


    if (
        rank > 0.20
    ) {

        return 2;

    }


    return 1;

}


function getSegment(
    r,
    f,
    m
) {

    const total =
        r +
        f +
        m;


    if (
        r >= 4 &&
        f >= 4 &&
        m >= 4
    ) {

        return {

            code:
                "CHAMPIONS",

            name:
                "أبطال",

            description:
                "عملاء حديثو الشراء، متكررون وذوو قيمة عالية",

            priority:
                "HIGH"

        };

    }


    if (
        r >= 4 &&
        f >= 3
    ) {

        return {

            code:
                "LOYAL",

            name:
                "عملاء أوفياء",

            description:
                "يشترون بشكل متكرر وما زال نشاطهم حديثًا",

            priority:
                "HIGH"

        };

    }


    if (
        r >= 4 &&
        f <= 2
    ) {

        return {

            code:
                "NEW_OR_PROMISING",

            name:
                "جدد / واعدون",

            description:
                "عملاء حديثو الشراء لكن تكرارهم ما زال منخفضًا",

            priority:
                "MEDIUM"

        };

    }


    if (
        r === 3 &&
        f >= 3
    ) {

        return {

            code:
                "POTENTIAL_LOYAL",

            name:
                "قابلون للولاء",

            description:
                "لديهم سلوك شراء جيد ويحتاجون للتنشيط المستمر",

            priority:
                "MEDIUM"

        };

    }


    if (
        r <= 2 &&
        f >= 4 &&
        m >= 4
    ) {

        return {

            code:
                "AT_RISK",

            name:
                "معرضون للفقد",

            description:
                "عملاء مهمون لكن مضى وقت على آخر شراء",

            priority:
                "HIGH"

        };

    }


    if (
        r <= 2 &&
        f >= 3
    ) {

        return {

            code:
                "NEED_ATTENTION",

            name:
                "بحاجة لتنشيط",

            description:
                "عملاء سابقون جيدون لكن نشاطهم انخفض",

            priority:
                "MEDIUM"

        };

    }


    if (
        r <= 2 &&
        f <= 2
    ) {

        return {

            code:
                "DORMANT",

            name:
                "خامدون",

            description:
                "نشاطهم منخفض ولم يشتروا منذ فترة",

            priority:
                "LOW"

        };

    }


    if (
        total >= 10
    ) {

        return {

            code:
                "GOOD",

            name:
                "عملاء جيدون",

            description:
                "أداء إجمالي جيد",

            priority:
                "MEDIUM"

        };

    }


    return {

        code:
            "REGULAR",

        name:
            "عاديون",

        description:
            "سلوك شراء اعتيادي",

        priority:
            "LOW"

    };

}


function getActionProfile(
    segmentCode
) {

    const profiles = {

        AT_RISK: {

            priorityWeights: {
                r: 0.15,
                f: 0.30,
                m: 0.55
            },

            urgencyWeights: {
                inverseR: 0.50,
                f: 0.20,
                m: 0.30
            },

            action:
                "تواصل سريعًا مع العميل بعرض مخصص لإعادة الشراء"

        },


        NEED_ATTENTION: {

            priorityWeights: {
                r: 0.20,
                f: 0.35,
                m: 0.45
            },

            urgencyWeights: {
                inverseR: 0.45,
                f: 0.35,
                m: 0.20
            },

            action:
                "أرسل تنشيطًا مباشرًا مع عرض مناسب لإعادة الزيارة"

        },


        CHAMPIONS: {

            priorityWeights: {
                r: 0.25,
                f: 0.30,
                m: 0.45
            },

            urgencyWeights: {
                inverseR: 0.15,
                f: 0.35,
                m: 0.50
            },

            action:
                "حافظ على العميل وقدم مزايا حصرية وحوافز للشراء المتكرر"

        },


        LOYAL: {

            priorityWeights: {
                r: 0.25,
                f: 0.35,
                m: 0.40
            },

            urgencyWeights: {
                inverseR: 0.20,
                f: 0.35,
                m: 0.45
            },

            action:
                "حفز العميل على زيادة قيمة السلة وتحويله إلى Champion"

        },


        POTENTIAL_LOYAL: {

            priorityWeights: {
                r: 0.25,
                f: 0.40,
                m: 0.35
            },

            urgencyWeights: {
                inverseR: 0.30,
                f: 0.40,
                m: 0.30
            },

            action:
                "شجع تكرار الشراء بعرض مرتبط بعاداته الشرائية"

        },


        DORMANT: {

            priorityWeights: {
                r: 0.15,
                f: 0.35,
                m: 0.50
            },

            urgencyWeights: {
                inverseR: 0.45,
                f: 0.20,
                m: 0.35
            },

            action:
                "نفذ حملة إعادة تنشيط واختبر سبب توقف الشراء"

        },


        NEW_OR_PROMISING: {

            priorityWeights: {
                r: 0.40,
                f: 0.35,
                m: 0.25
            },

            urgencyWeights: {
                inverseR: 0.25,
                f: 0.45,
                m: 0.30
            },

            action:
                "حوّل أولى المشتريات إلى عادة شراء متكررة"

        },


        GOOD: {

            priorityWeights: {
                r: 0.25,
                f: 0.35,
                m: 0.40
            },

            urgencyWeights: {
                inverseR: 0.25,
                f: 0.40,
                m: 0.35
            },

            action:
                "حافظ على النشاط وراقب انتقال العميل إلى شريحة أعلى"

        },


        REGULAR: {

            priorityWeights: {
                r: 0.25,
                f: 0.40,
                m: 0.35
            },

            urgencyWeights: {
                inverseR: 0.25,
                f: 0.40,
                m: 0.35
            },

            action:
                "راقب السلوك وحفز العميل على زيادة تكرار الشراء"

        }

    };


    return profiles[
        segmentCode
    ] || profiles.REGULAR;

}


function weightedScore(
    r,
    f,
    m,
    weights
) {

    const score =
        (
            r *
            weights.r
        ) +
        (
            f *
            weights.f
        ) +
        (
            m *
            weights.m
        );


    return Math.min(
        100,
        Math.max(
            0,
            Math.round(
                (
                    score /
                    5
                ) * 100
            )
        )
    );

}


function urgencyScore(
    r,
    f,
    m,
    weights
) {

    const inverseR =
        6 -
        r;


    const score =
        (
            inverseR *
            weights.inverseR
        ) +
        (
            f *
            weights.f
        ) +
        (
            m *
            weights.m
        );


    return Math.min(
        100,
        Math.max(
            0,
            Math.round(
                (
                    score /
                    5
                ) * 100
            )
        )
    );

}


function getPriorityLevel(
    score
) {

    if (
        score >= 85
    ) {

        return "URGENT";

    }


    if (
        score >= 70
    ) {

        return "HIGH";

    }


    if (
        score >= 50
    ) {

        return "MEDIUM";

    }


    return "LOW";

}


function aggregateCustomers(
    rows
) {

    const customers =
        new Map();


    for (
        const row
        of rows
    ) {

        if (
            !row.customerId
        ) {

            continue;

        }


        if (
            Number(
                row.customerId
            ) <= 0
        ) {

            continue;

        }


        if (
            row.transactionType !==
                "SALE" &&
            row.transactionType !==
                "RETURN"
        ) {

            continue;

        }


        const customerId =
            String(
                row.customerId
            );


        if (
            !customers.has(
                customerId
            )
        ) {

            customers.set(
                customerId,
                {

                    customerId,

                    customerName:
                        row.customerName ||
                        "غير معروف",

                    grossSales:
                        0,

                    returns:
                        0,

                    netSales:
                        0,

                    tickets:
                        new Set(),

                    units:
                        0,

                    lastPurchaseDate:
                        null

                }
            );

        }


        const customer =
            customers.get(
                customerId
            );


        const value =
            Math.abs(
                toNumber(
                    row.netLineValue
                )
            );


        const units =
            Math.abs(
                toNumber(
                    row.baseUnits
                )
            );


        const date =
            parseDate(
                row.date
            );


        if (
            row.transactionType ===
            "RETURN"
        ) {

            customer.returns +=
                value;

        }
        else {

            customer.grossSales +=
                value;

            customer.units +=
                units;


            if (
                row.ticketId !== null &&
                row.ticketId !== undefined
            ) {

                customer.tickets.add(
                    String(
                        row.ticketId
                    )
                );

            }


            if (
                date &&
                (
                    !customer.lastPurchaseDate ||
                    date.getTime() >
                    customer.lastPurchaseDate.getTime()
                )
            ) {

                customer.lastPurchaseDate =
                    date;

            }

        }


        customer.netSales =
            customer.grossSales -
            customer.returns;

    }


    return Array.from(
        customers.values()
    );

}


function buildSegments(
    customers
) {

    const map =
        new Map();


    for (
        const customer
        of customers
    ) {

        if (
            !map.has(
                customer.segmentCode
            )
        ) {

            map.set(

                customer.segmentCode,

                {

                    code:
                        customer.segmentCode,

                    name:
                        customer.segment,

                    priority:
                        customer.priority,

                    customers:
                        0,

                    netSales:
                        0

                }

            );

        }


        const segment =
            map.get(
                customer.segmentCode
            );


        segment.customers +=
            1;


        segment.netSales +=
            customer.netSales;

    }


    return Array.from(
        map.values()
    )
    .map(
        segment => ({

            ...segment,

            netSales:
                round2(
                    segment.netSales
                )

        })
    )
    .sort(
        (
            a,
            b
        ) =>
            b.netSales -
            a.netSales
    );

}


export async function getCustomerRfm(
    {
        branchId,
        connection,
        fromDate,
        toDate,
        limit = 100
    }
) {

    const rows =
        await getSales({

            branchId,

            connection,

            fromDate,

            toDate

        });


    const analysisDate =
        createAnalysisDate(
            toDate
        );


    const baseCustomers =
        aggregateCustomers(
            rows
        )
        .map(
            customer => ({

                customerId:
                    customer.customerId,

                customerName:
                    customer.customerName,

                grossSales:
                    round2(
                        customer.grossSales
                    ),

                returns:
                    round2(
                        customer.returns
                    ),

                netSales:
                    round2(
                        customer.netSales
                    ),

                tickets:
                    customer.tickets.size,

                units:
                    round2(
                        customer.units
                    ),

                lastPurchaseDate:
                    customer.lastPurchaseDate
                        ? customer.lastPurchaseDate.toISOString()
                        : null,

                recencyDays:
                    calculateRecencyDays(
                        customer.lastPurchaseDate,
                        analysisDate
                    )

            })
        )
        .filter(
            customer =>
                customer.recencyDays !== null
        );


    if (
        baseCustomers.length === 0
    ) {

        return {

            success:
                true,

            branchId:
                Number(
                    branchId
                ),

            fromDate,

            toDate,

            analysisDate:
                analysisDate.toISOString(),

            summary: {

                customers:
                    0,

                averageRecencyDays:
                    0,

                averageFrequency:
                    0,

                averageMonetary:
                    0,

                segments:
                    [],

                customerIntelligence: {

                    totalCustomers:
                        0,

                    totalNetSales:
                        0,

                    champions:
                        {
                            customers: 0,
                            netSales: 0
                        },

                    atRisk:
                        {
                            customers: 0,
                            netSales: 0
                        },

                    dormant:
                        {
                            customers: 0,
                            netSales: 0
                        },

                    reactivationOpportunity:
                        {
                            customers: 0,
                            netSales: 0
                        }

                }

            },

            customers:
                []

        };

    }


    const recencyValues =
        baseCustomers.map(
            customer =>
                customer.recencyDays
        );


    const frequencyValues =
        baseCustomers.map(
            customer =>
                customer.tickets
        );


    const monetaryValues =
        baseCustomers.map(
            customer =>
                customer.netSales
        );


    const scoredCustomers =
        baseCustomers
        .map(
            customer => {

                const r =
                    scoreRecency(
                        recencyValues,
                        customer.recencyDays
                    );


                const f =
                    scoreHigherIsBetter(
                        frequencyValues,
                        customer.tickets
                    );


                const m =
                    scoreHigherIsBetter(
                        monetaryValues,
                        customer.netSales
                    );


                const segment =
                    getSegment(
                        r,
                        f,
                        m
                    );


                const profile =
                    getActionProfile(
                        segment.code
                    );


                const priorityScore =
                    weightedScore(
                        r,
                        f,
                        m,
                        profile.priorityWeights
                    );


                const customerUrgency =
                    urgencyScore(
                        r,
                        f,
                        m,
                        profile.urgencyWeights
                    );


                return {

                    ...customer,

                    r,

                    f,

                    m,

                    rfmScore:
                        `${r}${f}${m}`,

                    rfmTotal:
                        r +
                        f +
                        m,

                    segmentCode:
                        segment.code,

                    segment:
                        segment.name,

                    segmentDescription:
                        segment.description,

                    priority:
                        segment.priority,

                    priorityScore,

                    urgencyScore:
                        customerUrgency,

                    priorityLevel:
                        getPriorityLevel(
                            customerUrgency
                        ),

                    recommendedAction:
                        profile.action

                };

            }
        )
        .sort(
            (
                a,
                b
            ) => {

                if (
                    b.urgencyScore !==
                    a.urgencyScore
                ) {

                    return (
                        b.urgencyScore -
                        a.urgencyScore
                    );

                }


                if (
                    b.priorityScore !==
                    a.priorityScore
                ) {

                    return (
                        b.priorityScore -
                        a.priorityScore
                    );

                }


                return (
                    b.netSales -
                    a.netSales
                );

            }
        );


    const normalizedLimit =
        Number.isFinite(
            Number(
                limit
            )
        ) &&
        Number(
            limit
        ) > 0

            ? Math.min(
                Math.floor(
                    Number(
                        limit
                    )
                ),
                5000
            )

            : 100;


    const segments =
        buildSegments(
            scoredCustomers
        );


    const totalNetSales =
        scoredCustomers.reduce(
            (
                total,
                customer
            ) =>
                total +
                customer.netSales,
            0
        );


    const champions =
        scoredCustomers.filter(
            customer =>
                customer.segmentCode ===
                "CHAMPIONS"
        );


    const atRisk =
        scoredCustomers.filter(
            customer =>
                customer.segmentCode ===
                "AT_RISK"
        );


    const dormant =
        scoredCustomers.filter(
            customer =>
                customer.segmentCode ===
                "DORMANT"
        );


    const reactivation =
        scoredCustomers.filter(
            customer =>
                customer.segmentCode ===
                    "AT_RISK" ||
                customer.segmentCode ===
                    "NEED_ATTENTION" ||
                customer.segmentCode ===
                    "DORMANT"
        );


    const customerIntelligence = {

        totalCustomers:
            scoredCustomers.length,

        totalNetSales:
            round2(
                totalNetSales
            ),

        champions: {

            customers:
                champions.length,

            netSales:
                round2(
                    champions.reduce(
                        (
                            total,
                            customer
                        ) =>
                            total +
                            customer.netSales,
                        0
                    )
                )

        },

        atRisk: {

            customers:
                atRisk.length,

            netSales:
                round2(
                    atRisk.reduce(
                        (
                            total,
                            customer
                        ) =>
                            total +
                            customer.netSales,
                        0
                    )
                )

        },

        dormant: {

            customers:
                dormant.length,

            netSales:
                round2(
                    dormant.reduce(
                        (
                            total,
                            customer
                        ) =>
                            total +
                            customer.netSales,
                        0
                    )
                )

        },

        reactivationOpportunity: {

            customers:
                reactivation.length,

            netSales:
                round2(
                    reactivation.reduce(
                        (
                            total,
                            customer
                        ) =>
                            total +
                            customer.netSales,
                        0
                    )
                )

        }

    };


    return {

        success:
            true,

        branchId:
            Number(
                branchId
            ),

        fromDate,

        toDate,

        analysisDate:
            analysisDate.toISOString(),

        summary: {

            customers:
                scoredCustomers.length,

            averageRecencyDays:
                round2(
                    scoredCustomers.reduce(
                        (
                            total,
                            customer
                        ) =>
                            total +
                            customer.recencyDays,
                        0
                    ) /
                    scoredCustomers.length
                ),

            averageFrequency:
                round2(
                    scoredCustomers.reduce(
                        (
                            total,
                            customer
                        ) =>
                            total +
                            customer.tickets,
                        0
                    ) /
                    scoredCustomers.length
                ),

            averageMonetary:
                round2(
                    scoredCustomers.reduce(
                        (
                            total,
                            customer
                        ) =>
                            total +
                            customer.netSales,
                        0
                    ) /
                    scoredCustomers.length
                ),

            segments,

            customerIntelligence

        },

        customers:
            scoredCustomers.slice(
                0,
                normalizedLimit
            )

    };

}


export default {

    getCustomerRfm

};