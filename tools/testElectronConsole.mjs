console.log("BENCHMARK SCRIPT STARTED");

import { app } from "electron";

console.log("ELECTRON IMPORT OK");

await app.whenReady();

console.log("ELECTRON READY");

app.quit();
