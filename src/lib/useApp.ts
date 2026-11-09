import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  arrayUnion,
  getDocs,
  collection,
  query,
  where,
  runTransaction,
} from "firebase/firestore";
import { auth, db, configured } from "./firebase";
import { projectWord } from "./content";
import {
  emptyLearning,
  dayKey,
  planFor,
  preserveCompletedBatches,
  commitBatch,
  type BatchRecord,
  type Learning,
  type Word,
  type Lesson,
} from "./model";
export type Profile = {
  uid: string;
  displayName: string;
  email: string;
  status: "pending" | "approved" | "revoked";
  role: "learner" | "admin";
};
export function useApp() {
  const demo = import.meta.env.DEV && !configured;
  const [previewScenario, setPreviewScenario] = useState<"fresh" | "review">(
    () =>
      import.meta.env.DEV &&
      localStorage.getItem("engls-pilot-scenario") === "review"
        ? "review"
        : "fresh",
  );
  const previewKey = `engls-pilot-v2:${previewScenario}`;
  const [user, setUser] = useState<User | null>(null),
    [profile, setProfile] = useState<Profile | null>(null),
    [phase, setPhase] = useState<
      "loading" | "login" | "pending" | "ready" | "setup"
    >("loading");
  const [data, setData] = useState<Learning>(emptyLearning),
    [words, setWords] = useState<Word[]>([]),
    [lessons, setLessons] = useState<Lesson[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [today, setToday] = useState(dayKey()),
    [contentRevision, setContentRevision] = useState(0);
  const dataRef = useRef(data);
  dataRef.current = data;
  function applyLearning(incoming: Learning) {
    setData((current) => {
      const next = preserveCompletedBatches(current, incoming);
      dataRef.current = next;
      return next;
    });
  }
  useEffect(() => {
    const timer = setInterval(() => setToday(dayKey()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (demo) {
      let active = true;
      import("../data/pilot").then((m) => {
        if (!active) return;
        let saved: Learning;
        try {
          saved =
            JSON.parse(localStorage.getItem(previewKey) || "null") ||
            m.pilotLearning(previewScenario);
        } catch {
          saved = m.pilotLearning(previewScenario);
        }
        setData(saved);
        setWords(m.words);
        setLessons(m.lessons);
        setProfile({
          uid: "demo",
          displayName: "Dung",
          email: "Local preview",
          status: "approved",
          role: "admin",
        });
        setPhase("ready");
      });
      return () => {
        active = false;
      };
    }
    if (!auth) {
      setPhase("setup");
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setProfile(null);
      setWords([]);
      setLessons([]);
      setData(emptyLearning());
      setPhase(u ? "loading" : "login");
      setError("");
    });
  }, [demo, previewScenario]);
  useEffect(() => {
    if (!user || !db) return;
    let active = true;
    const ref = doc(db, "users", user.uid);
    const off = onSnapshot(
      ref,
      (s) => {
        if (!active) return;
        if (!s.exists()) {
          setDoc(ref, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || "Learner",
            status: "pending",
            role: "learner",
          }).catch((e) => {
            setError(e.message);
            setPhase("pending");
          });
          return;
        }
        const p = s.data() as Profile;
        setProfile(p);
        setPhase(p.status === "approved" ? "ready" : "pending");
      },
      (e) => {
        setError(e.message);
        setPhase("pending");
      },
    );
    return () => {
      active = false;
      off();
    };
  }, [user]);
  useEffect(() => {
    if (demo || !db || !user || phase !== "ready") {
      if (!demo && phase !== "loading") {
        setWords([]);
        setLessons([]);
        setData(emptyLearning());
      }
      return;
    }
    let active = true;
    const fail = (e: Error) =>
      setError("Could not load protected data: " + e.message);
    const off = onSnapshot(
      doc(db, "learning", user.uid),
      (s) =>
        applyLearning(s.exists() ? (s.data() as Learning) : emptyLearning()),
      fail,
    );
    // A listener over the whole catalog re-reads every word after iPhone
    // background/reconnect cycles. One fetch per app load avoids that burst.
    void getDocs(
      query(collection(db, "words"), where("status", "==", "published")),
    )
      .then((s) => {
        if (active)
          setWords(s.docs.map((d) => projectWord({ ...d.data(), id: d.id })));
      })
      .catch(fail);
    void getDocs(
      query(collection(db, "lessons"), where("status", "==", "published")),
    )
      .then((s) => {
        if (active)
          setLessons(s.docs.map((d) => ({ ...d.data(), id: d.id }) as Lesson));
      })
      .catch(fail);
    return () => {
      active = false;
      off();
    };
  }, [user, phase, demo, contentRevision]);
  async function save(transform: (old: Learning) => Learning, quiet = false) {
    if (!quiet) setBusy(true);
    try {
      if (demo) {
        const next = transform(dataRef.current);
        dataRef.current = next;
        localStorage.setItem(previewKey, JSON.stringify(next));
        setData(next);
      } else {
        if (!db || !user || phase !== "ready")
          throw Error("Your account is not approved.");
        const database = db;
        const uid = user.uid;
        const committed = await runTransaction(database, async (tx) => {
          const ref = doc(database, "learning", uid),
            snapshot = await tx.get(ref);
          const next = transform(
            snapshot.exists() ? (snapshot.data() as Learning) : emptyLearning(),
          );
          tx.set(ref, next);
          return next;
        });
        applyLearning(committed);
      }
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      if (!quiet) setBusy(false);
    }
  }
  async function saveCompletedBatch(record: BatchRecord) {
    setBusy(true);
    try {
      if (demo) {
        await save((old) => commitBatch(old, record), true);
        setError("");
        return;
      }
      if (!db || !user || phase !== "ready")
        throw Error("Your account is not approved.");
      const current = dataRef.current;
      const next = commitBatch(current, record);
      if (next === current) {
        setError("");
        return;
      }
      const ref = doc(db, "learning", user.uid);
      // Avoid an extra transaction read for the completed batch. Security
      // rules still read the approval document, so quota exhaustion may
      // require the local completed draft to wait until the daily reset.
      try {
        await updateDoc(ref, {
          records: arrayUnion(record),
          activeSession: null,
        });
      } catch (error) {
        if ((error as { code?: string }).code !== "not-found") throw error;
        await setDoc(ref, next);
      }
      applyLearning(next);
      setError("");
    } catch (error) {
      setError((error as Error).message);
      throw error;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (phase === "ready" && !data.plans[today])
      void save((old) =>
        old.plans[today]
          ? old
          : { ...old, plans: { ...old.plans, [today]: planFor(old, today) } },
      ).catch(() => {});
  }, [phase, today, data.plans]);
  async function resetPreview() {
    if (import.meta.env.DEV && demo) {
      const { pilotLearning } = await import("../data/pilot");
      await save(() => pilotLearning(previewScenario));
    }
  }
  function choosePreviewScenario(scenario: "fresh" | "review") {
    if (!import.meta.env.DEV || !demo || scenario === previewScenario) return;
    localStorage.setItem("engls-pilot-scenario", scenario);
    setPhase("loading");
    setPreviewScenario(scenario);
  }
  return {
    demo,
    user,
    profile,
    phase,
    data,
    words,
    lessons,
    error,
    setError,
    busy,
    save,
    saveCompletedBatch,
    refreshContent: () => setContentRevision((value) => value + 1),
    resetPreview,
    previewScenario,
    choosePreviewScenario,
    today,
  };
}
