/**
 * Street Fighter Roll Dialog
 * @author Kirlian Silvestre
 */

const { DialogV2 } = foundry.applications.api;

export class StreetFighterRollDialog extends DialogV2 {
  /**
   * Create and display a roll dialog
   * @param {Actor} actor - The actor making the roll
   * @param {object} options - Dialog options
   * @param {string} options.selectedTraitId - Pre-selected trait ID
   * @param {string} options.selectedTraitType - Type of pre-selected trait (attribute, ability, etc.)
   * @param {string} options.rollTitle - Custom title for the roll
   * @returns {Promise<object|null>} Roll data or null if cancelled
   */
  static async create(actor, options = {}) {
    console.log("StreetFighterRollDialog.create called", { actor, options });
    
    const dialogData = this._prepareDialogData(actor, options);
    console.log("Dialog data prepared:", dialogData);
    
    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/street-fighter/templates/dialog/roll-dialog.hbs",
      dialogData
    );
    console.log("Template rendered, content length:", content?.length);

    let formData = null;
    let dialogElement = null;
    
    // Build dialog title
    const dialogTitle = options.rollTitle || game.i18n.localize("STREET_FIGHTER.Roll.title");

    try {
      console.log("About to call DialogV2.prompt");
      const result = await DialogV2.prompt({
        window: { 
          title: dialogTitle,
          icon: "fas fa-dice-d10",
        },
        classes: ["street-fighter", "roll-dialog-window"],
        content: content,
        render: (event, dialog) => {
          dialogElement = dialog.element;
          this._setupDialogListeners(dialog.element);
        },
        ok: {
          action: "roll",
          label: game.i18n.localize("STREET_FIGHTER.Roll.roll"),
          icon: "fas fa-dice",
          callback: (event, button, dialog) => {
            console.log("Roll button callback", { event, button, dialog });
            dialogElement = dialog.element;
            const form = dialog.element.querySelector("form");
            if (form) {
              formData = new FormData(form);
              console.log("FormData captured");
            }
            return formData;
          },
        },
        rejectClose: false,
      });

      console.log("DialogV2.prompt result:", result, "formData:", formData);

      if (!formData) return null;

      return this._processFormData(formData, actor, dialogElement, options.rollTitle);
    } catch (error) {
      console.error("Error in roll dialog:", error);
      return null;
    }
  }

  /**
   * Prepare data for the dialog template
   * @param {Actor} actor
   * @param {object} options
   * @returns {object}
   * @private
   */
  static _prepareDialogData(actor, options) {
    const attributes = [];
    const abilities = [];
    const techniques = [];
    const backgrounds = [];

    for (const item of actor.items) {
      const itemData = {
        id: item.id,
        name: item.name,
        system: item.system,
        selected: item.id === options.selectedTraitId,
        secondSelected: item.id === options.preSelectedSecondTrait,
      };

      switch (item.type) {
        case "attribute":
          if (options.selectedTraitType === "attribute" && item.id === options.selectedTraitId) {
            itemData.selected = true;
          }
          attributes.push(itemData);
          break;
        case "ability":
          if (options.selectedTraitType === "ability" && item.id === options.selectedTraitId) {
            itemData.selected = true;
          }
          if (item.id === options.preSelectedSecondTrait) {
            itemData.secondSelected = true;
          }
          abilities.push(itemData);
          break;
        case "technique":
          if (options.selectedTraitType === "technique" && item.id === options.selectedTraitId) {
            itemData.selected = true;
          }
          if (item.id === options.preSelectedSecondTrait) {
            itemData.secondSelected = true;
          }
          techniques.push(itemData);
          break;
        case "background":
          if (options.selectedTraitType === "background" && item.id === options.selectedTraitId) {
            itemData.selected = true;
          }
          if (item.id === options.preSelectedSecondTrait) {
            itemData.secondSelected = true;
          }
          backgrounds.push(itemData);
          break;
      }
    }

    // Sort alphabetically
    const sortByName = (a, b) => a.name.localeCompare(b.name);
    attributes.sort(sortByName);
    abilities.sort(sortByName);
    techniques.sort(sortByName);
    backgrounds.sort(sortByName);

    // Get applicable effects (future implementation)
    const effects = [];

    // Prepare fixed modifiers (from maneuvers, etc.)
    const fixedModifiers = [];
    if (options.maneuverDamageModifier !== undefined && options.maneuverDamageModifier !== null) {
      const modValue = parseInt(options.maneuverDamageModifier);
      if (!isNaN(modValue)) {
        fixedModifiers.push({
          name: options.maneuverName || game.i18n.localize("STREET_FIGHTER.Roll.maneuverDamage"),
          value: modValue,
          displayValue: modValue >= 0 ? `+${modValue}` : `${modValue}`,
          checked: true,
        });
      }
    }

    return {
      actor,
      attributes,
      abilities,
      techniques,
      backgrounds,
      effects,
      fixedModifiers,
      difficulty: 6,
      selectedTraitType: options.selectedTraitType,
      preSelectedSecondTrait: options.preSelectedSecondTrait,
    };
  }

  /**
   * Process form data into roll parameters
   * @param {FormData} formData
   * @param {Actor} actor
   * @param {HTMLElement} dialogElement
   * @param {string} rollTitle - Custom title for the roll
   * @returns {object}
   * @private
   */
  static _processFormData(formData, actor, dialogElement, rollTitle) {
    const attributeId = formData.get("attribute");
    const secondTraitId = formData.get("secondTrait");
    const rawDifficulty = parseInt(formData.get("difficulty")) || 6;
    const difficulty = Math.max(2, Math.min(10, rawDifficulty));
    const modifier = parseInt(formData.get("modifier")) || 0;

    // Calculate fixed modifiers from checked checkboxes
    let fixedModifierTotal = 0;
    if (dialogElement) {
      const fixedModCheckboxes = dialogElement.querySelectorAll('.fixed-modifier-item input[type="checkbox"]:checked');
      fixedModCheckboxes.forEach(cb => {
        const value = parseInt(cb.dataset.value) || 0;
        fixedModifierTotal += value;
      });
    }

    const attribute = actor.items.get(attributeId);
    const secondTrait = actor.items.get(secondTraitId);

    const attributeValue = attribute?.system.value || 0;
    const secondTraitValue = secondTrait?.system.value || 0;
    const totalModifier = modifier + fixedModifierTotal;
    const dicePool = attributeValue + secondTraitValue + totalModifier;

    // Collect active fixed modifiers for chat display
    const activeFixedModifiers = [];
    if (dialogElement) {
      const fixedModCheckboxes = dialogElement.querySelectorAll('.fixed-modifier-item input[type="checkbox"]:checked');
      fixedModCheckboxes.forEach(cb => {
        const label = cb.nextElementSibling?.textContent?.trim() || "";
        // Extract name from "Name (+2)" format
        const match = label.match(/^(.+?)\s*\([^)]+\)$/);
        const name = match ? match[1].trim() : label;
        const value = parseInt(cb.dataset.value) || 0;
        if (value !== 0) {
          activeFixedModifiers.push({ name, value, displayValue: value >= 0 ? `+${value}` : `${value}` });
        }
      });
    }

    return {
      actor,
      attribute: attribute ? { id: attribute.id, name: attribute.name, value: attributeValue } : null,
      secondTrait: secondTrait ? { id: secondTrait.id, name: secondTrait.name, value: secondTraitValue, type: secondTrait.type } : null,
      difficulty,
      modifier,
      fixedModifiers: activeFixedModifiers,
      dicePool: Math.max(0, dicePool),
      rollTitle,
    };
  }

  /**
   * Setup event listeners for the dialog
   * @param {HTMLElement} html
   * @private
   */
  static _setupDialogListeners(html) {
    if (!html) {
      console.warn("Roll Dialog: html is null");
      return;
    }
    
    const attributeSelect = html.querySelector('select[name="attribute"]');
    const secondTraitSelect = html.querySelector('select[name="secondTrait"]');
    const modifierInput = html.querySelector('input[name="modifier"]');
    const difficultyInput = html.querySelector('input[name="difficulty"]');
    const poolDisplay = html.querySelector("#dicePoolTotal");
    const fixedModCheckboxes = html.querySelectorAll('.fixed-modifier-item input[type="checkbox"]');
    
    console.log("Roll Dialog elements:", { attributeSelect, secondTraitSelect, modifierInput, difficultyInput, poolDisplay });
    
    if (!difficultyInput) {
      console.warn("Roll Dialog: difficultyInput not found");
      return;
    }

    const updatePool = () => {
      const attrOption = attributeSelect.selectedOptions[0];
      const traitOption = secondTraitSelect.selectedOptions[0];
      const modifier = parseInt(modifierInput.value) || 0;

      // Calculate fixed modifiers from checked checkboxes
      let fixedModTotal = 0;
      fixedModCheckboxes.forEach(cb => {
        if (cb.checked) {
          fixedModTotal += parseInt(cb.dataset.value) || 0;
        }
      });

      const attrValue = parseInt(attrOption?.dataset.value) || 0;
      const traitValue = parseInt(traitOption?.dataset.value) || 0;

      const total = Math.max(0, attrValue + traitValue + modifier + fixedModTotal);
      poolDisplay.textContent = total;
    };

    // Clamp difficulty between 2 and 10
    const clampDifficulty = () => {
      let value = parseInt(difficultyInput.value);
      if (isNaN(value)) return;
      if (value < 2) difficultyInput.value = 2;
      if (value > 10) difficultyInput.value = 10;
    };

    attributeSelect?.addEventListener("change", updatePool);
    secondTraitSelect?.addEventListener("change", updatePool);
    modifierInput?.addEventListener("input", updatePool);
    
    // Fixed modifier checkboxes
    fixedModCheckboxes.forEach(cb => {
      cb.addEventListener("change", updatePool);
    });
    
    // Multiple events to catch all input methods
    difficultyInput?.addEventListener("input", clampDifficulty);
    difficultyInput?.addEventListener("change", clampDifficulty);
    difficultyInput?.addEventListener("keyup", clampDifficulty);

    // Initial update
    updatePool();
  }
}

