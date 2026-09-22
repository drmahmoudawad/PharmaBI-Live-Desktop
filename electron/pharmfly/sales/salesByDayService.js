import {
    getSales
} from "./salesService.js";


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


function createDay(
    date
) {

    return {

        date,

        sales:
            0,

        returns:
            0,

        netSales:
            0,

        cost:
            0,

        profit:
            0,

        units:
            0,

        tickets:
            new Set()

    };

}


export async function getSalesByDay(
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


    const days =
        new Map();


    for (
        const row
        of rows
    ) {

        if (
            !row.date
        ) {

            continue;

        }


        const date =
            String(
                row.date
            ).slice(
                0,
                10
            );


        if (
            !days.has(
                date
            )
        ) {

            days.set(
                date,
                createDay(
                    date
                )
            );

        }


        const day =
            days.get(
                date
            );


        const value =
            Math.abs(
                toNumber(
                    row.netLineValue
                )
            );


        const cost =
            Math.abs(
                toNumber(
                    row.lineCost
                )
            );


        const units =
            Math.abs(
                toNumber(
                    row.baseUnits
                )
            );


        if (
            row.transactionType ===
            "RETURN"
        ) {

            day.returns +=
                value;

            day.cost -=
                cost;

            day.units -=
                units;

        }
        else {

            day.sales +=
                value;

            day.cost +=
                cost;

            day.units +=
                units;

        }


        day.netSales =
            day.sales -
            day.returns;


        day.profit =
            day.netSales -
            day.cost;


        day.tickets.add(
            row.ticketId
        );

    }


    const result =
        Array.from(
            days.values()
        )
        .map(
            day => ({

                date:
                    day.date,

                sales:
                    day.sales,

                returns:
                    day.returns,

                netSales:
                    day.netSales,

                cost:
                    day.cost,

                profit:
                    day.profit,

                units:
                    day.units,

                tickets:
                    day.tickets.size

            })
        )
        .sort(
            (
                a,
                b
            ) =>
                a.date.localeCompare(
                    b.date
                )
        );


    return {

        branchId:
            Number(
                branchId
            ),

        fromDate,

        toDate,

        days:
            result

    };

}


export default {

    getSalesByDay

};