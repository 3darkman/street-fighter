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

    // Setup context menu for traits (only for non-imported characters)
    this._setupTraitContextMenu(this.element);
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

    return {
      fightingStyles,
      specialManeuvers,
      attributesByCategory,
      abilitiesByCategory,
      techniques,
      backgrounds,
      weapons,
      divisions,
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
    
    // Only add increment/decrement for non-imported characters
    if (!isImported) {
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
    console.log("_onRollTrait called", { event, target });
    
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    console.log("itemId:", itemId);
    
    const item = this.actor.items.get(itemId);
    console.log("item:", item);

    if (!item) return;

    const rollData = await StreetFighterRollDialog.create(this.actor, {
      selectedTraitId: item.id,
      selectedTraitType: item.type,
    });

    if (rollData) {
      await executeRoll(rollData);
    }
  }
}
