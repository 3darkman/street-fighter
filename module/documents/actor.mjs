/**
 * Street Fighter Actor Document
 * @author Kirlian Silvestre
 * @extends {Actor}
 */

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
    } else if (actorData.type === "npc") {
      this._prepareNpcData(systemData);
    }
  }

  /**
   * Prepare common data for all actor types
   * @param {object} systemData
   * @private
   */
  _prepareCommonData(systemData) {
    const attributes = systemData.attributes;

    systemData.combat.initiative =
      attributes.wits.value + attributes.dexterity.value;

    systemData.combat.defense = Math.floor(
      (attributes.dexterity.value + attributes.wits.value) / 2
    );

    systemData.combat.soak = Math.floor(attributes.stamina.value / 2);
  }

  /**
   * Prepare fighter-specific data
   * @param {object} systemData
   * @private
   */
  _prepareFighterData(systemData) {
    const attributes = systemData.attributes;

    systemData.resources.health.max =
      10 + attributes.stamina.value * 2 + attributes.focus.value;

    systemData.resources.chi.max =
      5 + attributes.focus.value + attributes.intelligence.value;
  }

  /**
   * Prepare NPC-specific data
   * @param {object} systemData
   * @private
   */
  _prepareNpcData(systemData) {
    const threat = systemData.details.threat || 1;

    systemData.resources.health.max = 5 + threat * 5;
    systemData.resources.chi.max = Math.floor(threat * 2);
  }

  /**
   * Roll an attribute check
   * @param {string} attributeKey - The attribute key to roll
   * @returns {Promise<Roll>}
   */
  async rollAttribute(attributeKey) {
    const attribute = this.system.attributes[attributeKey];
    if (!attribute) return null;

    const label = game.i18n.localize(
      CONFIG.STREET_FIGHTER.attributes[attributeKey]
    );

    const roll = new Roll(`${attribute.value}d10cs>=7`);
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
