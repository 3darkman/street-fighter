/**
 * Street Fighter Actor Sheet
 * @author Kirlian Silvestre
 * @extends {ActorSheetV2}
 */

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
      biography: { id: "biography", group: "primary", label: "STREET_FIGHTER.Tabs.biography" },
    },
  };

  /** @inheritDoc */
  tabGroups = {
    primary: "traits",
  };

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
    const attributes = [];
    const abilities = [];
    const techniques = [];
    const backgrounds = [];
    const weapons = [];
    const divisions = [];

    for (const item of this.actor.items) {
      switch (item.type) {
        case "fightingStyle":
          fightingStyles.push(item);
          break;
        case "specialManeuver":
          specialManeuvers.push(item);
          break;
        case "attribute":
          attributes.push(item);
          break;
        case "ability":
          abilities.push(item);
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
      attributes,
      abilities,
      techniques,
      backgrounds,
      weapons,
      divisions,
    };
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
}
