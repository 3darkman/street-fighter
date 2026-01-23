/**
 * Street Fighter Active Effect Sheet
 * @author Kirlian Silvestre
 * @extends {ActiveEffectConfig}
 */

import {
  EFFECT_TARGET_TYPES,
  RESOURCE_TYPES,
  parseEffectKey,
  buildEffectKey,
} from "./effect-types.mjs";

const ActiveEffectConfig = foundry.applications.sheets.ActiveEffectConfig;

export class StreetFighterEffectSheet extends ActiveEffectConfig {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["street-fighter", "effect-sheet"],
  };

  /** @override */
  static PARTS = {
    ...super.PARTS,
    changes: { template: "systems/street-fighter/templates/effects/effect-changes-tab.hbs" },
  };

  /** @override */
  async _preparePartContext(partId, context) {
    const partContext = await super._preparePartContext(partId, context);

    if (partId === "changes") {
      partContext.effectTargetTypes = this._getEffectTargetTypes();
      partContext.resourceTypes = this._getResourceTypes();
      partContext.traits = this._getAvailableTraits();

      partContext.parsedChanges = partContext.source.changes.map((change, index) => {
        const parsed = parseEffectKey(change.key);
        return {
          ...change,
          index,
          targetType: parsed?.type || EFFECT_TARGET_TYPES.TRAIT,
          targetId: parsed?.targetId || "",
        };
      });
    }

    return partContext;
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);
    this._restoreTargetSelections();
  }

  /**
   * Restore target ID selections after render
   * @private
   */
  _restoreTargetSelections() {
    const html = this.element;
    if (!html) return;

    const rows = html.querySelectorAll("li.effect-change");
    rows.forEach((row) => {
      const targetType = row.dataset.targetType;
      const targetId = row.dataset.targetId;

      if (!targetId) return;

      if (targetType === EFFECT_TARGET_TYPES.TRAIT || targetType === EFFECT_TARGET_TYPES.ROLL_TRAIT) {
        const traitSelect = row.querySelector(".trait-target-select");
        if (traitSelect) {
          traitSelect.value = targetId;
        }
      } else if (targetType === EFFECT_TARGET_TYPES.RESOURCE_MAX) {
        const resourceSelect = row.querySelector(".resource-target-select");
        if (resourceSelect) {
          resourceSelect.value = targetId;
        }
      }
    });
  }

  /**
   * Get effect target types for dropdown
   * @returns {Array<{value: string, label: string}>}
   * @private
   */
  _getEffectTargetTypes() {
    return [
      { value: EFFECT_TARGET_TYPES.TRAIT, label: game.i18n.localize("STREET_FIGHTER.ActiveEffects.TargetTypes.trait") },
      { value: EFFECT_TARGET_TYPES.RESOURCE_MAX, label: game.i18n.localize("STREET_FIGHTER.ActiveEffects.TargetTypes.resourceMax") },
      { value: EFFECT_TARGET_TYPES.ROLL_ALL, label: game.i18n.localize("STREET_FIGHTER.ActiveEffects.TargetTypes.rollAll") },
      { value: EFFECT_TARGET_TYPES.ROLL_TRAIT, label: game.i18n.localize("STREET_FIGHTER.ActiveEffects.TargetTypes.rollTrait") },
    ];
  }

  /**
   * Get resource types for dropdown
   * @returns {Array<{value: string, label: string}>}
   * @private
   */
  _getResourceTypes() {
    return [
      { value: RESOURCE_TYPES.HEALTH, label: game.i18n.localize("STREET_FIGHTER.Resources.health") },
      { value: RESOURCE_TYPES.CHI, label: game.i18n.localize("STREET_FIGHTER.Resources.chi") },
      { value: RESOURCE_TYPES.WILLPOWER, label: game.i18n.localize("STREET_FIGHTER.Resources.willpower") },
      { value: RESOURCE_TYPES.SOAK, label: game.i18n.localize("STREET_FIGHTER.Combat.soak")}
    ];
  }

  /**
   * Get available traits from world items
   * @returns {Array<{id: string, name: string, type: string}>}
   * @private
   */
  _getAvailableTraits() {
    const traits = [];
    const traitTypes = ["attribute", "ability", "technique", "background"];

    for (const item of game.items) {
      if (traitTypes.includes(item.type)) {
        traits.push({
          id: item.system.sourceId || item.id,
          name: item.name,
          type: item.type,
        });
      }
    }

    return traits.sort((a, b) => a.name.localeCompare(b.name));
  }

  /** @override */
  _onChangeForm(formConfig, event) {
    super._onChangeForm(formConfig, event);

    const target = event.target;
    if (target?.matches('select.change-target-type')) {
      const targetType = target.value;
      const row = target.closest("li.effect-change");

      if (row) {
        const traitSelect = row.querySelector(".change-trait-select");
        const resourceSelect = row.querySelector(".change-resource-select");
        const rollAllSelect = row.querySelector(".change-rollall-select");

        if (traitSelect) {
          traitSelect.style.display =
            targetType === EFFECT_TARGET_TYPES.TRAIT || targetType === EFFECT_TARGET_TYPES.ROLL_TRAIT
              ? ""
              : "none";
        }

        if (resourceSelect) {
          resourceSelect.style.display =
            targetType === EFFECT_TARGET_TYPES.RESOURCE_MAX ? "" : "none";
        }

        if (rollAllSelect) {
          rollAllSelect.style.display =
            targetType === EFFECT_TARGET_TYPES.ROLL_ALL ? "" : "none";
        }
      }
    }
  }

  /** @override */
  _processFormData(event, form, formData) {
    const processedData = super._processFormData(event, form, formData);

    if (processedData.changes) {
      const changesArray = Object.values(processedData.changes || []);

      processedData.changes = changesArray.map((change) => {
        const targetType = change.targetType || EFFECT_TARGET_TYPES.TRAIT;
        let targetId = "";

        if (targetType === EFFECT_TARGET_TYPES.TRAIT || targetType === EFFECT_TARGET_TYPES.ROLL_TRAIT) {
          targetId = change.traitTargetId || "";
        } else if (targetType === EFFECT_TARGET_TYPES.RESOURCE_MAX) {
          targetId = change.resourceTargetId || "";
        }

        return {
          key: buildEffectKey(targetType, targetId),
          mode: CONST.ACTIVE_EFFECT_MODES.ADD,
          value: change.value || "0",
        };
      });
    }

    return processedData;
  }
}
