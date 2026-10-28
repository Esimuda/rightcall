import { decodePythPrice, referenceUsd } from "../lib/chain";
import { assessCall, assessSplit, spotRelation } from "../lib/learning";
import { seedCalls, seedObservations, seedSplits } from "../lib/seed";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const leon = seedCalls.find((call) => call.id === "leon-chiefs-bills");
const mina = seedCalls.find((call) => call.id === "mina-wolves");
const jonah = seedCalls.find((call) => call.id === "jonah-braves");
const split = seedSplits[0];
if (!leon || !mina || !jonah || !split) throw new Error("Seed calls missing");

const leonOn = assessCall(leon, seedObservations, true);
const leonOff = assessCall(leon, seedObservations, false);
assert(leonOff.before === "Follow", `Leon memory off should Follow, got ${leonOff.before}`);
assert(leonOn.after === "Fade", `Leon memory on should Fade, got ${leonOn.after}`);
assert(leonOn.used.length === 6, `Leon should use 6 memories, got ${leonOn.used.length}`);
assert(leonOn.heldOut.length === 2, `Leon should hold out 2, got ${leonOn.heldOut.length}`);
assert(leonOn.changed, "Leon recommendation should change");
assert(leonOff.used.length === 0, "Memory off should not attach memories");

const minaOn = assessCall(mina, seedObservations, true);
const minaOff = assessCall(mina, seedObservations, false);
assert(minaOff.before === "Pass", `Mina memory off should Pass, got ${minaOff.before}`);
assert(minaOn.after === "Follow", `Mina memory on should Follow, got ${minaOn.after}`);

const jonahOn = assessCall(jonah, seedObservations, true);
const jonahOff = assessCall(jonah, seedObservations, false);
assert(jonahOff.before === "Follow", `Jonah memory off should Follow, got ${jonahOff.before}`);
assert(jonahOn.after === "Pass", `Jonah memory on should Pass, got ${jonahOn.after}`);

const under = assessSplit(split, seedObservations, true, "under", null);
const over = assessSplit(split, seedObservations, true, "over", null);
const unread = assessSplit(split, seedObservations, true, "unknown", null);
const off = assessSplit(split, seedObservations, false, "under", null);
assert(under.judgment === "Lean chain", `Under cohort should lean chain, got ${under.judgment}`);
assert(over.judgment === "Lean book", `Over cohort should lean book, got ${over.judgment}`);
assert(unread.judgment === "No edge", `Unread cohort should be no edge, got ${unread.judgment}`);
assert(off.judgment === null, "Memory off should hide the split judgment");
assert(off.gapPp === 9, `Gap should stay 9pp, got ${off.gapPp}`);
assert(spotRelation(79462, 79489) === "under", "Spot $27 under reference should be under");
assert(spotRelation(79465, 79466) === "flat", "A one-dollar gap should stay flat");

const spot = decodePythPrice({
  price_magnitude: "7946260836773",
  exponent_magnitude: 8,
  exponent_is_negative: true,
  price_is_negative: false,
});
assert(spot != null && Math.abs(spot - 79462.608) < 0.01, `Pyth decode failed: ${spot}`);
const reference = referenceUsd("7948942", "10000000");
assert(reference != null && Math.abs(reference - 79489.42) < 0.01, `Reference decode failed: ${reference}`);

const predictionCount = seedObservations.filter((item) => item.kind === "prediction_outcome").length;
const oddsCount = seedObservations.filter((item) => item.kind === "odds_disagreement").length;
assert(seedObservations.length >= 10, "Need at least 10 seed observations");
assert(predictionCount >= 10, "Need at least 10 prediction outcomes");
assert(oddsCount >= 9, "Need a disagreement book");

console.log(
  JSON.stringify(
    {
      leon: { off: leonOff.before, on: leonOn.after, adjusted: Number(leonOn.adjusted?.toFixed(3)) },
      mina: { off: minaOff.before, on: minaOn.after, adjusted: Number(minaOn.adjusted?.toFixed(3)) },
      jonah: { off: jonahOff.before, on: jonahOn.after },
      split: { under: under.judgment, over: over.judgment, unread: unread.judgment, gap: off.gapPp },
      memories: seedObservations.length,
    },
    null,
    2,
  ),
);
