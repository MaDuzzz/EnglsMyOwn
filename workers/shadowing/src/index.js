const REPEATS = new Set([1, 3, 5, 7]);
const TICKET_SECONDS = 60 * 60;
const LESSON_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

function cors(request, env) {
  const origin = request.headers.get("origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((item) => item.trim());
  if (!origin || !allowed.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeBase64url(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function signingKey(secret) {
  if (!secret || secret.length < 32) throw Error("MEDIA_SIGNING_SECRET is missing");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(path, expires, secret) {
  const key = await signingKey(secret);
  const bytes = new TextEncoder().encode(`${path}\n${expires}`);
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes)));
}

async function validSignature(path, expires, signature, secret) {
  try {
    const key = await signingKey(secret);
    return crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64url(signature),
      new TextEncoder().encode(`${path}\n${expires}`),
    );
  } catch {
    return false;
  }
}

function tokenSubject(token, projectId) {
  try {
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64url(token.split(".")[1])));
    if (
      typeof payload.sub !== "string" ||
      !/^[A-Za-z0-9_-]{1,128}$/.test(payload.sub) ||
      payload.aud !== projectId ||
      payload.iss !== `https://securetoken.google.com/${projectId}`
    ) return null;
    // This is only a routing hint. Firestore validates the token and applies
    // rules before returning the user document below.
    return payload.sub;
  } catch {
    return null;
  }
}

async function approvedToken(request, env) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const uid = tokenSubject(token, env.FIREBASE_PROJECT_ID);
  if (!uid) return null;
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}` +
    `/databases/(default)/documents/users/${uid}?mask.fieldPaths=status`;
  const result = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!result.ok) return null;
  const profile = await result.json();
  return profile.fields?.status?.stringValue === "approved" ? token : null;
}

async function publishedLesson(token, lessonId, env) {
  const endpoint =
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}` +
    `/databases/(default)/documents/shadowingLessons/${lessonId}?mask.fieldPaths=status`;
  const result = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!result.ok) return false;
  const lesson = await result.json();
  return lesson.fields?.status?.stringValue === "published";
}

function rangeFor(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return false;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if (
    (first !== null && (!Number.isSafeInteger(first) || first >= size)) ||
    (last !== null && !Number.isSafeInteger(last))
  ) return false;
  const start = first === null ? Math.max(0, size - last) : first;
  const end = first === null ? size - 1 : Math.min(size - 1, last ?? size - 1);
  if (end < start) return false;
  return { offset: start, length: end - start + 1, end };
}

async function ticket(request, env, headers) {
  const origin = request.headers.get("origin");
  if (origin && !headers["Access-Control-Allow-Origin"])
    return json({ error: "Origin not allowed" }, 403, headers);
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400, headers);
  }
  if (typeof payload?.lessonId !== "string" ||
      payload.lessonId.length > 64 || !LESSON_ID.test(payload.lessonId) ||
      !REPEATS.has(payload?.repeats))
    return json({ error: "Unknown lesson or repeat count" }, 400, headers);
  try {
    const token = await approvedToken(request, env);
    if (!token)
      return json({ error: "Approved account required" }, 403, headers);
    if (!(await publishedLesson(token, payload.lessonId, env)))
      return json({ error: "Published lesson required" }, 404, headers);
  } catch {
    return json({ error: "Could not verify account" }, 503, headers);
  }
  const path = `/v1/audio/${payload.lessonId}/program-${payload.repeats}x.m4a`;
  const expires = Math.floor(Date.now() / 1000) + TICKET_SECONDS;
  const signature = await sign(path, expires, env.MEDIA_SIGNING_SECRET);
  const url = new URL(path, request.url);
  url.searchParams.set("exp", String(expires));
  url.searchParams.set("sig", signature);
  return json({ url: url.toString(), expiresAt: expires }, 200, {
    ...headers,
    "Cache-Control": "no-store",
  });
}

async function audio(request, env, url, headers) {
  const match = /^\/v1\/audio\/([a-z0-9]+(?:-[a-z0-9]+)*)\/program-(1|3|5|7)x\.m4a$/.exec(url.pathname);
  if (!match || match[1].length > 64) return json({ error: "Not found" }, 404, headers);
  const expires = Number(url.searchParams.get("exp"));
  const signature = url.searchParams.get("sig") || "";
  if (
    !Number.isSafeInteger(expires) ||
    expires < Math.floor(Date.now() / 1000) ||
    expires > Math.floor(Date.now() / 1000) + TICKET_SECONDS ||
    !(await validSignature(url.pathname, expires, signature, env.MEDIA_SIGNING_SECRET))
  ) return json({ error: "Link expired or invalid" }, 403, headers);

  const key = `${match[1]}/program-${match[2]}x.m4a`;
  const object = await env.AUDIO.head(key);
  if (!object) return json({ error: "Audio has not been uploaded" }, 404, headers);
  const range = rangeFor(request.headers.get("range"), object.size);
  if (range === false)
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${object.size}` },
    });
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "audio/mp4");
  responseHeaders.set("Accept-Ranges", "bytes");
  responseHeaders.set("Cache-Control", "private, no-store");
  responseHeaders.set("Content-Length", String(range ? range.length : object.size));
  responseHeaders.set("ETag", object.httpEtag);
  if (range) responseHeaders.set("Content-Range", `bytes ${range.offset}-${range.end}/${object.size}`);
  if (request.method === "HEAD")
    return new Response(null, { status: range ? 206 : 200, headers: responseHeaders });
  const body = await env.AUDIO.get(key, range ? { range: { offset: range.offset, length: range.length } } : undefined);
  if (!body || !("body" in body))
    return json({ error: "Audio unavailable" }, 503, headers);
  return new Response(body.body, {
    status: range ? 206 : 200,
    headers: responseHeaders,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const headers = cors(request, env);
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204, headers });
    if (url.pathname === "/v1/tickets") {
      if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
      return ticket(request, env, headers);
    }
    if (url.pathname.startsWith("/v1/audio/")) {
      if (request.method !== "GET" && request.method !== "HEAD")
        return json({ error: "Method not allowed" }, 405, headers);
      return audio(request, env, url, headers);
    }
    return json({ error: "Not found" }, 404, headers);
  },
};
