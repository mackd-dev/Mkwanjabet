import assert from "node:assert/strict";
import test from "node:test";
import { slug, sportMetadata, teamCode, teamKey } from "../src/modules/odds-feed/odds-api-feed.service";

test("normalizes The Odds API schedule metadata", () => {
  assert.equal(slug("Soccer EPL"), "soccer-epl");
  assert.deepEqual(sportMetadata("soccer_efl_champ"), { country: "England", competition: "Championship" });
  assert.equal(teamKey("Queens Park Rangers FC"), "queens-park-rangers");
  assert.equal(teamCode("Queens Park Rangers"), "QPR");
});
