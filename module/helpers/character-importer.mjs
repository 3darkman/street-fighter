/**
 * Street Fighter Character Importer
 * Imports characters from .fscharacters files exported from Fighter Sheet app
 * @author Kirlian Silvestre
 */

/**
 * Find a world item by its sourceId
 * @param {string} sourceId - The sourceId to search for
 * @param {string|string[]} types - Optional item type(s) to filter by
 * @returns {Item|null}
 */
function findWorldItemBySourceId(sourceId, types = null) {
  if (!sourceId) return null;
  
  const typeArray = types ? (Array.isArray(types) ? types : [types]) : null;
  
  return game.items.find((item) => {
    if (typeArray && !typeArray.includes(item.type)) return false;
    return item.system.sourceId === sourceId;
  }) || null;
}

/**
 * Import characters from a .fscharacters file
 * @param {File} file - The file to import
 * @param {Folder} folder - Optional folder to place characters in
 * @returns {Promise<{success: boolean, counts: object, errors: string[]}>}
 */
export async function importCharacters(file, folder = null) {
  const errors = [];
  const counts = {
    imported: 0,
    updated: 0,
    skipped: 0,
  };

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data.characters || !Array.isArray(data.characters)) {
      errors.push("Invalid file format: missing characters array");
      return { success: false, counts, errors };
    }

    const version = data.version || "unknown";

    for (const charData of data.characters) {
      try {
        await importSingleCharacter(charData, version, folder);
        counts.imported++;
      } catch (e) {
        errors.push(`Character ${charData.name || charData.characterId}: ${e.message}`);
      }
    }

    return { success: true, counts, errors };
  } catch (e) {
    errors.push(`Failed to parse file: ${e.message}`);
    return { success: false, counts, errors };
  }
}

/**
 * Import a single character from exported data
 * @param {object} charData - Character data from export
 * @param {string} version - Export version
 * @param {Folder} folder - Optional folder
 */
async function importSingleCharacter(charData, version, folder) {
  // Build actor data
  const actorData = {
    name: charData.name || charData.characterName || "Unnamed Fighter",
    type: charData.isNpc ? "npc" : "fighter",
    folder: folder?.id || null,
    img: charData.imageBase64 ? `data:image/png;base64,${charData.imageBase64}` : null,
    system: buildActorSystemData(charData, version),
  };

  // Create the actor
  const actor = await Actor.create(actorData);

  // Add embedded items (special maneuvers, weapons, etc.)
  await addEmbeddedItems(actor, charData);

  return actor;
}

/**
 * Build the system data for an actor from imported character data
 * @param {object} charData - Character data from export
 * @param {string} version - Export version
 * @returns {object} - System data for the actor
 */
function buildActorSystemData(charData, version) {
  return {
    importData: {
      isImported: true,
      characterId: charData.characterId || "",
      importedAt: new Date().toISOString(),
      sourceVersion: version,
    },
    profile: {
      characterName: charData.characterName || charData.name || "",
      playerName: charData.playerName || "",
      chronicleName: charData.chronicleName || "",
      schoolName: charData.schoolName || "",
      fightingTeam: charData.fightingTeam || "",
      stable: charData.stable || "",
      concept: charData.concept || "",
      signature: charData.signature || "",
    },
    resources: {
      health: {
        value: charData.health || 10,
        max: charData.health || 10,
        damageTaken: charData.damageTaken || 0,
      },
      chi: {
        value: charData.chi || 0,
        max: charData.chi || 0,
        spent: charData.chiSpent || 0,
      },
      willpower: {
        value: charData.willpower || 0,
        max: charData.willpower || 0,
        spent: charData.willpowerSpent || 0,
      },
    },
    renown: {
      honor: {
        permanent: charData.permanentHonor || 0,
        temporary: charData.temporaryHonor || 0,
      },
      glory: {
        permanent: charData.permanentGlory || 0,
        temporary: charData.temporaryGlory || 0,
      },
    },
    experience: {
      total: charData.experienceTotal || 0,
      spent: charData.experienceSpent || 0,
    },
    divisionRecords: charData.divisionRecords || [],
    sessionRecords: charData.sessionRecords || [],
    languages: charData.languages || [],
    combos: charData.combos || [],
    maneuverWeaponBindings: charData.maneuverWeaponBindings || {},
    biography: "",
    background: charData.background || "",
    motivations: charData.motivations || "",
    appearanceNotes: charData.appearance || "",
    equipment: charData.equipment || "",
  };
}

