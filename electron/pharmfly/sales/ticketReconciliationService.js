import {
    getSales
} from "./salesService.js";


const RECONCILIATION_TOLERANCE =
    0.05;


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


function buildTicket(
    row
) {

    return {

        ticketId:
            row.ticketId,

        date:
            row.date,

        transactionType:
            row.transactionType,

        ticketTotal:
            toNumber(
                row.ticketTotal
            ),

        lineGross:
            0,

        lineDiscount:
            0,

        lineExtraDiscount:
            0,

        lineNet:
            0,

        lineCost:
            0,

        units:
            0,

        lineCount:
            0

    };

}


function aggregateTickets(
    rows
) {

    const tickets =
        new Map();


    for (
        const row
        of rows
    ) {

        const ticketId =
            String(
                row.ticketId
            );


        if (
            !tickets.has(
                ticketId
            )
        ) {

            tickets.set(
                ticketId,
                buildTicket(
                    row
                )
            );

        }


        const ticket =
            tickets.get(
                ticketId
            );


        ticket.lineGross +=
            toNumber(
                row.grossLineValue
            );


        ticket.lineDiscount +=
            toNumber(
                row.discount
            );


        ticket.lineExtraDiscount +=
            toNumber(
                row.extraDiscount
            );


        ticket.lineNet +=
            toNumber(
                row.netLineValue
            );


        ticket.lineCost +=
            toNumber(
                row.lineCost
            );


        ticket.units +=
            toNumber(
                row.baseUnits
            );


        ticket.lineCount +=
            1;

    }


    return Array.from(
        tickets.values()
    )
        .map(
            ticket => {

                const ticketTotal =
                    round2(
                        ticket.ticketTotal
                    );


                const lineGross =
                    round2(
                        ticket.lineGross
                    );


                const lineDiscount =
                    round2(
                        ticket.lineDiscount
                    );


                const lineExtraDiscount =
                    round2(
                        ticket.lineExtraDiscount
                    );


                const lineNet =
                    round2(
                        ticket.lineNet
                    );


                const lineCost =
                    round2(
                        ticket.lineCost
                    );


                const units =
                    round2(
                        ticket.units
                    );


                const difference =
                    round2(
                        ticketTotal -
                        lineNet
                    );


                return {

                    ticketId:
                        ticket.ticketId,

                    date:
                        ticket.date,

                    transactionType:
                        ticket.transactionType,

                    ticketTotal,

                    lineGross,

                    lineDiscount,

                    lineExtraDiscount,

                    lineNet,

                    lineCost,

                    units,

                    lineCount:
                        ticket.lineCount,

                    reconciliationDifference:
                        difference,

                    absDifference:
                        Math.abs(
                            difference
                        ),

                    profitFromHeader:
                        round2(
                            ticketTotal -
                            lineCost
                        ),

                    profitFromLines:
                        round2(
                            lineNet -
                            lineCost
                        ),

                    isReconciled:
                        Math.abs(
                            difference
                        ) <=
                        RECONCILIATION_TOLERANCE

                };

            }
        );

}


export async function getTicketReconciliation(
    {
        branchId,
        connection,
        fromDate,
        toDate
    }
) {

    const rows =
        await getSales({

            branchId,

            connection,

            fromDate,

            toDate

        });


    const tickets =
        aggregateTickets(
            rows
        );


    const reconciledTickets =
        tickets.filter(
            ticket =>
                ticket.isReconciled
        );


    const unreconciledTickets =
        tickets
            .filter(
                ticket =>
                    !ticket.isReconciled
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.absDifference -
                    a.absDifference
            );


    const absoluteDifference =
        tickets.reduce(
            (
                total,
                ticket
            ) =>
                total +
                ticket.absDifference,
            0
        );


    return {

        branchId:
            Number(
                branchId
            ),

        fromDate,

        toDate,

        tolerance:
            RECONCILIATION_TOLERANCE,

        summary: {

            ticketCount:
                tickets.length,

            reconciledTickets:
                reconciledTickets.length,

            unreconciledTickets:
                unreconciledTickets.length,

            reconciliationRate:
                tickets.length > 0

                    ? round2(
                        (
                            reconciledTickets.length /
                            tickets.length
                        ) * 100
                    )

                    : 0,

            absoluteDifference:
                round2(
                    absoluteDifference
                )

        },

        largestDifferences:
            unreconciledTickets.slice(
                0,
                50
            )

    };

}


export default {

    getTicketReconciliation

};