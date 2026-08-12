// Server-side tests for the contextual assistant v2 contract.
// Synthetic fixtures only — no real CVs, notes, transcripts or credentials.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ASSISTANT_TASKS, ALLOWED_KINDS, parseAssistantRequest, parseModelProposal, type AssistantTask, type Proposal } from "./contract.ts";
import { buildPrompt } from "./prompts.ts";
import { handleV2, type Deps, type LogEntry, type QuotaState } from "./handler.ts";

const cors = { "Access-Control-Allow-Origin": "*" };
const RID = "00000000-0000-4000-8000-000000000001";

const baseContext = [
  { id: "role", label: "Graduate Analyst", provenance: "opportunity", content: "Graduate Analyst at Example Ltd" },
];

const requestBody = (overrides: Record<string, unknown> = {}) => ({
  version: 2,
  requestId: RID,
  task: "opportunity.explain_requirement",
  instruction: "Explain this requirement.",
  context: baseContext,
  ...overrides,
});

interface Harness {
  deps: Deps;
  logs: LogEntry[];
  consumed: number;
  store: Map<string, { status: string; proposal?: Proposal }>;
}

function harness(options: {
  user?: { userId: string } | null;
  quota?: QuotaState;
  gateway?: () => Promise<{ status: number; text?: string }>;
} = {}): Harness {
  const state: Harness = {
    logs: [],
    consumed: 0,
    store: new Map(),
    deps: undefined as unknown as Deps,
  };
  const quota: QuotaState = options.quota ?? { allowed: true, used: 1, limit: 5, isPremium: false };
  const key = (u: string, r: string) => `${u}:${r}`;

  state.deps = {
    verifyUser: () => Promise.resolve(options.user === undefined ? { userId: "user-a" } : options.user),
    checkQuota: () => Promise.resolve({ ...quota, used: quota.used + state.consumed }),
    consumeQuota: () => {
      state.consumed += 1;
      return Promise.resolve({ ...quota, used: quota.used + state.consumed });
    },
    reserve: (userId, requestId, _task) => {
      const existing = state.store.get(key(userId, requestId));
      if (!existing) {
        state.store.set(key(userId, requestId), { status: "reserved" });
        return Promise.resolve({ state: "reserved" as const });
      }
      if (existing.status === "completed") return Promise.resolve({ state: "completed" as const, proposal: existing.proposal });
      if (existing.status === "failed") {
        state.store.set(key(userId, requestId), { status: "reserved" });
        return Promise.resolve({ state: "reserved" as const });
      }
      return Promise.resolve({ state: "in_flight" as const });
    },
    complete: (userId, requestId, proposal) => {
      state.store.set(key(userId, requestId), { status: "completed", proposal });
      return Promise.resolve();
    },
    release: (userId, requestId) => {
      state.store.set(key(userId, requestId), { status: "failed" });
      return Promise.resolve();
    },
    generate: options.gateway ?? (() =>
      Promise.resolve({ status: 200, text: JSON.stringify({ kind: "explanation", text: "A bounded explanation.", sourceContextIds: ["role"] }) })),
    log: (entry) => state.logs.push(entry),
  };
  return state;
}

const proposalFor = (task: AssistantTask) =>
  JSON.stringify({ kind: ALLOWED_KINDS[task][0], text: "Synthetic proposal.", sourceContextIds: ["role"] });

// --- request validation -----------------------------------------------------

Deno.test("accepts every allowlisted task", async () => {
  for (const task of ASSISTANT_TASKS) {
    const h = harness({ gateway: () => Promise.resolve({ status: 200, text: proposalFor(task) }) });
    const res = await handleV2(requestBody({ task, requestId: RID }), "t", h.deps, cors);
    assertEquals(res.status, 200, task);
    const body = await res.json();
    assertEquals(body.usage.consumed, true);
    assertEquals(body.requestId, RID);
    assertEquals(body.proposal.sourceContextIds, ["role"]);
  }
});

Deno.test("rejects unsupported task and provenance", () => {
  assertEquals(parseAssistantRequest(requestBody({ task: "cv.delete_everything" })), { ok: false, failure: "task" });
  assertEquals(
    parseAssistantRequest(requestBody({ context: [{ ...baseContext[0], provenance: "profile" }] })),
    { ok: false, failure: "provenance" },
  );
});

