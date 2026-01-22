/**
 * Street Fighter Combat Document
 * Manages the two-phase combat system (selection and execution)
 * @author Kirlian Silvestre
 * @extends {Combat}
 */

import {
  COMBAT_PHASE,
  SELECTION_STATUS,
  ACTION_STATUS,
  FLAG_SCOPE,
  COMBAT_FLAGS,
  COMBATANT_FLAGS,
  getDefaultCombatFlags,
  getDefaultCombatantFlags,
  sortByInitiative
} from "./combat-phases.mjs";

import {
  broadcastPhaseChanged,
  broadcastTurnStarted,
  broadcastInterruption
} from "./combat-socket.mjs";

export class StreetFighterCombat extends Combat {

  /* -------------------------------------------- */
  /*  Accessors                                   */
  /* -------------------------------------------- */

  /**
   * Get the current combat phase
   * @returns {string}
   */
  get phase() {
    return this.getFlag(FLAG_SCOPE, COMBAT_FLAGS.PHASE) ?? COMBAT_PHASE.SETUP;
  }

  /**
   * Get the currently acting combatant ID
   * @returns {string|null}
   */
  get currentActingCombatantId() {
    return this.getFlag(FLAG_SCOPE, COMBAT_FLAGS.CURRENT_ACTING_ID) ?? null;
  }

  /**
   * Get the currently acting combatant
   * @returns {Combatant|null}
   */
  get currentActingCombatant() {
    const id = this.currentActingCombatantId;
    return id ? this.combatants.get(id) : null;
  }

  /**
   * Get the interruption stack
   * @returns {string[]}
   */
  get interruptionStack() {
    return this.getFlag(FLAG_SCOPE, COMBAT_FLAGS.INTERRUPTION_STACK) ?? [];
  }

  /**
   * Check if the turn has been started by GM
   * @returns {boolean}
   */
  get turnStarted() {
    return this.getFlag(FLAG_SCOPE, COMBAT_FLAGS.TURN_STARTED) ?? false;
  }

  /**
   * Check if all combatants have selected their maneuvers
   * @returns {boolean}
   */
  get allSelectionsComplete() {
    if (!this.combatants?.size) return false;
    return Array.from(this.combatants).every(c => {
      if (c.isDefeated) return true;
      const status = c.getFlag(FLAG_SCOPE, COMBATANT_FLAGS.SELECTION_STATUS);
      return status === SELECTION_STATUS.READY;
    });
  }

  /**
   * Check if all combatants have completed their actions
   * @returns {boolean}
   */
  get allActionsComplete() {
    if (!this.combatants?.size) return false;
    return Array.from(this.combatants).every(c => {
      if (c.isDefeated) return true;
      const status = c.getFlag(FLAG_SCOPE, COMBATANT_FLAGS.ACTION_STATUS);
      return status === ACTION_STATUS.COMPLETED || status === ACTION_STATUS.SKIPPED;
    });
  }

  /**
   * Get combatants sorted by initiative (speed-based)
   * @returns {Combatant[]}
   */
  get combatantsByInitiative() {
    if (!this.combatants?.size) return [];
    const combatantsWithSpeed = Array.from(this.combatants)
      .filter(c => !c.isDefeated)
      .map(c => ({
        combatant: c,
        speed: c.selectedManeuverSpeed ?? 999,
        name: c.name
      }));

    return sortByInitiative(combatantsWithSpeed).map(item => item.combatant);
  }

  /* -------------------------------------------- */
  /*  Lifecycle Methods                           */
  /* -------------------------------------------- */

  /** @override */
  async _preCreate(data, options, user) {
    await super._preCreate(data, options, user);

    const flags = getDefaultCombatFlags();
    this.updateSource({ [`flags.${FLAG_SCOPE}`]: flags });
  }

  /** @override */
  async startCombat() {
    await this._resetSuperBars();
    await this._initializeCombatFlags();
    return super.startCombat();
  }

