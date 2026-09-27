import {
    app
} from "electron";

import getWhatsAppService
    from "../electron/pharmfly/customers/crm/whatsappService.js";


let stopped =
    false;


function finish(
    code = 0
) {

    if (
        stopped
    ) {

        return;

    }

    stopped =
        true;

    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "[WhatsApp Runtime Test] FINISHED"
    );
    console.log(
        "============================================================"
    );

    try {

        app.quit();

    }
    catch {
        process.exit(code);
    }

}


app.whenReady()
    .then(
        async () => {

            console.log("");
            console.log(
                "============================================================"
            );
            console.log(
                "[WhatsApp Runtime Test] START"
            );
            console.log(
                "============================================================"
            );


            const service =
                getWhatsAppService();


            service.setEventSink(
                (
                    event,
                    payload
                ) => {

                    console.log(
                        "[WhatsApp EVENT]",
                        event,
                        payload
                    );

                }
            );


            try {

                const result =
                    await service.initialize();


                console.log(
                    "[WhatsApp INIT RESULT]",
                    result
                );

            }
            catch (
                error
            ) {

                console.error(
                    "[WhatsApp INIT ERROR]",
                    error
                );

                finish(1);

                return;

            }


            let count =
                0;


            const timer =
                setInterval(
                    async () => {

                        count += 1;


                        try {

                            const status =
                                await service.getStatus();


                            console.log(
                                `[WhatsApp STATUS ${count}]`,
                                status
                            );


                            if (
                                status?.status ===
                                "ready"
                            ) {

                                console.log(
                                    "[WhatsApp Runtime Test] READY detected."
                                );

                                clearInterval(
                                    timer
                                );


                                setTimeout(
                                    async () => {

                                        try {

                                            await service.destroy();

                                        }
                                        catch {
                                            // Ignore cleanup errors.
                                        }

                                        finish(0);

                                    },
                                    2000
                                );

                                return;

                            }


                            if (
                                count >= 10
                            ) {

                                clearInterval(
                                    timer
                                );


                                console.log(
                                    "[WhatsApp Runtime Test] 20-second observation completed."
                                );


                                try {

                                    await service.destroy();

                                }
                                catch {
                                    // Ignore cleanup errors.
                                }


                                finish(0);

                            }

                        }
                        catch (
                            error
                        ) {

                            console.error(
                                "[WhatsApp STATUS ERROR]",
                                error
                            );

                            clearInterval(
                                timer
                            );


                            try {

                                await service.destroy();

                            }
                            catch {
                                // Ignore cleanup errors.
                            }


                            finish(1);

                        }

                    },
                    2000
                );

        }
    )
    .catch(
        error => {

            console.error(
                "[WhatsApp Runtime Test] FATAL:",
                error
            );

            finish(1);

        }
    );