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


  game.settings.register("street-fighter", "onesRemoveSuccesses", {
    name: "STREET_FIGHTER.Settings.OnesRemoveSuccesses.Name",
    hint: "STREET_FIGHTER.Settings.OnesRemoveSuccesses.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("street-fighter", "criticalFailureRule", {
    name: "STREET_FIGHTER.Settings.CriticalFailureRule.Name",
    hint: "STREET_FIGHTER.Settings.CriticalFailureRule.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "moreOnesThanSuccesses": "STREET_FIGHTER.Settings.CriticalFailureRule.MoreOnesThanSuccesses",
      "onesWithNoSuccesses": "STREET_FIGHTER.Settings.CriticalFailureRule.OnesWithNoSuccesses",
      "disabled": "STREET_FIGHTER.Settings.CriticalFailureRule.Disabled",
    },
    default: "moreOnesThanSuccesses",
  });

  game.settings.register("street-fighter", "hidePlayerManeuversFromGM", {
    name: "STREET_FIGHTER.Settings.HidePlayerManeuversFromGM.Name",
    hint: "STREET_FIGHTER.Settings.HidePlayerManeuversFromGM.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("street-fighter", "autoAddTraitsOnImport", {
    name: "STREET_FIGHTER.Settings.AutoAddTraitsOnImport.Name",
    hint: "STREET_FIGHTER.Settings.AutoAddTraitsOnImport.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register("street-fighter", "autoAddTraitsOnManualCreate", {
    name: "STREET_FIGHTER.Settings.AutoAddTraitsOnManualCreate.Name",
    hint: "STREET_FIGHTER.Settings.AutoAddTraitsOnManualCreate.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });
}
