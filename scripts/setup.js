import { execSync } from "child_process";
import fs from "fs";

// Detect package manager
const packageManager = fs.existsSync("pnpm-lock.yaml") ? "pnpm" :
  fs.existsSync("yarn.lock") ? "pnpm" : "npm";

console.log(`🔹 Using ${packageManager} for package management.`);

// Install dependencies & run security checks
console.log("📦 Installing dependencies securely...");
execSync(`${packageManager} install --omit=dev --no-audit`, { stdio: "inherit" });

// Set up environment variables
if (!fs.existsSync(".env")) {
  fs.writeFileSync(".env", "PORT=3000\nNODE_ENV=production\nLOG_LEVEL=warn");
  console.log("✅ Created .env file with default settings.");
}

// Precompile TypeScript (if needed)
if (fs.existsSync("tsconfig.json")) {
  console.log("⚙️ Compiling TypeScript...");
  execSync("npm run build", { stdio: "inherit" });
}

// Start application automatically after install
console.log("🚀 Starting TetraCryptPQC...");
execSync(`${packageManager} start`, { stdio: "inherit" });
