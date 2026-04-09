import fastifyExpress from "@fastify/express";
import fastifyFormbody from "@fastify/formbody";
import fastifyMultipart from "@fastify/multipart";
import "dotenv/config";
import fastify from "fastify";
import net from "node:net";

import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = fastify();

app.register(fastifyFormbody);
app.register(fastifyMultipart, {
  limits: {
    // Allow up to 50MB files (PDFs, images)
    fileSize: 50 * 1024 * 1024,
    files: 1,
  },
});

export function log(message: string, source = "fastify") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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

app.addHook("preHandler", (req, res, done) => {
  const start = Date.now();
  res.raw.on("finish", () => {
    const duration = Date.now() - start;
    if (req.url.startsWith("/api")) {
      let logLine = `${req.method} ${req.url} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });
  done();
});

function getErrorStatusAndMessage(err: unknown) {
  if (typeof err === "object" && err !== null) {
    const maybeStatus =
      "statusCode" in err
        ? (err as { statusCode?: unknown }).statusCode
        : undefined;
    const maybeMessage =
      "message" in err ? (err as { message?: unknown }).message : undefined;

    return {
      status: typeof maybeStatus === "number" ? maybeStatus : 500,
      message:
        typeof maybeMessage === "string"
          ? maybeMessage
          : "Internal Server Error",
    };
  }

  return {
    status: 500,
    message: "Internal Server Error",
  };
}

(async () => {
  await app.register(fastifyExpress);
  await registerRoutes(app);

  app.setErrorHandler((err, _req, res) => {
    const { status, message } = getErrorStatusAndMessage(err);
    console.error("Internal Server Error:", err);
    res.status(status).send({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(app);
  }

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
