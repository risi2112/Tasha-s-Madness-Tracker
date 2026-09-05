import { MODULE_ID, FLAGS, MADNESS_TYPES, SETTINGS } from "./constants.js";

const UNIT_SECONDS = { minutes: 60, hours: 3600 };

const TYPE_ICON = {
  short: "icons/magic/perception/eye-slit-red.webp",
  long: "icons/magic/perception/eye-ringed-green.webp",
  indefinite: "icons/magic/perception/eye-ringed-glow-angry-large-red.webp"
};

export function getAfflictions(actor) {
  return foundry.utils.deepClone(actor.getFlag(MODULE_ID, FLAGS.AFFLICTIONS) ?? []);
}

async function setAfflictions(actor, list) {
  return actor.setFlag(MODULE_ID, FLAGS.AFFLICTIONS, list);
}

export async function rollDurationSeconds(type) {
  const meta = MADNESS_TYPES[type];
  if (!meta.durationSetting) return null; // indefinite: no duration, lasts until cured
  const formula = game.settings.get(MODULE_ID, meta.durationSetting);
  const roll = await new Roll(formula).evaluate();
  const unitSeconds = UNIT_SECONDS[meta.durationUnit] ?? 60;
  return Math.max(0, Math.round(roll.total * unitSeconds));
}

/**
 * Record a new madness affliction on an actor: stores the flag entry and
 * adds a visible Active Effect (with duration where applicable) so the
 * token HUD reflects the affliction.
 */
export async function applyAffliction(actor, { type, label, sourceText, durationSeconds }) {
  const meta = MADNESS_TYPES[type];
  const now = game.time.worldTime;
  const id = foundry.utils.randomID();

  const effectData = {
    name: `${game.i18n.localize(meta.labelKey)} Madness`,
    img: TYPE_ICON[type],
    origin: actor.uuid,
    flags: { [MODULE_ID]: { afflictionId: id, madnessType: type } }
  };
  if (durationSeconds != null) effectData.duration = { seconds: durationSeconds };

  const [effect] = await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

  const entry = {
    id,
    type,
    label: label ?? `${game.i18n.localize(meta.labelKey)} Madness`,
    sourceText: sourceText ?? "",
    appliedWorldTime: now,
    expiresWorldTime: durationSeconds != null ? now + durationSeconds : null,
    effectId: effect?.id ?? null
  };

  const list = getAfflictions(actor);
  list.push(entry);
  await setAfflictions(actor, list);
  return entry;
}

export async function clearAffliction(actor, afflictionId, { silent = false } = {}) {
  const list = getAfflictions(actor);
  const entry = list.find(a => a.id === afflictionId);
  if (!entry) return null;

  const remaining = list.filter(a => a.id !== afflictionId);
  await setAfflictions(actor, remaining);

  if (entry.effectId && actor.effects.get(entry.effectId)) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", [entry.effectId]);
  }

  if (!silent) {
    ChatMessage.create({
      content: game.i18n.format("MADNESS.Chat.Cleared", { name: actor.name, label: entry.label }),
      speaker: ChatMessage.getSpeaker({ actor })
    });
  }

  return entry;
}

function actorsWithAfflictions() {
  return game.actors.filter(a => (a.getFlag(MODULE_ID, FLAGS.AFFLICTIONS) ?? []).length > 0);
}

export function remainingSeconds(entry) {
  if (entry.expiresWorldTime == null) return null;
  return Math.max(0, entry.expiresWorldTime - game.time.worldTime);
}

export function formatRemaining(entry) {
  const secs = remainingSeconds(entry);
  if (secs == null) return game.i18n.localize("MADNESS.Tracker.Permanent");
  if (secs <= 0) return game.i18n.localize("MADNESS.Tracker.Expired");
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/**
 * Called on world-time advancement (and manually from the tracker). Removes
 * any afflictions whose expiry has passed and announces it in chat.
 */
export async function checkExpiries() {
  if (!game.user.isGM) return;
  const now = game.time.worldTime;
  for (const actor of actorsWithAfflictions()) {
    const list = getAfflictions(actor);
    const expired = list.filter(a => a.expiresWorldTime != null && a.expiresWorldTime <= now);
    for (const entry of expired) {
      await clearAffliction(actor, entry.id, { silent: true });
      ChatMessage.create({
        content: game.i18n.format("MADNESS.Chat.Expired", { name: actor.name, label: entry.label }),
        speaker: ChatMessage.getSpeaker({ actor })
      });
    }
  }
}

export function allAfflictedActors() {
  return actorsWithAfflictions().map(actor => ({ actor, afflictions: getAfflictions(actor) }));
}
