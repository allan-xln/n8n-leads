import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  await fs.access(path.join(__dirname, "src/index.html"));
  await fs.access(path.join(__dirname, "src/app.js"));
  console.log(JSON.stringify({ frontendReady: true }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
