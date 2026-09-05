import { MODULE_ID, SETTINGS, MADNESS_TYPES } from "../lib/constants.js";
import { requestSavingThrow } from "../lib/chat-cards.js";
import { applyAffliction, rollDurationSeconds } from "../lib/afflictions.js";
import { drawMadnessTable } from "../lib/tables.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class MadnessCheckApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "madness-check-app",
    tag: "form",
    classes: ["madness-tracker", "madness-check-app"],
    window: { title: "MADNESS.CheckApp.Title", icon: "fa-solid fa-brain", resizable: true },
    position: { width: 460, height: "auto" },
    form: { handler: MadnessCheckApp.#onSubmit, submitOnChange: false, closeOnSubmit: false },
    actions: {
      selectAll: MadnessCheckApp.#onSelectAll,
      selectNone: MadnessCheckApp.#onSelectNone
    }
  };

  static PARTS = {
    form: { template: `modules/${MODULE_ID}/templates/check-app.hbs` }
  };

  async _prepareContext() {
    const controlledIds = canvas.tokens?.controlled.map(t => t.actor?.id).filter(Boolean) ?? [];
    const actors = game.actors.filter(a => a.hasPlayerOwner);
    const useControlled = controlledIds.length > 0;
    const targets = actors.map(a => ({
      id: a.id,
      name: a.name,
      checked: useControlled ? controlledIds.includes(a.id) : true
    }));

    return {
      targets,
      dc: game.settings.get(MODULE_ID, SETTINGS.DEFAULT_DC),
      ability: game.settings.get(MODULE_ID, SETTINGS.DEFAULT_ABILITY),
      abilities: CONFIG.DND5E?.abilities ?? {},
      madnessTypes: Object.values(MADNESS_TYPES).map(t => ({ key: t.key, label: game.i18n.localize(t.labelKey) }))
    };
  }

  static async #onSelectAll(event) {
    event.preventDefault();
    this.element.querySelectorAll('input[name="targets"]').forEach(el => (el.checked = true));
  }

  static async #onSelectNone(event) {
    event.preventDefault();
    this.element.querySelectorAll('input[name="targets"]').forEach(el => (el.checked = false));
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    const actorIds = Array.from(this.element.querySelectorAll('input[name="targets"]:checked')).map(el => el.value);
    if (!actorIds.length) {
      ui.notifications.warn(game.i18n.localize("MADNESS.Notify.NoTargets"));
      return;
    }

    const dc = Number(data.dc) || game.settings.get(MODULE_ID, SETTINGS.DEFAULT_DC);
    const ability = data.ability;
    const mode = data.mode;
    const madnessType = data.madnessType || "short";
    const flavor = data.flavor?.trim();

    for (const id of actorIds) {
      const actor = game.actors.get(id);
      if (!actor) continue;

      if (mode === "save") {
        await requestSavingThrow(actor, { dc, ability, flavor, madnessType });
      } else {
        const draw = await drawMadnessTable(madnessType, { displayChat: true });
        if (!draw) continue;
        const resultText = draw.results.map(r => r.text || r.name).join("; ") || game.i18n.localize("MADNESS.Chat.NoResultText");
        const durationSeconds = await rollDurationSeconds(madnessType);
        await applyAffliction(actor, { type: madnessType, sourceText: resultText, durationSeconds });
      }
    }

    ui.notifications.info(game.i18n.format("MADNESS.Notify.CheckSent", { count: actorIds.length }));
    this.close();
  }
}
