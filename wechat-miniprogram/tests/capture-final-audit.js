const path = require("path");

const automatorModule = process.env.WECHAT_AUTOMATOR_MODULE;
if (!automatorModule) throw new Error("WECHAT_AUTOMATOR_MODULE is required");
const automator = require(automatorModule);

const STORAGE_KEY = "zhiwangsilai.data.v1";
const WS_ENDPOINT = process.env.WECHAT_AUTOMATOR_WS || "ws://127.0.0.1:9420";
const outputDirectory = process.env.TEMP || __dirname;

async function capture(name, route, prepare) {
  const miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  const originalData = await miniProgram.callWxMethod("getStorageSync", STORAGE_KEY);
  try {
    const page = await miniProgram.reLaunch(route);
    await page.waitFor(500);
    if (prepare) {
      await prepare(page);
      await page.waitFor(250);
    }
    const output = path.join(outputDirectory, `zhiwangsilai-final-${name}.png`);
    await miniProgram.screenshot({ path: output });
    return output;
  } finally {
    await miniProgram.callWxMethod("setStorageSync", STORAGE_KEY, originalData);
    miniProgram.disconnect();
  }
}

(async () => {
  const lookup = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  const data = await lookup.callWxMethod("getStorageSync", STORAGE_KEY);
  lookup.disconnect();
  const recordId = data?.records?.[0]?.id;
  const relationshipId = data?.relationships?.[0]?.id;
  const targets = [
    ["home", "/pages/home/index"],
    ["records", "/pages/records/index"],
    ["clarify-alert", "/pages/clarify/index"],
    ["clarify-all", "/pages/clarify/index", page => page.callMethod("setScope", { currentTarget: { dataset: { scope: "all" } } })],
    ["mine", "/pages/mine/index"],
    ["privacy", "/pages/privacy/index"],
    ["legal-detail", "/pages/legal-detail/index?id=loan-delivery"]
  ];
  if (recordId) {
    targets.splice(2, 0, ["record-detail", `/pages/record-detail/index?id=${recordId}`]);
    targets.push(["record-edit", `/pages/record-edit/index?id=${recordId}`]);
  }
  if (relationshipId) targets.push(["relationship-edit", `/pages/relationship-edit/index?id=${relationshipId}`]);

  const screenshots = {};
  for (const [name, route, prepare] of targets) {
    screenshots[name] = await capture(name, route, prepare);
  }
  console.log(JSON.stringify(screenshots, null, 2));
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
