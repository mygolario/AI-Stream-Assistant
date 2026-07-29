const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "frontend", "dist");
const dest = path.join(__dirname, "..", "public");

function rimraf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.lstatSync(full).isDirectory()) rimraf(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from)) {
    const srcPath = path.join(from, entry);
    const destPath = path.join(to, entry);
    if (fs.lstatSync(srcPath).isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

if (!fs.existsSync(src)) {
  console.error("frontend/dist missing — build frontend first");
  process.exit(1);
}

rimraf(dest);
copyDir(src, dest);
console.log("Copied frontend/dist -> public/");
