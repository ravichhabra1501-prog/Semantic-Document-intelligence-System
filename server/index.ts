import "dotenv/config";
import net from "node:net";

import { createApp, log } from "./app.js";

async function findAvailablePort(host: string): Promise<number> {
  return await new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, host, () => {
      const address = srv.address();
      srv.close(() => {
        if (typeof address === "object" && address?.port) {
          resolve(address.port);
        } else {
          reject(new Error("Could not determine free port"));
        }
      });
    });
  });
}

(async () => {
  const app = await createApp("standalone");

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const host = "0.0.0.0";
  let port = parseInt(process.env.PORT || "5000", 10);
  let attempts = 0;

  while (attempts < 5) {
    try {
      await app.listen({ port, host });
      log(`serving on http://localhost:${port}`);
      return;
    } catch (err: any) {
      if (err?.code === "EADDRINUSE") {
        log(`port ${port} busy, trying next port...`, "fastify");
        port += 1;
        attempts += 1;
        continue;
      }
      throw err;
    }
  }

  // As a last resort (all preferred ports busy), ask the OS for any free port so dev server can still start.
  const fallbackPort = await findAvailablePort(host);
  await app.listen({ port: fallbackPort, host });
  log(
    `serving on http://localhost:${fallbackPort} (preferred ports 5000-5004 were busy)`,
    "fastify",
  );
})();
