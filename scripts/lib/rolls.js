import { MODULE_ID } from "./constants.js";

function extractTotal(result) {
  if (!result) return null;
  const roll = Array.isArray(result) ? result[result.length - 1] : result;
  return roll?.total ?? null;
}

/**
 * Attempt to roll a saving throw via the dnd5e actor API, trying the
 * current (v4+) config-object signature first and falling back to the
 * legacy (v3-) signature. Returns null (rather than throwing) if neither
 * API is present or the roll was cancelled, so callers can fall back to a
 * manually-entered total.
 */
export async function tryProgrammaticRoll(actor, ability) {
  try {
    if (typeof actor.rollSavingThrow === "function") {
      const result = await actor.rollSavingThrow({ ability }, {}, {});
      const total = extractTotal(result);
      if (total != null) return total;
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | rollSavingThrow failed, will try legacy API`, err);
  }
  try {
    if (typeof actor.rollAbilitySave === "function") {
      const result = await actor.rollAbilitySave(ability, {});
      const total = extractTotal(result);
      if (total != null) return total;
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | rollAbilitySave failed`, err);
  }
  return null;
}
