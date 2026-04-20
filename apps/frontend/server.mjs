import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, "src");
const host = process.env.FRONTEND_HOST || "0.0.0.0";
const port = Number(process.env.FRONTEND_PORT || 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function getBackendUrl() {
  return process.env.FRONTEND_BACKEND_URL || "http://localhost:8095";
}

const server = http.createServer(async (request, response) => {
  try {
    const requestPath = request.url === "/" ? "/index.html" : request.url;

    if (requestPath === "/app-config.js") {
      response.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8"
      });
      response.end(`window.APP_CONFIG = ${JSON.stringify({ backendUrl: getBackendUrl() })};`);
      return;
    }

    const normalizedPath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(srcDir, normalizedPath);
    const extension = path.extname(filePath);
    const content = await fs.readFile(filePath);

    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream"
    });
    response.end(content);
  } catch (error) {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end("Not found");
  }
});

server.listen(port, host, () => {
  console.log(`Frontend ativo em http://localhost:${port}`);
});
