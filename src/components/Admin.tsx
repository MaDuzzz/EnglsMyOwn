import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { ShieldCheck, Upload, UserCheck } from "lucide-react";
import { db } from "../lib/firebase";
import { validateImport, storedWord } from "../lib/content";
import { type Profile } from "../lib/useApp";
import { Button, Empty } from "./ui";
export default function Admin({ demo, uid }: { demo: boolean; uid: string }) {
  const [users, setUsers] = useState<Profile[]>([]),
    [source, setSource] = useState(""),
    [preview, setPreview] = useState<ReturnType<typeof validateImport> | null>(
      null,
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!db || demo) return;
    return onSnapshot(
      collection(db, "users"),
      (s) => setUsers(s.docs.map((d) => d.data() as Profile)),
      (e) => setMessage(e.message),
    );
  }, [demo]);
  async function status(p: Profile, status: "approved" | "revoked") {
    if (!db) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "users", p.uid), { status });
      setMessage(
        status === "approved"
          ? "Approved in the app. Remember to share the lesson folder in Google Drive."
          : "App access revoked. Revoke their Google Drive sharing separately.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!preview || !db || demo) return;
    setBusy(true);
    try {
      const batch = writeBatch(db);
      for (const w of preview.words)
        batch.set(doc(db, "words", w.id), storedWord(w));
      for (const l of preview.lessons) batch.set(doc(db, "lessons", l.id), l);
      await batch.commit();
      setMessage(
        "Import complete. Published content is now available to approved learners.",
      );
      setPreview(null);
      setSource("");
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-intro">
        <span className="eyebrow">YOUR LITTLE LEARNING SPACE</span>
        <h1>Behind the scenes.</h1>
        <p>Manage access and thoughtfully prepared lessons.</p>
      </div>
      <section className="card admin-section">
        <h2>
          <UserCheck />
          Learner access
        </h2>
        <p className="muted">
          Approving someone here does not automatically share Google Drive
          files.
        </p>
        {users
          .filter((p) => p.uid !== uid)
          .map((p) => (
            <div className="user-row" key={p.uid}>
              <div>
                <b>{p.displayName}</b>
                <small>
                  {p.email} · {p.status}
                </small>
              </div>
              <Button
                secondary
                disabled={busy}
                onClick={() =>
                  void status(
                    p,
                    p.status === "approved" ? "revoked" : "approved",
                  )
                }
              >
                {p.status === "approved" ? "Revoke" : "Approve"}
              </Button>
            </div>
          ))}
        {!users.filter((p) => p.uid !== uid).length && (
          <p className="empty-inline">
            {demo
              ? "Access management becomes available after Firebase setup."
              : "New Google sign-ins will appear here for approval."}
          </p>
        )}
      </section>
      <section className="card admin-section">
        <h2>
          <Upload />
          Import learning content
        </h2>
        <p className="muted">
          Upload a JSON object with words and lessons arrays. Validate before
          publishing. Existing IDs will be updated.
        </p>
        <label className="file-input">
          Choose JSON file
          <input
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                if (f.size > 2 * 1024 * 1024) {
                  setMessage("Use a file smaller than 2 MB.");
                  return;
                }
                f.text().then((t) => {
                  setSource(t);
                  setPreview(null);
                });
              }
            }}
          />
        </label>
        <label>
          Content JSON
          <textarea
            className="json-editor"
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setPreview(null);
            }}
            placeholder={'{"words": [], "lessons": []}'}
          />
        </label>
        <Button
          secondary
          disabled={!source.trim()}
          onClick={() => {
            try {
              const next = validateImport(JSON.parse(source));
              setPreview(next);
              setMessage(
                "Validation passed. Review the items below before importing.",
              );
            } catch (e) {
              setPreview(null);
              setMessage((e as Error).message);
            }
          }}
        >
          Validate content
        </Button>
        {preview && (
          <div className="import-preview">
            <h3>
              {preview.words.length} words · {preview.lessons.length} videos
            </h3>
            <ul>
              {preview.words.map((w) => (
                <li key={w.id}>
                  {w.headword} — {w.cefrLevel} — {w.status}
                </li>
              ))}
              {preview.lessons.map((l) => (
                <li key={l.id}>
                  {l.title} — {l.status}
                </li>
              ))}
            </ul>
            <Button
              disabled={
                busy ||
                demo ||
                (!preview.words.length && !preview.lessons.length)
              }
              onClick={() => void publish()}
            >
              {busy
                ? "Importing…"
                : demo
                  ? "Connect Firebase to import"
                  : "Import reviewed content"}
            </Button>
          </div>
        )}
      </section>
      {message && (
        <div role="status" className="notice">
          {message}
        </div>
      )}
    </>
  );
}
