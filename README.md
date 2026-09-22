# PharmaBI Live Desktop

نسخة Desktop جديدة من PharmaBI تعتمد على الاتصال المباشر بـ PharmaFly SQL Server.

## المرحلة الحالية

المرحلة الأولى فقط:
- Electron + React + Vite
- MSSQL connection manager مستقل
- Connection pool لكل Branch
- IPC معزول بين الواجهة وطبقة Node/Electron
- شاشة اختبار اتصال أولية
- إعداد Installer عبر electron-builder / NSIS

## التشغيل

```bash
npm install
npm run dev
```

في Terminal ثانية:

```bash
npm start
```

## بناء Installer

```bash
npm run dist
```

الـInstaller سيظهر داخل مجلد `release/`.
