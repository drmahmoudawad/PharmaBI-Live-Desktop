const fs = require("fs");

const file =
  "electron/pharmfly/customers/crm/whatsappService.js";

let s = fs.readFileSync(file, "utf8");

const bad = 'replace(/\\\\D/g, "")';
const good = 'replace(/\\D/g, "")';

const count =
  (s.match(/replace\(\/\\\\D\/g, ""\)/g) || []).length;

if (count === 0) {
  console.log("No bad normalization pattern found.");
} else {
  s = s.replaceAll(bad, good);

  const backup =
    file + ".backup-before-phone-normalization";

  if (!fs.existsSync(backup)) {
    fs.copyFileSync(file, backup);
  }

  fs.writeFileSync(file, s, "utf8");

  console.log(
    "PHONE NORMALIZATION FIXED:",
    count,
    "occurrence(s)"
  );
}

console.log(
  "Checking JavaScript syntax..."
);
