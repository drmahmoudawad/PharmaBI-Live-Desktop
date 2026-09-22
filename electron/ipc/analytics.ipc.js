import { ipcMain } from 'electron';
import { getAnalyticsModule } from '../pharmfly/analytics/analyticsService.js';

let registered = false;

export function registerAnalyticsIpc() {
    if (registered) return;
    registered = true;

    ipcMain.handle('analytics:module', async (_event, payload) => {
        const branchId = payload?.branchId ?? payload?.branch_id;
        if (branchId == null) {
            throw new Error('A branch is required.');
        }

        if (branchId === 'all' && !['branch-overview','branch-comparison','branch-ranking'].includes(payload?.moduleId)) {
            throw new Error('اختر فرعًا لعرض التحليل التفصيلي لهذه الوحدة.');
        }
        return getAnalyticsModule({
            moduleId: payload?.moduleId,
            branchId,
            fromDate: payload?.fromDate,
            toDate: payload?.toDate,
            connection: payload?.connection || null,
            selectedBranchId: payload?.selectedBranchId ?? branchId
        });
    });

    console.log('[Electron] Analytics IPC handlers registered.');
}

export default { registerAnalyticsIpc };
