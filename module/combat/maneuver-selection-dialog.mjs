/**
 * Street Fighter Maneuver Selection Dialog
 * Displays available maneuvers for a combatant to select during the selection phase
 * @author Kirlian Silvestre
 */

import { COMBAT_PHASE, FLAG_SCOPE, COMBAT_FLAGS } from "./combat-phases.mjs";

/**
 * Dialog for selecting a maneuver during combat selection phase
 * @extends {foundry.applications.api.ApplicationV2}
 */
export class ManeuverSelectionDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  /**
   * @param {Combat} combat - The combat document
   * @param {Combatant} combatant - The combatant selecting a maneuver
   * @param {object} options - Application options
   */
  constructor(combat, combatant, options = {}) {
    super(options);
    this.combat = combat;
    this.combatant = combatant;
  }

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "maneuver-selection-dialog-{id}",
    classes: ["street-fighter", "maneuver-selection-dialog"],
    window: {
      frame: true,
      positioned: true,
      title: "STREET_FIGHTER.Combat.SelectManeuver",
      icon: "fas fa-fist-raised",
      minimizable: true,
      resizable: true
    },
    position: {
      width: 600,
      height: 500
    },
    actions: {
      selectManeuver: ManeuverSelectionDialog._onSelectManeuver,
      toggleNotes: ManeuverSelectionDialog._onToggleNotes
    }
  };

  /** @override */
  static PARTS = {
    content: {
      template: "systems/street-fighter/templates/combat/maneuver-selection-dialog.hbs"
    }
  };

  /** @override */
  get title() {
    return game.i18n.format("STREET_FIGHTER.Combat.SelectManeuverFor", {
      name: this.combatant.name
    });
  }

  /** @override */
  async _prepareContext(options) {
    const actor = this.combatant.actor;
    if (!actor) {
      return { maneuvers: [], hasManeuvers: false };
    }

    const maneuvers = this._prepareManeuvers(actor);
    const currentSelection = this.combatant.selectedManeuver;

    return {
      combatant: this.combatant,
      actor: actor,
      maneuvers: maneuvers,
      hasManeuvers: maneuvers.length > 0,
      currentSelection: currentSelection,
      currentSelectionId: currentSelection?.itemId ?? null
    };
  }

  /**
   * Prepare maneuver data with calculated stats
   * @param {Actor} actor - The actor
   * @returns {object[]}
   * @private
   */
  _prepareManeuvers(actor) {
    const maneuvers = actor.items.filter(item => item.type === "specialManeuver");
    const characterStats = this._getCharacterStats(actor);

    const prepared = maneuvers.map(maneuver => {
      const data = this._prepareManeuverData(maneuver, characterStats, actor);
      return {
        ...data,
        canAfford: this._canAffordManeuver(maneuver, actor)
      };
    });

    // Sort by calculated speed (lower speed = faster = first)
    return prepared.sort((a, b) => a.calculatedSpeed - b.calculatedSpeed);
  }

  /**
   * Get character stats needed for maneuver calculations
   * @param {Actor} actor
   * @returns {object}
   * @private
   */
  _getCharacterStats(actor) {
    const findTraitValue = (sourceId) => {
      if (!sourceId) return 0;
      const item = actor.items.find(i => i.system.sourceId === sourceId);
      return item?.system.value || 0;
    };

    const techniques = actor.items.filter(i => i.type === "technique");
    const techniquesMap = {};
    for (const t of techniques) {
      const key = t.system.sourceId || t.name.toLowerCase();
      techniquesMap[key] = {
        value: t.system.value || 0,
        isWeaponTechnique: t.system.isWeaponTechnique || false,
        isFirearmTechnique: t.system.isFirearmTechnique || false
      };
    }

    return {
      findTraitValue,
      dexterity: findTraitValue("dexterity"),
      strength: findTraitValue("strength"),
      wits: findTraitValue("wits"),
      athletics: findTraitValue("athletics"),
      techniques: techniquesMap
    };
  }

  /**
   * Prepare maneuver data with calculated stats
   * @param {Item} maneuver
   * @param {object} characterStats
   * @param {Actor} actor
   * @returns {object}
   * @private
   */
  _prepareManeuverData(maneuver, characterStats, actor) {
    const category = maneuver.system.category || "";
    const categoryKey = category.toLowerCase();
    const { findTraitValue } = characterStats;

    // Get technique data - check for damageTraitOverride first
    const effectiveTechniqueKey = maneuver.system.damageTraitOverride || categoryKey;
    const techniqueData = characterStats.techniques[effectiveTechniqueKey] || { value: 0, isWeaponTechnique: false, isFirearmTechnique: false };
    const techniqueValue = techniqueData.value;
    const isWeaponTechnique = techniqueData.isWeaponTechnique || techniqueData.isFirearmTechnique;
    const isFirearmTechnique = techniqueData.isFirearmTechnique;

    // Weapon modifiers (only for weapon/firearm techniques)
    const weapons = actor.items.filter(i => i.type === "weapon");
    const equippedWeapons = isWeaponTechnique
      ? weapons.filter(w => w.system.isEquipped && (w.system.techniqueId || "").toLowerCase() === effectiveTechniqueKey)
      : [];

    const singleEquippedWeapon = equippedWeapons.length === 1 ? equippedWeapons[0] : null;
    const parseWeaponMod = (val) => parseInt(String(val || "0").replace(/^\+/, "")) || 0;
    const weaponSpeedMod = singleEquippedWeapon ? parseWeaponMod(singleEquippedWeapon.system.speed) : 0;
    const weaponDamageMod = singleEquippedWeapon ? parseWeaponMod(singleEquippedWeapon.system.damage) : 0;
    const weaponMovementMod = singleEquippedWeapon ? parseWeaponMod(singleEquippedWeapon.system.movement) : 0;

    // Speed calculation
    // Default: dexterity, firearm: wits, override: specified trait
    let speedBase;
    if (maneuver.system.speedTraitOverride) {
      speedBase = findTraitValue(maneuver.system.speedTraitOverride);
    } else if (isFirearmTechnique) {
      speedBase = characterStats.wits;
    } else {
      speedBase = characterStats.dexterity;
    }
    const calculatedSpeed = this._calculateModifier(maneuver.system.speedModifier, speedBase + weaponSpeedMod);

    // Damage calculation
    // Attribute: default strength, firearm: 0, override: specified attribute
    // Technique: default category technique, override: specified technique (already handled above)
    let damageAttribute;
    if (maneuver.system.damageAttributeOverride) {
      damageAttribute = findTraitValue(maneuver.system.damageAttributeOverride);
    } else if (isFirearmTechnique) {
      damageAttribute = 0;
    } else {
      damageAttribute = characterStats.strength;
    }
    const damageBase = damageAttribute + techniqueValue;
    const calculatedDamage = this._calculateModifier(maneuver.system.damageModifier, damageBase + weaponDamageMod);

    // Movement calculation
    // Default: athletics, firearm: 0, override: specified trait
    let movementBase;
    if (maneuver.system.movementTraitOverride) {
      movementBase = findTraitValue(maneuver.system.movementTraitOverride);
    } else if (isFirearmTechnique) {
      movementBase = 0;
    } else {
      movementBase = characterStats.athletics;
    }
    const calculatedMovement = this._calculateModifier(maneuver.system.movementModifier, movementBase + weaponMovementMod);

    return {
      id: maneuver.id,
      name: maneuver.name,
      img: maneuver.img,
      system: maneuver.system,
      category: category,
      calculatedSpeed,
      calculatedDamage,
      calculatedMovement,
      chiCost: maneuver.system.chiCost || 0,
      willpowerCost: maneuver.system.willpowerCost || 0,
      notes: maneuver.system.notes || "",
      ruleSummary: maneuver.system.ruleSummary || "",
      isWeaponTechnique,
      isFirearmTechnique
    };
  }

  /**
   * Calculate a modifier value
   * @param {string} modifier - The modifier string (e.g., "+2", "-1", "x2")
   * @param {number} base - The base value
   * @returns {number}
   * @private
   */
  _calculateModifier(modifier, base) {
    if (!modifier) return base;

    const modStr = String(modifier).trim();

    if (modStr.startsWith("x") || modStr.startsWith("*")) {
      const multiplier = parseFloat(modStr.slice(1)) || 1;
      return Math.floor(base * multiplier);
    }

    const modValue = parseInt(modStr.replace(/^\+/, "")) || 0;
    return base + modValue;
  }

  /**
   * Check if the actor can afford a maneuver's costs
   * @param {Item} maneuver
   * @param {Actor} actor
   * @returns {boolean}
   * @private
   */
  _canAffordManeuver(maneuver, actor) {
    const chiCost = maneuver.system.chiCost || 0;
    const willpowerCost = maneuver.system.willpowerCost || 0;

    const currentChi = actor.system.resources?.chi?.value ?? 0;
    const currentWillpower = actor.system.resources?.willpower?.value ?? 0;

    return currentChi >= chiCost && currentWillpower >= willpowerCost;
  }

  /**
   * Handle maneuver selection
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {ManeuverSelectionDialog}
   */
  static async _onSelectManeuver(event, target) {
    event.preventDefault();

    const maneuverId = target.dataset.maneuverId;
    if (!maneuverId) return;

    const actor = this.combatant.actor;
    if (!actor) return;

    const maneuver = actor.items.get(maneuverId);
    if (!maneuver) return;

    if (!this._canAffordManeuver(maneuver, actor)) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.CannotAffordManeuver"));
      return;
    }

    const characterStats = this._getCharacterStats(actor);
    const preparedManeuver = this._prepareManeuverData(maneuver, characterStats, actor);

    await this.combatant.selectManeuver({
      itemId: maneuver.id,
      name: maneuver.name,
      speed: preparedManeuver.calculatedSpeed,
      damage: preparedManeuver.calculatedDamage,
      movement: preparedManeuver.calculatedMovement,
      category: preparedManeuver.category,
      chiCost: preparedManeuver.chiCost,
      willpowerCost: preparedManeuver.willpowerCost,
      notes: preparedManeuver.notes
    });

    ui.notifications.info(game.i18n.format("STREET_FIGHTER.Combat.ManeuverSelected", {
      name: maneuver.name
    }));

    ui.combat?.render();

    await this.close();
  }

  /**
   * Handle toggling the notes accordion
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   * @this {ManeuverSelectionDialog}
   */
  static _onToggleNotes(event, target) {
    event.preventDefault();
    event.stopPropagation();

    const card = target.closest(".sf-maneuver-card");
    if (!card) return;

    const notes = card.querySelector(".sf-maneuver-notes");
    if (!notes) return;

    const isCollapsed = notes.classList.contains("collapsed");
    notes.classList.toggle("collapsed", !isCollapsed);
    card.classList.toggle("expanded", isCollapsed);
  }

  /**
   * Show the maneuver selection dialog for a combatant
   * @param {Combat} combat - The combat document
   * @param {Combatant} combatant - The combatant
   * @returns {Promise<ManeuverSelectionDialog>}
   */
  static async show(combat, combatant) {
    if (combat.phase !== COMBAT_PHASE.SELECTION) {
      ui.notifications.warn(game.i18n.localize("STREET_FIGHTER.Combat.NotInSelectionPhase"));
      return null;
    }

    const existingDialog = Object.values(ui.windows).find(
      w => w instanceof ManeuverSelectionDialog && w.combatant?.id === combatant.id
    );

    if (existingDialog) {
      existingDialog.bringToFront();
      return existingDialog;
    }

    const dialog = new ManeuverSelectionDialog(combat, combatant, {
      id: `maneuver-selection-dialog-${combatant.id}`
    });

    await dialog.render(true);
    return dialog;
  }
}
