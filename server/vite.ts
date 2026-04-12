import fs from "fs";
import { nanoid } from "nanoid";
import path from "path";
import { createLogger, createServer as createViteServer } from "vite";
import viteConfig from "../vite.config.js";

const viteLogger = createLogger();

export async function setupVite(app: any) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server: app.server, path: "/vite-hmr" },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Serve index.html for any non-API GET request so client-side routing works
  app.use(async (req: any, res: any, next: any) => {
    if (req.method !== "GET" || (req.path && req.path.startsWith("/api"))) {
      return next();
    }

    const url = req.originalUrl || req.url;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
