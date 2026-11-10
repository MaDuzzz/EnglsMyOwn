import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  arrayUnion,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
describe.skipIf(!emulator)("Firestore access boundaries", () => {
  let env: RulesTestEnvironment;
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: "demo-englsmyown",
      firestore: { rules: readFileSync("firestore.rules", "utf8") },
    });
    await env.withSecurityRulesDisabled(async (c) => {
      const db = c.firestore();
      await setDoc(doc(db, "config/access"), { ownerUid: "owner" });
      for (const [uid, status] of [
        ["owner", "approved"],
        ["approved", "approved"],
        ["pending", "pending"],
        ["waiting", "pending"],
        ["revoked", "revoked"],
      ])
        await setDoc(doc(db, "users", uid), {
          uid,
          status,
          role: uid === "owner" ? "admin" : "learner",
        });
      await setDoc(doc(db, "words/published"), { status: "published" });
      await setDoc(doc(db, "words/draft"), { status: "draft" });
      await setDoc(doc(db, "learning/approved"), {
        records: [],
        plans: {},
        videos: {},
        savedVideos: [],
        pet: {
          name: "Mochi",
          color: "cream",
          gender: "unspecified",
          pattern: "solid",
        },
      });
    });
  });
  afterAll(async () => {
    await env?.cleanup();
  });
  it("blocks anonymous, pending and revoked accounts from content", async () => {
    await assertFails(
      getDoc(doc(env.unauthenticatedContext().firestore(), "words/published")),
    );
    for (const uid of ["pending", "revoked"])
      await assertFails(
        getDoc(
          doc(env.authenticatedContext(uid).firestore(), "words/published"),
        ),
      );
  });
  it("allows published queries but protects drafts and unfiltered queries", async () => {
    const db = env.authenticatedContext("approved").firestore();
    await assertSucceeds(
      getDocs(
        query(collection(db, "words"), where("status", "==", "published")),
      ),
    );
    await assertFails(getDoc(doc(db, "words/draft")));
    await assertFails(getDocs(collection(db, "words")));
  });
  it("prevents self approval, role escalation and owner config access", async () => {
    const db = env.authenticatedContext("pending").firestore();
    await assertFails(
      updateDoc(doc(db, "users/pending"), { status: "approved" }),
    );
    await assertFails(updateDoc(doc(db, "users/pending"), { role: "admin" }));
    await assertFails(getDoc(doc(db, "config/access")));
  });
  it("only the configured owner approves accounts", async () => {
    await assertSucceeds(
      updateDoc(
        doc(env.authenticatedContext("owner").firestore(), "users/pending"),
        { status: "approved" },
      ),
    );
    await assertFails(
      updateDoc(
        doc(env.authenticatedContext("approved").firestore(), "users/revoked"),
        { status: "approved" },
      ),
    );
  });
  it("isolates personal data to its learner and the configured owner", async () => {
    await assertSucceeds(
      getDoc(
        doc(env.authenticatedContext("owner").firestore(), "learning/approved"),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext("approved").firestore(),
          "learning/revoked",
        ),
      ),
    );
    await assertFails(
      setDoc(
        doc(env.authenticatedContext("approved").firestore(), "words/new"),
        { status: "published" },
      ),
    );
  });
  it("only creates a verified, pending learner profile with the caller email", async () => {
    const db = env
      .authenticatedContext("new", {
        email: "new@example.test",
        email_verified: true,
      })
      .firestore();
    const profile = {
      uid: "new",
      email: "new@example.test",
      displayName: "New learner",
      status: "pending",
      role: "learner",
    };
    await assertFails(
      setDoc(doc(db, "users/new"), { ...profile, status: "approved" }),
    );
    await assertFails(
      setDoc(doc(db, "users/new"), { ...profile, role: "admin" }),
    );
    await assertFails(
      setDoc(doc(db, "users/new"), { ...profile, email: "other@example.test" }),
    );
    await assertSucceeds(setDoc(doc(db, "users/new"), profile));
    await assertFails(setDoc(doc(db, "config/access"), { ownerUid: "new" }));
  });
  it("allows own progress while blocking other learners and revoked writes", async () => {
    const db = env.authenticatedContext("approved").firestore();
    const own = await assertSucceeds(getDoc(doc(db, "learning/approved")));
    await assertSucceeds(setDoc(doc(db, "learning/approved"), own.data()));
    await assertFails(setDoc(doc(db, "learning/revoked"), own.data()));
    await assertFails(
      setDoc(
        doc(
          env.authenticatedContext("revoked").firestore(),
          "learning/revoked",
        ),
        own.data(),
      ),
    );
    await assertFails(getDocs(collection(db, "users")));
  });
  it("shares only bounded ranking summaries with approved learners", async () => {
    const approved = env.authenticatedContext("approved").firestore();
    const owner = env.authenticatedContext("owner").firestore();
    const summary = {
      uid: "approved",
      displayName: "Learner",
      appearance: "cat",
      petStage: 1,
      weekKey: "2026-11-09",
      weekPoints: 30,
      weekDays: 1,
      weekWords: 10,
      monthKey: "2026-11",
      monthWords: 20,
      bestStreak: 5,
      currentStreak: 2,
      lastGoalDay: "2026-11-09",
      updatedDay: "2026-11-10",
    };
    const ref = doc(approved, "rankings/approved");
    await assertFails(
      getDocs(collection(env.unauthenticatedContext().firestore(), "rankings")),
    );
    await assertFails(
      getDocs(
        collection(env.authenticatedContext("waiting").firestore(), "rankings"),
      ),
    );
    await assertFails(
      getDocs(
        collection(env.authenticatedContext("revoked").firestore(), "rankings"),
      ),
    );
    await assertSucceeds(setDoc(ref, summary));
    await assertSucceeds(getDocs(collection(approved, "rankings")));
    await assertFails(
      setDoc(doc(approved, "rankings/owner"), { ...summary, uid: "owner" }),
    );
    await assertFails(
      setDoc(ref, { ...summary, email: "private@example.test" }),
    );
    await assertFails(setDoc(ref, { ...summary, bestStreak: 1 }));
    await assertFails(
      setDoc(
        doc(
          env.authenticatedContext("waiting").firestore(),
          "rankings/waiting",
        ),
        { ...summary, uid: "waiting" },
      ),
    );
    await assertFails(updateDoc(ref, { uid: "another" }));
    await assertSucceeds(updateDoc(ref, { weekPoints: 40 }));
    await assertFails(
      updateDoc(doc(owner, "rankings/approved"), { weekPoints: 1000 }),
    );
    await assertSucceeds(deleteDoc(doc(owner, "rankings/approved")));
  });
  it("accepts a completed batch with a write-only progress update", async () => {
    const db = env.authenticatedContext("approved").firestore();
    const ref = doc(db, "learning/approved");
    const record = {
      id: "review:2026-11-09:test",
      mode: "review",
      day: "2026-11-09",
      wordIds: Array.from({ length: 10 }, (_, i) => `word-${i}`),
      seconds: 135,
      completedAt: "2026-11-09T12:53:00+07:00",
    };
    await assertSucceeds(
      updateDoc(ref, {
        records: arrayUnion(record),
        activeSession: null,
      }),
    );
    const saved = (await getDoc(ref)).data()!;
    expect(saved.records).toContainEqual(record);
  });
  it("accepts supported companion species but rejects invalid or extra fields", async () => {
    const db = env.authenticatedContext("approved").firestore();
    const ref = doc(db, "learning/approved");
    const own = (await getDoc(ref)).data()!;
    for (const species of ["cat", "dog", "lion", "tiger"])
      await assertSucceeds(
        setDoc(ref, { ...own, pet: { ...own.pet, species } }),
      );
    await assertFails(
      setDoc(ref, { ...own, pet: { ...own.pet, species: "dragon" } }),
    );
    await assertFails(setDoc(ref, { ...own, pet: { ...own.pet, species: 3 } }));
    await assertFails(
      setDoc(ref, { ...own, pet: { ...own.pet, admin: true } }),
    );
    await assertSucceeds(setDoc(ref, own));
  });
  it("saves only a bounded draft in the approved learner's own document", async () => {
    const db = env.authenticatedContext("approved").firestore();
    const ref = doc(db, "learning/approved");
    const own = (await getDoc(ref)).data()!;
    const draft = {
      version: 1,
      id: "learn:2026-11-07:test",
      mode: "learn",
      day: "2026-11-07",
      wordIds: Array.from({ length: 10 }, (_, i) => `word-${i}`),
      queue: [],
      completed: [],
      introduced: [],
      round: 1,
      answer: "a saved answer",
      tokens: [],
      feedback: null,
      seconds: 25,
      updatedAt: 1794000000000,
    };
    await assertSucceeds(setDoc(ref, { ...own, activeSession: draft }));
    await assertFails(
      setDoc(ref, { ...own, activeSession: { ...draft, mode: "admin" } }),
    );
    await assertFails(
      setDoc(ref, { ...own, activeSession: { ...draft, secret: true } }),
    );
    await assertFails(
      setDoc(ref, {
        ...own,
        activeSession: { ...draft, answer: "a".repeat(501) },
      }),
    );
    await assertFails(
      setDoc(doc(db, "learning/revoked"), { ...own, activeSession: draft }),
    );
    await assertSucceeds(setDoc(ref, { ...own, activeSession: null }));
  });
  it("lets only the owner clear another learner's unfinished batch", async () => {
    const learnerDb = env.authenticatedContext("approved").firestore();
    const ownerDb = env.authenticatedContext("owner").firestore();
    const learnerRef = doc(learnerDb, "learning/approved");
    const ownerRef = doc(ownerDb, "learning/approved");
    const own = (await getDoc(learnerRef)).data()!;
    const draft = {
      version: 1,
      id: "review:today",
      attemptId: "attempt-one",
      mode: "review",
      day: "2026-11-09",
      wordIds: Array.from({ length: 10 }, (_, i) => `word-${i}`),
      queue: [],
      completed: ["word-0:0"],
      introduced: [],
      round: 1,
      answer: "",
      tokens: [],
      feedback: null,
      seconds: 20,
      updatedAt: 1794000000000,
    };
    await assertSucceeds(setDoc(learnerRef, { ...own, activeSession: draft }));
    await assertSucceeds(getDoc(ownerRef));
    await assertFails(
      updateDoc(ownerRef, { records: [], activeSession: null }),
    );
    await assertFails(
      updateDoc(ownerRef, {
        activeSession: null,
        blockedSessionId: "different-attempt",
      }),
    );
    await assertSucceeds(
      updateDoc(ownerRef, {
        activeSession: null,
        blockedSessionId: draft.attemptId,
      }),
    );
    expect((await getDoc(learnerRef)).data()).toMatchObject({
      activeSession: null,
      blockedSessionId: draft.attemptId,
    });
    await assertSucceeds(
      setDoc(learnerRef, {
        ...own,
        activeSession: {
          ...draft,
          attemptId: "attempt-two",
          completed: Array(40).fill("x"),
        },
      }),
    );
    await assertFails(
      updateDoc(ownerRef, {
        activeSession: null,
        blockedSessionId: "attempt-two",
      }),
    );
    await assertSucceeds(setDoc(learnerRef, { ...own, activeSession: null }));
  });
  it("revocation immediately denies new protected reads", async () => {
    const owner = env.authenticatedContext("owner").firestore();
    const learner = env.authenticatedContext("new").firestore();
    await assertSucceeds(
      updateDoc(doc(owner, "users/new"), { status: "approved" }),
    );
    await assertSucceeds(getDoc(doc(learner, "words/published")));
    const batch = writeBatch(owner);
    batch.update(doc(owner, "users/new"), { status: "revoked" });
    batch.delete(doc(owner, "rankings/new"));
    await assertSucceeds(batch.commit());
    await assertFails(getDoc(doc(learner, "words/published")));
    await assertFails(getDocs(collection(learner, "rankings")));
  });
});
