import { app } from "electron";
import { runDeliveryInspection } from "./inspectDeliveryFields.js";

await app.whenReady();

try {
    await runDeliveryInspection();
}
catch (error) {
    console.error("DELIVERY INSPECTION FAILED:");
    console.error(error);
}
finally {
    app.quit();
}
