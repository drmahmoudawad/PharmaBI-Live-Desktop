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


function createHour(
    hour
) {

    return {

        hour,

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


function createHours() {

    return Array.from(
        {
            length: 24
        },
        (
            _,
            hour
        ) =>
            createHour(
                hour
            )
    );

}


export async function getSalesByHour(
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


    const hours =
        createHours();


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
            new Date(
                row.date
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            continue;

        }


        const hour =
            date.getHours();


        if (
            hour < 0 ||
            hour > 23
        ) {

            continue;

        }


        const bucket =
            hours[
                hour
            ];


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

            bucket.returns +=
                value;

            bucket.cost -=
                cost;

            bucket.units -=
                units;

        }
        else {

            bucket.sales +=
                value;

            bucket.cost +=
                cost;

            bucket.units +=
                units;

        }


        bucket.netSales =
            bucket.sales -
            bucket.returns;


        bucket.profit =
            bucket.netSales -
            bucket.cost;


        bucket.tickets.add(
            row.ticketId
        );

    }


    return {

        branchId:
            Number(
                branchId
            ),

        fromDate,

        toDate,

        hours:
            hours.map(
                hour => ({

                    hour:
                        hour.hour,

                    sales:
                        hour.sales,

                    returns:
                        hour.returns,

                    netSales:
                        hour.netSales,

                    cost:
                        hour.cost,

                    profit:
                        hour.profit,

                    units:
                        hour.units,

                    tickets:
                        hour.tickets.size

                })
            )

    };

}


export default {

    getSalesByHour

};