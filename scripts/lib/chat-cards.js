import { MODULE_ID, MADNESS_TYPES } from "./constants.js";
import { applyAffliction, rollDurationSeconds } from "./afflictions.js";
import { drawMadnessTable } from "./tables.js";
import { tryProgrammaticRoll } from "./rolls.js";

function abilityLabel(ability) {
  const entry = CONFIG.DND5E?.abilities?.[ability];
  if (!entry) return ability?.toUpperCase() ?? "";
  return entry.label ?? entry;
}

/**
 * Post a chat card asking a specific actor's owner (or the GM) to make a
 * saving throw. The card tries to roll programmatically via the dnd5e
 * actor API when clicked, but always offers a manual-total fallback since
 * the roll method signature has changed across dnd5e versions.
 */
export async function requestSavingThrow(actor, { dc, ability, flavor, madnessType }) {
  const content = await renderTemplate(`modules/${MODULE_ID}/templates/chat/save-request.hbs`, {
    title: game.i18n.format("MADNESS.Chat.RequestTitle", { name: actor.name }),
    flavor,
    dc,
    abilityLabel: abilityLabel(ability),
    resolved: false
  });

  const owners = game.users.filter(u => !u.isGM && actor.testUserPermission(u, "OWNER")).map(u => u.id);
  const whisper = owners.length ? [...owners, ...game.users.filter(u => u.isGM).map(u => u.id)] : [];

  return ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper,
    flags: {
      [MODULE_ID]: {
        kind: "save-request",
        actorUuid: actor.uuid,
        dc,
        ability,
        flavor,
        madnessType: madnessType ?? "short",
        resolved: false
      }
    }
  });
}

async function rerender(message, data) {
  const flagData = message.flags?.[MODULE_ID] ?? {};
  const merged = foundry.utils.mergeObject(flagData, data, { inplace: false });
  const actor = await fromUuid(merged.actorUuid);
  const failed = merged.resolved && merged.total < merged.dc;

  const content = await renderTemplate(`modules/${MODULE_ID}/templates/chat/save-request.hbs`, {
    title: game.i18n.format("MADNESS.Chat.RequestTitle", { name: actor?.name ?? "?" }),
    flavor: merged.flavor,
    dc: merged.dc,
    abilityLabel: abilityLabel(merged.ability),
    resolved: merged.resolved,
    total: merged.total,
    outcomeLabel: merged.resolved ? (failed ? game.i18n.localize("MADNESS.Chat.Failed") : game.i18n.localize("MADNESS.Chat.Passed")) : null,
    outcomeClass: failed ? "failed" : "passed",
    failed,
    tableRolled: merged.tableRolled ?? false,
    tableResultText: merged.tableResultText ?? "",
    madnessType: merged.madnessType,
    tableButtonLabel: game.i18n.format("MADNESS.Chat.RollTableButton", { type: game.i18n.localize(MADNESS_TYPES[merged.madnessType]?.labelKey ?? merged.madnessType) })
  });

  await message.update({ content, [`flags.${MODULE_ID}`]: merged });
}

async function resolveSave(message, total) {
  await rerender(message, { resolved: true, total });
}

async function handleRollSave(message) {
  const flags = message.flags?.[MODULE_ID] ?? {};
  const actor = await fromUuid(flags.actorUuid);
  if (!actor) return;
  const total = await tryProgrammaticRoll(actor, flags.ability);
  if (total == null) {
    ui.notifications.info(game.i18n.localize("MADNESS.Notify.RollManually"));
    return;
  }
  await resolveSave(message, total);
}

async function handleSubmitManual(message, html) {
  const input = html.querySelector(".manual-total");
  const value = Number(input?.value);
  if (!Number.isFinite(value)) {
    ui.notifications.warn(game.i18n.localize("MADNESS.Notify.EnterNumber"));
    return;
  }
  await resolveSave(message, value);
}

async function handleRollTable(message, button) {
  if (!game.user.isGM) return;
  const flags = message.flags?.[MODULE_ID] ?? {};
  const actor = await fromUuid(flags.actorUuid);
  const type = button.dataset.madnessType || "short";
  const draw = await drawMadnessTable(type, { displayChat: true });
  if (!draw) return;
  const resultText = draw.results.map(r => r.text || r.name).join("; ") || game.i18n.localize("MADNESS.Chat.NoResultText");
  const durationSeconds = await rollDurationSeconds(type);
  await applyAffliction(actor, { type, sourceText: resultText, durationSeconds });
  await rerender(message, { tableRolled: true, tableResultText: resultText });
}

export function attachChatListeners(message, root) {
  const flags = message.flags?.[MODULE_ID];
  if (!flags || flags.kind !== "save-request") return;

  const el = root instanceof HTMLElement ? root : root?.[0];
  if (!el) return;

  el.querySelector('[data-action="roll-save"]')?.addEventListener("click", () => handleRollSave(message));
  el.querySelector('[data-action="submit-manual"]')?.addEventListener("click", () => handleSubmitManual(message, el));
  el.querySelector('[data-action="roll-table"]')?.addEventListener("click", ev => handleRollTable(message, ev.currentTarget));
}
