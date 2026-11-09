import { auditFile, applyFromFiles } from "./file-workflow.js";

const [, , command = "audit", dataPath = "data/inventory.json", tokenOrPlanPath, applyPlanPath] = process.argv;

if (command === "audit") {
  const planPath = tokenOrPlanPath ?? "plan.json";
  const plan = await auditFile({ dataPath, planPath });
  console.log(`Plan gotowy: ${plan.changes.length} zmian. Token: ${plan.confirmationToken}`);
} else if (command === "apply") {
  const planPath = applyPlanPath ?? "plan.json";
  const result = await applyFromFiles({
    dataPath,
    planPath,
    confirmationToken: tokenOrPlanPath,
    outputDir: process.cwd(),
  });
  console.log(`Zastosowano ${result.updated.length} zmian. Readback: ${result.readbackVerified ? "OK" : "FAIL"}`);
} else {
  throw new Error("Użycie: node src/cli.js audit [plik.json] [plan.json] | apply [plik.json] TOKEN [plan.json]");
}
