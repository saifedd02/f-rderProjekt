import assert from "node:assert/strict";
import test from "node:test";

import { parseGermanDate } from "../src/lib/utils/date";

test("unmögliche deutsche Kalenderdaten werden verworfen", () => {
  assert.equal(parseGermanDate("bis 31.06.2027"), undefined);
  assert.equal(parseGermanDate("31.02.2027"), undefined);
});

test("gültige deutsche Kalenderdaten bleiben erhalten", () => {
  const date = parseGermanDate("Frist 30.06.2027");
  assert.deepEqual(
    date && [date.getFullYear(), date.getMonth() + 1, date.getDate()],
    [2027, 6, 30]
  );
});