Deno.test("rejects empty, duplicate, oversized and malformed input", () => {
  const long = "x".repeat(9_000);
  assertEquals(parseAssistantRequest(requestBody({ instruction: "   " })).ok, false);
  assertEquals(parseAssistantRequest(requestBody({ instruction: "y".repeat(2_001) })), { ok: false, failure: "instruction_too_long" });
  assertEquals(parseAssistantRequest(requestBody({ context: [] })), { ok: false, failure: "context_empty" });
  assertEquals(
    parseAssistantRequest(requestBody({ context: [baseContext[0], { ...baseContext[0] }] })),
    { ok: false, failure: "context_duplicate_id" },
  );
  assertEquals(
    parseAssistantRequest(requestBody({ context: [{ ...baseContext[0], content: long }] })),
    { ok: false, failure: "context_item_too_long" },
  );
  assertEquals(
    parseAssistantRequest(requestBody({
      context: Array.from({ length: 4 }, (_, i) => ({ ...baseContext[0], id: `c${i}`, content: "z".repeat(7_000) })),
    })),
    { ok: false, failure: "context_total_too_long" },
  );
  assertEquals(parseAssistantRequest(requestBody({ requestId: "not-a-uuid" })), { ok: false, failure: "request_id" });
  assertEquals(parseAssistantRequest("nonsense"), { ok: false, failure: "shape" });
  assertEquals(parseAssistantRequest({ version: 1, messages: [] }), { ok: false, failure: "not_v2" });
});

Deno.test("a malformed v2 request returns 422 and never bills", async () => {
  const h = harness();
  const res = await handleV2(requestBody({ task: "unknown.task" }), "t", h.deps, cors);
  assertEquals(res.status, 422);
  assertEquals(h.consumed, 0);
  assertEquals((await res.json()).usage.consumed, false);
});

// --- prompt construction ----------------------------------------------------

Deno.test("prompt uses only supplied context and forbids invention", () => {
  const parsed = parseAssistantRequest(requestBody());
  assert(parsed.ok);
  const { system, user } = buildPrompt(parsed.request);
  assertStringIncludes(user, "Graduate Analyst at Example Ltd");
  assertStringIncludes(user, "Explain this requirement.");
  assertStringIncludes(system, "Never invent facts");
  assertStringIncludes(system, "no profile, no memory, no chat history");
  assertStringIncludes(system, "Never invent an id");
  // No implicit profile/memory placeholders leak into the prompt.
  for (const forbidden of ["readinessScore", "User profile:", "chat history:"]) {
    assertEquals(system.includes(forbidden) || user.includes(forbidden), false, forbidden);
  }
});

// --- model output validation ------------------------------------------------

Deno.test("rejects malformed, empty, wrong-kind and context-inventing output", () => {
  const ids = ["role"];
  for (const raw of [
    "not json",
    JSON.stringify({ kind: "explanation", text: "", sourceContextIds: ids }),
    JSON.stringify({ kind: "draft", text: "wrong kind", sourceContextIds: ids }),
    JSON.stringify({ kind: "explanation", text: "invented", sourceContextIds: ["hidden-profile"] }),
    JSON.stringify({ kind: "explanation", text: "no ids", sourceContextIds: [] }),
    JSON.stringify({ kind: "explanation", text: "x".repeat(12_001), sourceContextIds: ids }),
  ]) {
    assertEquals(parseModelProposal(raw, "opportunity.explain_requirement", ids).ok, false, raw.slice(0, 24));
  }
  assert(parseModelProposal("```json\n" + JSON.stringify({ kind: "explanation", text: "ok", sourceContextIds: ids }) + "\n```", "opportunity.explain_requirement", ids).ok);
});

Deno.test("unsafe model output returns 422 and does not consume quota", async () => {
  const h = harness({ gateway: () => Promise.resolve({ status: 200, text: "{}" }) });
  const res = await handleV2(requestBody(), "t", h.deps, cors);
  assertEquals(res.status, 422);
  assertEquals((await res.json()).error, "no_safe_proposal");
  assertEquals(h.consumed, 0);
});

// --- auth, quota, gateway ---------------------------------------------------

Deno.test("missing or invalid authentication returns 401", async () => {
  const h = harness({ user: null });
  const res = await handleV2(requestBody(), "", h.deps, cors);
  assertEquals(res.status, 401);
  assertEquals(h.consumed, 0);
});

