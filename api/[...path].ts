import type { IncomingMessage, ServerResponse } from "node:http";

import { createApp } from "../server/app.js";

let appPromise: ReturnType<typeof createApp> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = createApp("serverless");
  }

  return appPromise;
}

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = await getApp();
  await app.ready();
  app.server.emit("request", req, res);
}
