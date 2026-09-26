import {
    useEffect,
    useState
} from "react";


function money(
    value
) {

    if (
        value === null ||
        value === undefined ||
        !Number.isFinite(
            Number(value)
        )
    ) {

        return "-";

    }


    return Number(
        value
    ).toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


export default function MasterManagementPanel() {

    const [
        masters,
        setMasters
    ] = useState([]);


    const [
        search,
        setSearch
    ] = useState("");


    const [
        sortBy,
        setSortBy
    ] = useState("name");


    const [
        selected,
        setSelected
    ] = useState(null);


    const [
        loading,
        setLoading
    ] = useState(false);


    const [
        saving,
        setSaving
    ] = useState(false);


    const [
        editingName,
        setEditingName
    ] = useState("");


    const [
        error,
        setError
    ] = useState("");


    async function loadMasters() {

        setLoading(
            true
        );

        setError("");


        try {

            const response =
                await window
                    .pharmaBI
                    .masterItem
                    .managementList({

                        search,

                        sortBy

                    });


            setMasters(

                Array.isArray(
                    response?.items
                )
                    ? response.items
                    : []

            );

        }
        catch (
            loadError
        ) {

            console.error(
                "[MasterManagementPanel] list failed:",
                loadError
            );


            setError(
                loadError?.message ||
                "فشل تحميل الأسماء الموحدة."
            );

        }
        finally {

            setLoading(
                false
            );

        }

    }


    async function openMaster(
        masterId
    ) {

        setLoading(
            true
        );

        setError("");


        try {

            const response =
                await window
                    .pharmaBI
                    .masterItem
                    .managementGet({

                        masterItemId:
                            masterId

                    });


            setSelected(
                response ||
                null
            );


            setEditingName(
                response?.master?.canonical_name ||
                ""
            );

        }
        catch (
            detailError
        ) {

            console.error(
                "[MasterManagementPanel] details failed:",
                detailError
            );


            setError(
                detailError?.message ||
                "فشل تحميل تفاصيل الاسم الموحد."
            );

        }
        finally {

            setLoading(
                false
            );

        }

    }


    useEffect(
        () => {

            loadMasters();

        },
        [
            sortBy
        ]
    );


    async function saveName() {

        if (
            !selected?.master?.id
        ) {

            return;

        }


        const name =
            String(
                editingName ||
                ""
            ).trim();


        if (
            !name
        ) {

            setError(
                "اكتب الاسم الموحد أولًا."
            );

            return;

        }


        setSaving(
            true
        );

        setError("");


        try {

            await window
                .pharmaBI
                .masterItem
                .managementUpdateName({

                    masterItemId:
                        selected.master.id,

                    canonicalName:
                        name

                });


            await openMaster(
                selected.master.id
            );


            await loadMasters();

        }
        catch (
            saveError
        ) {

            setError(
                saveError?.message ||
                "فشل تعديل الاسم الموحد."
            );

        }
        finally {

            setSaving(
                false
            );

        }

    }


    async function removeMember(
        member
    ) {

        if (
            !selected?.master?.id
        ) {

            return;

        }


        const ok =
            window.confirm(
                `إزالة ${member?.branch_item_name || "هذا الصنف"} من الاسم الموحد؟`
            );


        if (
            !ok
        ) {

            return;

        }


        setSaving(
            true
        );

        setError("");


        try {

            await window
                .pharmaBI
                .masterItem
                .managementRemoveMember({

                    masterItemId:
                        selected.master.id,

                    branchId:
                        member.branch_id,

                    branchItemId:
                        member.branch_item_id

                });


            await openMaster(
                selected.master.id
            );


            await loadMasters();

        }
        catch (
            removeError
        ) {

            setError(
                removeError?.message ||
                "فشل إزالة الصنف."
            );

        }
        finally {

            setSaving(
                false
            );

        }

    }


    async function cancelSelectedMaster() {

        if (
            !selected?.master?.id
        ) {

            return;

        }


        const ok =
            window.confirm(
                `سيتم إلغاء الاسم الموحد "${selected.master.canonical_name}" وفك كل الأصناف المرتبطة به. هل تريد المتابعة؟`
            );


        if (
            !ok
        ) {

            return;

        }


        setSaving(
            true
        );

        setError("");


        try {

            await window
                .pharmaBI
                .masterItem
                .managementCancel({

                    masterItemId:
                        selected.master.id

                });


            setSelected(
                null
            );


            setEditingName(
                ""
            );


            await loadMasters();

        }
        catch (
            cancelError
        ) {

            setError(
                cancelError?.message ||
                "فشل إلغاء الاسم الموحد."
            );

        }
        finally {

            setSaving(
                false
            );

        }

    }


    if (
        selected?.master
    ) {

        return (

            <div>

                <div
                    className="table-card"
                    style={{
                        marginBottom:
                            "14px"
                    }}
                >

                    <div
                        style={{
                            padding:
                                "16px"
                        }}
                    >

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {

                                setSelected(
                                    null
                                );

                                setError(
                                    ""
                                );

                            }}
                        >
                            ← الأسماء الموحدة
                        </button>


                        <div
                            style={{
                                marginTop:
                                    "16px"
                            }}
                        >

                            <div
                                style={{
                                    display:
                                        "grid",

                                    gridTemplateColumns:
                                        "minmax(0,1fr) auto auto",

                                    gap:
                                        "10px",

                                    alignItems:
                                        "end"
                                }}
                            >

                                <div>

                                    <label>
                                        الاسم الموحد
                                    </label>

                                    <input
                                        value={
                                            editingName
                                        }
                                        onChange={
                                            event =>
                                                setEditingName(
                                                    event.target.value
                                                )
                                        }
                                        style={{
                                            width:
                                                "100%",

                                            height:
                                                "40px",

                                            padding:
                                                "0 10px"
                                        }}
                                    />

                                </div>


                                <div>

                                    <div
                                        style={{
                                            fontSize:
                                                "12px",

                                            opacity:
                                                0.7
                                        }}
                                    >
                                        الكود
                                    </div>

                                    <strong>
                                        {
                                            selected
                                                .master
                                                .unified_code
                                        }
                                    </strong>

                                </div>


                                <button
                                    type="button"
                                    className="primary-button"
                                    disabled={
                                        saving
                                    }
                                    onClick={
                                        saveName
                                    }
                                >
                                    حفظ الاسم
                                </button>

                            </div>


                            <div
                                style={{
                                    marginTop:
                                        "14px",

                                    display:
                                        "flex",

                                    justifyContent:
                                        "space-between",

                                    gap:
                                        "10px",

                                    alignItems:
                                        "center"
                                }}
                            >

                                <strong>
                                    الأصناف المرتبطة:
                                    {" "}
                                    {
                                        selected
                                            .master
                                            .memberCount
                                    }
                                </strong>


                                <button
                                    type="button"
                                    className="secondary-button"
                                    disabled={
                                        saving
                                    }
                                    onClick={
                                        cancelSelectedMaster
                                    }
                                >
                                    إلغاء الاسم الموحد
                                </button>

                            </div>

                        </div>

                    </div>

                </div>


                {
                    error && (

                        <div
                            className="table-card"
                            style={{
                                marginBottom:
                                    "14px"
                            }}
                        >

                            <div
                                style={{
                                    padding:
                                        "12px"
                                }}
                            >
                                {
                                    error
                                }
                            </div>

                        </div>

                    )
                }


                <div
                    className="table-card"
                >

                    <div
                        style={{
                            overflowX:
                                "auto"
                        }}
                    >

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        الفرع
                                    </th>

                                    <th>
                                        الصنف
                                    </th>

                                    <th>
                                        السعر الحالي
                                    </th>

                                    <th>
                                        كود الصنف
                                    </th>

                                    <th>
                                        الإجراء
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {
                                    (
                                        selected.members ||
                                        []
                                    ).map(
                                        member => (

                                            <tr
                                                key={`${member.branch_id}-${member.branch_item_id}`}
                                            >

                                                <td>
                                                    {
                                                        member.branchName
                                                    }
                                                </td>

                                                <td>
                                                    {
                                                        member.branch_item_name ||
                                                        "-"
                                                    }
                                                </td>

                                                <td>
                                                    <strong>
                                                        {
                                                            money(
                                                                member.salesPrice
                                                            )
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {
                                                        member.branch_item_code ||
                                                        member.branch_item_id
                                                    }
                                                </td>

                                                <td>

                                                    <button
                                                        type="button"
                                                        className="secondary-button"
                                                        disabled={
                                                            saving
                                                        }
                                                        onClick={
                                                            () =>
                                                                removeMember(
                                                                    member
                                                                )
                                                        }
                                                    >
                                                        إزالة من الـMaster
                                                    </button>

                                                </td>

                                            </tr>

                                        )
                                    )
                                }

                            </tbody>

                        </table>

                    </div>

                </div>

            </div>

        );

    }


    return (

        <div>

            <div
                className="table-card"
                style={{
                    marginBottom:
                        "14px"
                }}
            >

                <div
                    style={{
                        padding:
                            "14px",

                        display:
                            "flex",

                        gap:
                            "8px",

                        flexWrap:
                            "wrap"
                    }}
                >

                    <input
                        value={
                            search
                        }
                        onChange={
                            event =>
                                setSearch(
                                    event.target.value
                                )
                        }
                        onKeyDown={
                            event => {

                                if (
                                    event.key ===
                                    "Enter"
                                ) {

                                    loadMasters();

                                }

                            }
                        }
                        placeholder="ابحث باسم الصنف الرئيسي أو الكود"
                        style={{
                            flex:
                                1,

                            minWidth:
                                "260px",

                            height:
                                "42px",

                            padding:
                                "0 12px"
                        }}
                    />


                    <button
                        type="button"
                        className="primary-button"
                        onClick={
                            loadMasters
                        }
                        disabled={
                            loading
                        }
                    >
                        بحث
                    </button>


                    <select
                        value={
                            sortBy
                        }
                        onChange={
                            event =>
                                setSortBy(
                                    event.target.value
                                )
                        }
                        style={{
                            height:
                                "42px",

                            padding:
                                "0 10px"
                        }}
                    >

                        <option value="name">
                            الاسم أبجديًا
                        </option>

                        <option value="code">
                            الكود
                        </option>

                        <option value="members">
                            عدد الأصناف
                        </option>

                    </select>

                </div>

            </div>


            {
                error && (

                    <div
                        className="table-card"
                        style={{
                            marginBottom:
                                "14px"
                        }}
                    >

                        <div
                            style={{
                                padding:
                                    "12px"
                            }}
                        >
                            {
                                error
                            }
                        </div>

                    </div>

                )
            }


            <div
                className="table-card"
            >

                <div
                    style={{
                        overflowX:
                            "auto"
                    }}
                >

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    الاسم الموحد
                                </th>

                                <th>
                                    الكود الموحد
                                </th>

                                <th>
                                    عدد الأصناف
                                </th>

                                <th>
                                    الإجراء
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {
                                masters.map(
                                    master => (

                                        <tr
                                            key={
                                                master.id
                                            }
                                        >

                                            <td>
                                                <strong>
                                                    {
                                                        master.canonical_name
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    master.unified_code
                                                }
                                            </td>

                                            <td>
                                                {
                                                    master.member_count
                                                }
                                            </td>

                                            <td>

                                                <button
                                                    type="button"
                                                    className="primary-button"
                                                    onClick={
                                                        () =>
                                                            openMaster(
                                                                master.id
                                                            )
                                                    }
                                                >
                                                    فتح وإدارة
                                                </button>

                                            </td>

                                        </tr>

                                    )
                                )
                            }


                            {
                                !loading &&
                                masters.length ===
                                    0 && (

                                    <tr>

                                        <td
                                            colSpan={
                                                4
                                            }
                                            style={{
                                                textAlign:
                                                    "center",

                                                padding:
                                                    "25px"
                                            }}
                                        >
                                            لا توجد أسماء موحدة.
                                        </td>

                                    </tr>

                                )
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

    );

}