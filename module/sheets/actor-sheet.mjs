/**
 * Street Fighter Actor Sheet
 * @author Kirlian Silvestre
 * @extends {ActorSheetV2}
 */

import { StreetFighterRollDialog, executeRoll } from "../dice/roll-dialog.mjs";
import { getTraitMaxValue, getTraitMinValue } from "../config/constants.mjs";
import { getEffectiveTraitValue } from "../helpers/effect-helpers.mjs";
import {
  calculateManeuverStats,
  getCharacterStatsForManeuver,
  formatOriginalModifier,
} from "../helpers/maneuver-calculator.mjs";
import { showPlayerCharacterImportDialog } from "../helpers/character-importer.mjs";

const { ActorSheetV2 } = foundry.applications.sheets;
const { HandlebarsApplicationMixin } = foundry.applications.api;

export class StreetFighterActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    classes: ["street-fighter", "sheet", "actor"],
    position: {
      width: 800,
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
      toggleWeaponEquip: StreetFighterActorSheet._onToggleWeaponEquip,
      editResourceMax: StreetFighterActorSheet._onEditResourceMax,
      editRenownPermanent: StreetFighterActorSheet._onEditRenownPermanent,
      addCombo: StreetFighterActorSheet._onAddCombo,
      editCombo: StreetFighterActorSheet._onEditCombo,
      deleteCombo: StreetFighterActorSheet._onDeleteCombo,
      addBasicManeuvers: StreetFighterActorSheet._onAddBasicManeuvers,
      importCharacter: StreetFighterActorSheet._onImportCharacter,
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
  async _onChangeForm(formConfig, event) {
    const form = this.form;
    if (!form) return;
    
    const formData = new foundry.applications.ux.FormDataExtended(form);
    const data = foundry.utils.expandObject(formData.object);
    
    // Convert languagesText (comma-separated string) to languages array
    if (data.system?.languagesText !== undefined) {
      const text = data.system.languagesText || "";
      data.system.languages = text.split(",").map(s => s.trim()).filter(s => s);
      delete data.system.languagesText;
    }
    
    await this.document.update(data);
  }

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

    // Setup context menus for traits and fighting styles
    this._setupTraitContextMenu(this.element);
    this._setupFightingStyleContextMenu(this.element);
    
    // Setup maneuver accordion
    this._setupManeuverAccordion(this.element);
    
    // Setup weapon accordion
    this._setupWeaponAccordion(this.element);
    
    // Setup resource click handlers (health, chi, willpower)
    this._setupResourceClickHandlers(this.element);
    
    // Restore active tab after re-render
    if (this.tabGroups.primary && this.tabGroups.primary !== "traits") {
      this._activateTab(this.tabGroups.primary);
    }
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
  _getHeaderControls() {
    const controls = super._getHeaderControls();
    
    // Add import button for sheet owners
    // Show for: non-imported characters (first import) OR already imported (reimport)
    // Non-GM players can import into their own sheets
    const isOwner = this.actor.isOwner;
    const isGM = game.user.isGM;
    
    if (isOwner && !isGM) {
      controls.unshift({
        icon: "fas fa-file-import",
        label: "STREET_FIGHTER.Character.importMyCharacter",
        action: "importCharacter",
        visible: true,
      });
    }
    
    return controls;
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
    context.effectiveResources = this._prepareEffectiveResources();
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
    
    context.enrichedAppearanceNotes = await TextEditorImpl.enrichHTML(
      this.actor.system.appearanceNotes || "",
      {
        secrets: this.actor.isOwner,
        async: true,
        relativeTo: this.actor,
      }
    );

    // Prepare languages as comma-separated text for input field
    const languages = this.actor.system.languages || [];
    context.languagesText = languages.join(", ");

    // Build maneuver names lookup for combo display
    context.maneuverNamesById = {};
    for (const item of this.actor.items) {
      if (item.type === "specialManeuver") {
        const sourceId = item.system.sourceId || item.id;
        context.maneuverNamesById[sourceId] = item.name;
        context.maneuverNamesById[item.id] = item.name;
      }
    }

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
    const equipment = [];
    
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

    // Helper to prepare trait with effective value
    const prepareTraitWithEffects = (item) => {
      const sourceId = item.system.sourceId;
      const baseValue = item.system.value || 0;
      const effective = getEffectiveTraitValue(this.actor, sourceId, baseValue);
      item.effectiveValue = effective.value;
      item.baseValue = baseValue;
      item.hasModifiers = effective.hasModifiers;
      item.modifiers = effective.modifiers;
      return item;
    };

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
            attributesByCategory[attrCategory].push(prepareTraitWithEffects(item));
          }
          break;
        case "ability":
          const abilCategory = item.system.category || "talents";
          if (abilitiesByCategory[abilCategory]) {
            abilitiesByCategory[abilCategory].push(prepareTraitWithEffects(item));
          }
          break;
        case "technique":
          techniques.push(prepareTraitWithEffects(item));
          break;
        case "background":
          backgrounds.push(prepareTraitWithEffects(item));
          break;
        case "weapon":
          weapons.push(item);
          break;
        case "division":
          divisions.push(item);
          break;
        case "equipment":
          equipment.push(item);
          break;
      }
    }

    // Calculate maneuver stats using centralized calculator (SSOT)
    const characterStats = getCharacterStatsForManeuver(this.actor);
    const preparedManeuvers = specialManeuvers.map(maneuver => {
      return calculateManeuverStats(this.actor, maneuver, { characterStats });
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
      equipment,
    };
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
      const isManual = effect.flags?.["street-fighter"]?.isManual || false;
      const effectData = {
        id: effect.id,
        name: effect.name,
        icon: effect.img || effect.icon || "icons/svg/aura.svg",
        disabled: effect.disabled,
        duration: effect.duration,
        isTemporary: effect.isTemporary,
        isManual: isManual,
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

  /**
   * Prepare effective resource values with effect modifiers applied
   * @returns {object}
   * @private
   */
  _prepareEffectiveResources() {
    const resources = this.actor.system.resources || {};
    
    return {
      health: {
        value: resources.health?.value ?? 0,
        max: resources.health?.max ?? 0,
        effectiveMax: this.actor.getEffectiveResourceMax("health"),
      },
      chi: {
        value: resources.chi?.value ?? 0,
        max: resources.chi?.max ?? 0,
        effectiveMax: this.actor.getEffectiveResourceMax("chi"),
      },
      willpower: {
        value: resources.willpower?.value ?? 0,
        max: resources.willpower?.max ?? 0,
        effectiveMax: this.actor.getEffectiveResourceMax("willpower"),
      },
    };
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

    const maxValue = getTraitMaxValue(item.type);
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
    const minValue = getTraitMinValue(item.type);
    
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

    await this._sendTraitToChatById(itemId);
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
   * Setup context menu for fighting styles (right-click)
   * @param {HTMLElement} html - The rendered HTML
   * @private
   */
  _setupFightingStyleContextMenu(html) {
    const sheet = this;
    const isImported = this.actor.system.importData?.isImported;
    
    const menuItems = [];
    
    if (!isImported) {
      menuItems.push({
        name: game.i18n.localize("STREET_FIGHTER.Common.edit"),
        icon: '<i class="fas fa-edit"></i>',
        callback: (target) => {
          const itemId = target.dataset?.itemId;
          if (itemId) sheet._editItemById(itemId);
        },
      });
      menuItems.push({
        name: game.i18n.localize("STREET_FIGHTER.Common.delete"),
        icon: '<i class="fas fa-trash"></i>',
        callback: (target) => {
          const itemId = target.dataset?.itemId;
          if (itemId) sheet._deleteItemById(itemId);
        },
      });
    }

    new foundry.applications.ux.ContextMenu.implementation(html, ".header-style", menuItems, { jQuery: false });
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
   * Setup weapon accordion (expand/collapse special notes)
   * @param {HTMLElement} html - The rendered HTML
   * @private
   */
  _setupWeaponAccordion(html) {
    const weaponRows = html.querySelectorAll(".weapon-row");
    
    weaponRows.forEach(row => {
      row.addEventListener("click", (event) => {
        // Don't toggle if clicking on the equip button
        if (event.target.closest(".weapon-equip")) {
          return;
        }
        
        const card = row.closest(".weapon-card");
        const notes = card.querySelector(".weapon-notes");
        const expandIcon = row.querySelector(".weapon-expand i");
        
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
   * Setup click handlers for resource labels (health, chi, willpower)
   * Left-click decreases value, right-click increases value
   * @param {HTMLElement} html - The rendered HTML
   * @private
   */
  _setupResourceClickHandlers(html) {
    const resourceLabels = html.querySelectorAll(".resource-row[data-resource] .resource-label");
    
    resourceLabels.forEach(label => {
      const resourceRow = label.closest(".resource-row");
      const resourceType = resourceRow?.dataset.resource;
      
      if (!resourceType || !["health", "chi", "willpower"].includes(resourceType)) return;
      
      // Left-click: decrease value
      label.addEventListener("click", (event) => {
        event.preventDefault();
        this._adjustResource(resourceType, -1);
      });
      
      // Right-click: increase value
      label.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        this._adjustResource(resourceType, 1);
      });
    });
  }

  /**
   * Adjust a resource value by a delta amount
   * @param {string} resourceType - The resource type (health, chi, willpower)
   * @param {number} delta - The amount to change (+1 or -1)
   * @private
   */
  async _adjustResource(resourceType, delta) {
    const resource = this.actor.system.resources[resourceType];
    if (!resource) return;
    
    const currentValue = resource.value ?? 0;
    const maxValue = resource.max ?? 10;
    const newValue = Math.clamp(currentValue + delta, 0, maxValue);
    
    if (newValue !== currentValue) {
      await this.actor.update({ [`system.resources.${resourceType}.value`]: newValue });
    }
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

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/street-fighter/templates/chat/maneuver-chat-card.hbs",
      { item }
    );

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
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

    const maxValue = getTraitMaxValue(item.type);
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
    const minValue = getTraitMinValue(item.type);
    
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

    const content = await foundry.applications.handlebars.renderTemplate(
      "systems/street-fighter/templates/chat/trait-chat-card.hbs",
      { item, typeLabel, categoryLabel }
    );

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
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
    
    const effectData = {
      name: game.i18n.localize("STREET_FIGHTER.Effects.new"),
      img: "icons/svg/aura.svg",
      origin: this.actor.uuid,
      disabled: false,
      flags: {
        "street-fighter": {
          isManual: true,
        },
      },
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
    
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    const effect = this.actor.effects.get(effectId);

    if (!effect) return;

    // For imported characters, only allow deleting manual effects
    const isImported = this.actor.system.importData?.isImported;
    const isManual = effect.flags?.["street-fighter"]?.isManual;
    
    if (isImported && !isManual) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Character.readOnlyWarning"));
      return;
    }

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
      rollTitle: item.name,
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
    const categoryKey = category.toLowerCase();
    
    // Find Strength attribute and the technique for this maneuver's category
    let strengthItem = null;
    let techniqueItem = null;
    
    for (const item of this.actor.items) {
      if (item.type === "attribute") {
        const sourceId = item.system.sourceId || "";
        if (sourceId === "strength") {
          strengthItem = item;
        }
      }
      if (item.type === "technique") {
        const sourceId = item.system.sourceId || "";
        if (sourceId === categoryKey) {
          techniqueItem = item;
        }
      }
    }

    // For weapon techniques (melee or firearm), we don't use strength
    const isWeaponTechnique = techniqueItem?.system.isWeaponTechnique || techniqueItem?.system.isFirearmTechnique || false;
    const attributeItem = isWeaponTechnique ? null : strengthItem;
    
    // Parse damage modifier for fixed modifier
    let damageModValue = null;
    const damageModStr = maneuver.system.damageModifier || "";
    if (damageModStr.startsWith("+") || damageModStr.startsWith("-")) {
      damageModValue = parseInt(damageModStr);
    }
    
    // Find equipped weapons for this technique
    const equippedWeapons = [];
    if (isWeaponTechnique) {
      for (const item of this.actor.items) {
        const weaponTechniqueId = (item.system.techniqueId || "").toLowerCase();
        if (item.type === "weapon" && item.system.isEquipped && weaponTechniqueId === categoryKey) {
          // Parse damage which may be a string like "+2" or "-1" or just "2"
          const damageStr = String(item.system.damage || "0");
          const damageMod = parseInt(damageStr.replace(/^\+/, "")) || 0;
          equippedWeapons.push({
            id: item.id,
            name: item.name,
            damageMod,
            selected: false,
          });
        }
      }
      // If only one weapon, pre-select it
      if (equippedWeapons.length === 1) {
        equippedWeapons[0].selected = true;
      }
    }
    
    // Get target's soak if a target is selected
    let targetSoak = null;
    let targetName = null;
    const firstTarget = game.user.targets.first();
    if (firstTarget?.actor) {
      const targetActor = firstTarget.actor;
      targetSoak = targetActor.getEffectiveSoak?.() ?? targetActor.system.combat?.soak ?? 0;
      targetName = targetActor.name;
    }
    
    const rollData = await StreetFighterRollDialog.create(this.actor, {
      selectedTraitId: attributeItem?.id,
      selectedTraitType: "attribute",
      preSelectedSecondTrait: techniqueItem?.id,
      maneuverName: maneuver.name,
      maneuverDamageModifier: damageModValue,
      equippedWeapons,
      targetSoak,
      targetName,
      rollTitle: maneuver.name,
      isDamageRoll: true,
    });

    if (rollData) {
      await executeRoll(rollData);
    }
  }

  /**
   * Handle toggling weapon equipped state
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onToggleWeaponEquip(event, target) {
    event.preventDefault();
    event.stopPropagation();
    
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    const weapon = this.actor.items.get(itemId);
    
    if (!weapon || weapon.type !== "weapon") return;
    
    await weapon.update({
      "system.isEquipped": !weapon.system.isEquipped,
    });
  }

  /**
   * Handle editing a resource's max value (health, chi, willpower)
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onEditResourceMax(event, target) {
    event.preventDefault();
    
    if (this.actor.system.importData?.isImported) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Character.readOnlyWarning"));
      return;
    }
    
    const resourceType = target.dataset.resource;
    if (!resourceType || !["health", "chi", "willpower"].includes(resourceType)) return;
    
    const currentMax = this.actor.system.resources[resourceType]?.max ?? 10;
    const resourceLabel = game.i18n.localize(`STREET_FIGHTER.Resources.${resourceType}`);
    const title = game.i18n.format("STREET_FIGHTER.Resources.editMaxTitle", { resource: resourceLabel });
    
    const content = `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize("STREET_FIGHTER.Resources.maxValue")}</label>
          <input type="number" name="maxValue" value="${currentMax}" min="0" max="20" autofocus />
        </div>
      </form>
    `;
    
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title },
      content,
      ok: {
        label: game.i18n.localize("STREET_FIGHTER.Common.save"),
        callback: (event, button, dialog) => {
          const form = button.form;
          return parseInt(form.elements.maxValue.value) || 0;
        },
      },
    });
    
    if (result !== null && result !== undefined) {
      const newMax = Math.clamp(result, 0, 20);
      await this.actor.update({ [`system.resources.${resourceType}.max`]: newMax });
    }
  }

  /**
   * Handle editing a renown's permanent value (honor, glory)
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onEditRenownPermanent(event, target) {
    event.preventDefault();
    
    if (this.actor.system.importData?.isImported) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Character.readOnlyWarning"));
      return;
    }
    
    const renownType = target.dataset.renown;
    if (!renownType || !["honor", "glory"].includes(renownType)) return;
    
    const currentPermanent = this.actor.system.renown[renownType]?.permanent ?? 0;
    const renownLabel = game.i18n.localize(`STREET_FIGHTER.Renown.${renownType}`);
    const title = game.i18n.format("STREET_FIGHTER.Renown.editPermanentTitle", { renown: renownLabel });
    
    const content = `
      <form>
        <div class="form-group">
          <label>${game.i18n.localize("STREET_FIGHTER.Renown.permanentValue")}</label>
          <input type="number" name="permanentValue" value="${currentPermanent}" min="0" max="10" autofocus />
        </div>
      </form>
    `;
    
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title },
      content,
      ok: {
        label: game.i18n.localize("STREET_FIGHTER.Common.save"),
        callback: (event, button, dialog) => {
          const form = button.form;
          return parseInt(form.elements.permanentValue.value) || 0;
        },
      },
    });
    
    if (result !== null && result !== undefined) {
      const newPermanent = Math.clamp(result, 0, 10);
      await this.actor.update({
        [`system.renown.${renownType}.permanent`]: newPermanent,
      });
    }
  }

  /**
   * Handle adding a new combo
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onAddCombo(event, target) {
    event.preventDefault();
    
    if (this.actor.system.importData?.isImported) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Character.readOnlyWarning"));
      return;
    }

    const result = await this._openComboDialog(null);
    if (!result) return;

    const combos = [...(this.actor.system.combos || [])];
    combos.push({
      id: foundry.utils.randomID(),
      isDizzy: result.isDizzy,
      maneuverIds: result.maneuverIds,
    });
    
    await this.actor.update({ "system.combos": combos });
  }

  /**
   * Handle editing an existing combo
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onEditCombo(event, target) {
    event.preventDefault();
    
    if (this.actor.system.importData?.isImported) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Character.readOnlyWarning"));
      return;
    }

    const index = parseInt(target.dataset.comboIndex);
    const combos = [...(this.actor.system.combos || [])];
    const combo = combos[index];
    
    if (!combo) return;

    const result = await this._openComboDialog(combo);
    if (!result) return;

    combos[index] = {
      ...combo,
      isDizzy: result.isDizzy,
      maneuverIds: result.maneuverIds,
    };
    
    await this.actor.update({ "system.combos": combos });
  }

  /**
   * Handle deleting a combo
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onDeleteCombo(event, target) {
    event.preventDefault();
    
    if (this.actor.system.importData?.isImported) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Character.readOnlyWarning"));
      return;
    }

    const index = parseInt(target.dataset.comboIndex);
    const combos = [...(this.actor.system.combos || [])];
    
    if (index < 0 || index >= combos.length) return;

    combos.splice(index, 1);
    await this.actor.update({ "system.combos": combos });
  }

  /**
   * Handle adding basic maneuvers
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onAddBasicManeuvers(event, target) {
    event.preventDefault();
    
    // Source IDs das manobras básicas
    const BASIC_MANEUVERS = [
      'jab',
      'forward',
      'fierce',
      'strong',
      'roundhouse',
      'short',
      'movement',
      'block',
      'grab'
    ];
    
    // Verifica quais manobras já existem no ator
    const existingManeuvers = this.actor.items.filter(i => 
      i.type === 'specialManeuver' && BASIC_MANEUVERS.includes(i.system.sourceId)
    );
    
    const existingSourceIds = existingManeuvers.map(m => m.system.sourceId);
    const maneuversToAdd = BASIC_MANEUVERS.filter(id => !existingSourceIds.includes(id));
    
    if (maneuversToAdd.length === 0) {
      ui.notifications.info(game.i18n.localize('STREET_FIGHTER.Maneuvers.allBasicAlreadyAdded'));
      return;
    }
    
    // Busca os itens no diretório
    const items = await game.items.contents;
    const maneuvers = items.filter(i => 
      i.type === 'specialManeuver' && maneuversToAdd.includes(i.system.sourceId)
    );
    
    if (maneuvers.length === 0) {
      ui.notifications.warn(game.i18n.localize('STREET_FIGHTER.Maneuvers.basicNotFound'));
      return;
    }
    
    // Adiciona as manobras
    try {
      await this.actor.createEmbeddedDocuments('Item', maneuvers.map(m => m.toObject()));
      ui.notifications.info(game.i18n.format('STREET_FIGHTER.Maneuvers.addedBasic', {
        count: maneuvers.length
      }));
    } catch (err) {
      console.error('Error adding basic maneuvers:', err);
      ui.notifications.error(game.i18n.localize('STREET_FIGHTER.Maneuvers.addBasicError'));
    }
  }

  /**
   * Handle importing a character from file (player self-import)
   * @this {StreetFighterActorSheet}
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async _onImportCharacter(event, target) {
    event.preventDefault();
    await showPlayerCharacterImportDialog(this.actor);
  }

  /**
   * Open a dialog to create or edit a combo
   * @param {object|null} existingCombo - The existing combo to edit, or null for new
   * @returns {Promise<{isDizzy: boolean, maneuverIds: string[]}|null>}
   * @private
   */
  async _openComboDialog(existingCombo) {
    const maneuvers = this.actor.items.filter(i => i.type === "specialManeuver");
    
    if (maneuvers.length < 2) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combo.minManeuvers"));
      return null;
    }

    const maneuverOptions = maneuvers.map(m => {
      const sourceId = m.system.sourceId || m.id;
      return `<option value="${sourceId}">${m.name}</option>`;
    }).join("");

    const isDizzyChecked = existingCombo?.isDizzy ? "checked" : "";
    const existingIds = existingCombo?.maneuverIds || [];
    
    const content = `
      <form class="combo-dialog">
        <div class="form-group">
          <label>
            <input type="checkbox" name="isDizzy" ${isDizzyChecked} />
            ${game.i18n.localize("STREET_FIGHTER.Combo.isDizzy")}
          </label>
          <p class="hint">${game.i18n.localize("STREET_FIGHTER.Combo.isDizzyHint")}</p>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("STREET_FIGHTER.Combo.maneuvers")}</label>
          <div class="combo-maneuver-selects">
            <select name="maneuver1">
              <option value="">-- ${game.i18n.localize("STREET_FIGHTER.Combo.selectManeuver")} --</option>
              ${maneuverOptions}
            </select>
            <select name="maneuver2">
              <option value="">-- ${game.i18n.localize("STREET_FIGHTER.Combo.selectManeuver")} --</option>
              ${maneuverOptions}
            </select>
            <select name="maneuver3">
              <option value="">-- ${game.i18n.localize("STREET_FIGHTER.Combo.selectManeuver")} --</option>
              ${maneuverOptions}
            </select>
          </div>
        </div>
      </form>
    `;

    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: game.i18n.localize("STREET_FIGHTER.Combo.title") },
      content,
      ok: {
        label: game.i18n.localize("STREET_FIGHTER.Common.save"),
        callback: (event, button, dialog) => {
          const form = button.form;
          const isDizzy = form.elements.isDizzy.checked;
          const m1 = form.elements.maneuver1.value;
          const m2 = form.elements.maneuver2.value;
          const m3 = form.elements.maneuver3.value;
          
          const maneuverIds = [m1, m2, m3].filter(id => id);
          
          if (maneuverIds.length < 2) {
            ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combo.minManeuvers"));
            return null;
          }
          
          return { isDizzy, maneuverIds };
        },
      },
            render: (event) => {
        if (!Array.isArray(existingIds) || existingIds.length === 0) return;
          
        const dialog = event.target;
        if (!dialog || !dialog.element) return;

        const $dialog = $(dialog.element);
        if (!$dialog.length) return;
          
        existingIds.forEach((id, i) => {
          const $select = $dialog.find(`select[name="maneuver${i+1}"]`);
          if (!$select.length) return;

          const maneuver = this.actor.items.find(item => 
            item.type === 'specialManeuver' && 
            (item.id === id || item.system.sourceId === id)
          );

          if (maneuver) {
            const optionValue = maneuver.system.sourceId || maneuver.id;
            if ($select.find(`option[value="${optionValue}"]`).length) {
              $select.val(optionValue);
            }
            $select.trigger('change');
          }
        });
      },
    });

    return result;
  }
}
