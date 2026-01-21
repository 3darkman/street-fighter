/**
 * Street Fighter RPG System Settings
 * @author Kirlian Silvestre
 */

export function registerSettings() {
  game.settings.register("street-fighter", "systemMigrationVersion", {
    name: "System Migration Version",
    scope: "world",
    config: false,
    type: String,
    default: "",
  });

  game.settings.register("street-fighter", "autoRollDamage", {
    name: "STREET_FIGHTER.Settings.AutoRollDamage.Name",
    hint: "STREET_FIGHTER.Settings.AutoRollDamage.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register("street-fighter", "showCombatAnimations", {
    name: "STREET_FIGHTER.Settings.ShowCombatAnimations.Name",
    hint: "STREET_FIGHTER.Settings.ShowCombatAnimations.Hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
  });
}
