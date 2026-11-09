import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { auditFile, applyFromFiles } from "../src/file-workflow.js";

const sample = [
  { id: "P-001", current: "legacy-a", target: "standard-a" },
  { id: "P-002", current: "standard-b", target: "standard-b" },
];

test("apply uses the persisted audit plan and rejects input drift", async () => {
  const root = await mkdtemp(join(tmpdir(), "safe-automation-"));
  const dataPath = join(root, "inventory.json");
  const planPath = join(root, "plan.json");
  await writeFile(dataPath, JSON.stringify(sample));
  const plan = await auditFile({ dataPath, planPath });

  const drifted = sample.map((item) => ({ ...item }));
  drifted[1].note = "changed after audit";
  await writeFile(dataPath, JSON.stringify(drifted));

  await assert.rejects(
    applyFromFiles({ dataPath, planPath, confirmationToken: plan.confirmationToken, outputDir: root }),
    /zmieniły/i,
  );
});

test("apply reads the saved output back before writing a verified checkpoint", async () => {
  const root = await mkdtemp(join(tmpdir(), "safe-automation-"));
  const dataPath = join(root, "inventory.json");
  const planPath = join(root, "plan.json");
  await writeFile(dataPath, JSON.stringify(sample));
  const plan = await auditFile({ dataPath, planPath });

  const result = await applyFromFiles({
    dataPath,
    planPath,
    confirmationToken: plan.confirmationToken,
    outputDir: root,
  });

  const savedOutput = JSON.parse(await readFile(join(root, "output.json"), "utf8"));
  const checkpoint = JSON.parse(await readFile(join(root, "checkpoint.json"), "utf8"));
  assert.deepEqual(savedOutput, result.output);
  assert.equal(checkpoint.readbackVerified, true);
  assert.equal(checkpoint.outputHash, result.outputHash);
});

test("apply fails closed when post-write readback differs", async () => {
  const inventory = JSON.stringify(sample);
  let outputWasWritten = false;
  const io = {
    async readFile(path) {
      if (String(path).endsWith("inventory.json")) return inventory;
      if (String(path).endsWith("plan.json")) {
        const { buildPlan } = await import("../src/workflow.js");
        return JSON.stringify(buildPlan(sample));
      }
      if (String(path).endsWith("output.json") && outputWasWritten) return "[]";
      throw new Error(`Unexpected read: ${path}`);
    },
    async writeFile(path) {
      if (String(path).endsWith("output.json")) outputWasWritten = true;
    },
  };
  const { buildPlan } = await import("../src/workflow.js");
  const plan = buildPlan(sample);

  await assert.rejects(
    applyFromFiles({
      dataPath: "inventory.json",
      planPath: "plan.json",
      confirmationToken: plan.confirmationToken,
      outputDir: ".",
      io,
    }),
    /odczycie/i,
  );
});
