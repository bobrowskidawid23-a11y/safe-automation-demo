import test from "node:test";
import assert from "node:assert/strict";

import { buildPlan, applyPlan, stableHash } from "../src/workflow.js";

const inventory = [
  { id: "P-001", current: "legacy-a", target: "standard-a" },
  { id: "P-002", current: "standard-b", target: "standard-b" },
];

test("audit produces a deterministic plan and confirmation token", () => {
  const plan = buildPlan(inventory);

  assert.equal(plan.changes.length, 1);
  assert.equal(plan.changes[0].id, "P-001");
  assert.equal(plan.unchanged, 1);
  assert.equal(plan.confirmationToken, stableHash(plan.changes).slice(0, 12));
});

test("apply refuses an invalid confirmation token", () => {
  const plan = buildPlan(inventory);

  assert.throws(() => applyPlan(inventory, plan, "wrong-token"), /token/i);
});

test("apply verifies the input snapshot and returns readback evidence", () => {
  const plan = buildPlan(inventory);
  const result = applyPlan(inventory, plan, plan.confirmationToken);

  assert.equal(result.updated.length, 1);
  assert.equal(result.output[0].current, "standard-a");
  assert.equal(result.outputHash, stableHash(result.output));

  const drifted = inventory.map((item) => ({ ...item }));
  drifted[0].current = "unexpected";
  assert.throws(() => applyPlan(drifted, plan, plan.confirmationToken), /zmieniły/i);
});
