/**
 * Street Fighter Handlebars Helpers
 * @author Kirlian Silvestre
 */

/**
 * Register custom Handlebars helpers for the system
 */
export function registerHandlebarsHelpers() {
  Handlebars.registerHelper("concat", function (...args) {
    args.pop();
    return args.join("");
  });

  Handlebars.registerHelper("localizeFormat", function (key, ...args) {
    const options = args.pop();
    const data = {};
    for (let i = 0; i < args.length; i += 2) {
      data[args[i]] = args[i + 1];
    }
    return game.i18n.format(key, data);
  });

  Handlebars.registerHelper("times", function (n, block) {
    let result = "";
    for (let i = 0; i < n; i++) {
      result += block.fn(i);
    }
    return result;
  });

  Handlebars.registerHelper("range", function (start, end, block) {
    let result = "";
    for (let i = start; i <= end; i++) {
      result += block.fn(i);
    }
    return result;
  });

  Handlebars.registerHelper("eq", function (a, b) {
    return a === b;
  });

  Handlebars.registerHelper("neq", function (a, b) {
    return a !== b;
  });

  Handlebars.registerHelper("gt", function (a, b) {
    return a > b;
  });

  Handlebars.registerHelper("gte", function (a, b) {
    return a >= b;
  });

  Handlebars.registerHelper("lt", function (a, b) {
    return a < b;
  });

  Handlebars.registerHelper("lte", function (a, b) {
    return a <= b;
  });

  Handlebars.registerHelper("and", function (...args) {
    args.pop();
    return args.every(Boolean);
  });

  Handlebars.registerHelper("or", function (...args) {
    args.pop();
    return args.some(Boolean);
  });

  Handlebars.registerHelper("not", function (value) {
    return !value;
  });

  Handlebars.registerHelper("percentage", function (value, max) {
    if (max === 0) return 0;
    return Math.round((value / max) * 100);
  });

  Handlebars.registerHelper("add", function (a, b) {
    return a + b;
  });

  Handlebars.registerHelper("subtract", function (a, b) {
    return a - b;
  });

  Handlebars.registerHelper("multiply", function (a, b) {
    return a * b;
  });

  Handlebars.registerHelper("divide", function (a, b) {
    if (b === 0) return 0;
    return a / b;
  });

  Handlebars.registerHelper("floor", function (value) {
    return Math.floor(value);
  });

  Handlebars.registerHelper("ceil", function (value) {
    return Math.ceil(value);
  });

  Handlebars.registerHelper("abs", function (value) {
    return Math.abs(value);
  });

  Handlebars.registerHelper("sfSelectOptions", function (choices, selected) {
    let html = "";
    for (const [key, label] of Object.entries(choices)) {
      const isSelected = key === selected ? "selected" : "";
      const localizedLabel = game.i18n.localize(label);
      html += `<option value="${key}" ${isSelected}>${localizedLabel}</option>`;
    }
    return new Handlebars.SafeString(html);
  });

  Handlebars.registerHelper("json", function (value) {
    if (value === null || value === undefined) return "";
    return JSON.stringify(value, null, 2);
  });

  Handlebars.registerHelper("checked", function (value) {
    return value ? "checked" : "";
  });
}
