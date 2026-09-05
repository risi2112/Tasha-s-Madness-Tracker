import { MODULE_ID, SETTINGS, MADNESS_TYPES } from "./constants.js";

const FOLDER_NAME = "Madness Tracker";

function placeholderResults(type) {
  const results = [];
  if (type === "indefinite") {
    for (let i = 0; i < 10; i++) {
      const lo = i * 10 + 1;
      const hi = lo + 9;
      results.push({
        type: CONST.TABLE_RESULT_TYPES?.TEXT ?? 0,
        text: `GM: fill in Indefinite Madness result for roll ${lo}–${hi} (see your rulebook).`,
        range: [lo, hi],
        weight: 1
      });
    }
  } else {
    const label = type === "short" ? "Short-Term" : "Long-Term";
    for (let i = 1; i <= 10; i++) {
      results.push({
        type: CONST.TABLE_RESULT_TYPES?.TEXT ?? 0,
        text: `GM: fill in ${label} Madness result #${i} (see your rulebook).`,
        range: [i, i],
        weight: 1
      });
    }
  }
  return results;
}

async function getOrCreateFolder() {
  let folder = game.folders.find(f => f.type === "RollTable" && f.name === FOLDER_NAME);
  if (!folder) {
    folder = await Folder.create({ name: FOLDER_NAME, type: "RollTable", color: "#4b0082" });
  }
  return folder;
}

async function createPlaceholderTable(type, folder) {
  const label = type === "short" ? "Short-Term Madness" : type === "long" ? "Long-Term Madness" : "Indefinite Madness";
  const formula = type === "indefinite" ? "1d100" : "1d10";
  const table = await RollTable.create({
    name: `${label} (Placeholder)`,
    folder: folder.id,
    formula,
    replacement: true,
    displayRoll: true,
    results: placeholderResults(type),
    flags: { [MODULE_ID]: { madnessType: type, placeholder: true } }
  });
  return table;
}

/**
 * On first world load, create placeholder RollTables for the three madness
 * tables and point the module settings at them so the tracker has something
 * to roll on immediately. GMs are expected to replace the placeholder text
 * with their rulebook's actual table entries.
 */
export async function ensurePlaceholderTables() {
  if (!game.user.isGM) return;
  if (game.settings.get(MODULE_ID, SETTINGS.PLACEHOLDER_TABLES_CREATED)) return;

  const folder = await getOrCreateFolder();
  const created = {};
  for (const type of Object.keys(MADNESS_TYPES)) {
    const settingKey = MADNESS_TYPES[type].tableSetting;
    const existingUuid = game.settings.get(MODULE_ID, settingKey);
    if (existingUuid && (await fromUuid(existingUuid))) continue;
    const table = await createPlaceholderTable(type, folder);
    created[type] = table;
    await game.settings.set(MODULE_ID, settingKey, table.uuid);
  }

  await game.settings.set(MODULE_ID, SETTINGS.PLACEHOLDER_TABLES_CREATED, true);

  if (Object.keys(created).length) {
    ui.notifications.info(game.i18n.localize("MADNESS.Notify.PlaceholderTablesCreated"));
  }
}

export async function getTableForType(type) {
  const settingKey = MADNESS_TYPES[type].tableSetting;
  const uuid = game.settings.get(MODULE_ID, settingKey);
  if (!uuid) return null;
  const table = await fromUuid(uuid);
  return table ?? null;
}

/**
 * Draw on the configured table for the given madness type and return the
 * drawn result plus the raw roll, without posting a duplicate chat card
 * (the caller decides how/whether to announce it).
 */
export async function drawMadnessTable(type, { displayChat = true } = {}) {
  const table = await getTableForType(type);
  if (!table) {
    ui.notifications.warn(game.i18n.format("MADNESS.Notify.NoTableConfigured", { type }));
    return null;
  }
  const draw = await table.draw({ displayChat });
  return { table, roll: draw.roll, results: draw.results };
}
