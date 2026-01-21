/**
 * Street Fighter RPG System Configuration
 * Matches the fslibrary domain structure for import compatibility
 * @author Kirlian Silvestre
 */

export const STREET_FIGHTER = {
  actorTypes: {
    fighter: "STREET_FIGHTER.Actor.Types.fighter",
  },

  itemTypes: {
    fightingStyle: "STREET_FIGHTER.Item.Types.fightingStyle",
    specialManeuver: "STREET_FIGHTER.Item.Types.specialManeuver",
    attribute: "STREET_FIGHTER.Item.Types.attribute",
    ability: "STREET_FIGHTER.Item.Types.ability",
    technique: "STREET_FIGHTER.Item.Types.technique",
    background: "STREET_FIGHTER.Item.Types.background",
    weapon: "STREET_FIGHTER.Item.Types.weapon",
    division: "STREET_FIGHTER.Item.Types.division",
  },

  // Attribute categories (physical, social, mental)
  attributeCategories: {
    physical: "STREET_FIGHTER.Attributes.Categories.physical",
    social: "STREET_FIGHTER.Attributes.Categories.social",
    mental: "STREET_FIGHTER.Attributes.Categories.mental",
  },

  // Ability categories (talents, skills, knowledge)
  abilityCategories: {
    talents: "STREET_FIGHTER.Trait.Categories.talents",
    skills: "STREET_FIGHTER.Trait.Categories.skills",
    knowledge: "STREET_FIGHTER.Trait.Categories.knowledge",
  },

  // Physical attributes
  physicalAttributes: {
    strength: "STREET_FIGHTER.Attributes.strength",
    dexterity: "STREET_FIGHTER.Attributes.dexterity",
    stamina: "STREET_FIGHTER.Attributes.stamina",
  },

  // Social attributes
  socialAttributes: {
    charisma: "STREET_FIGHTER.Attributes.charisma",
    manipulation: "STREET_FIGHTER.Attributes.manipulation",
    appearance: "STREET_FIGHTER.Attributes.appearance",
  },

  // Mental attributes
  mentalAttributes: {
    perception: "STREET_FIGHTER.Attributes.perception",
    intelligence: "STREET_FIGHTER.Attributes.intelligence",
    wits: "STREET_FIGHTER.Attributes.wits",
  },

  // Combat techniques
  techniques: {
    punch: "STREET_FIGHTER.Techniques.punch",
    kick: "STREET_FIGHTER.Techniques.kick",
    block: "STREET_FIGHTER.Techniques.block",
    grab: "STREET_FIGHTER.Techniques.grab",
    athletics: "STREET_FIGHTER.Techniques.athletics",
    focus: "STREET_FIGHTER.Techniques.focus",
  },

  // Resources
  resources: {
    health: "STREET_FIGHTER.Resources.health",
    chi: "STREET_FIGHTER.Resources.chi",
    willpower: "STREET_FIGHTER.Resources.willpower",
  },

  // Maneuver categories (matches ManeuverCategory enum)
  maneuverCategories: {
    punch: "STREET_FIGHTER.Maneuver.Categories.punch",
    kick: "STREET_FIGHTER.Maneuver.Categories.kick",
    block: "STREET_FIGHTER.Maneuver.Categories.block",
    grab: "STREET_FIGHTER.Maneuver.Categories.grab",
    athletics: "STREET_FIGHTER.Maneuver.Categories.athletics",
    focus: "STREET_FIGHTER.Maneuver.Categories.focus",
    other: "STREET_FIGHTER.Maneuver.Categories.other",
  },

  // Trait types (attribute, ability, technique, background)
  traitTypes: {
    attribute: "STREET_FIGHTER.Trait.Types.attribute",
    ability: "STREET_FIGHTER.Trait.Types.ability",
    technique: "STREET_FIGHTER.Trait.Types.technique",
    background: "STREET_FIGHTER.Trait.Types.background",
  },

  // Trait categories (matches the fslibrary structure)
  traitCategories: {
    // Attributes
    physical: "STREET_FIGHTER.Trait.Categories.physical",
    social: "STREET_FIGHTER.Trait.Categories.social",
    mental: "STREET_FIGHTER.Trait.Categories.mental",
    // Abilities
    talents: "STREET_FIGHTER.Trait.Categories.talents",
    skills: "STREET_FIGHTER.Trait.Categories.skills",
    knowledge: "STREET_FIGHTER.Trait.Categories.knowledge",
    // Techniques
    techniques: "STREET_FIGHTER.Trait.Categories.techniques",
    // Backgrounds
    backgrounds: "STREET_FIGHTER.Trait.Categories.backgrounds",
  },

  // Prerequisite types for maneuvers
  prerequisiteTypes: {
    techniqueRating: "STREET_FIGHTER.Prerequisite.Types.techniqueRating",
    maneuver: "STREET_FIGHTER.Prerequisite.Types.maneuver",
    attributeRating: "STREET_FIGHTER.Prerequisite.Types.attributeRating",
    abilityRating: "STREET_FIGHTER.Prerequisite.Types.abilityRating",
    background: "STREET_FIGHTER.Prerequisite.Types.background",
  },

  // Effect types (matches EffectType enum)
  effectTypes: {
    categoryBonus: "STREET_FIGHTER.Effect.Types.categoryBonus",
    categoryInitialFixed: "STREET_FIGHTER.Effect.Types.categoryInitialFixed",
    categoryInitialMax: "STREET_FIGHTER.Effect.Types.categoryInitialMax",
    categoryXpCost: "STREET_FIGHTER.Effect.Types.categoryXpCost",
    traitBonus: "STREET_FIGHTER.Effect.Types.traitBonus",
    traitInitialFixed: "STREET_FIGHTER.Effect.Types.traitInitialFixed",
    traitInitialMax: "STREET_FIGHTER.Effect.Types.traitInitialMax",
    traitXpCost: "STREET_FIGHTER.Effect.Types.traitXpCost",
    priorityPoints: "STREET_FIGHTER.Effect.Types.priorityPoints",
    grantManeuver: "STREET_FIGHTER.Effect.Types.grantManeuver",
    bypassPrerequisite: "STREET_FIGHTER.Effect.Types.bypassPrerequisite",
    grantDivision: "STREET_FIGHTER.Effect.Types.grantDivision",
  },
};
