/**
 * Street Fighter Actor Document
 * @author Kirlian Silvestre
 * @extends {Actor}
 */

import {
  collectTraitModifiers,
  collectResourceMaxModifiers,
  applyModifiers,
  getRollModifiersForTraits,
} from "../helpers/effect-helpers.mjs";

export class StreetFighterActor extends Actor {
  /** @override */
  prepareData() {
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
  }

  /** @override */
  prepareDerivedData() {
    super.prepareDerivedData();

    const actorData = this;
    const systemData = actorData.system;

    this._prepareCommonData(systemData);

    if (actorData.type === "fighter") {
      this._prepareFighterData(systemData);
    }
  }

  /**
   * Get trait value from embedded items by sourceId (base value without effects)
   * @param {string} sourceId - The sourceId of the trait
   * @returns {number} The trait value or 0 if not found
   * @private
   */
  _getTraitValue(sourceId) {
    const item = this.items.find(i => i.system.sourceId === sourceId);
    return item?.system.value ?? 0;
  }

  /**
   * Get effective trait value including active effect modifiers
   * @param {string} sourceId - The sourceId of the trait
   * @returns {number} The effective trait value
   */
  getEffectiveTraitValue(sourceId) {
    const baseValue = this._getTraitValue(sourceId);
    const modifiers = collectTraitModifiers(this, sourceId);
    return applyModifiers(baseValue, modifiers);
  }

  /**
   * Get effective resource max value including active effect modifiers
   * @param {string} resourceType - The resource type (health, chi, willpower)
   * @returns {number} The effective max value
   */
  getEffectiveResourceMax(resourceType) {
    const baseMax = this.system.resources?.[resourceType]?.max ?? 0;
    const modifiers = collectResourceMaxModifiers(this, resourceType);
    return Math.max(0, applyModifiers(baseMax, modifiers));
  }

  /**
   * Get roll modifiers from active effects for a specific roll
   * @param {Array<string>} traitSourceIds - Array of trait sourceIds involved in the roll
   * @returns {Array<{name: string, value: number, effectId: string}>}
   */
  getRollModifiers(traitSourceIds = []) {
    return getRollModifiersForTraits(this, traitSourceIds);
  }

  /**
   * Prepare common data for all actor types
   * @param {object} systemData
   * @private
   */
  _prepareCommonData(systemData) {
    // Initialize combat object if it doesn't exist
    if (!systemData.combat) {
      systemData.combat = {};
    }

    // Get attribute values from embedded items
    const wits = this._getTraitValue("wits");
    const dexterity = this._getTraitValue("dexterity");
    const stamina = this._getTraitValue("stamina");

    // Initiative = Wits + Dexterity
    systemData.combat.initiative = wits + dexterity;
    // Soak = Stamina (not half)
    systemData.combat.soak = stamina;
  }

  /**
   * Prepare fighter-specific data
   * Note: health.max, chi.max, willpower.max come from character data (imported or manual)
   * They are NOT calculated from attributes
   * @param {object} systemData
   * @private
   */
  _prepareFighterData(systemData) {
    // Resource max values come from the character data, not calculated
    // For imported characters: values come from the import
    // For manual characters: values are set directly by the user
  }

  /**
   * Roll an attribute check
   * @param {string} attributeKey - The sourceId of the attribute to roll
   * @returns {Promise<Roll>}
   */
  async rollAttribute(attributeKey) {
    const value = this._getTraitValue(attributeKey);
    if (value === 0) return null;

    // Find the item to get its name
    const item = this.items.find(i => i.system.sourceId === attributeKey);
    const label = item?.name || attributeKey;

    const roll = new Roll(`${value}d10cs>=7`);
    await roll.evaluate();

    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this }),
      flavor: label,
    });

    return roll;
  }

  /**
   * Apply damage to the actor
   * @param {number} amount - Amount of damage to apply
   * @returns {Promise<Actor>}
   */
  async applyDamage(amount) {
    const currentHealth = this.system.resources.health.value;
    const newHealth = Math.max(0, currentHealth - amount);

    return this.update({ "system.resources.health.value": newHealth });
  }

  /**
   * Restore health to the actor
   * @param {number} amount - Amount of health to restore
   * @returns {Promise<Actor>}
   */
  async restoreHealth(amount) {
    const currentHealth = this.system.resources.health.value;
    const maxHealth = this.system.resources.health.max;
    const newHealth = Math.min(maxHealth, currentHealth + amount);

    return this.update({ "system.resources.health.value": newHealth });
  }

  /**
   * Spend chi
   * @param {number} amount - Amount of chi to spend
   * @returns {Promise<Actor|null>}
   */
  async spendChi(amount) {
    const currentChi = this.system.resources.chi.value;
    if (currentChi < amount) {
      ui.notifications.warn(
        game.i18n.localize("STREET_FIGHTER.Notifications.NotEnoughChi")
      );
      return null;
    }

    return this.update({ "system.resources.chi.value": currentChi - amount });
  }
}
