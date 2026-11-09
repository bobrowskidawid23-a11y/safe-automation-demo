import * as fs from "node:fs/promises";
import { basename, join } from "node:path";

import { applyPlan, buildPlan, stableHash } from "./workflow.js";

export async function auditFile({ dataPath, planPath = "plan.json", io = fs }) {
  const inventory = JSON.parse(await io.readFile(dataPath, "utf8"));
  const plan = buildPlan(inventory);
  await io.writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  return plan;
}

export async function applyFromFiles({
  dataPath,
  planPath = "plan.json",
  confirmationToken,
  outputDir = ".",
  io = fs,
}) {
  const inventoryText = await io.readFile(dataPath, "utf8");
  const inventory = JSON.parse(inventoryText);
  const plan = JSON.parse(await io.readFile(planPath, "utf8"));
  const result = applyPlan(inventory, plan, confirmationToken);

  const backupPath = join(outputDir, `${basename(dataPath)}.backup`);
  const outputPath = join(outputDir, "output.json");
  const checkpointPath = join(outputDir, "checkpoint.json");
  await io.writeFile(backupPath, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");
  await io.writeFile(outputPath, `${JSON.stringify(result.output, null, 2)}\n`, "utf8");

  const persistedOutput = JSON.parse(await io.readFile(outputPath, "utf8"));
  if (stableHash(persistedOutput) !== result.outputHash) {
    throw new Error("Weryfikacja po odczycie zapisanego wyniku nie powiodła się.");
  }

  const checkpoint = { ...result, readbackVerified: true };
  await io.writeFile(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`, "utf8");
  return checkpoint;
}
