/**
 * Street Fighter RPG System for Foundry VTT v13
 * @author Kirlian Silvestre
 * @version 1.0.0
 */

import { STREET_FIGHTER } from "./config/config.mjs";
import { registerSettings } from "./config/settings.mjs";
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { registerHandlebarsHelpers } from "./helpers/handlebars-helpers.mjs";

import { StreetFighterActor } from "./documents/actor.mjs";
import { StreetFighterItem } from "./documents/item.mjs";

import { StreetFighterActorSheet } from "./sheets/actor-sheet.mjs";
import { StreetFighterItemSheet } from "./sheets/item-sheet.mjs";

import { StreetFighterCombat } from "./combat/combat.mjs";
import { StreetFighterCombatant } from "./combat/combatant.mjs";

import { showImportDialog } from "./helpers/library-importer.mjs";
import { showCharacterImportDialog } from "./helpers/character-importer.mjs";
import { executeRoll } from "./dice/roll-dialog.mjs";

Hooks.once("init", async () => {
  console.log("Street Fighter | Initializing Street Fighter RPG System");

  game.streetfighter = {
    StreetFighterActor,
    StreetFighterItem,
    config: STREET_FIGHTER,
    showImportDialog,
    showCharacterImportDialog,
  };

  CONFIG.STREET_FIGHTER = STREET_FIGHTER;

  CONFIG.Actor.typeLabels = STREET_FIGHTER.actorTypes;
  CONFIG.Item.typeLabels = STREET_FIGHTER.itemTypes;

  CONFIG.Actor.documentClass = StreetFighterActor;
  CONFIG.Item.documentClass = StreetFighterItem;
  CONFIG.Combat.documentClass = StreetFighterCombat;
  CONFIG.Combatant.documentClass = StreetFighterCombatant;

  // Register sheets using DocumentSheetConfig for V2 applications
  foundry.documents.collections.Actors.registerSheet("street-fighter", StreetFighterActorSheet, {
    types: ["fighter"],
    makeDefault: true,
    label: "STREET_FIGHTER.SheetLabels.Actor",
  });

  foundry.documents.collections.Items.registerSheet("street-fighter", StreetFighterItemSheet, {
    makeDefault: true,
    label: "STREET_FIGHTER.SheetLabels.Item",
  });

  registerSettings();
  registerHandlebarsHelpers();

  await preloadHandlebarsTemplates();
});

Hooks.once("ready", () => {
  console.log("Street Fighter | System Ready");
});

Hooks.on("renderItemDirectory", (app, html, data) => {
  const button = document.createElement("button");
  button.className = "sf-import-library";
  button.type = "button";
  button.innerHTML = `<i class="fas fa-file-import"></i> ${game.i18n.localize("STREET_FIGHTER.Library.import")}`;
  
  button.addEventListener("click", () => {
    game.streetfighter.showImportDialog();
  });

  const actionButtons = html.querySelector(".directory-header .action-buttons");
  if (actionButtons) {
    actionButtons.prepend(button);
  }
});

Hooks.on("renderActorDirectory", (app, html, data) => {
  const button = document.createElement("button");
  button.className = "sf-import-characters";
  button.type = "button";
  button.innerHTML = `<i class="fas fa-file-import"></i> ${game.i18n.localize("STREET_FIGHTER.Character.import")}`;
  
  button.addEventListener("click", () => {
    game.streetfighter.showCharacterImportDialog();
  });

  const actionButtons = html.querySelector(".directory-header .action-buttons");
  if (actionButtons) {
    actionButtons.prepend(button);
  }
});

Hooks.on("renderChatMessage", (message, html, data) => {
  const element = html instanceof HTMLElement ? html : html[0] ?? html;
  if (!element?.querySelector) return;
  
  const rerollButton = element.querySelector(".reroll-button");
  if (!rerollButton) return;

  rerollButton.addEventListener("click", async (event) => {
    event.preventDefault();
    const card = element.querySelector(".roll-result");
    if (!card) return;

    const actorId = card.dataset.actorId;
    const attributeId = card.dataset.attributeId;
    const secondTraitId = card.dataset.secondTraitId;
    const difficulty = parseInt(card.dataset.difficulty) || 6;
    const modifier = parseInt(card.dataset.modifier) || 0;

    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.warn("Actor not found");
      return;
    }

    const attribute = actor.items.get(attributeId);
    const secondTrait = actor.items.get(secondTraitId);

    const attributeValue = attribute?.system.value || 0;
    const secondTraitValue = secondTrait?.system.value || 0;
    const dicePool = attributeValue + secondTraitValue + modifier;

    const rollData = {
      actor,
      attribute: attribute ? { id: attribute.id, name: attribute.name, value: attributeValue } : null,
      secondTrait: secondTrait ? { id: secondTrait.id, name: secondTrait.name, value: secondTraitValue, type: secondTrait.type } : null,
      difficulty,
      modifier,
      dicePool: Math.max(0, dicePool),
    };

    await executeRoll(rollData);
  });
});
