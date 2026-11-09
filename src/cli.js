import { readFile, writeFile } from "node:fs/promises";
import { buildPlan, applyPlan } from "./workflow.js";

const [, , command = "audit", dataPath = "data/inventory.json", token] = process.argv;
const inventory = JSON.parse(await readFile(dataPath, "utf8"));
const plan = buildPlan(inventory);

if (command === "audit") {
  await writeFile("plan.json", `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`Plan gotowy: ${plan.changes.length} zmian. Token: ${plan.confirmationToken}`);
} else if (command === "apply") {
  const result = applyPlan(inventory, plan, token);
  await writeFile(`${dataPath}.backup`, `${JSON.stringify(inventory, null, 2)}\n`);
  await writeFile("output.json", `${JSON.stringify(result.output, null, 2)}\n`);
  await writeFile("checkpoint.json", `${JSON.stringify(result, null, 2)}\n`);
  console.log(`Zastosowano ${result.updated.length} zmian. Readback: ${result.readbackVerified ? "OK" : "FAIL"}`);
} else {
  throw new Error("Użycie: node src/cli.js audit|apply [plik.json] [token]");
}