  /* -------------------------------------------- */
  /*  Phase Management                            */
  /* -------------------------------------------- */

  /**
   * Initialize combat flags for a new combat
   * @private
   */
  async _initializeCombatFlags() {
    const flags = getDefaultCombatFlags();
    await this.update({ [`flags.${FLAG_SCOPE}`]: flags });

    for (const combatant of this.combatants) {
      await combatant.initializeFlags();
    }
  }

  /**
   * Start the selection phase (GM action)
   * @returns {Promise<Combat>}
   */
  async startSelectionPhase() {
    if (!game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.OnlyGMCanStartTurn"));
      return this;
    }

    // Increment round if this is a new turn (round 0 means combat just started)
    if (this.round === 0) {
      await this.update({ round: 1 });
    }

    await this._resetCombatantFlags();

    await this.setFlag(FLAG_SCOPE, COMBAT_FLAGS.PHASE, COMBAT_PHASE.SELECTION);
    await this.setFlag(FLAG_SCOPE, COMBAT_FLAGS.TURN_STARTED, true);
    await this.setFlag(FLAG_SCOPE, COMBAT_FLAGS.CURRENT_ACTING_ID, null);
    await this.setFlag(FLAG_SCOPE, COMBAT_FLAGS.INTERRUPTION_STACK, []);

    broadcastPhaseChanged(this, COMBAT_PHASE.SELECTION);

    ui.notifications.info(game.i18n.localize("STREET_FIGHTER.Combat.SelectionPhaseStarted"));

    return this;
  }

  /**
   * Start the execution phase (GM action)
   * @returns {Promise<Combat>}
   */
  async startExecutionPhase() {
    if (!game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.OnlyGMCanStartExecution"));
      return this;
    }

    if (!this.allSelectionsComplete) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.NotAllSelectionsComplete"));
      return this;
    }

    await this.setFlag(FLAG_SCOPE, COMBAT_FLAGS.PHASE, COMBAT_PHASE.EXECUTION);

    const firstCombatant = this.combatantsByInitiative[0];
    if (firstCombatant) {
      await this._setActingCombatant(firstCombatant);
    }

    broadcastPhaseChanged(this, COMBAT_PHASE.EXECUTION);

    ui.notifications.info(game.i18n.localize("STREET_FIGHTER.Combat.ExecutionPhaseStarted"));

