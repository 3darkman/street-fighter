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
import { StreetFighterCombatTracker } from "./combat/combat-tracker.mjs";
import { registerCombatSockets } from "./combat/combat-socket.mjs";

import { registerEffects } from "./effects/index.mjs";

import { showImportDialog } from "./helpers/library-importer.mjs";
import { showCharacterImportDialog } from "./helpers/character-importer.mjs";
import { executeRoll } from "./dice/roll-dialog.mjs";
import { createImportButton, canInteractWithChatMessage } from "./helpers/utils.mjs";
import { DIFFICULTY } from "./config/constants.mjs";

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

  CONFIG.ui.combat = StreetFighterCombatTracker;

  registerEffects();

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

  registerCombatSockets();
});

// Global click handler for chat message accordions
Hooks.on("renderChatMessageHTML", (message, html) => {
  html.querySelectorAll(".sf-maneuver-expand-chat").forEach(btn => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const card = btn.closest(".sf-maneuver-card-inline");
      if (!card) return;

      const notesSection = card.querySelector(".sf-maneuver-notes");
      if (!notesSection) return;

      const isCollapsed = notesSection.classList.contains("collapsed");
      notesSection.classList.toggle("collapsed", !isCollapsed);
      notesSection.classList.toggle("expanded", isCollapsed);

      const icon = btn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-chevron-down", !isCollapsed);
        icon.classList.toggle("fa-chevron-up", isCollapsed);
      }
    });
  });
});

Hooks.on("renderItemDirectory", (app, html, data) => {
  const button = createImportButton(
    "sf-import-library",
    "STREET_FIGHTER.Library.import",
    "fas fa-file-import",
    () => game.streetfighter.showImportDialog()
  );

  const actionButtons = html.querySelector(".directory-header .action-buttons");
  if (actionButtons) {
    actionButtons.prepend(button);
  }
});

Hooks.on("renderActorDirectory", (app, html, data) => {
  const button = createImportButton(
    "sf-import-characters",
    "STREET_FIGHTER.Character.import",
    "fas fa-file-import",
    () => game.streetfighter.showCharacterImportDialog()
  );

  const actionButtons = html.querySelector(".directory-header .action-buttons");
  if (actionButtons) {
    actionButtons.prepend(button);
  }
});

Hooks.on("renderChatMessageHTML", (message, html, data) => {
  const canInteract = canInteractWithChatMessage(message);

  // Hide interactive buttons for non-owners/non-GMs
  if (!canInteract) {
    html.querySelectorAll(".reroll-button, .apply-damage-button, .card-buttons button").forEach(btn => {
      btn.style.display = "none";
    });
  }

  // Apply Damage button handler
  const applyDamageButton = html.querySelector(".apply-damage-button");
  if (applyDamageButton) {
    applyDamageButton.addEventListener("click", async (event) => {
      event.preventDefault();
      const card = html.querySelector(".roll-result");
      if (!card) return;

      const targetActorId = card.dataset.targetActorId;
      const damage = parseInt(card.dataset.damage) || 0;

      if (!targetActorId || damage <= 0) {
        ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Roll.noDamageToApply"));
        return;
      }

      const targetActor = game.actors.get(targetActorId);
      if (!targetActor) {
        ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Errors.actorNotFound"));
        return;
      }

      await targetActor.applyDamage(damage);
      
      ui.notifications.info(
        game.i18n.format("STREET_FIGHTER.Roll.damageApplied", { 
          damage: damage, 
          name: targetActor.name 
        })
      );

      // Disable button after use
      applyDamageButton.disabled = true;
      applyDamageButton.classList.add("applied");
    });
  }

  const rerollButton = html.querySelector(".reroll-button");
  if (!rerollButton) return;

  rerollButton.addEventListener("click", async (event) => {
    event.preventDefault();
    const card = html.querySelector(".roll-result");
    if (!card) return;

    const actorId = card.dataset.actorId;
    const attributeId = card.dataset.attributeId;
    const secondTraitId = card.dataset.secondTraitId;
    const difficulty = parseInt(card.dataset.difficulty) || DIFFICULTY.default;
    const modifier = parseInt(card.dataset.modifier) || 0;
    const dicePool = parseInt(card.dataset.dicePool) || 0;
    const rollTitle = card.dataset.rollTitle || null;
    const targetTokenId = card.dataset.targetTokenId || null;
    const targetActorId = card.dataset.targetActorId || null;
    const targetName = card.dataset.targetName || null;
    const attributeValue = parseInt(card.dataset.attributeValue) || 0;
    const attributeName = card.dataset.attributeName || null;
    const secondTraitValue = parseInt(card.dataset.secondTraitValue) || 0;
    const secondTraitName = card.dataset.secondTraitName || null;
    const secondTraitType = card.dataset.secondTraitType || null;
    const isDamageRoll = card.dataset.isDamageRoll === "true";

    // Parse modifiers from JSON
    let fixedModifiers = [];
    let effectModifiers = [];
    try {
      const fixedModifiersStr = card.dataset.fixedModifiers;
      const effectModifiersStr = card.dataset.effectModifiers;
      if (fixedModifiersStr) fixedModifiers = JSON.parse(fixedModifiersStr);
      if (effectModifiersStr) effectModifiers = JSON.parse(effectModifiersStr);
    } catch (e) {
      console.warn("Street Fighter | Failed to parse modifiers for reroll", e);
    }

    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Errors.actorNotFound"));
      return;
    }

    const rollData = {
      actor,
      attribute: attributeId ? { id: attributeId, name: attributeName, value: attributeValue } : null,
      secondTrait: secondTraitId ? { id: secondTraitId, name: secondTraitName, value: secondTraitValue, type: secondTraitType } : null,
      difficulty,
      modifier,
      fixedModifiers,
      effectModifiers,
      dicePool: Math.max(0, dicePool),
      rollTitle,
      targetTokenId,
      targetActorId,
      targetName,
      isDamageRoll,
    };

    await executeRoll(rollData);
  });
});
