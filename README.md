# Tasha's Madness Tracker

A Foundry VTT module for tracking **Short-Term, Long-Term, and Indefinite Madness** from the 2014 D&D 5e Dungeon Master's Guide. Built for **Foundry v12/v13** with the **dnd5e v4+** system.

The GM triggers a check (e.g. "the party sees something horrifying"), players get a chat card to roll their saving throw, and on a failure the module rolls the appropriate madness table, tracks the resulting affliction's duration, and automatically clears it when it expires.

## ⚠️ About the table content

The actual Short-Term/Long-Term/Indefinite Madness table entries are copyrighted D&D 5e (2014) Dungeon Master's Guide content and are **not** included in this module. On first load, the module creates three **placeholder RollTables** in a "Madness Tracker" folder:

- Short-Term Madness (Placeholder) — 1d10, 10 entries
- Long-Term Madness (Placeholder) — 1d10, 10 entries
- Indefinite Madness (Placeholder) — 1d100, 10 entries (each spanning a 1-10 range, matching the DMG's table shape)

Open each table and replace the placeholder text with your own rulebook's entries. If you already own a compendium module with the official tables, point the module settings (**Short/Long/Indefinite Madness Table**) at that table's UUID instead, and the tracker will roll on it directly.

## Installing

1. Copy this folder into your Foundry `Data/modules/` directory (or install via manifest URL once published), so it lives at `Data/modules/tashas-madness-tracker/`.
2. Enable **Tasha's Madness Tracker** in your world's Module Management.
3. As GM, load the world once — the placeholder tables are created automatically.

## Using it

### Trigger a check

Open the **Madness Check** dialog via:
- The brain icon in the token controls toolbar (left sidebar, GM only), or
- A macro:
  ```js
  game.modules.get("tashas-madness-tracker").api.openCheck();
  ```

Pick your targets (defaults to selected tokens, or all player characters if nothing is selected), set the DC/ability, write flavor text, and choose:
- **Request Saving Throw** — posts a chat card per character; they (or you) click "Roll Saving Throw" to roll automatically, or enter a manually-rolled total. On a failure, a "Roll on [Type] Madness Table" button appears for the GM.
- **Direct Table Roll** — skips the save and rolls the chosen madness table immediately (e.g. for a cursed item, spell, or other forced effect), applying the result right away.

### Track active afflictions

Open the **Madness Tracker** via the book-skull icon in token controls, or:
```js
game.modules.get("tashas-madness-tracker").api.openTracker();
```
It lists every character with an active affliction, time remaining (or "Until cured" for Indefinite Madness), and per-row actions:
- **Attempt Recovery** — rolls a saving throw against the configurable Recovery DC; success clears the affliction.
- **Escalate** — rolls on the next tier's table (Short → Long → Indefinite) and replaces the current affliction with the new one.
- **Clear** — manually removes the affliction.

Durations count down against Foundry's world clock (`game.time.worldTime`); advancing time (e.g. via a long/short rest, or any macro/module that advances the clock) will automatically expire afflictions and post a chat message when they run out. Each active affliction also gets a small Active Effect on the actor so it's visible on the token.

## Settings

All configurable in Module Settings:

| Setting | Default | Purpose |
|---|---|---|
| Default Save DC | 15 | Pre-filled DC in the check dialog |
| Default Saving Throw Ability | Wisdom | Pre-filled ability in the check dialog |
| Short/Long/Indefinite Madness Table | (auto-set) | UUID of the RollTable to roll on for each tier |
| Short-Term Duration Formula | `1d10` (minutes) | How long Short-Term Madness lasts |
| Long-Term Duration Formula | `1d10 * 10` (hours) | How long Long-Term Madness lasts |
| Recovery Check DC | 15 | DC for the tracker's "Attempt Recovery" button |
| Remind Recovery Checks After Rest | off | Chat reminder to the GM after an afflicted character rests |

Adjust the duration/recovery numbers to match whatever madness variant rules your table actually uses — they're not hardcoded to a specific rules text since that's copyrighted.

## Notes / known limitations

- The "Roll Saving Throw" button tries to call the dnd5e system's actor roll API directly. Because that API's exact method signature has changed across dnd5e versions, the module tries the current and legacy signatures and falls back to a manual-total entry field if neither works — so it should keep working even if a future dnd5e update changes the roll API again.
- The token-controls toolbar buttons use Foundry's `getSceneControlButtons` hook, whose shape differs between v12 (array of groups) and v13 (object of groups); the module detects both, but if a future core update changes this again, use the macro API above as a guaranteed fallback.
- This module has not been tested inside a running Foundry instance — please try it in a test world before your session and report anything broken.
