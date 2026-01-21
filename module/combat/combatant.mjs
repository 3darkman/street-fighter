/**
 * Street Fighter Combatant Document
 * @author Kirlian Silvestre
 * @extends {Combatant}
 */

export class StreetFighterCombatant extends Combatant {
  /** @override */
  prepareBaseData() {
    super.prepareBaseData();
  }

  /**
   * Get the initiative value for this combatant
   * @returns {number}
   */
  getInitiativeValue() {
    const actor = this.actor;
    if (!actor) return 0;

    return actor.system.combat?.initiative || 0;
  }

  /**
   * Check if this combatant is defeated
   * @returns {boolean}
   */
  get isDefeated() {
    const actor = this.actor;
    if (!actor) return false;

    const health = actor.system.resources?.health;
    if (!health) return false;

    return health.value <= 0;
  }
}
