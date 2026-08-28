"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "_build", "devices");
const transform = require(path.join(SRC, "transform.js"));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function tokenize(source) {
  const tokens = [];
  const pattern = /\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > cursor) {
      tokens.push({ kind: "text", value: source.slice(cursor, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("{{")) {
      tokens.push({ kind: "out", value: raw.slice(2, -2).trim() });
    } else {
      tokens.push({ kind: "tag", value: raw.slice(2, -2).trim() });
    }
    cursor = match.index + raw.length;
  }

  if (cursor < source.length) {
    tokens.push({ kind: "text", value: source.slice(cursor) });
  }

  return tokens;
}

function parseTokens(tokens) {
  const parseNodes = () => {
    const nodes = [];

    while (tokens.length > 0) {
      const token = tokens[0];

      if (token.kind === "text") {
        tokens.shift();
        nodes.push({ type: "text", value: token.value });
        continue;
      }

      if (token.kind === "out") {
        tokens.shift();
        nodes.push({ type: "out", expr: token.value });
        continue;
      }

      const [keyword, ...rest] = token.value.split(/\s+/);
      const argument = rest.join(" ");

      if (keyword === "assign") {
        tokens.shift();
        const assignment = argument.match(/^(\w+)\s*=\s*"(.*)"\s*$/s);
        if (!assignment) {
          throw new Error(`Unsupported assign: ${argument}`);
        }
        nodes.push({
          type: "assign",
          name: assignment[1],
          value: assignment[2],
        });
        continue;
      }

      if (keyword === "if" || keyword === "unless") {
        tokens.shift();
        const branches = [];
        let current = { condition: argument, body: [] };
        let closed = false;

        while (tokens.length > 0) {
          const next = tokens[0];
          if (next.kind === "tag") {
            const [nextKeyword] = next.value.split(/\s+/);
            if (nextKeyword === "endif" || nextKeyword === "endunless") {
              tokens.shift();
              branches.push(current);
              closed = true;
              break;
            }
            if (nextKeyword === "else") {
              tokens.shift();
              branches.push(current);
              current = { condition: null, body: [] };
              continue;
            }
          }
          current.body.push(...parseNodes());
        }

        if (!closed) {
          throw new Error(`Unclosed ${keyword} block`);
        }
        nodes.push({ type: keyword, branches });
        continue;
      }

      if (keyword === "for") {
        tokens.shift();
        const match = argument.match(/^(\w+)\s+in\s+(.+)$/);
        const body = [];
        let closed = false;

        while (tokens.length > 0) {
          const next = tokens[0];
          if (next.kind === "tag" && next.value === "endfor") {
            tokens.shift();
            closed = true;
            break;
          }
          body.push(...parseNodes());
        }

        if (!closed) {
          throw new Error("Unclosed for block");
        }
        nodes.push({
          type: "for",
          varName: match[1],
          collection: match[2],
          body,
        });
        continue;
      }

      if (
        keyword === "endif" ||
        keyword === "endfor" ||
        keyword === "endunless" ||
        keyword === "else"
      ) {
        return nodes;
      }

      throw new Error(`Unsupported tag: ${token.value}`);
    }

    return nodes;
  };

  return parseNodes();
}

function lookup(context, expression) {
  return expression
    .trim()
    .split(".")
    .reduce((value, part) => (value == null ? value : value[part]), context);
}

function evaluateOutput(context, expression) {
  const [valueExpression, ...filters] = expression.split("|");
  let value = lookup(context, valueExpression.trim());
  if (filters.map((filter) => filter.trim()).includes("escape")) {
    value = escapeHtml(value);
  }
  return value == null ? "" : String(value);
}

function evaluateCondition(context, condition) {
  const match = condition.match(/^(.*?)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);

  if (!match) {
    return Boolean(lookup(context, condition));
  }

  const left = lookup(context, match[1]);
  const right = Number(match[3]);

  switch (match[2]) {
    case ">":
      return left > right;
    case ">=":
      return left >= right;
    case "<":
      return left < right;
    case "<=":
      return left <= right;
    case "==":
      return left === right;
    case "!=":
      return left !== right;
    default:
      throw new Error(`Unsupported operator: ${match[2]}`);
  }
}

function renderNodes(nodes, context) {
  let output = "";

  for (const node of nodes) {
    if (node.type === "text") {
      output += node.value;
    } else if (node.type === "assign") {
      context[node.name] = node.value;
    } else if (node.type === "out") {
      output += evaluateOutput(context, node.expr);
    } else if (node.type === "if" || node.type === "unless") {
      for (const branch of node.branches) {
        const conditionMet =
          branch.condition === null
            ? true
            : node.type === "if"
              ? evaluateCondition(context, branch.condition)
              : !evaluateCondition(context, branch.condition);
        if (conditionMet) {
          output += renderNodes(branch.body, context);
          break;
        }
      }
    } else if (node.type === "for") {
      const collection = lookup(context, node.collection) || [];
      collection.forEach((item, index) => {
        const scope = Object.create(context);
        scope[node.varName] = item;
        scope.forloop = { last: index === collection.length - 1 };
        output += renderNodes(node.body, scope);
      });
    }
  }

  return output;
}

function renderTemplate(source, context) {
  return renderNodes(parseTokens(tokenize(source)), context);
}

const LAYOUTS = {
  full: { view: "view--full", mashup: null },
  half_horizontal: { view: "view--half_horizontal", mashup: "mashup--1Tx1B" },
  half_vertical: { view: "view--half_vertical", mashup: "mashup--1Lx1R" },
  quadrant: { view: "view--quadrant", mashup: "mashup--2x2" },
};

const DEVICES = {
  "og-landscape": "screen--og screen--md screen--1bit",
  "x-landscape": "screen--v2 screen--lg screen--4bit",
  "x-portrait": "screen--v2 screen--lg screen--4bit screen--portrait",
};

const GALLERY_DEVICE_SPECS = {
  "og-landscape": { width: 800, height: 480, scale: 0.5 },
  "x-landscape": { width: 1872, height: 1404, scale: 0.24 },
  "x-portrait": { width: 1404, height: 1872, scale: 0.24 },
};

const PAGE_STYLES = `
    <style>body { margin: 0; background: #ddd; }</style>`;

function pageHtml(deviceClass, config, sharedHtml, body) {
  const viewOpen = config.mashup ? `<div class="mashup ${config.mashup}">` : "";
  const viewClose = config.mashup ? "</div>" : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="https://trmnl.com/css/3.2.0/plugins.css" />
    <script src="https://trmnl.com/js/3.2.0/plugins.js"></script>
    <meta name="trmnl-framework-version" content="3.2.0" />
    <meta name="trmnl-framework-pinned" content="true" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" rel="stylesheet">
    ${PAGE_STYLES}
  </head>

  <body class="environment trmnl">
    <div class="screen ${deviceClass}">
      ${viewOpen}
      <div class="view ${config.view}">
        ${sharedHtml}
${body}
      </div>
      ${viewClose}
    </div>
  </body>
</html>
`;
}

function galleryHtml(deviceTiles) {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>In Season device-accurate previews</title>
    <style>
      body { font-family: sans-serif; margin: 24px; }
      h1 { font-size: 20px; }
      h2 { font-size: 16px; margin: 24px 0 8px; }
      .row { display: flex; gap: 16px; flex-wrap: wrap; }
      figure { margin: 0; }
      figcaption { font-size: 12px; color: #555; text-align: center; margin-top: 4px; }
      .frame { border: 1px solid #999; overflow: hidden; }
      iframe { border: 0; transform-origin: top left; background: #fff; }
    </style>
  </head>
  <body>
    <h1>In Season device-accurate previews</h1>
    <p>Each frame is an exact device viewport, so media queries behave as they do on real hardware. Resize this window freely.</p>
    ${deviceTiles.join("\n")}
  </body>
</html>
`;
}

function main() {
  const payload = transform.run(
    {
      trmnl: {
        plugin_settings: {
          instance_name: "In Season",
          custom_fields_values: { country: "united_kingdom" },
        },
      },
    },
    { now: () => new Date() }
  );

  const shared = fs.readFileSync(path.join(SRC, "shared.liquid"), "utf8");
  const sharedHtml = renderTemplate(shared, payload);
  fs.mkdirSync(OUT, { recursive: true });

  for (const [layout, config] of Object.entries(LAYOUTS)) {
    const templateSource = fs.readFileSync(
      path.join(SRC, `${layout}.liquid`),
      "utf8"
    );
    const body = renderTemplate(templateSource, payload);

    for (const [device, deviceClass] of Object.entries(DEVICES)) {
      const name = `${layout}-${device}.html`;
      fs.writeFileSync(
        path.join(OUT, name),
        pageHtml(deviceClass, config, sharedHtml, body)
      );
    }
  }

  const tiles = Object.keys(DEVICES).map((device) => {
    const spec = GALLERY_DEVICE_SPECS[device];
    const shownWidth = Math.round(spec.width * spec.scale);
    const shownHeight = Math.round(spec.height * spec.scale);
    const figures = Object.keys(LAYOUTS)
      .map(
        (layout) => `      <figure>
        <div class="frame" style="width:${shownWidth}px;height:${shownHeight}px;">
          <iframe src="${layout}-${device}.html" style="width:${spec.width}px;height:${spec.height}px;transform:scale(${spec.scale});" title="${layout} ${device}" scrolling="no"></iframe>
        </div>
        <figcaption>${layout}</figcaption>
      </figure>`
      )
      .join("\n");

    return `    <h2>${device} (renders at ${spec.width}&times;${spec.height})</h2>
    <div class="row">
${figures}
    </div>`;
  });

  fs.writeFileSync(path.join(OUT, "gallery.html"), galleryHtml(tiles));
  console.log(`Wrote 12 device pages and gallery.html to ${path.relative(ROOT, OUT)}`);
}

main();