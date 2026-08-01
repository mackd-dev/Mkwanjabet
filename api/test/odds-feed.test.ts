import assert from "node:assert/strict";
import test from "node:test";
import { EventStatus } from "@prisma/client";
import { adjustedPrice, eventStatus, outcomeKey, slug, sportName, teamCode, uniqueCode } from "../src/modules/odds-feed/odds-feed.service";

test("maps provider outcomes", () => {
  const event = { home_team: "Arsenal", away_team: "Chelsea" };
  assert.equal(outcomeKey("Arsenal", event), "home");
  assert.equal(outcomeKey("Chelsea", event), "away");
  assert.equal(outcomeKey("Draw", event), "draw");
});

test("normalizes provider values", () => {
  assert.equal(slug("Soccer EPL"), "soccer-epl");
  assert.equal(uniqueCode("soccer_epl"), "ODDS_SOCCER_EPL");
  assert.equal(sportName("football"), "Football");
  assert.equal(adjustedPrice(2.345, 1), 2.34);
  assert.equal(adjustedPrice(1.005, 0.95), 1.01);
});

test("maps API-Football fixture status and team codes", () => {
  assert.equal(eventStatus("1H"), EventStatus.LIVE);
  assert.equal(eventStatus("FT"), EventStatus.FINISHED);
  assert.equal(eventStatus("PST"), EventStatus.POSTPONED);
  assert.equal(eventStatus("NS"), EventStatus.SCHEDULED);
  assert.equal(teamCode("Manchester United"), "MU");
  assert.equal(teamCode("Azam"), "AZA");
});