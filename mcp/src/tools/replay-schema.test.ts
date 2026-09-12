import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  ReplayBackfillOutputSchema,
  ReplayCompareOutputSchema,
  ReplayIncidentOutputSchema,
  ReplayStatusOutputSchema,
  ReplayToolErrorSchema,
} from "./replay-types.js";

const localFixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
);
const goldenFixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../tests/fixtures/golden",
);

function readFixture(name: string, goldenFallback: string): unknown {
  const localPath = join(localFixturesDir, name);
  if (existsSync(localPath)) {
    return JSON.parse(readFileSync(localPath, "utf8")) as unknown;
  }
  const goldenContent = JSON.parse(
    readFileSync(join(goldenFixturesDir, goldenFallback), "utf8"),
  ) as { output?: { shape?: unknown } };
  return goldenContent.output?.shape ?? goldenContent;
}

const backfillFixture = readFixture(
  "replay-backfill-output.json",
  "mcp-replay-backfill-success.json",
) as Record<string, unknown>;
const compareFixture = readFixture(
  "replay-compare-output.json",
  "mcp-replay-compare-success.json",
);
const incidentFixture = readFixture(
  "replay-incident-output.json",
  "mcp-replay-incident-success.json",
);
const statusFixture = readFixture(
  "replay-status-output.json",
  "mcp-replay-status-success.json",
);
const errorFixture = readFixture(
  "replay-error-output.json",
  "mcp-replay-backfill-error-slot-window.json",
);

test("schema contract: backfill fixture", () => {
  const result = ReplayBackfillOutputSchema.safeParse(backfillFixture);
  assert.equal(result.success, true);
});

test("schema contract: compare fixture", () => {
  const result = ReplayCompareOutputSchema.safeParse(compareFixture);
  assert.equal(result.success, true);
});

test("schema contract: incident fixture", () => {
  const result = ReplayIncidentOutputSchema.safeParse(incidentFixture);
  assert.equal(result.success, true);
});

test("schema contract: status fixture", () => {
  const result = ReplayStatusOutputSchema.safeParse(statusFixture);
  assert.equal(result.success, true);
});

test("schema contract: error fixture", () => {
  const result = ReplayToolErrorSchema.safeParse(errorFixture);
  assert.equal(result.success, true);
});

test("schema contract: backfill fixture has required fields", () => {
  assert.equal(backfillFixture.status, "ok");
  assert.equal(backfillFixture.schema, "replay.backfill.output.v1");

  const result = backfillFixture.result as { processed?: unknown } | undefined;
  assert.equal(typeof result?.processed, "number");
  assert.equal(typeof backfillFixture.truncated, "boolean");
});
