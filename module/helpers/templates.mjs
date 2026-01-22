/**
 * Street Fighter Handlebars Templates
 * @author Kirlian Silvestre
 */

/**
 * Preload Handlebars templates for the system
 * @returns {Promise<Handlebars.TemplateDelegate[]>}
 */
export async function preloadHandlebarsTemplates() {
  const templatePaths = [
    "systems/street-fighter/templates/actor/actor-fighter-sheet.hbs",
    "systems/street-fighter/templates/item/item-fightingStyle-sheet.hbs",
    "systems/street-fighter/templates/item/item-specialManeuver-sheet.hbs",
    "systems/street-fighter/templates/item/item-attribute-sheet.hbs",
    "systems/street-fighter/templates/item/item-ability-sheet.hbs",
    "systems/street-fighter/templates/item/item-technique-sheet.hbs",
    "systems/street-fighter/templates/item/item-background-sheet.hbs",
    "systems/street-fighter/templates/item/item-weapon-sheet.hbs",
    "systems/street-fighter/templates/item/item-division-sheet.hbs",
    "systems/street-fighter/templates/chat/item-card.hbs",
    "systems/street-fighter/templates/chat/roll-card.hbs",
    "systems/street-fighter/templates/chat/roll-result.hbs",
    "systems/street-fighter/templates/chat/trait-chat-card.hbs",
    "systems/street-fighter/templates/chat/maneuver-chat-card.hbs",
    "systems/street-fighter/templates/dialog/roll-dialog.hbs",
  ];

  return foundry.applications.handlebars.loadTemplates(templatePaths);
}
