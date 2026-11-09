import { useEffect, useRef, useState } from "react";
import {
  collection,
  getDoc,
  onSnapshot,
  doc,
  updateDoc,
  runTransaction,
} from "firebase/firestore";
import { Upload, UserCheck } from "lucide-react";
import { db } from "../lib/firebase";
import { validateImport, storedWord } from "../lib/content";
import { type Profile } from "../lib/useApp";
import { Button, Modal } from "./ui";
export default function Admin({
  demo,
  uid,
  onContentImported,
}: {
  demo: boolean;
  uid: string;
  onContentImported: () => void;
}) {
  const [users, setUsers] = useState<Profile[]>([]),
    [source, setSource] = useState(""),
    [preview, setPreview] = useState<ReturnType<typeof validateImport> | null>(
      null,
    ),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [reading, setReading] = useState(false),
    [fileName, setFileName] = useState(""),
    [replaceExisting, setReplaceExisting] = useState(false);
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [resetError, setResetError] = useState("");
  const readVersion = useRef(0);
  useEffect(
    () => () => {
      readVersion.current++;
    },
    [],
  );
  async function readFile(file?: File) {
    const version = ++readVersion.current;
    setPreview(null);
    setSource("");
    setMessage("");
    setReplaceExisting(false);
    setFileName(file?.name || "");
    if (!file) {
      setReading(false);
      return;
    }
    setReading(true);
    try {
      if (file.size > 5 * 1024 * 1024)
        throw Error("Use a file smaller than 5 MB.");
      let content;
      if (/\.xlsx$/i.test(file.name)) {
        const { readVocabularyXlsx } = await import("../lib/xlsx-import");
        content = await readVocabularyXlsx(await file.arrayBuffer());
      } else if (/\.json$/i.test(file.name)) {
        content = validateImport(JSON.parse(await file.text()));
      } else throw Error("Choose an .xlsx or .json file.");
      if (version !== readVersion.current) return;
      setPreview(content);
      setMessage(
        "Validation passed. Review the entries and publication status before importing.",
      );
    } catch (e) {
      if (version === readVersion.current) setMessage((e as Error).message);
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }
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
          ? "Learner approved. They can now access published vocabulary."
          : "App access revoked.",
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function resetBatch() {
    if (!db || !resetTarget || busy) return;
    setBusy(true);
    setResetError("");
    try {
      const ref = doc(db, "learning", resetTarget.uid);
      const snapshot = await getDoc(ref);
      const draft = snapshot.data()?.activeSession;
      if (!draft) throw Error("This learner has no saved batch to clear.");
      if (draft.completed?.length === 40)
        throw Error(
          "This batch is complete. Ask the learner to retry saving it.",
        );
      await updateDoc(ref, {
        activeSession: null,
        blockedSessionId: draft.attemptId || draft.id,
      });
      setMessage(
        `${resetTarget.displayName}'s unfinished batch was cleared. Their completed progress and tickets were kept.`,
      );
      setResetTarget(null);
    } catch (error) {
      setResetError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!preview || !db || demo || busy || reading) return;
    setBusy(true);
    try {
      const database = db;
      const entries = [
        ...preview.words.map((w) => ({
          ref: doc(database, "words", w.id),
          data: storedWord(w),
        })),
        ...preview.lessons.map((l) => ({
          ref: doc(database, "lessons", l.id),
          data: l,
        })),
      ];
      if (
        new TextEncoder().encode(JSON.stringify(entries.map((e) => e.data)))
          .byteLength >
        6 * 1024 * 1024
      )
        throw Error(
          "Content is too large for one import. Split it into smaller files.",
        );
      await runTransaction(database, async (tx) => {
        const current = await Promise.all(entries.map((e) => tx.get(e.ref)));
        const existing = current.filter((s) => s.exists());
        if (existing.length && !replaceExisting)
          throw Error(
            `No changes saved. ${existing.length} IDs already exist (${existing
              .slice(0, 5)
              .map((s) => s.id)
              .join(
                ", ",
              )}). Enable replacement only if you intend to overwrite them.`,
          );
        entries.forEach((e) => tx.set(e.ref, e.data));
      });
      setMessage(
        "Import complete. Published content is now available to approved learners.",
      );
      onContentImported();
      setPreview(null);
      setSource("");
      setFileName("");
      setReplaceExisting(false);
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
          Only approved accounts can access published learning content.
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
              <div className="user-actions">
                {p.status === "approved" && (
                  <Button
                    secondary
                    disabled={busy}
                    onClick={() => {
                      setResetTarget(p);
                      setResetError("");
                    }}
                  >
                    Clear batch
                  </Button>
                )}
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
      {resetTarget && (
        <Modal
          title={`Clear ${resetTarget.displayName}'s batch?`}
          onClose={() => !busy && setResetTarget(null)}
        >
          <p>
            This removes only their unfinished batch. They can start it again
            after reopening the app. Completed batches and food tickets stay
            safe.
          </p>
          {resetError && (
            <p className="error" role="alert">
              {resetError}
            </p>
          )}
          <Button disabled={busy} onClick={() => setResetTarget(null)}>
            Keep batch
          </Button>
          <Button secondary disabled={busy} onClick={() => void resetBatch()}>
            {busy ? "Clearing…" : "Clear unfinished batch"}
          </Button>
        </Modal>
      )}
      <section className="card admin-section">
        <h2>
          <Upload />
          Import learning content
        </h2>
        <p className="muted">
          Choose a vocabulary v2 XLSX workbook or a JSON file. Files are checked
          locally before anything is saved. Maximum 400 entries and 5 MB.
        </p>
        <label className="file-input">
          Choose XLSX or JSON file
          <input
            type="file"
            accept=".xlsx,.json,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={busy}
            onChange={(e) => {
              void readFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
        {fileName && (
          <p className="muted">
            {reading ? "Checking… " : "Selected: "}
            {fileName}
          </p>
        )}
        <details>
          <summary>Or paste JSON</summary>
          <label>
            Content JSON
            <textarea
              className="json-editor"
              value={source}
              disabled={busy || reading}
              onChange={(e) => {
                readVersion.current++;
                setSource(e.target.value);
                setPreview(null);
                setMessage("");
                setFileName("");
                setReplaceExisting(false);
              }}
              placeholder={'{"words": [], "lessons": []}'}
            />
          </label>
          <Button
            secondary
            disabled={busy || reading || !source.trim()}
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
        </details>
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
            <label className="import-replace">
              <input
                type="checkbox"
                checked={replaceExisting}
                disabled={busy}
                onChange={(e) => setReplaceExisting(e.target.checked)}
              />
              Replace all content of matching IDs, including their
              draft/published status.
            </label>
            <p className="muted">
              Published entries become available to approved learners. Drafts
              remain hidden. Learning history is kept.
            </p>
            <Button
              disabled={
                busy ||
                reading ||
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
        <div role="status" className="notice import-message">
          {message}
        </div>
      )}
    </>
  );
}
