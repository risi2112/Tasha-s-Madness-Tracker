import { MODULE_ID, SETTINGS, FLAGS } from "./lib/constants.js";
import { ensurePlaceholderTables } from "./lib/tables.js";
import { checkExpiries } from "./lib/afflictions.js";
import { attachChatListeners } from "./lib/chat-cards.js";
import { registerControls } from "./lib/controls.js";
import { MadnessCheckApp } from "./apps/check-app.js";
import { MadnessTrackerApp } from "./apps/tracker-app.js";

const FALLBACK_ABILITIES = { str: "Strength", dex: "Dexterity", con: "Constitution", int: "Intelligence", wis: "Wisdom", cha: "Charisma" };

function abilityChoices() {
  const abilities = CONFIG.DND5E?.abilities;
  if (!abilities) return FALLBACK_ABILITIES;
  return Object.fromEntries(Object.entries(abilities).map(([k, v]) => [k, v.label ?? v]));
}

function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.DEFAULT_DC, {
    name: "MADNESS.Settings.DefaultDC.Name",
    hint: "MADNESS.Settings.DefaultDC.Hint",
    scope: "world", config: true, type: Number, default: 15
  });

  game.settings.register(MODULE_ID, SETTINGS.DEFAULT_ABILITY, {
    name: "MADNESS.Settings.DefaultAbility.Name",
    hint: "MADNESS.Settings.DefaultAbility.Hint",
    scope: "world", config: true, type: String, default: "wis",
    choices: abilityChoices()
  });

  game.settings.register(MODULE_ID, SETTINGS.SHORT_TABLE_UUID, {
    name: "MADNESS.Settings.ShortTable.Name",
    hint: "MADNESS.Settings.ShortTable.Hint",
    scope: "world", config: true, type: String, default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS.LONG_TABLE_UUID, {
    name: "MADNESS.Settings.LongTable.Name",
    hint: "MADNESS.Settings.LongTable.Hint",
    scope: "world", config: true, type: String, default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS.INDEFINITE_TABLE_UUID, {
    name: "MADNESS.Settings.IndefiniteTable.Name",
    hint: "MADNESS.Settings.IndefiniteTable.Hint",
    scope: "world", config: true, type: String, default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS.SHORT_DURATION_FORMULA, {
    name: "MADNESS.Settings.ShortDuration.Name",
    hint: "MADNESS.Settings.ShortDuration.Hint",
    scope: "world", config: true, type: String, default: "1d10"
  });

  game.settings.register(MODULE_ID, SETTINGS.LONG_DURATION_FORMULA, {
    name: "MADNESS.Settings.LongDuration.Name",
    hint: "MADNESS.Settings.LongDuration.Hint",
    scope: "world", config: true, type: String, default: "1d10 * 10"
  });

  game.settings.register(MODULE_ID, SETTINGS.RECOVERY_DC, {
    name: "MADNESS.Settings.RecoveryDC.Name",
    hint: "MADNESS.Settings.RecoveryDC.Hint",
    scope: "world", config: true, type: Number, default: 15
  });

  game.settings.register(MODULE_ID, SETTINGS.PROMPT_RECOVERY_ON_REST, {
    name: "MADNESS.Settings.PromptRecovery.Name",
    hint: "MADNESS.Settings.PromptRecovery.Hint",
    scope: "world", config: true, type: Boolean, default: false
  });

  game.settings.register(MODULE_ID, SETTINGS.PLACEHOLDER_TABLES_CREATED, {
    scope: "world", config: false, type: Boolean, default: false
  });
}

Hooks.once("init", () => {
  registerSettings();
  if (!Handlebars.helpers.eq) Handlebars.registerHelper("eq", (a, b) => a === b);

  game.modules.get(MODULE_ID).api = {
    openCheck: () => new MadnessCheckApp().render(true),
    openTracker: () => MadnessTrackerApp.open(),
    checkExpiries: () => checkExpiries()
  };
});

Hooks.once("ready", () => {
  ensurePlaceholderTables();
});

Hooks.on("updateWorldTime", async () => {
  await checkExpiries();
  if (MadnessTrackerApp.instance?.rendered) MadnessTrackerApp.instance.render();
});

// Chat card listeners: Foundry v13 renders chat messages to a plain
// HTMLElement via `renderChatMessageHTML`; v12 uses the legacy jQuery-based
// `renderChatMessage`. Register both - only the one the running core
// actually fires will do anything.
Hooks.on("renderChatMessageHTML", (message, html) => attachChatListeners(message, html));
Hooks.on("renderChatMessage", (message, html) => attachChatListeners(message, html));

Hooks.on("getSceneControlButtons", controls => registerControls(controls));

Hooks.on("dnd5e.restCompleted", async (actor) => {
  if (!game.settings.get(MODULE_ID, SETTINGS.PROMPT_RECOVERY_ON_REST)) return;
  if (!game.user.isGM) return;
  const afflictions = actor.getFlag(MODULE_ID, FLAGS.AFFLICTIONS) ?? [];
  if (afflictions.length) {
    ui.notifications.info(game.i18n.format("MADNESS.Notify.RestRecoveryReminder", { name: actor.name }));
  }
});
