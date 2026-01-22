/**
 * Street Fighter Actor Sheet
 * @author Kirlian Silvestre
 * @extends {ActorSheetV2}
 */

import { StreetFighterRollDialog, executeRoll } from "../dice/roll-dialog.mjs";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class StreetFighterActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["street-fighter", "sheet", "actor"],
    position: {
      width: 720,
      height: 680,
    },
    window: {
      resizable: true,
    },
    actions: {
      editItem: StreetFighterActorSheet._onEditItem,
      deleteItem: StreetFighterActorSheet._onDeleteItem,
      editImage: StreetFighterActorSheet._onEditImage,
      incrementTrait: StreetFighterActorSheet._onIncrementTrait,
      decrementTrait: StreetFighterActorSheet._onDecrementTrait,
      sendTraitToChat: StreetFighterActorSheet._onSendTraitToChat,
      createEffect: StreetFighterActorSheet._onCreateEffect,
      editEffect: StreetFighterActorSheet._onEditEffect,
      deleteEffect: StreetFighterActorSheet._onDeleteEffect,
      toggleEffect: StreetFighterActorSheet._onToggleEffect,
      rollTrait: StreetFighterActorSheet._onRollTrait,
      rollManeuver: StreetFighterActorSheet._onRollManeuver,
    },
    form: {
      submitOnChange: true,
    },
    dragDrop: [{ dragSelector: ".item[data-item-id]", dropSelector: null }],
  };

  /** @inheritDoc */
  static PARTS = {
    form: {
      template: "systems/street-fighter/templates/actor/actor-fighter-sheet.hbs",
    },
  };

  /** @inheritDoc */
  static TABS = {
    primary: {
      traits: { id: "traits", group: "primary", label: "STREET_FIGHTER.Tabs.traits" },
      maneuvers: { id: "maneuvers", group: "primary", label: "STREET_FIGHTER.Tabs.maneuvers" },
      resources: { id: "resources", group: "primary", label: "STREET_FIGHTER.Tabs.resources" },
      effects: { id: "effects", group: "primary", label: "STREET_FIGHTER.Tabs.effects" },
      biography: { id: "biography", group: "primary", label: "STREET_FIGHTER.Tabs.biography" },
    },
  };

  /** @inheritDoc */
  tabGroups = {
    primary: "traits",
  };

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    
    // Setup tab click handlers
    const tabs = this.element.querySelectorAll(".sheet-tabs .item");
    tabs.forEach(tab => {
      tab.addEventListener("click", (event) => {
        event.preventDefault();
        const tabName = tab.dataset.tab;
        this._activateTab(tabName);
      });
    });

    // Setup context menu for traits and maneuvers
    this._setupTraitContextMenu(this.element);
    this._setupManeuverContextMenu(this.element);
    
    // Setup maneuver accordion
    this._setupManeuverAccordion(this.element);
  }

  /**
   * Activate a specific tab
   * @param {string} tabName - The name of the tab to activate
   * @private
   */
  _activateTab(tabName) {
    // Update tab buttons
    const tabs = this.element.querySelectorAll(".sheet-tabs .item");
    tabs.forEach(t => {
      t.classList.toggle("active", t.dataset.tab === tabName);
    });

    // Update tab content
    const tabContents = this.element.querySelectorAll(".tab[data-group='primary']");
    tabContents.forEach(content => {
      content.classList.toggle("active", content.dataset.tab === tabName);
    });

    // Store the active tab
    this.tabGroups.primary = tabName;
  }

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Add actor reference for template compatibility
    context.actor = this.actor;
    context.systemData = this.actor.system;
    context.config = CONFIG.STREET_FIGHTER;
    context.isOwner = this.actor.isOwner;
    
    // Check if character is imported (read-only) or manual (editable)
    context.isImported = this.actor.system.importData?.isImported || false;
    context.isEditable = this.isEditable && !context.isImported;

    context.items = this._prepareItems(context);
    context.effects = this._prepareEffects(context);
    context.tabs = this._prepareTabs(options);

    // Enrich HTML fields
    const TextEditorImpl = foundry.applications.ux.TextEditor.implementation;
    context.enrichedBiography = await TextEditorImpl.enrichHTML(
      this.actor.system.biography || "",
      {
        secrets: this.actor.isOwner,
        async: true,
        relativeTo: this.actor,
      }
    );
    
    context.enrichedBackground = await TextEditorImpl.enrichHTML(
      this.actor.system.background || "",
      {
        secrets: this.actor.isOwner,
        async: true,
        relativeTo: this.actor,
      }
    );
    
    context.enrichedMotivations = await TextEditorImpl.enrichHTML(
      this.actor.system.motivations || "",
      {
        secrets: this.actor.isOwner,
        async: true,
        relativeTo: this.actor,
      }
    );

    return context;
  }

  /**
   * Prepare tab data for rendering
   * @param {object} options
   * @returns {object}
   * @protected
   */
  _prepareTabs(options) {
    const tabs = {};
    for (const [groupId, group] of Object.entries(this.constructor.TABS)) {
      tabs[groupId] = {};
      for (const [tabId, tab] of Object.entries(group)) {
        tabs[groupId][tabId] = {
          ...tab,
          active: this.tabGroups[groupId] === tabId,
          cssClass: this.tabGroups[groupId] === tabId ? "active" : "",
        };
      }
    }
    return tabs;
  }

  /**
   * Organize and classify items for the actor sheet
   * @param {object} context
   * @returns {object}
   * @private
   */
  _prepareItems(context) {
    const fightingStyles = [];
    const specialManeuvers = [];
    const weapons = [];
    const divisions = [];
    
    // Organize attributes by category
    const attributesByCategory = {
      physical: [],
      social: [],
      mental: [],
    };
    
    // Organize abilities by category
    const abilitiesByCategory = {
      talents: [],
      skills: [],
      knowledge: [],
    };
    
    const techniques = [];
    const backgrounds = [];

    // First pass: collect all items
    for (const item of this.actor.items) {
      switch (item.type) {
        case "fightingStyle":
          fightingStyles.push(item);
          break;
        case "specialManeuver":
          specialManeuvers.push(item);
          break;
        case "attribute":
          const attrCategory = item.system.category || "physical";
          if (attributesByCategory[attrCategory]) {
            attributesByCategory[attrCategory].push(item);
          }
          break;
        case "ability":
          const abilCategory = item.system.category || "talents";
          if (abilitiesByCategory[abilCategory]) {
            abilitiesByCategory[abilCategory].push(item);
          }
          break;
        case "technique":
          techniques.push(item);
          break;
        case "background":
          backgrounds.push(item);
          break;
        case "weapon":
          weapons.push(item);
          break;
        case "division":
          divisions.push(item);
          break;
      }
    }

    // Calculate maneuver stats
    const characterStats = this._getCharacterStats(attributesByCategory, abilitiesByCategory, techniques);
    const preparedManeuvers = specialManeuvers.map(maneuver => {
      return this._prepareManeuverData(maneuver, characterStats);
    });

    return {
      fightingStyles,
      specialManeuvers: preparedManeuvers,
      attributesByCategory,
      abilitiesByCategory,
      techniques,
      backgrounds,
      weapons,
      divisions,
    };
  }

  /**
   * Get character stats needed for maneuver calculations
   * @param {object} attributesByCategory
   * @param {object} abilitiesByCategory
   * @param {Array} techniques
   * @returns {object}
   * @private
   */
  _getCharacterStats(attributesByCategory, abilitiesByCategory, techniques) {
    // Find Dexterity (physical attribute)
    const dexterity = attributesByCategory.physical.find(a => 
      a.system.sourceId === "dexterity" || a.name.toLowerCase() === "dexterity" || a.name.toLowerCase() === "destreza"
    );
    
    // Find Strength (physical attribute)
    const strength = attributesByCategory.physical.find(a => 
      a.system.sourceId === "strength" || a.name.toLowerCase() === "strength" || a.name.toLowerCase() === "força"
    );
    
    // Find Wits (mental attribute)
    const wits = attributesByCategory.mental.find(a => 
      a.system.sourceId === "wits" || a.name.toLowerCase() === "wits" || a.name.toLowerCase() === "raciocínio"
    );
    
    // Find Athletics technique
    const athletics = techniques.find(t => 
      t.system.sourceId === "athletics" || t.name.toLowerCase() === "athletics" || t.name.toLowerCase() === "atletismo"
    );

    return {
      dexterity: dexterity?.system.value || 0,
      strength: strength?.system.value || 0,
      wits: wits?.system.value || 0,
      athletics: athletics?.system.value || 0,
      techniques: Object.fromEntries(techniques.map(t => [t.system.sourceId || t.name.toLowerCase(), t.system.value || 0])),
    };
  }

  /**
   * Prepare maneuver data with calculated stats
   * @param {Item} maneuver
   * @param {object} characterStats
   * @returns {object}
   * @private
   */
  _prepareManeuverData(maneuver, characterStats) {
    const category = maneuver.system.category || "";
    const isFirearm = category.toLowerCase() === "firearm" || category.toLowerCase() === "arma de fogo";
    
    // Get technique value for this maneuver's category
    const techniqueValue = characterStats.techniques[category.toLowerCase()] || 0;
    
    // Calculate Speed: base is Dexterity (or Wits for firearms)
    const speedBase = isFirearm ? characterStats.wits : characterStats.dexterity;
    const calculatedSpeed = this._calculateModifier(maneuver.system.speedModifier, speedBase);
    
    // Calculate Damage: base is Strength + Technique (or just Technique for firearms)
    const damageBase = isFirearm ? techniqueValue : characterStats.strength + techniqueValue;
    const calculatedDamage = this._calculateModifier(maneuver.system.damageModifier, damageBase);
    
    // Calculate Movement: base is Athletics (or 0 for firearms)
    const movementBase = isFirearm ? 0 : characterStats.athletics;
    const calculatedMovement = this._calculateModifier(maneuver.system.movementModifier, movementBase);

    return {
      id: maneuver.id,
      name: maneuver.name,
      system: maneuver.system,
      calculatedSpeed,
      calculatedDamage,
      calculatedMovement,
      // Formatted original values for display in parentheses
      originalSpeed: this._formatOriginalModifier(maneuver.system.speedModifier),
      originalDamage: this._formatOriginalModifier(maneuver.system.damageModifier),
      originalMovement: this._formatOriginalModifier(maneuver.system.movementModifier),
      damageAttribute: isFirearm ? null : "strength",
      damageTechnique: category.toLowerCase(),
    };
  }

  /**
   * Format original modifier for display in parentheses
   * @param {string} modifierStr - The original modifier string
   * @returns {string} Formatted string for display
   * @private
   */
  _formatOriginalModifier(modifierStr) {
    if (!modifierStr || modifierStr === "") return "—";
    
    // Keep +/- modifiers as-is
    if (modifierStr.startsWith("+") || modifierStr.startsWith("-")) {
      return modifierStr;
    }
    
    // Handle special strings
    const lowerMod = modifierStr.toLowerCase().trim();
    if (lowerMod === "nenhum" || lowerMod === "none") return "—";
    if (lowerMod === "um" || lowerMod === "one") return "1";
    if (lowerMod === "dois" || lowerMod === "two") return "2";
    
    // Try to parse as number - keep as-is
    const value = parseInt(modifierStr);
    if (!isNaN(value)) return modifierStr;
    
    // Any other text returns "*"
    return "*";
  }

  /**
   * Calculate modifier value based on maneuver rules
   * @param {string} modifierStr - The modifier string (e.g., "+2", "-1", "None")
   * @param {number} baseStat - The base stat value
   * @returns {string}
   * @private
   */
  _calculateModifier(modifierStr, baseStat) {
    if (!modifierStr || modifierStr === "") return "—";
    
    // Check if it starts with + or -
    if (modifierStr.startsWith("+") || modifierStr.startsWith("-")) {
      const modValue = parseInt(modifierStr);
      if (!isNaN(modValue)) {
        return String(baseStat + modValue);
      }
    }
    
    // Handle special strings - "Nenhum" means no value, not zero
    const lowerMod = modifierStr.toLowerCase().trim();
    if (lowerMod === "nenhum" || lowerMod === "none") return "—";
    if (lowerMod === "um" || lowerMod === "one") return "1";
    if (lowerMod === "dois" || lowerMod === "two") return "2";
    
    // Try to parse as number
    const value = parseInt(modifierStr);
    if (!isNaN(value)) return String(value);
    
    // Any other text returns "*"
    return "*";
  }

  /**
   * Organize and classify effects for the actor sheet
   * @param {object} context
   * @returns {object}
   * @private
   */
  _prepareEffects(context) {
    const passive = [];
    const temporary = [];
    const inactive = [];

    for (const effect of this.actor.effects) {
      const effectData = {
        id: effect.id,
        name: effect.name,
        icon: effect.icon || "icons/svg/aura.svg",
        disabled: effect.disabled,
        duration: effect.duration,
        isTemporary: effect.isTemporary,
      };

      if (effect.disabled) {
        inactive.push(effectData);
      } else if (effect.isTemporary) {
        temporary.push(effectData);
      } else {
        passive.push(effectData);
      }
    }

    return { passive, temporary, inactive };
  }

  /** @inheritDoc */
  async _onDropItem(event, data) {
    // Block drops on imported characters
    if (!this.isEditable || this.actor.system.importData?.isImported) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Character.readOnlyWarning"));
      return false;
    }
    
    const item = await Item.implementation.fromDropData(data);
    if (!item) return false;

    // If dropping a fighting style, remove existing styles first (only one allowed)
    if (item.type === "fightingStyle") {
      const existingStyles = this.actor.items.filter(i => i.type === "fightingStyle");
      if (existingStyles.length > 0) {
        const idsToDelete = existingStyles.map(s => s.id);
        await this.actor.deleteEmbeddedDocuments("Item", idsToDelete);
      }
    }

    // Create the new item
    const itemData = item.toObject();
    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Handle editing an item
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onEditItem(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    item?.sheet.render(true);
  }

  /**
   * Handle deleting an item
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onDeleteItem(event, target) {
    event.preventDefault();
    // Block on imported characters
    if (this.actor.system.importData?.isImported) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Character.readOnlyWarning"));
      return;
    }
    
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("STREET_FIGHTER.Dialog.DeleteItem.Title") },
      content: game.i18n.format("STREET_FIGHTER.Dialog.DeleteItem.Content", {
        name: item.name,
      }),
    });

    if (confirmed) {
      await item.delete();
    }
  }

  /**
   * Handle editing the actor image
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onEditImage(event, target) {
    const field = target.dataset.field || "img";
    const current = foundry.utils.getProperty(this.document, field);
    const fp = new foundry.applications.apps.FilePicker({
      type: "image",
      current: current,
      callback: (path) => this.document.update({ [field]: path }),
    });
    fp.render(true);
  }

  /**
   * Handle incrementing a trait value
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onIncrementTrait(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const maxValue = StreetFighterActorSheet._getTraitMaxValue(item.type);
    const currentValue = item.system.value || 0;
    
    if (currentValue < maxValue) {
      await item.update({ "system.value": currentValue + 1 });
    }
  }

  /**
   * Handle decrementing a trait value
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onDecrementTrait(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const currentValue = item.system.value || 0;
    const minValue = item.type === "attribute" ? 1 : 0;
    
    if (currentValue > minValue) {
      await item.update({ "system.value": currentValue - 1 });
    }
  }

  /**
   * Handle sending a trait to chat
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onSendTraitToChat(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const typeLabel = game.i18n.localize(`STREET_FIGHTER.Item.Types.${item.type}`);
    const categoryLabel = item.system.category 
      ? game.i18n.localize(`STREET_FIGHTER.Categories.${item.system.category}`)
      : "";

    const content = `
      <div class="street-fighter chat-card">
        <div class="card-header">
          <h3>${item.name}</h3>
        </div>
        <div class="card-content">
          <p><strong>${typeLabel}</strong>${categoryLabel ? ` (${categoryLabel})` : ""}</p>
          <p><strong>${game.i18n.localize("STREET_FIGHTER.Common.value")}:</strong> ${item.system.value || 0}</p>
          ${item.system.description ? `<p>${item.system.description}</p>` : ""}
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
    });
  }

  /**
   * Get the maximum value for a trait type
   * @param {string} itemType - The type of item
   * @returns {number} Maximum value
   * @private
   */
  static _getTraitMaxValue(itemType) {
    switch (itemType) {
      case "attribute":
      case "ability":
      case "technique":
        return 8;
      case "background":
        return 10;
      default:
        return 10;
    }
  }

  /**
   * Setup context menu for traits (right-click)
   * @param {HTMLElement} html - The rendered HTML
   * @private
   */
  _setupTraitContextMenu(html) {
    const sheet = this;
    const isImported = this.actor.system.importData?.isImported;
    
    const menuItems = [];
    
    // Only add edit/delete and increment/decrement for non-imported characters
    if (!isImported) {
      menuItems.push({
        name: game.i18n.localize("STREET_FIGHTER.Common.edit"),
        icon: '<i class="fas fa-edit"></i>',
        callback: (li) => {
          const itemId = li.dataset?.itemId;
          if (itemId) sheet._editItemById(itemId);
        },
      });
      menuItems.push({
        name: game.i18n.localize("STREET_FIGHTER.ContextMenu.increment"),
        icon: '<i class="fas fa-plus"></i>',
        callback: (li) => {
          const itemId = li.dataset?.itemId;
          if (itemId) sheet._incrementTraitById(itemId);
        },
      });
      menuItems.push({
        name: game.i18n.localize("STREET_FIGHTER.ContextMenu.decrement"),
        icon: '<i class="fas fa-minus"></i>',
        callback: (li) => {
          const itemId = li.dataset?.itemId;
          if (itemId) sheet._decrementTraitById(itemId);
        },
      });
      menuItems.push({
        name: game.i18n.localize("STREET_FIGHTER.Common.delete"),
        icon: '<i class="fas fa-trash"></i>',
        callback: (li) => {
          const itemId = li.dataset?.itemId;
          if (itemId) sheet._deleteItemById(itemId);
        },
      });
    }
    
    // Send to chat is always available
    menuItems.push({
      name: game.i18n.localize("STREET_FIGHTER.ContextMenu.sendToChat"),
      icon: '<i class="fas fa-comment"></i>',
      callback: (li) => {
        const itemId = li.dataset?.itemId;
        if (itemId) sheet._sendTraitToChatById(itemId);
      },
    });

    new foundry.applications.ux.ContextMenu.implementation(html, ".trait-item[data-item-id]", menuItems, { jQuery: false });
  }

  /**
   * Setup context menu for maneuvers (right-click)
   * @param {HTMLElement} html - The rendered HTML
   * @private
   */
  _setupManeuverContextMenu(html) {
    const sheet = this;
    const isImported = this.actor.system.importData?.isImported;
    
    const menuItems = [];
    
    // Only add edit/delete for non-imported characters
    if (!isImported) {
      menuItems.push({
        name: game.i18n.localize("STREET_FIGHTER.Common.edit"),
        icon: '<i class="fas fa-edit"></i>',
        callback: (li) => {
          const itemId = li.dataset?.itemId;
          if (itemId) sheet._editItemById(itemId);
        },
      });
      menuItems.push({
        name: game.i18n.localize("STREET_FIGHTER.Common.delete"),
        icon: '<i class="fas fa-trash"></i>',
        callback: (li) => {
          const itemId = li.dataset?.itemId;
          if (itemId) sheet._deleteItemById(itemId);
        },
      });
    }
    
    // Send to chat is always available
    menuItems.push({
      name: game.i18n.localize("STREET_FIGHTER.ContextMenu.sendToChat"),
      icon: '<i class="fas fa-comment"></i>',
      callback: (li) => {
        const itemId = li.dataset?.itemId;
        if (itemId) sheet._sendManeuverToChatById(itemId);
      },
    });

    new foundry.applications.ux.ContextMenu.implementation(html, ".maneuver-card[data-item-id]", menuItems, { jQuery: false });
    new foundry.applications.ux.ContextMenu.implementation(html, ".weapon-item[data-item-id]", menuItems, { jQuery: false });
  }

  /**
   * Setup maneuver accordion (expand/collapse notes)
   * @param {HTMLElement} html - The rendered HTML
   * @private
   */
  _setupManeuverAccordion(html) {
    const maneuverRows = html.querySelectorAll(".maneuver-row");
    
    maneuverRows.forEach(row => {
      row.addEventListener("click", (event) => {
        // Don't toggle if clicking on the name (which triggers roll)
        if (event.target.closest(".maneuver-name")) {
          return;
        }
        
        const card = row.closest(".maneuver-card");
        const notes = card.querySelector(".maneuver-notes");
        const expandIcon = row.querySelector(".maneuver-expand i");
        
        if (notes) {
          notes.classList.toggle("collapsed");
          if (expandIcon) {
            expandIcon.classList.toggle("fa-chevron-down");
            expandIcon.classList.toggle("fa-chevron-up");
          }
        }
      });
    });
  }

  /**
   * Edit an item by its ID
   * @param {string} itemId - The item ID
   * @private
   */
  _editItemById(itemId) {
    const item = this.actor.items.get(itemId);
    item?.sheet.render(true);
  }

  /**
   * Delete an item by its ID
   * @param {string} itemId - The item ID
   * @private
   */
  async _deleteItemById(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("STREET_FIGHTER.Dialog.DeleteItem.Title") },
      content: game.i18n.format("STREET_FIGHTER.Dialog.DeleteItem.Content", {
        name: item.name,
      }),
    });

    if (confirmed) {
      await item.delete();
    }
  }

  /**
   * Send a maneuver to chat by its ID
   * @param {string} itemId - The item ID
   * @private
   */
  async _sendManeuverToChatById(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const content = `
      <div class="street-fighter chat-card">
        <div class="card-header">
          <h3>${item.name}</h3>
        </div>
        <div class="card-content">
          <p><strong>${game.i18n.localize("STREET_FIGHTER.SpecialManeuver.category")}:</strong> ${item.system.category || "-"}</p>
          <p><strong>${game.i18n.localize("STREET_FIGHTER.SpecialManeuver.speedModifier")}:</strong> ${item.system.speedModifier || "-"}</p>
          <p><strong>${game.i18n.localize("STREET_FIGHTER.SpecialManeuver.damageModifier")}:</strong> ${item.system.damageModifier || "-"}</p>
          <p><strong>${game.i18n.localize("STREET_FIGHTER.SpecialManeuver.movementModifier")}:</strong> ${item.system.movementModifier || "-"}</p>
          ${item.system.chiCost ? `<p><strong>${game.i18n.localize("STREET_FIGHTER.SpecialManeuver.chiCost")}:</strong> ${item.system.chiCost}</p>` : ""}
          ${item.system.willpowerCost ? `<p><strong>${game.i18n.localize("STREET_FIGHTER.SpecialManeuver.willpowerCost")}:</strong> ${item.system.willpowerCost}</p>` : ""}
          ${item.system.notes ? `<p><em>${item.system.notes}</em></p>` : ""}
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
    });
  }

  /**
   * Increment a trait by its ID
   * @param {string} itemId - The item ID
   * @private
   */
  async _incrementTraitById(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const maxValue = this.constructor._getTraitMaxValue(item.type);
    const currentValue = item.system.value || 0;
    
    if (currentValue < maxValue) {
      await item.update({ "system.value": currentValue + 1 });
    }
  }

  /**
   * Decrement a trait by its ID
   * @param {string} itemId - The item ID
   * @private
   */
  async _decrementTraitById(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const currentValue = item.system.value || 0;
    const minValue = item.type === "attribute" ? 1 : 0;
    
    if (currentValue > minValue) {
      await item.update({ "system.value": currentValue - 1 });
    }
  }

  /**
   * Send a trait to chat by its ID
   * @param {string} itemId - The item ID
   * @private
   */
  async _sendTraitToChatById(itemId) {
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const typeLabel = game.i18n.localize(`STREET_FIGHTER.Item.Types.${item.type}`);
    const categoryLabel = item.system.category 
      ? game.i18n.localize(`STREET_FIGHTER.Categories.${item.system.category}`)
      : "";

    const content = `
      <div class="street-fighter chat-card">
        <div class="card-header">
          <h3>${item.name}</h3>
        </div>
        <div class="card-content">
          <p><strong>${typeLabel}</strong>${categoryLabel ? ` (${categoryLabel})` : ""}</p>
          <p><strong>${game.i18n.localize("STREET_FIGHTER.Common.value")}:</strong> ${item.system.value || 0}</p>
          ${item.system.description ? `<p>${item.system.description}</p>` : ""}
        </div>
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content: content,
    });
  }

  /**
   * Handle creating a new effect
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onCreateEffect(event, target) {
    event.preventDefault();
    // Block on imported characters
    if (this.actor.system.importData?.isImported) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Character.readOnlyWarning"));
      return;
    }
    
    const effectData = {
      name: game.i18n.localize("STREET_FIGHTER.Effects.new"),
      icon: "icons/svg/aura.svg",
      origin: this.actor.uuid,
      disabled: false,
    };
    await this.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  }

  /**
   * Handle editing an effect
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onEditEffect(event, target) {
    event.preventDefault();
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    const effect = this.actor.effects.get(effectId);
    effect?.sheet.render(true);
  }

  /**
   * Handle deleting an effect
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onDeleteEffect(event, target) {
    event.preventDefault();
    // Block on imported characters
    if (this.actor.system.importData?.isImported) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Character.readOnlyWarning"));
      return;
    }
    
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    const effect = this.actor.effects.get(effectId);

    if (!effect) return;

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("STREET_FIGHTER.Dialog.DeleteItem.Title") },
      content: game.i18n.format("STREET_FIGHTER.Dialog.DeleteItem.Content", {
        name: effect.name,
      }),
    });

    if (confirmed) {
      await effect.delete();
    }
  }

  /**
   * Handle toggling an effect on/off
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onToggleEffect(event, target) {
    event.preventDefault();
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    const effect = this.actor.effects.get(effectId);

    if (!effect) return;

    await effect.update({ disabled: !effect.disabled });
  }

  /**
   * Handle clicking a trait to open roll dialog
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onRollTrait(event, target) {
    event.preventDefault();
    
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const item = this.actor.items.get(itemId);

    if (!item) return;

    const rollData = await StreetFighterRollDialog.create(this.actor, {
      selectedTraitId: item.id,
      selectedTraitType: item.type,
    });

    if (rollData) {
      await executeRoll(rollData);
    }
  }

  /**
   * Handle clicking a maneuver name to open roll dialog pre-filled with damage calculation
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onRollManeuver(event, target) {
    event.preventDefault();
    event.stopPropagation();
    
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const maneuver = this.actor.items.get(itemId);

    if (!maneuver) return;

    // Find the attribute and technique for damage calculation
    // Damage = Strength + Technique (based on maneuver category)
    const category = maneuver.system.category || "";
    const isFirearm = category.toLowerCase() === "firearm" || category.toLowerCase() === "arma de fogo";
    
    // Find Strength attribute
    let strengthItem = null;
    let techniqueItem = null;
    
    for (const item of this.actor.items) {
      if (item.type === "attribute") {
        const sourceId = item.system.sourceId || item.name.toLowerCase();
        if (sourceId === "strength" || item.name.toLowerCase() === "força") {
          strengthItem = item;
        }
      }
      if (item.type === "technique") {
        const sourceId = item.system.sourceId || item.name.toLowerCase();
        if (sourceId === category.toLowerCase() || item.name.toLowerCase() === category.toLowerCase()) {
          techniqueItem = item;
        }
      }
    }

    // For firearms, we don't use strength
    const attributeItem = isFirearm ? null : strengthItem;
    
    // Parse damage modifier for fixed modifier
    let damageModValue = null;
    const damageModStr = maneuver.system.damageModifier || "";
    if (damageModStr.startsWith("+") || damageModStr.startsWith("-")) {
      damageModValue = parseInt(damageModStr);
    }
    
    const rollData = await StreetFighterRollDialog.create(this.actor, {
      selectedTraitId: attributeItem?.id,
      selectedTraitType: "attribute",
      preSelectedSecondTrait: techniqueItem?.id,
      maneuverName: maneuver.name,
      maneuverDamageModifier: damageModValue,
    });

    if (rollData) {
      await executeRoll(rollData);
    }
  }
}
