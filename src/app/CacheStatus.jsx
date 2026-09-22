import {
    useEffect,
    useMemo,
    useState
} from "react";


import {
    normalizeBranchName,
    isBranchActive
} from "./appHelpers.js";


function formatNumber(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US"
    );

}


function formatDate(value) {

    if (!value) {
        return "—";
    }

    return String(value).slice(
        0,
        10
    );

}


export default function CacheStatus({
    savedBranches = [],
    activeConnections = []
}) {

    const [
        coverage,
        setCoverage
    ] = useState({});


    const [
        loading,
        setLoading
    ] = useState(true);


    const [
        error,
        setError
    ] = useState("");


    useEffect(() => {

        let cancelled = false;


        async function loadCoverage() {

            if (
                !Array.isArray(savedBranches) ||
                savedBranches.length === 0
            ) {

                setCoverage({});
                setLoading(false);

                return;

            }


            setLoading(true);
            setError("");


            const results =
                await Promise.all(

                    savedBranches.map(
                        async branch => {

                            const branchId =
                                Number(
                                    branch?.branchId
                                );


                            try {

                                const result =
                                    await window
                                        .pharmaBI
                                        .sales
                                        .cacheCoverage({

                                            branchId,

                                            startYear:
                                                2000

                                        });


                                return [
                                    branchId,
                                    result
                                ];

                            }
                            catch (
                                branchError
                            ) {

                                return [
                                    branchId,
                                    {
                                        success: false,
                                        error:
                                            branchError?.message ||
                                            "فشل قراءة الكاش"
                                    }
                                ];

                            }

                        }
                    )

                );


            if (cancelled) {
                return;
            }


            const nextCoverage = {};


            for (
                const [
                    branchId,
                    result
                ]
                of results
            ) {

                nextCoverage[
                    branchId
                ] = result;

            }


            setCoverage(
                nextCoverage
            );

            setLoading(false);

        }


        loadCoverage()
            .catch(error => {

                if (cancelled) {
                    return;
                }

                console.error(
                    "[CacheStatus] Coverage load failed:",
                    error
                );

                setError(
                    error?.message ||
                    "فشل تحميل حالة الكاش."
                );

                setLoading(false);

            });


        return () => {

            cancelled = true;

        };

    }, [
        savedBranches
    ]);


    const totals =
        useMemo(
            () => {

                let months = 0;
                let rows = 0;


                for (
                    const result
                    of Object.values(
                        coverage
                    )
                ) {

                    months +=
                        Number(
                            result?.cachedMonths || 0
                        );


                    rows +=
                        Number(
                            result?.cachedRows || 0
                        );

                }


                return {
                    months,
                    rows
                };

            },
            [
                coverage
            ]
        );


    return (

        <section className="page-card">

            <div className="page-header">

                <div>

                    <div className="page-eyebrow">
                        النظام
                    </div>


                    <h2>
                        حالة التخزين المؤقت
                    </h2>


                    <p>
                        حالة الاتصالات ومدى توفر بيانات المبيعات المخزنة مؤقتًا لكل فرع.
                    </p>

                </div>

            </div>


            <div className="kpi-grid">

                <div className="kpi-card">

                    <span>
                        الفروع المحفوظة
                    </span>

                    <strong>
                        {
                            formatNumber(
                                savedBranches.length
                            )
                        }
                    </strong>

                </div>


                <div className="kpi-card">

                    <span>
                        الاتصالات النشطة
                    </span>

                    <strong>
                        {
                            formatNumber(
                                activeConnections.length
                            )
                        }
                    </strong>

                </div>


                <div className="kpi-card">

                    <span>
                        الشهور المخزنة
                    </span>

                    <strong>
                        {
                            loading
                                ? "..."
                                : formatNumber(
                                    totals.months
                                )
                        }
                    </strong>

                </div>


                <div className="kpi-card">

                    <span>
                        السجلات المخزنة
                    </span>

                    <strong>
                        {
                            loading
                                ? "..."
                                : formatNumber(
                                    totals.rows
                                )
                        }
                    </strong>

                </div>

            </div>


            {
                error && (

                    <div className="table-card">

                        <div className="table-card-header">

                            <div>

                                <strong>
                                    خطأ
                                </strong>

                                <span>
                                    {error}
                                </span>

                            </div>

                        </div>

                    </div>

                )
            }


            <div className="table-card">

                <div className="table-card-header">

                    <div>

                        <strong>
                            تغطية بيانات المبيعات
                        </strong>

                        <span>
                            أقدم وأحدث تاريخ فعلي موجود داخل الكاش الشهري
                        </span>

                    </div>

                </div>


                <div className="table-wrap">

                    <table>

                        <thead>

                            <tr>

                                <th>المعرّف</th>
                                <th>الفرع</th>
                                <th>الاتصال</th>
                                <th>أقدم تاريخ</th>
                                <th>أحدث تاريخ</th>
                                <th>الشهور</th>
                                <th>السجلات</th>
                                <th>الخادم</th>
                                <th>قاعدة البيانات</th>

                            </tr>

                        </thead>


                        <tbody>

                            {
                                savedBranches.length === 0

                                    ? (

                                        <tr>

                                            <td
                                                colSpan={9}
                                                style={{
                                                    textAlign: "center"
                                                }}
                                            >
                                                لا توجد فروع محفوظة.
                                            </td>

                                        </tr>

                                    )

                                    : savedBranches.map(
                                        branch => {

                                            const branchId =
                                                Number(
                                                    branch?.branchId
                                                );


                                            const result =
                                                coverage[
                                                    branchId
                                                ] || null;


                                            const active =
                                                isBranchActive(
                                                    activeConnections,
                                                    branchId
                                                );


                                            return (

                                                <tr
                                                    key={
                                                        branchId
                                                    }
                                                >

                                                    <td>
                                                        {branchId}
                                                    </td>


                                                    <td>

                                                        <strong>
                                                            {
                                                                normalizeBranchName(
                                                                    branch
                                                                )
                                                            }
                                                        </strong>

                                                    </td>


                                                    <td>

                                                        <span>

                                                            <span
                                                                className={
                                                                    active
                                                                        ? "mode-dot branch"
                                                                        : "mode-dot"
                                                                }
                                                            />

                                                            {" "}

                                                            {
                                                                active
                                                                    ? "متصل"
                                                                    : "غير متصل"
                                                            }

                                                        </span>

                                                    </td>


                                                    <td>

                                                        {
                                                            loading && !result

                                                                ? "..."

                                                                : result?.success === false

                                                                    ? "خطأ"

                                                                    : formatDate(
                                                                        result?.earliestDate
                                                                    )
                                                        }

                                                    </td>


                                                    <td>

                                                        <strong>

                                                            {
                                                                loading && !result

                                                                    ? "..."

                                                                    : result?.success === false

                                                                        ? "خطأ"

                                                                        : formatDate(
                                                                            result?.latestDate
                                                                        )
                                                            }

                                                        </strong>

                                                    </td>


                                                    <td>

                                                        {
                                                            loading && !result
                                                                ? "..."
                                                                : formatNumber(
                                                                    result?.cachedMonths
                                                                )
                                                        }

                                                    </td>


                                                    <td>

                                                        {
                                                            loading && !result
                                                                ? "..."
                                                                : formatNumber(
                                                                    result?.cachedRows
                                                                )
                                                        }

                                                    </td>


                                                    <td>
                                                        {
                                                            branch?.server ||
                                                            "—"
                                                        }
                                                    </td>


                                                    <td>
                                                        {
                                                            branch?.database ||
                                                            "—"
                                                        }
                                                    </td>

                                                </tr>

                                            );

                                        }
                                    )

                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </section>

    );

}