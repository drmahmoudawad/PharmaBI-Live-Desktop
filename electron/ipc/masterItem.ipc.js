import {
    ipcMain
} from "electron";


import {
    searchMasterItems,
    searchExistingMasters,
    resolveItem,
    getMasterItemById,
    getReviewQueue,
    searchReviewQueue,
    getReviewGroup,
    decideReview,
    decideReviewGroup,
    createMasterFromReview,
    createMasterFromReviewManual,
    createMasterFromReviewGroup,
    getMasterItemStats
} from "../masterItem/masterItemService.js";


import {
    getCurrentItemPrices,
    getMasterManagementList,
    getMasterManagementDetails,
    updateMasterName,
    removeMasterMember,
    cancelMaster
} from "../masterItem/masterManagementService.js";

export function registerMasterItemIpc() {

    ipcMain.handle(
        "master-item:search",
        async (
            _event,
            payload
        ) => {

            return {

                success:
                    true,

                results:
                    searchMasterItems(
                        payload?.query,
                        {
                            branchId:
                                payload?.branchId,

                            limit:
                                payload?.limit
                        }
                    )

            };

        }
    );


    ipcMain.handle(
        "master-item:resolve",
        async (
            _event,
            payload
        ) => {

            return resolveItem(
                payload?.query,
                {
                    branchId:
                        payload?.branchId
                }
            );

        }
    );


    ipcMain.handle(
        "master-item:get",
        async (
            _event,
            payload
        ) => {

            return {

                success:
                    true,

                item:
                    getMasterItemById(
                        payload?.masterItemId
                    )

            };

        }
    );


    ipcMain.handle(
        "master-item:reviewQueue",
        async (
            _event,
            payload
        ) => {

            return {

                success:
                    true,

                results:
                    getReviewQueue(
                        {
                            limit:
                                payload?.limit,

                            branchId:
                                payload?.branchId
                        }
                    )

            };

        }
    );



    ipcMain.handle(
        "master-item:reviewSearch",
        async (
            _event,
            payload
        ) => {

            return searchReviewQueue(
                {
                    limit:
                        payload?.limit,

                    offset:
                        payload?.offset,

                    branchId:
                        payload?.branchId,

                    search:
                        payload?.search,

                    sortBy:
                        payload?.sortBy
                }
            );

        }
    );

    ipcMain.handle(
        "master-item:reviewGroup",
        async (
            _event,
            payload
        ) => {

            return getReviewGroup(
                {
                    branchId:
                        payload?.branchId,

                    branchItemId:
                        payload?.branchItemId
                }
            );

        }
    );



    ipcMain.handle(
        "master-item:search-existing",
        async (
            _event,
            payload
        ) => {

            return {
                success:
                    true,

                results:
                    searchExistingMasters(
                        payload?.query,
                        {
                            limit:
                                payload?.limit
                        }
                    )

            };

        }
    );
    ipcMain.handle(
        "master-item:decide",
        async (
            _event,
            payload
        ) => {

            return decideReview(
                {
                    branchId:
                        payload?.branchId,

                    branchItemId:
                        payload?.branchItemId,

                    candidateMasterItemId:
                        payload?.candidateMasterItemId,

                    decision:
                        payload?.decision
                }
            );

        }
    );


    ipcMain.handle(
        "master-item:decide-group",
        async (
            _event,
            payload
        ) => {

            return decideReviewGroup(
                {
                    branchId:
                        payload?.branchId,

                    branchItemId:
                        payload?.branchItemId,

                    candidateMasterItemId:
                        payload?.candidateMasterItemId,

                    decision:
                        payload?.decision
                }
            );

        }
    );


    ipcMain.handle(
        "master-item:create-new",
        async (
            _event,
            payload
        ) => {

            return createMasterFromReview(
                {
                    branchId:
                        payload?.branchId,

                    branchItemId:
                        payload?.branchItemId
                }
            );

        }
    );



    ipcMain.handle(
        "master-item:create-manual",
        async (
            _event,
            payload
        ) => {

            return createMasterFromReviewManual(
                {
                    branchId:
                        payload?.branchId,

                    branchItemId:
                        payload?.branchItemId,

                    canonicalName:
                        payload?.canonicalName
                }
            );

        }
    );
    ipcMain.handle(
        "master-item:create-new-group",
        async (
            _event,
            payload
        ) => {

            return createMasterFromReviewGroup(
                {
                    branchId:
                        payload?.branchId,

                    branchItemId:
                        payload?.branchItemId,

                    canonicalName:
                        payload?.canonicalName
                }
            );

        }
    );




    ipcMain.handle(
        "master-item:prices",
        async (
            _event,
            payload
        ) => {

            return getCurrentItemPrices(
                payload?.items || []
            );

        }
    );


    ipcMain.handle(
        "master-item:management-list",
        async (
            _event,
            payload
        ) => {

            return getMasterManagementList(
                {
                    search:
                        payload?.search,

                    sortBy:
                        payload?.sortBy
                }
            );

        }
    );


    ipcMain.handle(
        "master-item:management-get",
        async (
            _event,
            payload
        ) => {

            return getMasterManagementDetails(
                payload?.masterItemId
            );

        }
    );


    ipcMain.handle(
        "master-item:management-update-name",
        async (
            _event,
            payload
        ) => {

            return updateMasterName(
                {
                    masterItemId:
                        payload?.masterItemId,

                    canonicalName:
                        payload?.canonicalName
                }
            );

        }
    );


    ipcMain.handle(
        "master-item:management-remove-member",
        async (
            _event,
            payload
        ) => {

            return removeMasterMember(
                {
                    masterItemId:
                        payload?.masterItemId,

                    branchId:
                        payload?.branchId,

                    branchItemId:
                        payload?.branchItemId
                }
            );

        }
    );


    ipcMain.handle(
        "master-item:management-cancel",
        async (
            _event,
            payload
        ) => {

            return cancelMaster(
                payload?.masterItemId
            );

        }
    );

    ipcMain.handle(
        "master-item:stats",
        async () => {

            return {

                success:
                    true,

                ...getMasterItemStats()

            };

        }
    );

}
