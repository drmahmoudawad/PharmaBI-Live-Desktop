import { ipcMain } from 'electron';
import { getAnalyticsModule } from '../pharmfly/analyticsHubService.js';

let registered = false;
export function registerAnalyticsHubIpc(){
    if(registered) return;
    registered=true;
    ipcMain.handle('analytics:module', async (_event,payload)=>getAnalyticsModule({
        moduleId:payload?.moduleId,
        branchId:payload?.branchId,
        fromDate:payload?.fromDate,
        toDate:payload?.toDate,
        connection:payload?.connection||null
    }));
    console.log('[Electron] Analytics Hub IPC registered.');
}
export default { registerAnalyticsHubIpc };
