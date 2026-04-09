import fastifyStatic from "@fastify/static";
import fs from "fs";
import path from "path";

export function serveStatic(app: any) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.register(fastifyStatic, {
    root: distPath,
  });

  app.setNotFoundHandler(async (_req: any, res: any) => {
    return res.sendFile("index.html");
  });
}
