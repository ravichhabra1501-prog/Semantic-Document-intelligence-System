import fastifyCors from "@fastify/cors";
import fastifyExpress from "@fastify/express";
import fastifyFormbody from "@fastify/formbody";
import fastifyMultipart from "@fastify/multipart";
import "dotenv/config";
import fastify from "fastify";

import { registerRoutes } from "./routes.js";

export type AppMode = "standalone" | "serverless";

export function log(message: string, source = "fastify") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

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

export async function createApp(mode: AppMode = "standalone") {
  const app = fastify();

  const corsOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.register(fastifyCors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
  });

  app.register(fastifyFormbody);
  app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 1,
    },
  });

  app.addHook("preHandler", (req, res, done) => {
    const start = Date.now();
    res.raw.on("finish", () => {
      const duration = Date.now() - start;
      if (req.url.startsWith("/api")) {
        log(`${req.method} ${req.url} ${res.statusCode} in ${duration}ms`);
      }
    });
    done();
  });

  await app.register(fastifyExpress);
  await registerRoutes(app);

  app.setErrorHandler((err, _req, res) => {
    const { status, message } = getErrorStatusAndMessage(err);
    console.error("Internal Server Error:", err);
    res.status(status).send({ message });
  });

  if (mode === "standalone") {
    if (process.env.NODE_ENV === "production") {
      const { serveStatic } = await import("./static.js");
      serveStatic(app);
    } else {
      const { setupVite } = await import("./vite.js");
      await setupVite(app);
    }
  }

  return app;
}
