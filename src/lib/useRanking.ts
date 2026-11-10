import { useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { rankingEntry, type RankingEntry } from "./ranking";
import type { Learning } from "./model";

export function useRanking({
  uid,
  displayName,
  data,
  today,
  ready,
  visible,
  demo,
}: {
  uid: string | undefined;
  displayName: string | undefined;
  data: Learning;
  today: string;
  ready: boolean;
  visible: boolean;
  demo: boolean;
}) {
  const [remote, setRemote] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [readError, setReadError] = useState("");
  const [writeError, setWriteError] = useState("");
  const [retry, setRetry] = useState(0);
  const published = useRef("");
  const own = useMemo(
    () =>
      uid ? rankingEntry(uid, displayName || "Learner", data, today) : null,
    [uid, displayName, data, today],
  );
  const signature = own ? JSON.stringify(own) : "";

  useEffect(() => {
    if (!ready || !uid || !own) {
      published.current = "";
      return;
    }
    if (demo || !db) return;
    const key = `${uid}:${signature}`;
    if (published.current === key) return;
    let cancelled = false;
    void setDoc(doc(db, "rankings", uid), own)
      .then(() => {
        if (!cancelled) {
          published.current = key;
          setWriteError("");
        }
      })
      .catch((cause: Error) => {
        if (!cancelled)
          setWriteError(`Could not sync your ranking: ${cause.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, uid, signature, retry, demo]);

  useEffect(() => {
    if (!visible || !ready || demo || !db) {
      if (!ready) setRemote([]);
      setLoading(false);
      setReadError("");
      return;
    }
    setLoading(true);
    return onSnapshot(
      collection(db, "rankings"),
      (snapshot) => {
        setRemote(snapshot.docs.map((item) => item.data() as RankingEntry));
        setLoading(false);
        setReadError("");
      },
      (cause) => {
        setLoading(false);
        setReadError(`Could not load Ranking: ${cause.message}`);
      },
    );
  }, [visible, ready, demo, retry]);

  const entries = own
    ? [...remote.filter((entry) => entry.uid !== own.uid), own]
    : remote;
  return {
    entries,
    loading,
    error: [readError, writeError].filter(Boolean).join(" "),
    retry: () => {
      published.current = "";
      setRetry((value) => value + 1);
    },
  };
}
