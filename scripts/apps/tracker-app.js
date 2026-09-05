import { MODULE_ID, SETTINGS, MADNESS_TYPES } from "../lib/constants.js";
import { allAfflictedActors, clearAffliction, applyAffliction, rollDurationSeconds, checkExpiries, formatRemaining } from "../lib/afflictions.js";
import { drawMadnessTable } from "../lib/tables.js";
import { tryProgrammaticRoll } from "../lib/rolls.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const NEXT_TYPE = { short: "long", long: "indefinite" };

export class MadnessTrackerApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static instance = null;

  static DEFAULT_OPTIONS = {
    id: "madness-tracker-app",
    classes: ["madness-tracker", "madness-tracker-app"],
    window: { title: "MADNESS.TrackerApp.Title", icon: "fa-solid fa-brain", resizable: true },
    position: { width: 480, height: 480 },
    actions: {
      checkExpiries: MadnessTrackerApp.#onCheckExpiries,
      clear: MadnessTrackerApp.#onClear,
      escalate: MadnessTrackerApp.#onEscalate,
      recover: MadnessTrackerApp.#onRecover
    }
  };

  static PARTS = {
    main: { template: `modules/${MODULE_ID}/templates/tracker-app.hbs` }
  };

  static open() {
    if (!MadnessTrackerApp.instance) MadnessTrackerApp.instance = new MadnessTrackerApp();
    MadnessTrackerApp.instance.render(true);
    return MadnessTrackerApp.instance;
  }

  async _prepareContext() {
    const rows = [];
    for (const { actor, afflictions } of allAfflictedActors()) {
      for (const entry of afflictions) {
        rows.push({
          actorId: actor.id,
          afflictionId: entry.id,
          actorName: actor.name,
          typeLabel: game.i18n.localize(MADNESS_TYPES[entry.type]?.labelKey ?? entry.type),
          sourceText: entry.sourceText,
          remaining: formatRemaining(entry),
          nextType: NEXT_TYPE[entry.type] ?? null,
          nextTypeLabel: NEXT_TYPE[entry.type] ? game.i18n.localize(MADNESS_TYPES[NEXT_TYPE[entry.type]].labelKey) : null
        });
      }
    }
    return { rows, hasRows: rows.length > 0 };
  }

  static async #onCheckExpiries() {
    await checkExpiries();
    this.render();
  }

  static async #onClear(event, target) {
    const { actorId, afflictionId } = target.dataset;
    const actor = game.actors.get(actorId);
    if (actor) await clearAffliction(actor, afflictionId);
    this.render();
  }

  static async #onEscalate(event, target) {
    const { actorId, afflictionId, nextType } = target.dataset;
    const actor = game.actors.get(actorId);
    if (!actor || !nextType) return;

    const draw = await drawMadnessTable(nextType, { displayChat: true });
    if (!draw) return;
    const resultText = draw.results.map(r => r.text || r.name).join("; ") || game.i18n.localize("MADNESS.Chat.NoResultText");
    const durationSeconds = await rollDurationSeconds(nextType);

    await clearAffliction(actor, afflictionId, { silent: true });
    await applyAffliction(actor, { type: nextType, sourceText: resultText, durationSeconds });
    this.render();
  }

  static async #onRecover(event, target) {
    const { actorId, afflictionId } = target.dataset;
    const actor = game.actors.get(actorId);
    if (!actor) return;

    const dc = game.settings.get(MODULE_ID, SETTINGS.RECOVERY_DC);
    const ability = game.settings.get(MODULE_ID, SETTINGS.DEFAULT_ABILITY);
    const total = await tryProgrammaticRoll(actor, ability);

    if (total == null) {
      ui.notifications.info(game.i18n.localize("MADNESS.Notify.RollManually"));
      return;
    }
    if (total >= dc) {
      await clearAffliction(actor, afflictionId, { silent: true });
      ChatMessage.create({
        content: game.i18n.format("MADNESS.Chat.RecoverySuccess", { name: actor.name }),
        speaker: ChatMessage.getSpeaker({ actor })
      });
    } else {
      ui.notifications.warn(game.i18n.format("MADNESS.Notify.RecoveryFail", { name: actor.name, total, dc }));
    }
    this.render();
  }
}
