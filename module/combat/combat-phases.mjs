/**
 * Street Fighter Combat Phases and Constants
 * Single Source of Truth for combat state management
 * @author Kirlian Silvestre
 */

/**
 * Combat phases enumeration
 * @enum {string}
 */
export const COMBAT_PHASE = Object.freeze({
  SETUP: "setup",
  SELECTION: "selection",
  EXECUTION: "execution"
});

/**
 * Combatant selection status during selection phase
 * @enum {string}
 */
export const SELECTION_STATUS = Object.freeze({
  PENDING: "pending",
  READY: "ready"
});

/**
 * Combatant action status during execution phase
 * @enum {string}
 */
export const ACTION_STATUS = Object.freeze({
  PENDING: "pending",
  ACTING: "acting",
  REVEALED: "revealed",
  INTERRUPTED: "interrupted",
  COMPLETED: "completed",
  SKIPPED: "skipped"
});

/**
 * Socket event names for combat communication
 * @enum {string}
 */
export const SOCKET_EVENTS = Object.freeze({
  INTERRUPTION: "streetfighter.combat.interruption",
  MANEUVER_REVEALED: "streetfighter.combat.maneuverRevealed",
  TURN_STARTED: "streetfighter.combat.turnStarted",
  PHASE_CHANGED: "streetfighter.combat.phaseChanged",
  REQUEST_INTERRUPTION: "streetfighter.combat.requestInterruption",
  REQUEST_COMPLETE_ACTION: "streetfighter.combat.requestCompleteAction",
  REQUEST_SKIP_ACTION: "streetfighter.combat.requestSkipAction"
});

/**
 * Flag scope for Street Fighter system
 * @constant {string}
 */
export const FLAG_SCOPE = "street-fighter";

/**
 * Combat flag keys
 * @enum {string}
 */
export const COMBAT_FLAGS = Object.freeze({
  PHASE: "phase",
  CURRENT_ACTING_ID: "currentActingCombatantId",
  INTERRUPTION_STACK: "interruptionStack",
  TURN_STARTED: "turnStarted"
});

/**
 * Combatant flag keys
 * @enum {string}
 */
export const COMBATANT_FLAGS = Object.freeze({
  SELECTED_MANEUVER: "selectedManeuver",
  SELECTION_STATUS: "selectionStatus",
  ACTION_STATUS: "actionStatus",
  MANEUVER_REVEALED: "maneuverRevealed",
  INTERRUPTED_BY_ID: "interruptedById"
});

/**
 * Default combat flags structure
 * @returns {object}
 */
export function getDefaultCombatFlags() {
  return {
    [COMBAT_FLAGS.PHASE]: COMBAT_PHASE.SETUP,
    [COMBAT_FLAGS.CURRENT_ACTING_ID]: null,
    [COMBAT_FLAGS.INTERRUPTION_STACK]: [],
    [COMBAT_FLAGS.TURN_STARTED]: false
  };
}

/**
 * Default combatant flags structure
 * @returns {object}
 */
export function getDefaultCombatantFlags() {
  return {
    [COMBATANT_FLAGS.SELECTED_MANEUVER]: null,
    [COMBATANT_FLAGS.SELECTION_STATUS]: SELECTION_STATUS.PENDING,
    [COMBATANT_FLAGS.ACTION_STATUS]: ACTION_STATUS.PENDING,
    [COMBATANT_FLAGS.MANEUVER_REVEALED]: false,
    [COMBATANT_FLAGS.INTERRUPTED_BY_ID]: null
  };
}

/**
 * Selected maneuver data structure
 * @typedef {object} SelectedManeuver
 * @property {string} itemId - The maneuver item ID
 * @property {string} name - The maneuver name
 * @property {number} speed - Calculated speed value
 * @property {number} chiCost - Chi cost
 * @property {number} willpowerCost - Willpower cost
 * @property {string} notes - Maneuver notes
 * @property {number} damage - Calculated damage value
 * @property {number} movement - Calculated movement value
 * @property {string} category - Maneuver category (punch, kick, etc.)
 */

/**
 * Creates a selected maneuver data object
 * @param {object} params - Maneuver parameters
 * @param {string} params.itemId - The maneuver item ID
 * @param {string} params.name - The maneuver name
 * @param {number} params.speed - Calculated speed value
 * @param {number} params.damage - Calculated damage value
 * @param {number} params.movement - Calculated movement value
 * @param {string} params.category - Maneuver category
 * @param {number} params.chiCost - Chi cost
 * @param {number} params.willpowerCost - Willpower cost
 * @param {string} params.notes - Maneuver notes
 * @returns {SelectedManeuver}
 */
export function createSelectedManeuver({ itemId, name, speed, damage, movement, category, chiCost, willpowerCost, notes }) {
  return Object.freeze({
    itemId,
    name,
    speed,
    damage,
    movement,
    category,
    chiCost: chiCost || 0,
    willpowerCost: willpowerCost || 0,
    notes: notes || ""
  });
}

/**
 * Checks if a combatant can interrupt another based on speed
 * @param {number} interruptorSpeed - Speed of the combatant attempting to interrupt
 * @param {number} targetSpeed - Speed of the currently acting combatant
 * @returns {boolean}
 */
export function canInterrupt(interruptorSpeed, targetSpeed) {
  return interruptorSpeed > targetSpeed;
}

/**
 * Sorts combatants by initiative (speed-based, lower first)
 * @param {Array<{speed: number, name: string}>} combatants - Array of combatant data
 * @returns {Array} Sorted array
 */
export function sortByInitiative(combatants) {
  return [...combatants].sort((a, b) => {
    if (a.speed !== b.speed) {
      return a.speed - b.speed;
    }
    return a.name.localeCompare(b.name);
  });
}
