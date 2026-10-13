const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..", "miniprogram");
const failures = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

const files = walk(root);

for (const jsonPath of files.filter((file) => file.endsWith(".json"))) {
  try {
    JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  } catch (error) {
    failures.push(`${path.relative(root, jsonPath)}: invalid JSON (${error.message})`);
  }
}

for (const jsPath of files.filter((file) => file.endsWith(".js"))) {
  try {
    new vm.Script(fs.readFileSync(jsPath, "utf8"), { filename: jsPath });
  } catch (error) {
    failures.push(`${path.relative(root, jsPath)}: invalid JavaScript (${error.message})`);
  }
}

const handlerPattern = /(?:bind|catch)(?:tap|input|change|confirm|submit|longpress|error|load|scrolltolower|columnchange)=["']([^"']+)["']/g;

for (const wxmlPath of files.filter((file) => file.endsWith(".wxml"))) {
  const jsPath = wxmlPath.replace(/\.wxml$/, ".js");
  if (!fs.existsSync(jsPath)) continue;

  const markup = fs.readFileSync(wxmlPath, "utf8");
  const source = fs.readFileSync(jsPath, "utf8");
  const handlers = new Set(Array.from(markup.matchAll(handlerPattern), (match) => match[1]));

  for (const handler of handlers) {
    if (handler.startsWith("{{")) continue;
    const escaped = handler.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`(?:^|\\n)\\s*(?:async\\s+)?${escaped}\\s*\\(`).test(source)) {
      failures.push(`${path.relative(root, wxmlPath)}: handler ${handler} is not defined`);
    }
  }

  for (const match of markup.matchAll(/\bsrc=["'](\/[A-Za-z0-9_./-]+)["']/g)) {
    const assetPath = path.join(root, match[1].replace(/^\//, ""));
    if (!fs.existsSync(assetPath)) {
      failures.push(`${path.relative(root, wxmlPath)}: missing asset ${match[1]}`);
    }
  }

  for (const match of markup.matchAll(/<(input|textarea)\b[^>]*>/g)) {
    const tag = match[0];
    if (!/\badjust-position=["']true["']/.test(tag)) {
      failures.push(`${path.relative(root, wxmlPath)}: ${match[1]} is missing adjust-position=\"true\"`);
    }
    if (!/\bcursor-spacing=["']\d+["']/.test(tag)) {
      failures.push(`${path.relative(root, wxmlPath)}: ${match[1]} is missing cursor-spacing`);
    }
  }
}

const appConfig = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
for (const page of appConfig.pages || []) {
  for (const extension of ["js", "json", "wxml", "wxss"]) {
    const pagePath = path.join(root, `${page}.${extension}`);
    if (!fs.existsSync(pagePath)) {
      failures.push(`app.json: missing ${page}.${extension}`);
    }
  }
}

if (appConfig.tabBar?.custom && !fs.existsSync(path.join(root, "custom-tab-bar", "index.js"))) {
  failures.push("app.json: custom tab bar is enabled but custom-tab-bar/index.js is missing");
}

const registered = { apps: 0, pages: 0, components: 0 };
global.App = () => { registered.apps += 1; };
global.Page = () => { registered.pages += 1; };
global.Component = () => { registered.components += 1; };
global.getCurrentPages = () => [];
global.wx = new Proxy({}, { get: () => () => undefined });

for (const jsPath of files.filter((file) => file.endsWith(".js"))) {
  try {
    require(jsPath);
  } catch (error) {
    failures.push(`${path.relative(root, jsPath)}: module failed to load (${error.message})`);
  }
}

if (registered.apps !== 1) failures.push(`expected 1 App registration, found ${registered.apps}`);
if (registered.pages !== (appConfig.pages || []).length) failures.push(`expected ${(appConfig.pages || []).length} Page registrations, found ${registered.pages}`);
if (registered.components < 1) failures.push("expected at least 1 Component registration");

const packageBytes = files.reduce((total, file) => total + fs.statSync(file).size, 0);
if (packageBytes > 2 * 1024 * 1024) {
  failures.push(`main package is ${(packageBytes / 1024 / 1024).toFixed(2)} MiB, over the 2 MiB limit`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Structure check passed: ${files.length} files, ${(appConfig.pages || []).length} registered pages, ${(packageBytes / 1024 / 1024).toFixed(2)} MiB.`);
