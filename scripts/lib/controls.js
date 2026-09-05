import { MODULE_ID } from "./constants.js";
import { MadnessCheckApp } from "../apps/check-app.js";
import { MadnessTrackerApp } from "../apps/tracker-app.js";

const TOOLS = [
  {
    name: "madness-check",
    title: "MADNESS.Controls.Check",
    icon: "fa-solid fa-brain",
    onClick: () => new MadnessCheckApp().render(true)
  },
  {
    name: "madness-tracker",
    title: "MADNESS.Controls.Tracker",
    icon: "fa-solid fa-book-skull",
    onClick: () => MadnessTrackerApp.open()
  }
];

/**
 * Adds two GM-only buttons to the token controls group: one to open the
 * madness-check dialog, one to open the affliction tracker. Foundry v12
 * passes `controls` as an array of groups; v13 passes an object keyed by
 * group name. This is best-effort UI sugar - if the scene-controls API
 * doesn't match either known shape, the module falls back silently to its
 * macro API (see README) rather than breaking anything else.
 */
export function registerControls(controls) {
  if (!game.user.isGM) return;

  try {
    if (Array.isArray(controls)) {
      const tokenGroup = controls.find(c => c.name === "token");
      if (!tokenGroup) return;
      for (const tool of TOOLS) {
        tokenGroup.tools.push({
          name: tool.name,
          title: game.i18n.localize(tool.title),
          icon: tool.icon,
          button: true,
          visible: true,
          onClick: tool.onClick
        });
      }
    } else if (controls && typeof controls === "object") {
      const tokenGroup = controls.tokens ?? controls.token;
      if (!tokenGroup?.tools) return;
      for (const tool of TOOLS) {
        tokenGroup.tools[tool.name] = {
          name: tool.name,
          title: game.i18n.localize(tool.title),
          icon: tool.icon,
          button: true,
          visible: true,
          onClick: tool.onClick
        };
      }
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | Could not register scene control buttons; use the macro API instead.`, err);
  }
}
