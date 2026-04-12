let appPromise;

function getRequestPath(req) {
  const rawUrl = typeof req.url === "string" && req.url.trim() ? req.url : "/";

  try {
    const url = new URL(rawUrl, "http://localhost");
    return `${url.pathname}${url.search}`;
  } catch {
    return rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  }
}

function normalizeBody(req) {
  if (req.rawBody !== undefined && req.rawBody !== null) {
    return req.rawBody;
  }

  if (req.body === undefined || req.body === null) {
    return undefined;
  }

  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return req.body;
  }

  return JSON.stringify(req.body);
}

async function getApp() {
  if (!appPromise) {
    const { createApp } = require("../dist/app.cjs");
    appPromise = createApp("standalone");
  }

  return appPromise;
}

module.exports = async function functionHandler(context, req) {
  const app = await getApp();
  const response = await app.inject({
    method: (req.method || "GET").toUpperCase(),
    url: getRequestPath(req),
    headers: req.headers || {},
    payload: normalizeBody(req),
  });

  context.res = {
    status: response.statusCode,
    headers: response.headers,
    body: response.body,
  };
};
