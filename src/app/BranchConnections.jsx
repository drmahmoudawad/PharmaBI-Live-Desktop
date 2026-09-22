import React from "react";

import {
    normalizeBranchName,
    isBranchActive
} from "./appHelpers.js";


export default function BranchConnections({
    savedBranches,
    activeConnections,
    branchEditorBusy,
    openAddBranchEditor,
    selectedBranchId,
    selectedBranchName,
    systemConnection,
    setSystemConnection,
    testCurrentConnection,
    selectBranch,
    openEditBranchEditor,
    closeBranch,
    reconnectBranch,
    deleteBranch,
    loadingBranch
}) {

    return (

            <section className="page-card">

                <div className="page-header">

                    <div>

                        <div className="page-eyebrow">
                            النظام
                        </div>


                        <h2>
                            اتصالات الفروع
                        </h2>


                        <p>
                            إدارة فروع PharmaFly واتصالاتها وأسمائها.
                        </p>

                    </div>


                    <button

                        type="button"

                        className="primary-button"

                        onClick={
                            openAddBranchEditor
                        }

                        disabled={
                            branchEditorBusy
                        }

                    >

                        إضافة فرع +

                    </button>

                </div>


                <div className="table-card">

                    <div className="table-card-header">

                        <div>

                            <strong>
                                الفروع المحفوظة
                            </strong>

                            <span>
                                {savedBranches.length} فرع
                            </span>

                        </div>

                    </div>


                    <div className="table-wrap">

                        <table>

                            <thead>

                                <tr>

                                    <th>
                                        الفرع
                                    </th>

                                    <th>
                                        الاسم
                                    </th>

                                    <th>
                                        الخادم
                                    </th>

                                    <th>
                                        قاعدة البيانات
                                    </th>

                                    <th>
                                        الحالة
                                    </th>

                                    <th>
                                        الإجراءات
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {
                                    savedBranches.length ===
                                    0

                                        ? (

                                            <tr>

                                                <td

                                                    colSpan="6"

                                                    style={{

                                                        textAlign:
                                                            "center",

                                                        padding:
                                                            "30px"

                                                    }}

                                                >

                                                    لا توجد فروع محفوظة.

                                                </td>

                                            </tr>

                                        )

                                        : (

                                            savedBranches.map(

                                                branch => {

                                                    const active =
                                                        isBranchActive(

                                                            activeConnections,

                                                            branch.branchId

                                                        );


                                                    return (

                                                        <tr

                                                            key={
                                                                branch.branchId
                                                            }

                                                        >

                                                            <td>

                                                                <strong>
                                                                    #{branch.branchId}
                                                                </strong>

                                                            </td>


                                                            <td>

                                                                <strong>

                                                                    {
                                                                        normalizeBranchName(
                                                                            branch
                                                                        )
                                                                    }

                                                                </strong>

                                                            </td>


                                                            <td>

                                                                {
                                                                    branch.server ||
                                                                    "—"
                                                                }

                                                            </td>


                                                            <td>

                                                                {
                                                                    branch.database ||
                                                                    "—"
                                                                }

                                                            </td>


                                                            <td>

                                                                <span>

                                                                    <span

                                                                        className={

                                                                            active

                                                                                ? "mode-dot branch"

                                                                                : "mode-dot"

                                                                        }

                                                                    />

                                                                    {" "}

                                                                    {

                                                                        active

                                                                            ? "متصل"

                                                                            : "غير متصل"

                                                                    }

                                                                </span>

                                                            </td>


                                                            <td>

                                                                <div

                                                                    style={{

                                                                        display:
                                                                            "flex",

                                                                        gap:
                                                                            "6px",

                                                                        flexWrap:
                                                                            "wrap"

                                                                    }}

                                                                >

                                                                    <button

                                                                        type="button"

                                                                        onClick={() =>

                                                                            selectBranch(

                                                                                String(

                                                                                    branch.branchId

                                                                                )

                                                                            )

                                                                        }

                                                                    >

                                                                        فتح

                                                                    </button>


                                                                    <button

                                                                        type="button"

                                                                        onClick={() =>

                                                                            openEditBranchEditor(

                                                                                branch.branchId

                                                                            )

                                                                        }

                                                                    >

                                                                        تعديل

                                                                    </button>


                                                                    {

                                                                        active

                                                                            ? (

                                                                                <button

                                                                                    type="button"

                                                                                    onClick={() =>

                                                                                        closeBranch(

                                                                                            branch.branchId

                                                                                        )

                                                                                    }

                                                                                >

                                                                                    فصل الاتصال

                                                                                </button>

                                                                            )

                                                                            : (

                                                                                <button

                                                                                    type="button"

                                                                                    onClick={() =>

                                                                                        reconnectBranch(

                                                                                            branch.branchId

                                                                                        )

                                                                                    }

                                                                                >

                                                                                    اتصال

                                                                                </button>

                                                                            )

                                                                    }


                                                                    <button

                                                                        type="button"

                                                                        onClick={() =>

                                                                            deleteBranch(

                                                                                branch.branchId

                                                                            )

                                                                        }

                                                                    >

                                                                        حذف

                                                                    </button>

                                                                </div>

                                                            </td>

                                                        </tr>

                                                    );

                                                }

                                            )

                                        )

                                }

                            </tbody>

                        </table>

                    </div>

                </div>


                {

                    selectedBranchId !==
                    "all" && (

                        <>

                            <div

                                className="section-title"

                                style={{

                                    marginTop:
                                        "22px"

                                }}

                            >

                                {
                                    selectedBranchName
                                }

                            </div>


                            <div className="system-grid">

                                <label>

                                    الخادم

                                    <input

                                        value={
                                            systemConnection.server
                                        }

                                        onChange={event =>

                                            setSystemConnection(

                                                current => ({

                                                    ...current,

                                                    server:
                                                        event.target.value

                                                })

                                            )

                                        }

                                    />

                                </label>


                                <label>

                                    المنفذ

                                    <input

                                        value={
                                            systemConnection.port
                                        }

                                        onChange={event =>

                                            setSystemConnection(

                                                current => ({

                                                    ...current,

                                                    port:
                                                        event.target.value

                                                })

                                            )

                                        }

                                    />

                                </label>


                                <label>

                                    قاعدة البيانات

                                    <input

                                        value={
                                            systemConnection.database
                                        }

                                        onChange={event =>

                                            setSystemConnection(

                                                current => ({

                                                    ...current,

                                                    database:
                                                        event.target.value

                                                })

                                            )

                                        }

                                    />

                                </label>


                                <label>

                                    اسم المستخدم

                                    <input

                                        value={
                                            systemConnection.user
                                        }

                                        onChange={event =>

                                            setSystemConnection(

                                                current => ({

                                                    ...current,

                                                    user:
                                                        event.target.value

                                                })

                                            )

                                        }

                                    />

                                </label>


                                <label>

                                    كلمة المرور

                                    <input

                                        type="password"

                                        value={
                                            systemConnection.password
                                        }

                                        onChange={event =>

                                            setSystemConnection(

                                                current => ({

                                                    ...current,

                                                    password:
                                                        event.target.value

                                                })

                                            )

                                        }

                                    />

                                </label>

                            </div>


                            <button

                                type="button"

                                className="primary-button"

                                onClick={
                                    testCurrentConnection
                                }

                                disabled={
                                    loadingBranch
                                }

                            >

                                اختبار اتصال{" "}

                                {
                                    selectedBranchName
                                }

                            </button>

                        </>

                    )

                }

            </section>

        );

    }