    return this;
  }

  /**
   * Advance to the next turn (new round)
   * @returns {Promise<Combat>}
   */
  async advanceToNextTurn() {
    if (!game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.OnlyGMCanAdvanceTurn"));
      return this;
    }

    if (!this.allActionsComplete) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.NotAllActionsComplete"));
      return this;
    }

    await this._onRoundEnd();
    await this.nextRound();
    await this.startSelectionPhase();

    return this;
  }

  /* -------------------------------------------- */
  /*  Action Management                           */
  /* -------------------------------------------- */

  /**
   * Set the currently acting combatant
   * @param {Combatant} combatant - The combatant to set as acting
   * @private
   */
  async _setActingCombatant(combatant) {
    const previousActing = this.currentActingCombatant;
    if (previousActing && previousActing.id !== combatant.id) {
      const prevStatus = previousActing.getFlag(FLAG_SCOPE, COMBATANT_FLAGS.ACTION_STATUS);
      if (prevStatus === ACTION_STATUS.ACTING || prevStatus === ACTION_STATUS.REVEALED) {
        await previousActing.setFlag(FLAG_SCOPE, COMBATANT_FLAGS.ACTION_STATUS, ACTION_STATUS.INTERRUPTED);
      }
    }

    await this.setFlag(FLAG_SCOPE, COMBAT_FLAGS.CURRENT_ACTING_ID, combatant.id);
    await combatant.setFlag(FLAG_SCOPE, COMBATANT_FLAGS.ACTION_STATUS, ACTION_STATUS.ACTING);

    broadcastTurnStarted(this, combatant);
  }

  /**
   * Handle interruption by a combatant
   * @param {string} interruptorId - ID of the interrupting combatant
   * @returns {Promise<Combat>}
   */
  async handleInterruption(interruptorId) {
    const interruptor = this.combatants.get(interruptorId);
    const interrupted = this.currentActingCombatant;

    if (!interruptor || !interrupted) {
      ui.notifications.error(game.i18n.localize("STREET_FIGHTER.Combat.InvalidInterruption"));
      return this;
    }

    if (!interruptor.canInterrupt(interrupted)) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.CannotInterrupt"));
      return this;
    }

    const interruptedStatus = interrupted.getFlag(FLAG_SCOPE, COMBATANT_FLAGS.ACTION_STATUS);
    if (interruptedStatus === ACTION_STATUS.COMPLETED) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.ActionAlreadyCompleted"));
      return this;
    }

    const stack = [...this.interruptionStack, interrupted.id];
    await this.setFlag(FLAG_SCOPE, COMBAT_FLAGS.INTERRUPTION_STACK, stack);

    await interrupted.setFlag(FLAG_SCOPE, COMBATANT_FLAGS.ACTION_STATUS, ACTION_STATUS.INTERRUPTED);
    await interrupted.setFlag(FLAG_SCOPE, COMBATANT_FLAGS.INTERRUPTED_BY_ID, interruptorId);

    await this._setActingCombatant(interruptor);

    broadcastInterruption(this, interruptor, interrupted);

    return this;
  }

  /**
   * Complete the current combatant's action
   * @returns {Promise<Combat>}
   */
  async completeCurrentAction() {
    const current = this.currentActingCombatant;
    if (!current) return this;

    // Auto-reveal maneuver if not already revealed
    if (!current.maneuverRevealed) {
      await current.revealManeuver();
    }

    await current.setFlag(FLAG_SCOPE, COMBATANT_FLAGS.ACTION_STATUS, ACTION_STATUS.COMPLETED);

    const stack = this.interruptionStack;
    if (stack.length > 0) {
      const returnToId = stack[stack.length - 1];
      const newStack = stack.slice(0, -1);
      await this.setFlag(FLAG_SCOPE, COMBAT_FLAGS.INTERRUPTION_STACK, newStack);

      const returnTo = this.combatants.get(returnToId);
      if (returnTo) {
        await this._setActingCombatant(returnTo);
        return this;
      }
    }

    await this._advanceToNextCombatant();

    return this;
  }

  /**
   * Skip the current combatant's action
   * @returns {Promise<Combat>}
   */
  async skipCurrentAction() {
    const current = this.currentActingCombatant;
    if (!current) return this;

    await current.setFlag(FLAG_SCOPE, COMBATANT_FLAGS.ACTION_STATUS, ACTION_STATUS.SKIPPED);

    await this._advanceToNextCombatant();

    return this;
  }

  /**
   * Advance to the next combatant in initiative order
   * @private
   */
  async _advanceToNextCombatant() {
    const ordered = this.combatantsByInitiative;
    const currentIndex = ordered.findIndex(c => c.id === this.currentActingCombatantId);

    for (let i = currentIndex + 1; i < ordered.length; i++) {
      const next = ordered[i];
      const status = next.getFlag(FLAG_SCOPE, COMBATANT_FLAGS.ACTION_STATUS);
      if (status === ACTION_STATUS.PENDING) {
        await this._setActingCombatant(next);
        return;
      }
    }

    await this.setFlag(FLAG_SCOPE, COMBAT_FLAGS.CURRENT_ACTING_ID, null);
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  /**
   * Reset combatant flags for a new turn
   * @private
   */
  async _resetCombatantFlags() {
    for (const combatant of this.combatants) {
      await combatant.resetTurnFlags();
    }
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
