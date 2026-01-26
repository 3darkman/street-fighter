/**
 * Street Fighter Combat Tracker
 * Custom combat tracker UI with two-phase combat system support
 * @author Kirlian Silvestre
 */

import {
  COMBAT_PHASE,
  SELECTION_STATUS,
  ACTION_STATUS,
  FLAG_SCOPE,
  COMBAT_FLAGS,
  COMBATANT_FLAGS
} from "./combat-phases.mjs";

import { ManeuverSelectionDialog } from "./maneuver-selection-dialog.mjs";
import { ActionTurnDialog } from "./action-turn-dialog.mjs";
import { requestInterruption, requestCompleteAction } from "./combat-socket.mjs";

/**
 * Street Fighter Combat Tracker Application
 * Replaces the default Foundry combat tracker with Street Fighter specific functionality
 */
export class StreetFighterCombatTracker extends foundry.applications.sidebar.tabs.CombatTracker {

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    id: "combat",
    actions: {
      startTurn: StreetFighterCombatTracker._onStartTurn,
      startExecution: StreetFighterCombatTracker._onStartExecution,
      nextTurn: StreetFighterCombatTracker._onNextTurn,
      openManeuverSelection: StreetFighterCombatTracker._onOpenManeuverSelection,
      openTurnDialog: StreetFighterCombatTracker._onOpenTurnDialog,
      interrupt: StreetFighterCombatTracker._onInterrupt,
      completeAction: StreetFighterCombatTracker._onCompleteAction,
      revealManeuver: StreetFighterCombatTracker._onRevealManeuver,
      createCombat: StreetFighterCombatTracker._onCreateCombat,
      endCombat: StreetFighterCombatTracker._onEndCombat,
      rollAll: StreetFighterCombatTracker._onRollAll,
      rollNPC: StreetFighterCombatTracker._onRollNPC,
      resetAll: StreetFighterCombatTracker._onResetAll,
      previousCombat: StreetFighterCombatTracker._onPreviousCombat,
      nextCombat: StreetFighterCombatTracker._onNextCombat,
      toggleHidden: StreetFighterCombatTracker._onToggleHidden,
      toggleDefeatedStatus: StreetFighterCombatTracker._onToggleDefeated,
      configure: StreetFighterCombatTracker._onConfigure
    }
  }, { inplace: false });

  /** @override */
  static PARTS = {
    tracker: {
      template: "systems/street-fighter/templates/combat/combat-tracker.hbs"
    }
  };

  /* -------------------------------------------- */
  /*  Context Preparation                         */
  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    const isGM = game.user.isGM;
    const combats = this.combats;
    const combat = this.viewed;

    // Ensure combats context is available
    context.combats = combats;
    context.combatCount = combats.length;
    context.combatIndex = combat ? combats.findIndex(c => c.id === combat.id) + 1 : 0;
    context.viewed = combat;

    // Always provide sfCombat context for template
    if (!combat) {
      context.sfCombat = {
        phase: COMBAT_PHASE.SETUP,
        phaseLabel: this._getPhaseLabel(COMBAT_PHASE.SETUP),
        isSetup: true,
        isSelection: false,
        isExecution: false,
        turnStarted: false,
        allSelectionsComplete: false,
        allActionsComplete: false,
        currentActingId: null,
        isGM: isGM
      };
      return context;
    }

    const phase = combat.phase;

    context.sfCombat = {
      phase: phase,
      phaseLabel: this._getPhaseLabel(phase),
      isSetup: phase === COMBAT_PHASE.SETUP,
      isSelection: phase === COMBAT_PHASE.SELECTION,
      isExecution: phase === COMBAT_PHASE.EXECUTION,
      turnStarted: combat.turnStarted,
      allSelectionsComplete: combat.allSelectionsComplete,
      allActionsComplete: combat.allActionsComplete,
      currentActingId: combat.currentActingCombatantId,
      isGM: isGM
    };

    if (context.turns && Array.isArray(context.turns)) {
      context.turns = await this._prepareCombatantContexts(combat, context.turns);
    } else if (combat.combatants?.size) {
      context.turns = await this._buildTurnsFromCombatants(combat);
    }

    // Sort turns by speed during execution phase (lower speed = faster = first)
    if (phase === COMBAT_PHASE.EXECUTION && context.turns?.length) {
      context.turns = this._sortTurnsBySpeed(context.turns);
    }

    return context;
  }

  /**
   * Build turns array from combatants when parent doesn't provide it
   * @param {Combat} combat
   * @returns {Promise<object[]>}
   * @private
   */
  async _buildTurnsFromCombatants(combat) {
    const turns = [];
    for (const combatant of combat.combatants) {
      const turn = await this._prepareTurnContext(combat, combatant, turns.length);
      turns.push(turn);
    }
    return this._prepareCombatantContexts(combat, turns);
  }

  /**
   * Prepare context for a single turn/combatant
   * @param {Combat} combat
   * @param {Combatant} combatant
   * @param {number} index
   * @returns {Promise<object>}
   * @private
   */
  async _prepareTurnContext(combat, combatant, index) {
    const token = combatant.token;
    const actor = combatant.actor;

    return {
      id: combatant.id,
      name: combatant.name,
      img: await this._getCombatantThumbnail(combatant),
      initiative: combatant.initiative,
      hidden: combatant.hidden,
      defeated: combatant.isDefeated,
      owner: combatant.isOwner,
      tokenId: token?.id ?? null,
      actorId: actor?.id ?? null,
      canPing: combatant.isOwner && canvas.ready,
      css: combatant.isDefeated ? "defeated" : ""
    };
  }

  /**
   * Get localized phase label
   * @param {string} phase
   * @returns {string}
   * @private
   */
  _getPhaseLabel(phase) {
    const labels = {
      [COMBAT_PHASE.SETUP]: "STREET_FIGHTER.Combat.Phase.Setup",
      [COMBAT_PHASE.SELECTION]: "STREET_FIGHTER.Combat.Phase.Selection",
      [COMBAT_PHASE.EXECUTION]: "STREET_FIGHTER.Combat.Phase.Execution"
    };
    return game.i18n.localize(labels[phase] || labels[COMBAT_PHASE.SETUP]);
  }

  /**
   * Prepare additional context for each combatant
   * @param {Combat} combat
   * @param {object[]} turns
   * @returns {Promise<object[]>}
   * @private
   */
  async _prepareCombatantContexts(combat, turns) {
    const phase = combat.phase;
    const currentActingId = combat.currentActingCombatantId;
    const currentActing = combat.currentActingCombatant;
    const hidePlayerManeuversFromGM = game.settings.get("street-fighter", "hidePlayerManeuversFromGM");

    return turns.map(turn => {
      const combatant = combat.combatants.get(turn.id);
      if (!combatant) return turn;

      const selectionStatus = combatant.selectionStatus;
      const actionStatus = combatant.actionStatus;
      const selectedManeuver = combatant.selectedManeuver;
      const isOwner = combatant.isOwner;
      const isNPC = combatant.isNPC;
      const isGM = game.user.isGM;

      // Check if this combatant belongs to an online player (not NPC, owned by a non-GM player)
      const isOnlinePlayerCombatant = !isNPC && this._isOwnedByOnlinePlayer(combatant);

      // Should hide maneuver from GM for online player combatants?
      const shouldHideFromGM = isGM && hidePlayerManeuversFromGM && isOnlinePlayerCombatant && !combatant.maneuverRevealed;

      const isDefeated = combatant.isDefeated;

      const canOpenManeuverDialog = phase === COMBAT_PHASE.SELECTION &&
        selectionStatus !== SELECTION_STATUS.READY &&
        !isDefeated &&
        (isOwner || (isGM && isNPC));

      const canInterrupt = phase === COMBAT_PHASE.EXECUTION &&
        currentActing &&
        combatant.id !== currentActingId &&
        !isDefeated &&
        combatant.canInterrupt(currentActing) &&
        (isOwner || isGM);

      const showManeuverButton = phase === COMBAT_PHASE.SELECTION &&
        !isDefeated &&
        (isOwner || (isGM && isNPC));

      return {
        ...turn,
        sf: {
          selectionStatus,
          actionStatus,
          selectedManeuver: shouldHideFromGM ? null : selectedManeuver,
          isReady: selectionStatus === SELECTION_STATUS.READY,
          isActing: combatant.id === currentActingId,
          isCompleted: actionStatus === ACTION_STATUS.COMPLETED,
          isSkipped: actionStatus === ACTION_STATUS.SKIPPED,
          isInterrupted: actionStatus === ACTION_STATUS.INTERRUPTED,
          maneuverRevealed: combatant.maneuverRevealed,
          speed: shouldHideFromGM ? null : (selectedManeuver?.speed ?? null),
          canOpenManeuverDialog,
          canInterrupt,
          showManeuverButton,
          isOwner,
          isNPC,
          shouldHideFromGM,
          statusIcon: this._getStatusIcon(phase, selectionStatus, actionStatus, combatant.id === currentActingId),
          statusLabel: this._getStatusLabel(phase, selectionStatus, actionStatus)
        }
      };
    });
  }

  /**
   * Sort turns by speed (lower speed = faster = first)
   * @param {object[]} turns - Array of turn objects with sf.speed
   * @returns {object[]} Sorted array
   * @private
   */
  _sortTurnsBySpeed(turns) {
    return [...turns].sort((a, b) => {
      const speedA = a.sf?.speed ?? 999;
      const speedB = b.sf?.speed ?? 999;
      if (speedA !== speedB) {
        return speedA - speedB;
      }
      return (a.name || "").localeCompare(b.name || "");
    });
  }

  /**
   * Check if a combatant is owned by an online player
   * @param {Combatant} combatant
   * @returns {boolean}
   * @private
   */
  _isOwnedByOnlinePlayer(combatant) {
    const actor = combatant.actor;
    if (!actor) return false;

    // Check if any non-GM user has ownership (regardless of online status)
    // This ensures the setting works even when testing alone
    const players = game.users.filter(u => !u.isGM);
    return players.some(user => actor.testUserPermission(user, "OWNER"));
  }

  /**
   * Get status icon class for a combatant
   * @param {string} phase
   * @param {string} selectionStatus
   * @param {string} actionStatus
   * @param {boolean} isActing
   * @returns {string}
   * @private
   */
  _getStatusIcon(phase, selectionStatus, actionStatus, isActing) {
    if (phase === COMBAT_PHASE.SELECTION) {
      return selectionStatus === SELECTION_STATUS.READY
        ? "fas fa-check-circle sf-status-ready"
        : "fas fa-hourglass-half sf-status-pending";
    }

    if (phase === COMBAT_PHASE.EXECUTION) {
      if (isActing) return "fas fa-bolt sf-status-acting";
      if (actionStatus === ACTION_STATUS.COMPLETED) return "fas fa-check-circle sf-status-completed";
      if (actionStatus === ACTION_STATUS.SKIPPED) return "fas fa-forward sf-status-skipped";
      if (actionStatus === ACTION_STATUS.INTERRUPTED) return "fas fa-pause-circle sf-status-interrupted";
      return "fas fa-clock sf-status-pending";
    }

    return "fas fa-circle sf-status-setup";
  }

  /**
   * Get status label for a combatant
   * @param {string} phase
   * @param {string} selectionStatus
   * @param {string} actionStatus
   * @returns {string}
   * @private
   */
  _getStatusLabel(phase, selectionStatus, actionStatus) {
    if (phase === COMBAT_PHASE.SELECTION) {
      return selectionStatus === SELECTION_STATUS.READY
        ? game.i18n.localize("STREET_FIGHTER.Combat.Status.Ready")
        : game.i18n.localize("STREET_FIGHTER.Combat.Status.Selecting");
    }

    if (phase === COMBAT_PHASE.EXECUTION) {
      const labels = {
        [ACTION_STATUS.PENDING]: "STREET_FIGHTER.Combat.Status.Waiting",
        [ACTION_STATUS.ACTING]: "STREET_FIGHTER.Combat.Status.Acting",
        [ACTION_STATUS.REVEALED]: "STREET_FIGHTER.Combat.Status.Revealed",
        [ACTION_STATUS.INTERRUPTED]: "STREET_FIGHTER.Combat.Status.Interrupted",
        [ACTION_STATUS.COMPLETED]: "STREET_FIGHTER.Combat.Status.Completed",
        [ACTION_STATUS.SKIPPED]: "STREET_FIGHTER.Combat.Status.Skipped"
      };
      return game.i18n.localize(labels[actionStatus] || labels[ACTION_STATUS.PENDING]);
    }

    return "";
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  /**
   * Handle starting a new turn (selection phase)
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onStartTurn(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat || !game.user.isGM) return;

    await combat.startSelectionPhase();
  }

  /**
   * Handle starting the execution phase
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onStartExecution(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat || !game.user.isGM) return;

    await combat.startExecutionPhase();
  }

  /**
   * Handle advancing to the next turn
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onNextTurn(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat || !game.user.isGM) return;

    await combat.advanceToNextTurn();
  }

  /**
   * Handle opening the maneuver selection dialog
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onOpenManeuverSelection(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat) return;

    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId;
    if (!combatantId) return;

    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return;

    if (!combatant.isOwner && !game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.NotYourCombatant"));
      return;
    }

    await ManeuverSelectionDialog.show(combat, combatant);
  }

  /**
   * Handle opening the turn dialog
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onOpenTurnDialog(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat) return;

    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId;
    if (!combatantId) return;

    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return;

    if (!combatant.isOwner && !game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.NotYourCombatant"));
      return;
    }

    await ActionTurnDialog.show(combat, combatant);
  }

  /**
   * Handle interruption
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onInterrupt(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat) return;

    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId;
    if (!combatantId) return;

    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return;

    if (!combatant.isOwner && !game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.NotYourCombatant"));
      return;
    }

    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("STREET_FIGHTER.Combat.InterruptTitle") },
      content: game.i18n.format("STREET_FIGHTER.Combat.InterruptConfirm", {
        name: combatant.name,
        target: combat.currentActingCombatant?.name || ""
      })
    });

    if (confirmed) {
      requestInterruption(combat, combatantId);
    }
  }

  /**
   * Handle completing the current action
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onCompleteAction(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat) return;

    const currentActing = combat.currentActingCombatant;
    if (!currentActing) return;

    if (!currentActing.isOwner && !game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.NotYourCombatant"));
      return;
    }

    requestCompleteAction(combat);
  }

  /**
   * Handle revealing the current combatant's maneuver
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onRevealManeuver(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat) return;

    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId;
    if (!combatantId) return;

    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return;

    if (!combatant.isOwner && !game.user.isGM) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.NotYourCombatant"));
      return;
    }

    await combatant.revealManeuver();
    ui.combat?.render();
  }

  /* -------------------------------------------- */
  /*  Standard Combat Tracker Actions             */
  /* -------------------------------------------- */

  /**
   * Handle creating a new combat encounter
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onCreateCombat(event, target) {
    event.preventDefault();
    await Combat.create({ scene: canvas.scene?.id, active: true });
  }

  /**
   * Handle ending the current combat
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onEndCombat(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat || !game.user.isGM) return;
    await combat.endCombat();
  }

  /**
   * Handle rolling initiative for all combatants
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onRollAll(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat || !game.user.isGM) return;
    await combat.rollAll();
  }

  /**
   * Handle rolling initiative for NPC combatants
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onRollNPC(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat || !game.user.isGM) return;
    await combat.rollNPC();
  }

  /**
   * Handle resetting all initiative
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onResetAll(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat || !game.user.isGM) return;
    await combat.resetAll();
  }

  /**
   * Handle cycling to the previous combat
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onPreviousCombat(event, target) {
    event.preventDefault();
    const combats = this.combats;
    const current = this.viewed;
    if (!combats.length || !current) return;
    const index = combats.findIndex(c => c.id === current.id);
    const prev = combats[(index - 1 + combats.length) % combats.length];
    await prev.activate();
  }

  /**
   * Handle cycling to the next combat
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onNextCombat(event, target) {
    event.preventDefault();
    const combats = this.combats;
    const current = this.viewed;
    if (!combats.length || !current) return;
    const index = combats.findIndex(c => c.id === current.id);
    const next = combats[(index + 1) % combats.length];
    await next.activate();
  }

  /**
   * Handle toggling combatant hidden status
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onToggleHidden(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat || !game.user.isGM) return;

    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId;
    if (!combatantId) return;

    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return;

    await combatant.update({ hidden: !combatant.hidden });
  }

  /**
   * Handle toggling combatant defeated status
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onToggleDefeated(event, target) {
    event.preventDefault();
    const combat = this.viewed;
    if (!combat || !game.user.isGM) return;

    const combatantId = target.closest("[data-combatant-id]")?.dataset.combatantId;
    if (!combatantId) return;

    const combatant = combat.combatants.get(combatantId);
    if (!combatant) return;

    await combatant.update({ defeated: !combatant.defeated });
  }

  /**
   * Handle opening combat configuration
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {StreetFighterCombatTracker}
   */
  static async _onConfigure(event, target) {
    event.preventDefault();
    new foundry.applications.apps.CombatTrackerConfig().render(true);
  }
}
