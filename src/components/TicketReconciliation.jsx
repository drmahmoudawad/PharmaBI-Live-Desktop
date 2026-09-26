import React from "react";


function formatNumber(
    value
) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US",
        {
            minimumFractionDigits:
                2,

            maximumFractionDigits:
                2
        }
    );

}


export default function TicketReconciliation(
    {
        result,
        loading,
        error,
        onRun
    }
) {

    return (

        <section className="analysis-section">

            <div className="section-title">
                Ticket Reconciliation
            </div>


            <button
                type="button"
                onClick={onRun}
                disabled={loading}
            >

                {
                    loading
                        ? "جاري الفحص..."
                        : "فحص Ticket Reconciliation"
                }

            </button>


            {
                error && (

                    <div className="status error">

                        {
                            error
                        }

                    </div>

                )
            }


            {
                result && (

                    <>

                        <div className="summary-grid">

                            <div className="metric">

                                <span>
                                    Tickets
                                </span>

                                <strong>
                                    {
                                        result.summary.ticketCount
                                            .toLocaleString(
                                                "en-US"
                                            )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Reconciled
                                </span>

                                <strong>
                                    {
                                        result.summary.reconciledTickets
                                            .toLocaleString(
                                                "en-US"
                                            )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Unreconciled
                                </span>

                                <strong>
                                    {
                                        result.summary.unreconciledTickets
                                            .toLocaleString(
                                                "en-US"
                                            )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Reconciliation Rate
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            result.summary.reconciliationRate
                                        )
                                    }
                                    %
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Absolute Difference
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            result.summary.absoluteDifference
                                        )
                                    }
                                </strong>

                            </div>


                            <div className="metric">

                                <span>
                                    Tolerance
                                </span>

                                <strong>
                                    {
                                        formatNumber(
                                            result.tolerance
                                        )
                                    }
                                </strong>

                            </div>

                        </div>


                        {
                            result.summary.unreconciledTickets >
                            0 && (

                                <div className="sales-result">

                                    <div className="result-header">

                                        <strong>
                                            أكبر الفروقات
                                        </strong>

                                        <span>
                                            {
                                                result
                                                    .largestDifferences
                                                    .length
                                            }
                                        </span>

                                    </div>


                                    <div className="table-wrap">

                                        <table>

                                            <thead>

                                                <tr>

                                                    <th>
                                                        Ticket
                                                    </th>

                                                    <th>
                                                        Date
                                                    </th>

                                                    <th>
                                                        الإجمالي
                                                    </th>

                                                    <th>
                                                        Line Net
                                                    </th>

                                                    <th>
                                                        Difference
                                                    </th>

                                                    <th>
                                                        Cost
                                                    </th>

                                                    <th>
                                                        Lines
                                                    </th>

                                                </tr>

                                            </thead>


                                            <tbody>

                                                {
                                                    result
                                                        .largestDifferences
                                                        .map(
                                                            ticket => (

                                                                <tr
                                                                    key={
                                                                        ticket.ticketId
                                                                    }
                                                                >

                                                                    <td>
                                                                        {
                                                                            ticket.ticketId
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            ticket.date ||
                                                                            "—"
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            formatNumber(
                                                                                ticket.ticketTotal
                                                                            )
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            formatNumber(
                                                                                ticket.lineNet
                                                                            )
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            formatNumber(
                                                                                ticket.reconciliationDifference
                                                                            )
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            formatNumber(
                                                                                ticket.lineCost
                                                                            )
                                                                        }
                                                                    </td>

                                                                    <td>
                                                                        {
                                                                            ticket.lineCount
                                                                        }
                                                                    </td>

                                                                </tr>

                                                            )
                                                        )
                                                }

                                            </tbody>

                                        </table>

                                    </div>

                                </div>

                            )
                        }

                    </>

                )
            }

        </section>

    );

}