/**
 * Execute a Street Fighter dice roll
 * @param {object} rollData - Data from the roll dialog
 * @returns {Promise<void>}
 */
export async function executeRoll(rollData) {
  if (!rollData || rollData.dicePool <= 0) {
    ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Roll.noDice"));
    return;
  }

  const { actor, attribute, secondTrait, difficulty, modifier, fixedModifiers, dicePool, rollTitle } = rollData;

  // Get system settings
  const onesRemoveSuccesses = game.settings.get("street-fighter", "onesRemoveSuccesses");
  const criticalFailureRule = game.settings.get("street-fighter", "criticalFailureRule");

  // Roll the dice
  const roll = new Roll(`${dicePool}d10`);
  await roll.evaluate();

  // Process results
  const dice = roll.terms[0].results.map(r => r.result);
  let successes = 0;
  let ones = 0;

  const diceResults = dice.map(die => {
    const isSuccess = die >= difficulty;
    const isOne = die === 1;
    const isTen = die === 10;

    if (isSuccess) successes++;
    if (isOne) ones++;

    return {
      value: die,
      isSuccess,
      isOne,
      isTen,
      cssClass: isSuccess ? "success" : (isOne ? "failure" : ""),
    };
  });

  // Apply ones removing successes
  let finalSuccesses = successes;
  let onesRemoved = 0;
  if (onesRemoveSuccesses && ones > 0) {
    onesRemoved = Math.min(ones, successes);
    finalSuccesses = successes - onesRemoved;
  }

  // Determine critical failure
  let isCriticalFailure = false;
  if (criticalFailureRule === "moreOnesThanSuccesses") {
    isCriticalFailure = ones > successes && finalSuccesses <= 0;
  } else if (criticalFailureRule === "onesWithNoSuccesses") {
    isCriticalFailure = ones > 0 && successes === 0;
  }

  // Determine result type
  let resultType = "failure";
  let resultLabel = game.i18n.localize("STREET_FIGHTER.Roll.failure");
  
  if (isCriticalFailure) {
    resultType = "criticalFailure";
    resultLabel = game.i18n.localize("STREET_FIGHTER.Roll.criticalFailure");
  } else if (finalSuccesses > 0) {
    resultType = "success";
    resultLabel = game.i18n.format("STREET_FIGHTER.Roll.successCount", { count: finalSuccesses });
  }

  // Build chat message content
  const chatData = {
    actor,
    attribute,
    secondTrait,
    difficulty,
    modifier,
    fixedModifiers: fixedModifiers || [],
    dicePool,
    diceResults,
    successes,
    ones,
    onesRemoved,
    finalSuccesses,
    resultType,
    resultLabel,
    onesRemoveSuccesses,
    isCriticalFailure,
    rollTitle: rollTitle || game.i18n.localize("STREET_FIGHTER.Roll.title"),
  };

  const content = await foundry.applications.handlebars.renderTemplate(
    "systems/street-fighter/templates/chat/roll-result.hbs",
    chatData
  );

  // Create chat message
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content,
    rolls: [roll],
    sound: CONFIG.sounds.dice,
  });
}
