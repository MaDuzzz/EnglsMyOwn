import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../workers/shadowing/src/index.js";

const base = "https://shadow.example.workers.dev";
const env = {
  FIREBASE_PROJECT_ID: "english-app-6ca48",
  ALLOWED_ORIGINS: "https://maduzzz.github.io",
  MEDIA_SIGNING_SECRET: "a-test-secret-with-more-than-32-characters",
  AUDIO: {
    head: vi.fn(async () => ({ size: 100, httpEtag: '"audio-etag"' })),
    get: vi.fn(async () => ({ body: new Blob([new Uint8Array(100)]).stream() })),
  },
};
const origin = "https://maduzzz.github.io";
const token = `header.${Buffer.from(JSON.stringify({
  sub: "learner", aud: env.FIREBASE_PROJECT_ID,
  iss: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
})).toString("base64url")}.signature`;

function request(repeats = 3, authorization = `Bearer ${token}`, lessonId = "pilot-01") {
  return new Request(`${base}/v1/tickets`, {
    method: "POST",
    headers: { origin, authorization, "content-type": "application/json" },
    body: JSON.stringify({ lessonId, repeats }),
  });
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("private shadowing media", () => {
  it("requires an approved Firebase account before issuing a link", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      fields: { status: { stringValue: "pending" } },
    }))));
    expect((await worker.fetch(request(), env)).status).toBe(403);
    expect((await worker.fetch(request(3, ""), env)).status).toBe(403);
    expect(env.AUDIO.head).not.toHaveBeenCalled();
  });

  it("allows only signed, unexpired audio and handles iPhone byte ranges", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => new Response(JSON.stringify({
      fields: { status: { stringValue: String(url).includes("shadowingLessons")
        ? "published" : "approved" } },
    }))));
    const response = await worker.fetch(request(3, `Bearer ${token}`, "weekend-plan"), env);
    expect(response.status).toBe(200);
    const { url } = await response.json();
    const range = await worker.fetch(new Request(url, {
      headers: { origin, range: "bytes=10-19" },
    }), env);
    expect(range.status).toBe(206);
    expect(range.headers.get("content-range")).toBe("bytes 10-19/100");
    expect(env.AUDIO.get).toHaveBeenCalledWith(
      "weekend-plan/program-3x.m4a", { range: { offset: 10, length: 10 } },
    );
    const altered = new URL(url);
    altered.pathname = "/v1/audio/weekend-plan/program-7x.m4a";
    expect((await worker.fetch(new Request(altered), env)).status).toBe(403);
    const expired = new URL(url);
    expired.searchParams.set("exp", "1");
    expect((await worker.fetch(new Request(expired), env)).status).toBe(403);
  });

  it("does not issue audio links for draft lessons or unsafe IDs", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url) => new Response(JSON.stringify({
      fields: { status: { stringValue: String(url).includes("shadowingLessons")
        ? "draft" : "approved" } },
    }))));
    expect((await worker.fetch(request(1, `Bearer ${token}`, "draft-lesson"), env)).status).toBe(404);
    expect((await worker.fetch(request(1, `Bearer ${token}`, "../secret"), env)).status).toBe(400);
    expect(env.AUDIO.head).not.toHaveBeenCalled();
  });
});
