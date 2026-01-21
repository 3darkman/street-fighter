/**
 * Street Fighter Combat Document
 * @author Kirlian Silvestre
 * @extends {Combat}
 */

export class StreetFighterCombat extends Combat {
  /** @override */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);
  }

  /** @override */
  async startCombat() {
    await this._resetSuperBars();
    return super.startCombat();
  }

  /**
   * Reset super bars for all combatants at combat start
   * @private
   */
  async _resetSuperBars() {
    for (const combatant of this.combatants) {
      const actor = combatant.actor;
      if (actor && actor.system.resources.super) {
        await actor.update({ "system.resources.super.value": 0 });
      }
    }
  }

  /** @override */
  async nextRound() {
    await this._onRoundEnd();
    return super.nextRound();
  }

  /**
   * Handle end of round effects
   * @private
   */
  async _onRoundEnd() {
    for (const combatant of this.combatants) {
      const actor = combatant.actor;
      if (!actor) continue;

      if (actor.system.resources.chi) {
        const currentChi = actor.system.resources.chi.value;
        const maxChi = actor.system.resources.chi.max;
        const newChi = Math.min(maxChi, currentChi + 1);
        await actor.update({ "system.resources.chi.value": newChi });
      }
    }
  }

  /**
   * Get initiative formula for a combatant
   * @param {Combatant} combatant
   * @returns {string}
   */
  _getInitiativeFormula(combatant) {
    const actor = combatant.actor;
    if (!actor) return "1d10";

    const initiative = actor.system.combat?.initiative || 0;
    return `1d10 + ${initiative}`;
  }
}