/**
 * Add embedded items to an actor based on imported data
 * @param {Actor} actor - The actor to add items to
 * @param {object} charData - Character data from export
 */
async function addEmbeddedItems(actor, charData) {
  const itemsToCreate = [];

  // Add fighting style as embedded item
  if (charData.styleId) {
    const styleItem = findWorldItemBySourceId(charData.styleId, "fightingStyle");
    if (styleItem) {
      itemsToCreate.push(styleItem.toObject());
    }
  }

  // Add traits from traitValues as embedded items with their values
  if (charData.traitValues && typeof charData.traitValues === "object") {
    for (const [traitSourceId, value] of Object.entries(charData.traitValues)) {
      // Try to find the trait in world items (could be attribute, ability, technique, or background)
      const traitItem = findWorldItemBySourceId(traitSourceId, ["attribute", "ability", "technique", "background"]);
      if (traitItem) {
        const traitData = traitItem.toObject();
        traitData.system.value = value;
        itemsToCreate.push(traitData);
      }
    }
  }

  // Add special maneuvers
  if (charData.specialManeuverIds && Array.isArray(charData.specialManeuverIds)) {
    for (const maneuverId of charData.specialManeuverIds) {
      const maneuverItem = findWorldItemBySourceId(maneuverId, "specialManeuver");
      if (maneuverItem) {
        itemsToCreate.push(maneuverItem.toObject());
      }
    }
  }

  // Add weapons
  if (charData.selectedWeaponIds && Array.isArray(charData.selectedWeaponIds)) {
    for (const weaponId of charData.selectedWeaponIds) {
      const weaponItem = findWorldItemBySourceId(weaponId, "weapon");
      if (weaponItem) {
        itemsToCreate.push(weaponItem.toObject());
      }
    }
  }

  // Add division records as division items
  if (charData.divisionRecords && Array.isArray(charData.divisionRecords)) {
    for (const record of charData.divisionRecords) {
      const divisionItem = findWorldItemBySourceId(record.divisionId, "division");
      if (divisionItem) {
        const divisionData = divisionItem.toObject();
        divisionData.system.rank = record.rank || "";
        divisionData.system.wins = record.wins || 0;
        divisionData.system.draws = record.draws || 0;
        divisionData.system.losses = record.losses || 0;
        divisionData.system.knockouts = record.knockouts || 0;
        itemsToCreate.push(divisionData);
      }
    }
  }

  // Create all embedded items
  if (itemsToCreate.length > 0) {
    await actor.createEmbeddedDocuments("Item", itemsToCreate);
  }
}

/**
 * Show the character import dialog
 */
export function showCharacterImportDialog() {
  new Dialog({
    title: game.i18n.localize("STREET_FIGHTER.Character.import"),
    content: `
      <form>
        <div class="form-group">
          <label>Character File (.fscharacters)</label>
          <input type="file" name="characterFile" accept=".fscharacters,.json" />
        </div>
        <p style="font-size: 11px; color: #888; margin-top: 8px;">
          Imported characters are read-only and can only be updated by re-importing.
        </p>
      </form>
    `,
    buttons: {
      import: {
        icon: '<i class="fas fa-file-import"></i>',
        label: game.i18n.localize("STREET_FIGHTER.Character.import"),
        callback: async (html) => {
          const fileInput = html.find('input[name="characterFile"]')[0];
          
          if (!fileInput.files.length) {
            ui.notifications.error("Please select a file to import.");
            return;
          }

          const file = fileInput.files[0];
          ui.notifications.info(`Importing characters from: ${file.name}...`);

          const result = await importCharacters(file);

          if (result.success) {
            ui.notifications.info(
              `${game.i18n.localize("STREET_FIGHTER.Character.importSuccess")}: ` +
              `${result.counts.imported} characters imported`
            );
          }

          if (result.errors.length > 0) {
            console.warn("Character import errors:", result.errors);
            ui.notifications.warn(
              `${game.i18n.localize("STREET_FIGHTER.Character.importError")}: ${result.errors.length} errors. Check console for details.`
            );
          }
        },
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: game.i18n.localize("STREET_FIGHTER.Common.cancel"),
      },
    },
    default: "import",
  }).render(true);
}