Deno.test("exhausted quota returns 402 without calling the gateway", async () => {
  let called = false;
  const h = harness({
    quota: { allowed: false, used: 5, limit: 5, isPremium: false },
    gateway: () => { called = true; return Promise.resolve({ status: 200, text: proposalFor("opportunity.explain_requirement") }); },
  });
  const res = await handleV2(requestBody(), "t", h.deps, cors);
  assertEquals(res.status, 402);
  assertEquals(called, false);
  assertEquals(h.consumed, 0);
});

Deno.test("gateway 429, 502, timeout and interruption never consume quota", async () => {
  const cases: Array<[() => Promise<{ status: number; text?: string }>, number]> = [
    [() => Promise.resolve({ status: 429 }), 429],
    [() => Promise.resolve({ status: 402 }), 402],
    [() => Promise.resolve({ status: 500 }), 502],
    [() => Promise.resolve({ status: 200, text: undefined }), 502],
    [() => Promise.reject(new Error("interrupted")), 502],
  ];
  for (const [gateway, expected] of cases) {
    const h = harness({ gateway });
    const res = await handleV2(requestBody(), "t", h.deps, cors);
    assertEquals(res.status, expected);
    assertEquals(h.consumed, 0);
    assertEquals((await res.json()).usage.consumed, false);
  }
});

// --- idempotency ------------------------------------------------------------

Deno.test("a repeated completed request returns the stored result and bills once", async () => {
  const h = harness();
  const first = await handleV2(requestBody(), "t", h.deps, cors);
  assertEquals(first.status, 200);
  const second = await handleV2(requestBody(), "t", h.deps, cors);
  const body = await second.json();
  assertEquals(second.status, 200);
  assertEquals(body.usage.consumed, false);
  assertEquals(body.proposal.text, "A bounded explanation.");
  assertEquals(h.consumed, 1);
});

Deno.test("concurrent duplicates reach billable execution only once", async () => {
  let resolveGateway: (value: { status: number; text: string }) => void = () => {};
  let calls = 0;
  const h = harness({
    gateway: () => {
      calls += 1;
      return new Promise((resolve) => { resolveGateway = resolve; });
    },
  });
  const a = handleV2(requestBody(), "t", h.deps, cors);
  const b = await handleV2(requestBody(), "t", h.deps, cors);
  assertEquals(b.status, 409);
  await b.text();
  resolveGateway({ status: 200, text: proposalFor("opportunity.explain_requirement") });
  assertEquals((await a).status, 200);
  assertEquals(calls, 1);
  assertEquals(h.consumed, 1);
});

Deno.test("a failed request may be retried and then bills exactly once", async () => {
  let fail = true;
  const h = harness({
    gateway: () => fail
      ? Promise.resolve({ status: 500 })
      : Promise.resolve({ status: 200, text: proposalFor("opportunity.explain_requirement") }),
  });
  assertEquals((await handleV2(requestBody(), "t", h.deps, cors)).status, 502);
  fail = false;
  assertEquals((await handleV2(requestBody(), "t", h.deps, cors)).status, 200);
  assertEquals(h.consumed, 1);
});

Deno.test("another user cannot retrieve the first user's stored response", async () => {
  const h = harness();
  await (await handleV2(requestBody(), "t", h.deps, cors)).json();
  // Same requestId, different authenticated user: this is a fresh reservation.
  (h.deps as { verifyUser: Deps["verifyUser"] }).verifyUser = () => Promise.resolve({ userId: "user-b" });
  const res = await handleV2(requestBody(), "t", h.deps, cors);
  assertEquals(res.status, 200);
  await res.json();
  assertEquals(h.store.has("user-b:" + RID), true);
  assertEquals(h.consumed, 2);
});

Deno.test("the response echoes the received request id", async () => {
  const other = "00000000-0000-4000-8000-0000000000ff";
  const h = harness();
  const body = await (await handleV2(requestBody({ requestId: other }), "t", h.deps, cors)).json();
  assertEquals(body.requestId, other);
});

// --- logging privacy --------------------------------------------------------

Deno.test("logs contain no instruction, context, proposal text or token", async () => {
  const h = harness();
  await (await handleV2(requestBody({ instruction: "SECRET-INSTRUCTION" }), "SECRET-TOKEN", h.deps, cors)).json();
  const serialised = JSON.stringify(h.logs);
  for (const secret of ["SECRET-INSTRUCTION", "SECRET-TOKEN", "Graduate Analyst at Example Ltd", "A bounded explanation."]) {
    assertEquals(serialised.includes(secret), false, secret);
  }
  assertStringIncludes(serialised, "opportunity.explain_requirement");
  assertStringIncludes(serialised, "consumed");
});
