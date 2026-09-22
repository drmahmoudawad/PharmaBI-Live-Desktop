import React from "react";


export default function BranchEditor({

    branchEditor,
    branchEditorBusy,
    branchEditorMessage,
    updateBranchEditorField,
    updateBranchEditorName,
    updateBranchEditorId,
    closeBranchEditor,
    saveBranchFromEditor

}) {

    if (
        !branchEditor.open
    ) {

            return null;

        }


    return (

            <div

                style={{

                    position:
                        "fixed",

                    inset:
                        0,

                    zIndex:
                        10000,

                    background:
                        "rgba(15, 23, 42, 0.42)",

                    display:
                        "flex",

                    alignItems:
                        "center",

                    justifyContent:
                        "center",

                    padding:
                        "24px"

                }}

            >

                <div

                    className="page-card"

                    style={{

                        maxWidth:
                            "820px",

                        width:
                            "100%",

                        maxHeight:
                            "90vh",

                        overflowY:
                            "auto"

                    }}

                >

                    <div className="page-header">

                        <div>

                            <div className="page-eyebrow">

                                {
                                    branchEditor.mode ===
                                    "add"

                                        ? "إضافة فرع"

                                        : "تعديل الفرع"

                                }

                            </div>


                            <h2>

                                {
                                    branchEditor.mode ===
                                    "add"

                                        ? "إضافة فرع جديد"

                                        : `تعديل ${
                                            branchEditor.branchName ||
                                            `Branch ${branchEditor.branchId}`
                                        }`

                                }

                            </h2>


                            <p>
                                الاسم للعرض فقط، أما معرّف الفرع فيظل ثابتًا.
                            </p>

                        </div>

                    </div>


                    {
                        branchEditorMessage && (

                            <div

                                className={
                                    `status ${
                                        branchEditorMessage.type
                                    }`
                                }

                                style={{
                                    marginBottom:
                                        "16px"
                                }}

                            >

                                {
                                    branchEditorMessage.message
                                }

                            </div>

                        )
                    }


                    <div className="system-grid">

                        <label>

                            رقم الفرع

                            <input

                                value={
                                    branchEditor.branchId
                                }

                                onChange={event =>
                                    updateBranchEditorId(
                                        event.target.value
                                    )
                                }

                                disabled={

                                    branchEditor.mode ===
                                    "edit"

                                }

                            />

                        </label>


                        <label>

                            اسم الفرع

                            <input

                                value={
                                    branchEditor.branchName
                                }

                                onChange={event =>
                                    updateBranchEditorName(
                                        event.target.value
                                    )
                                }

                                placeholder="مثال: أسكوت"

                                autoFocus={

                                    branchEditor.mode ===
                                    "add"

                                }

                            />

                        </label>


                        <label>

                            المنفذ

                            <input

                                value={
                                    branchEditor.connection.port
                                }

                                onChange={event =>
                                    updateBranchEditorField(
                                        "port",
                                        event.target.value
                                    )
                                }

                            />

                        </label>


                        <label>

                            خادم SQL

                            <input

                                value={
                                    branchEditor.connection.server
                                }

                                onChange={event =>
                                    updateBranchEditorField(
                                        "server",
                                        event.target.value
                                    )
                                }

                                placeholder="SERVER\\INSTANCE أو IP"

                            />

                        </label>


                        <label>

                            قاعدة البيانات

                            <input

                                value={
                                    branchEditor.connection.database
                                }

                                onChange={event =>
                                    updateBranchEditorField(
                                        "database",
                                        event.target.value
                                    )
                                }

                            />

                        </label>


                        <label>

                            اسم المستخدم

                            <input

                                value={
                                    branchEditor.connection.user
                                }

                                onChange={event =>
                                    updateBranchEditorField(
                                        "user",
                                        event.target.value
                                    )
                                }

                            />

                        </label>


                        <label>

                            كلمة المرور

                            <input

                                type="password"

                                value={
                                    branchEditor.connection.password
                                }

                                onChange={event =>
                                    updateBranchEditorField(
                                        "password",
                                        event.target.value
                                    )
                                }

                            />

                        </label>

                    </div>


                    <div

                        style={{

                            display:
                                "flex",

                            justifyContent:
                                "flex-end",

                            gap:
                                "8px",

                            marginTop:
                                "20px"

                        }}

                    >

                        <button

                            type="button"

                            onClick={
                                closeBranchEditor
                            }

                            disabled={
                                branchEditorBusy
                            }

                        >

                            إلغاء

                        </button>


                        <button

                            type="button"

                            className="primary-button"

                            onClick={
                                saveBranchFromEditor
                            }

                            disabled={
                                branchEditorBusy
                            }

                        >

                            {

                                branchEditorBusy

                                    ? "جاري الحفظ..."

                                    : (

                                        branchEditor.mode ===
                                        "add"

                                            ? "حفظ واتصال بالفرع"

                                            : "حفظ التغييرات"

                                    )

                            }

                        </button>

                    </div>

                </div>

            </div>

        );

    }
