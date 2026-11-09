import { createHash } from "node:crypto";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

export function stableHash(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

export function buildPlan(inventory) {
  if (!Array.isArray(inventory)) throw new TypeError("Inwentaryzacja musi być tablicą.");
  const ids = new Set();
  const conflicts = [];

  for (const item of inventory) {
    if (!item?.id || ids.has(item.id)) conflicts.push(item?.id ?? "missing-id");
    ids.add(item?.id);
  }
  if (conflicts.length) throw new Error(`Konflikt identyfikatorów: ${conflicts.join(", ")}`);

  const changes = inventory
    .filter((item) => item.current !== item.target)
    .map((item) => ({ id: item.id, from: item.current, to: item.target }));

  return {
    createdAt: "deterministic-demo",
    inputHash: stableHash(inventory),
    changes,
    unchanged: inventory.length - changes.length,
    confirmationToken: stableHash(changes).slice(0, 12),
  };
}

export function applyPlan(inventory, plan, confirmationToken) {
  if (confirmationToken !== plan.confirmationToken) {
    throw new Error("Nieprawidłowy token potwierdzający. Operacja przerwana.");
  }
  if (stableHash(inventory) !== plan.inputHash) {
    throw new Error("Dane wejściowe zmieniły się od audytu. Wykonaj nowy plan.");
  }

  const changeById = new Map(plan.changes.map((change) => [change.id, change]));
  const output = inventory.map((item) => {
    const change = changeById.get(item.id);
    return change ? { ...item, current: change.to } : { ...item };
  });
  const readbackVerified = plan.changes.every((change) => output.find((item) => item.id === change.id)?.current === change.to);
  if (!readbackVerified) throw new Error("Weryfikacja po zapisie nie powiodła się.");

  return {
    output,
    updated: plan.changes.map((change) => change.id),
    backupHash: plan.inputHash,
    outputHash: stableHash(output),
    readbackVerified,
  };
}
