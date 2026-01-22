/**
 * Street Fighter RPG System - Effect Types and Constants
 * @author Kirlian Silvestre
 */

/**
 * Effect change modes supported by the system
 * Maps to Foundry's CONST.ACTIVE_EFFECT_MODES
 */
export const EFFECT_CHANGE_MODES = {
  ADD: CONST.ACTIVE_EFFECT_MODES.ADD,
  MULTIPLY: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
  OVERRIDE: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
  CUSTOM: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
};

/**
 * Effect target types - what the effect modifies
 */
export const EFFECT_TARGET_TYPES = {
  TRAIT: "trait",
  RESOURCE_MAX: "resourceMax",
  ROLL_ALL: "rollAll",
  ROLL_TRAIT: "rollTrait",
};

/**
 * Resource types that can be modified
 */
export const RESOURCE_TYPES = {
  HEALTH: "health",
  CHI: "chi",
  WILLPOWER: "willpower",
  SOAK: "soak",
};

/**
 * Trait types that can be modified
 */
export const TRAIT_TYPES = {
  ATTRIBUTE: "attribute",
  ABILITY: "ability",
  TECHNIQUE: "technique",
  BACKGROUND: "background",
};

/**
 * Effect key prefixes for different modification types
 * Used to identify what an effect change targets
 */
export const EFFECT_KEY_PREFIXES = {
  TRAIT_MOD: "sf.trait.",
  RESOURCE_MAX: "sf.resource.max.",
  ROLL_ALL: "sf.roll.all",
  ROLL_TRAIT: "sf.roll.trait.",
};

/**
 * Parse an effect key to determine its type and target
 * @param {string} key - The effect change key
 * @returns {object|null} Parsed key data or null if not a system key
 */
export function parseEffectKey(key) {
  if (!key || !key.startsWith("sf.")) {
    return null;
  }

  if (key.startsWith(EFFECT_KEY_PREFIXES.TRAIT_MOD)) {
    const traitSourceId = key.substring(EFFECT_KEY_PREFIXES.TRAIT_MOD.length);
    return {
      type: EFFECT_TARGET_TYPES.TRAIT,
      targetId: traitSourceId,
    };
  }

  if (key.startsWith(EFFECT_KEY_PREFIXES.RESOURCE_MAX)) {
    const resourceType = key.substring(EFFECT_KEY_PREFIXES.RESOURCE_MAX.length);
    return {
      type: EFFECT_TARGET_TYPES.RESOURCE_MAX,
      targetId: resourceType,
    };
  }

  if (key === EFFECT_KEY_PREFIXES.ROLL_ALL) {
    return {
      type: EFFECT_TARGET_TYPES.ROLL_ALL,
      targetId: null,
    };
  }

  if (key.startsWith(EFFECT_KEY_PREFIXES.ROLL_TRAIT)) {
    const traitSourceId = key.substring(EFFECT_KEY_PREFIXES.ROLL_TRAIT.length);
    return {
      type: EFFECT_TARGET_TYPES.ROLL_TRAIT,
      targetId: traitSourceId,
    };
  }

  return null;
}

/**
 * Build an effect key from type and target
 * @param {string} type - Effect target type from EFFECT_TARGET_TYPES
 * @param {string} targetId - Target identifier (sourceId for traits, resource type for resources)
 * @returns {string} The effect key
 */
export function buildEffectKey(type, targetId = null) {
  switch (type) {
    case EFFECT_TARGET_TYPES.TRAIT:
      return `${EFFECT_KEY_PREFIXES.TRAIT_MOD}${targetId}`;
    case EFFECT_TARGET_TYPES.RESOURCE_MAX:
      return `${EFFECT_KEY_PREFIXES.RESOURCE_MAX}${targetId}`;
    case EFFECT_TARGET_TYPES.ROLL_ALL:
      return EFFECT_KEY_PREFIXES.ROLL_ALL;
    case EFFECT_TARGET_TYPES.ROLL_TRAIT:
      return `${EFFECT_KEY_PREFIXES.ROLL_TRAIT}${targetId}`;
    default:
      return "";
  }
}

/**
 * Get localization key for effect target type
 * @param {string} type - Effect target type
 * @returns {string} Localization key
 */
export function getEffectTargetTypeLabel(type) {
  const labels = {
    [EFFECT_TARGET_TYPES.TRAIT]: "STREET_FIGHTER.ActiveEffects.TargetTypes.trait",
    [EFFECT_TARGET_TYPES.RESOURCE_MAX]: "STREET_FIGHTER.ActiveEffects.TargetTypes.resourceMax",
    [EFFECT_TARGET_TYPES.ROLL_ALL]: "STREET_FIGHTER.ActiveEffects.TargetTypes.rollAll",
    [EFFECT_TARGET_TYPES.ROLL_TRAIT]: "STREET_FIGHTER.ActiveEffects.TargetTypes.rollTrait",
  };
  return labels[type] || "";
}

/**
 * Get localization key for resource type
 * @param {string} resourceType - Resource type
 * @returns {string} Localization key
 */
export function getResourceTypeLabel(resourceType) {
  const labels = {
    [RESOURCE_TYPES.HEALTH]: "STREET_FIGHTER.Resources.health",
    [RESOURCE_TYPES.CHI]: "STREET_FIGHTER.Resources.chi",
    [RESOURCE_TYPES.WILLPOWER]: "STREET_FIGHTER.Resources.willpower",
    [RESOURCE_TYPES.SOAK]: "STREET_FIGHTER.Combat.soak",
  };
  return labels[resourceType] || "";
}
