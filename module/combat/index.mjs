/**
 * Street Fighter Combat Module
 * Exports all combat-related components
 * @author Kirlian Silvestre
 */

export { StreetFighterCombat } from "./combat.mjs";
export { StreetFighterCombatant } from "./combatant.mjs";
export { StreetFighterCombatTracker } from "./combat-tracker.mjs";
export { ManeuverSelectionDialog } from "./maneuver-selection-dialog.mjs";
export { ActionTurnDialog } from "./action-turn-dialog.mjs";
export { registerCombatSockets } from "./combat-socket.mjs";

export {
  COMBAT_PHASE,
  SELECTION_STATUS,
  ACTION_STATUS,
  SOCKET_EVENTS,
  FLAG_SCOPE,
  COMBAT_FLAGS,
  COMBATANT_FLAGS,
  getDefaultCombatFlags,
  getDefaultCombatantFlags,
  createSelectedManeuver,
  canInterrupt,
  sortByInitiative
} from "./combat-phases.mjs";
