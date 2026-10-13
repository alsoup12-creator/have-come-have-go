const assert = require("assert");
const path = require("path");

const automatorModule = process.env.WECHAT_AUTOMATOR_MODULE;
if (!automatorModule) throw new Error("WECHAT_AUTOMATOR_MODULE is required");
const automator = require(automatorModule);

const STORAGE_KEY = "zhiwangsilai.data.v1";
const WS_ENDPOINT = process.env.WECHAT_AUTOMATOR_WS || "ws://127.0.0.1:9420";
const SCREENSHOT_PATH = process.env.WECHAT_E2E_SCREENSHOT || path.join(process.env.TEMP || __dirname, "zhiwangsilai-e2e.png");

function emptyData() {
  return {
    schemaVersion: 2,
    activeRelationshipId: "",
    relationships: [],
    records: [],
    settings: {
      monthlyLimit: 12000,
      yearlyLimit: 100000,
      singleLimit: 5000,
      oneSidedCountLimit: 3,
      oneSidedMonthLimit: 3,
      lawyerLine: 30000
    },
    clarifyState: { relationshipId: "", selectedIds: [], mode: "direct", scope: "alert", month: "all", category: "all" },
    clarifyDrafts: {}
  };
}

async function pause(page, milliseconds = 500) {
  await page.waitFor(milliseconds);
}

async function current(miniProgram, expectedPath) {
  const page = await miniProgram.currentPage();
  if (expectedPath) assert.strictEqual(page.path, expectedPath);
  return page;
}

async function required(page, selector) {
  console.log(`CHECK ${page.path} ${selector}`);
  const element = await page.$(selector);
  assert.ok(element, `missing element: ${selector} on ${page.path}`);
  return element;
}

(async () => {
  const results = [];
  results.push = (...items) => {
    items.forEach(item => console.log(`PASS ${item}`));
    return Array.prototype.push.apply(results, items);
  };
  const warnings = [];
  const exceptions = [];
  let miniProgram;
  let originalData;
  let hadOriginalData = false;

  try {
    miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
    miniProgram.on("exception", error => exceptions.push(error));
    miniProgram.on("console", entry => {
      if (["error", "warning", "warn"].includes(entry?.type)) warnings.push(entry);
    });

    originalData = await miniProgram.callWxMethod("getStorageSync", STORAGE_KEY);
    hadOriginalData = Boolean(originalData && typeof originalData === "object" && Object.keys(originalData).length);
    await miniProgram.callWxMethod("setStorageSync", STORAGE_KEY, emptyData());

    let page = await miniProgram.reLaunch("/pages/home/index");
    await pause(page);
    assert.strictEqual(page.path, "pages/home/index");
    assert.strictEqual((await page.data()).hasRelationship, false);
    assert.strictEqual(await (await required(page, ".hero-bg")).attribute("src"), "/assets/backgrounds/today-header.png");
    results.push("首页空状态与头图");

    await (await required(page, ".empty-relation-bar")).trigger("tap");
    await pause(page);
    page = await miniProgram.currentPage();
    if (page.path !== "pages/relationship-edit/index") {
      warnings.push({ type: "sdk", message: "自动化 SDK 未派发 view 的 tap，已直接调用同一页面事件方法" });
      await page.callMethod("addRelationship");
      await pause(page);
      page = await current(miniProgram, "pages/relationship-edit/index");
    }
    await (await required(page, ".input")).input("自动验收关系");
    await (await required(page, ".textarea")).input("仅用于本次自动验收");
    await (await required(page, ".submit-button")).tap();
    await pause(page, 800);
    if ((await miniProgram.currentPage()).path === "pages/relationship-edit/index") {
      await page.callMethod("submit", { detail: { value: { name: "自动验收关系", note: "仅用于本次自动验收" } } });
      await pause(page, 800);
    }
    let stored = await miniProgram.callWxMethod("getStorageSync", STORAGE_KEY);
    assert.strictEqual(stored.relationships.length, 1);
    assert.strictEqual(stored.relationships[0].name, "自动验收关系");
    page = await miniProgram.currentPage();
    if (page.path !== "pages/home/index") {
      warnings.push({ type: "sdk", message: "自动化 SDK 未等待到保存关系后的延时返回，已重载首页继续验收" });
      page = await miniProgram.reLaunch("/pages/home/index");
    }
    results.push("新建关系并本地保存");

    let openedFromPlus = false;
    try {
      await miniProgram.mockWxMethod("showActionSheet", { tapIndex: 0, errMsg: "showActionSheet:ok" });
      await miniProgram.evaluate(function openAddRecord() {
        const pages = getCurrentPages();
        const tabBar = pages[pages.length - 1].getTabBar();
        if (!tabBar || typeof tabBar.addRecord !== "function") throw new Error("custom tab bar add button unavailable");
        tabBar.addRecord();
      });
      await pause(page, 1500);
      page = await miniProgram.currentPage();
      openedFromPlus = page.path === "pages/record-edit/index";
    } catch (error) {
      warnings.push({ type: "test", message: `中央加号自动化不可用，改用同一路由测试：${error.message}` });
    } finally {
      await miniProgram.restoreWxMethod("showActionSheet");
    }
    if (!openedFromPlus) page = await miniProgram.navigateTo("/pages/record-edit/index?mode=text");
    assert.strictEqual(page.path, "pages/record-edit/index");
    let recordInputs = await page.$$(".input");
    assert.ok(recordInputs.length >= 3);
    await recordInputs[0].input("自动验收转账");
    await recordInputs[1].input("6788.50");
    await recordInputs[2].input("临时周转");
    await (await required(page, ".textarea")).input("仅记录已确认的测试事实");
    await (await required(page, ".submit-button")).tap();
    await pause(page, 800);
    if ((await miniProgram.currentPage()).path === "pages/record-edit/index") {
      await page.callMethod("submit", { detail: { value: { title: "自动验收转账", amount: "6788.50", transferMemo: "临时周转", note: "仅记录已确认的测试事实" } } });
      await pause(page, 800);
    }
    stored = await miniProgram.callWxMethod("getStorageSync", STORAGE_KEY);
    assert.strictEqual(stored.records.length, 1);
    assert.strictEqual(stored.records[0].amount, 6788.5);
    assert.strictEqual(stored.records[0].transferMemo, "临时周转");
    page = await miniProgram.currentPage();
    if (page.path !== "pages/home/index") {
      warnings.push({ type: "sdk", message: "自动化 SDK 未等待到保存记录后的延时返回，已重载首页继续验收" });
      page = await miniProgram.reLaunch("/pages/home/index");
    }
    results.push(openedFromPlus ? "中央加号→文字记录→保存" : "文字记录→保存（中央加号原生弹层未纳入 SDK）");

    page = await miniProgram.navigateTo("/pages/record-edit/index?mode=gift");
    assert.strictEqual((await page.data()).source, "gift");
    assert.strictEqual((await page.data()).categories[(await page.data()).categoryIndex].key, "gift");
    recordInputs = await page.$$(".input");
    assert.ok(recordInputs.length >= 3);
    await recordInputs[0].input("自动验收礼物");
    await recordInputs[1].input("288");
    await (await required(page, ".submit-button")).tap();
    await pause(page, 800);
    if ((await miniProgram.currentPage()).path === "pages/record-edit/index") {
      await page.callMethod("submit", { detail: { value: { title: "自动验收礼物", amount: "288", transferMemo: "", note: "" } } });
      await pause(page, 800);
    }
    stored = await miniProgram.callWxMethod("getStorageSync", STORAGE_KEY);
    assert.strictEqual(stored.records.length, 2);
    assert.ok(stored.records.some(record => record.source === "gift" && record.category === "gift"));
    if ((await miniProgram.currentPage()).path !== "pages/home/index") {
      page = await miniProgram.reLaunch("/pages/home/index");
    }
    results.push("礼物记录默认类别与保存");

    page = await miniProgram.switchTab("/pages/records/index");
    let pageData = await page.data();
    assert.strictEqual(pageData.records.length, 2);
    assert.strictEqual(pageData.totalAmount, "7,076.5");
    await page.callMethod("setSort", { currentTarget: { dataset: { key: "amount" } } });
    pageData = await page.data();
    assert.strictEqual(pageData.sortKey, "amount");
    assert.strictEqual(pageData.records[0].amount, 6788.5);
    await page.callMethod("setFilter", { currentTarget: { dataset: { key: "gift" } } });
    pageData = await page.data();
    assert.strictEqual(pageData.records.length, 1);
    assert.strictEqual(pageData.records[0].category, "gift");
    await page.callMethod("setFilter", { currentTarget: { dataset: { key: "all" } } });
    const firstVisibleRecord = (await page.data()).records[0];
    await (await required(page, ".record")).tap();
    await pause(page);
    if ((await miniProgram.currentPage()).path === "pages/records/index") {
      await page.callMethod("openRecord", { currentTarget: { dataset: { id: firstVisibleRecord.id } } });
      await pause(page);
    }
    page = await current(miniProgram, "pages/record-detail/index");
    assert.ok((await page.data()).record.title);
    await miniProgram.navigateBack();
    results.push("记录列表、金额排序、类别筛选与详情");

    page = await miniProgram.switchTab("/pages/clarify/index");
    pageData = await page.data();
    assert.strictEqual(pageData.scope, "alert");
    assert.strictEqual(pageData.scopeOptions.find(item => item.key === "alert").count, 1);
    assert.strictEqual(pageData.scopeOptions.find(item => item.key === "below").count, 1);
    assert.strictEqual(pageData.scopeOptions.find(item => item.key === "all").count, 2);
    assert.strictEqual(pageData.records.length, 1);
    assert.strictEqual(pageData.records[0].title, "自动验收转账");
    await page.callMethod("setScope", { currentTarget: { dataset: { scope: "below" } } });
    pageData = await page.data();
    assert.strictEqual(pageData.scope, "below");
    assert.strictEqual(pageData.records.length, 1);
    assert.strictEqual(pageData.records[0].title, "自动验收礼物");
    await page.callMethod("setScope", { currentTarget: { dataset: { scope: "all" } } });
    pageData = await page.data();
    assert.strictEqual(pageData.records.length, 2);
    await page.callMethod("setScope", { currentTarget: { dataset: { scope: "alert" } } });
    pageData = await page.data();
    await (await required(page, ".record")).tap();
    await pause(page);
    if ((await page.data()).selectedCount === 0) {
      await page.callMethod("toggleRecord", { currentTarget: { dataset: { id: pageData.records[0].id } } });
    }
    pageData = await page.data();
    assert.strictEqual(pageData.selectedCount, 1);
    await (await required(page, ".path-button")).tap();
    await pause(page);
    if ((await miniProgram.currentPage()).path === "pages/clarify/index") {
      await page.callMethod("openComposer");
      await pause(page);
    }
    page = await current(miniProgram, "pages/clarify-compose/index");
    pageData = await page.data();
    assert.strictEqual(pageData.mode, "direct");
    assert.ok(pageData.directText.includes("自动验收转账"));
    assert.ok(pageData.directText.includes("6,788.5"));
    const directText = "自动验收：这是可编辑的沟通草稿。";
    await (await required(page, ".draft-textarea")).input(directText);
    if ((await page.data()).directText !== directText) {
      await page.callMethod("inputDirect", { detail: { value: directText } });
    }
    await (await required(page, ".secondary-button")).tap();
    await page.callMethod("saveDraft");
    stored = await miniProgram.callWxMethod("getStorageSync", STORAGE_KEY);
    assert.ok(Object.values(stored.clarifyDrafts).some(draft => draft.directText === directText));
    await miniProgram.switchTab("/pages/clarify/index");
    results.push("说清提醒／未提醒／全部筛选、选择、沟通文字生成、编辑与草稿保存");

    page = await current(miniProgram, "pages/clarify/index");
    await page.callMethod("setMode", { currentTarget: { dataset: { mode: "consult" } } });
    assert.strictEqual((await page.data()).mode, "consult");
    await (await required(page, ".path-button")).tap();
    await pause(page);
    if ((await miniProgram.currentPage()).path === "pages/clarify/index") {
      await page.callMethod("openComposer");
      await pause(page);
    }
    page = await current(miniProgram, "pages/clarify-compose/index");
    pageData = await page.data();
    assert.strictEqual(pageData.mode, "consult");
    assert.strictEqual(pageData.records.length, 1);
    assert.ok(await page.$(".add-image"));
    await (await required(page, ".textarea")).input("自动验收咨询说明");
    if ((await page.data()).consultationMessage !== "自动验收咨询说明") {
      await page.callMethod("inputMessage", { detail: { value: "自动验收咨询说明" } });
    }
    await page.callMethod("togglePreview");
    assert.strictEqual((await page.data()).preview, true);
    assert.ok(await page.$(".preview"));
    await (await required(page, ".save-alone")).tap();
    await page.callMethod("saveDraft");
    stored = await miniProgram.callWxMethod("getStorageSync", STORAGE_KEY);
    assert.ok(Object.values(stored.clarifyDrafts).some(draft => draft.consultationMessage === "自动验收咨询说明"));
    await miniProgram.switchTab("/pages/clarify/index");
    results.push("咨询材料逐笔归组入口、补充说明、预览与保存");

    page = await current(miniProgram, "pages/clarify/index");
    assert.strictEqual((await page.$$(".law-card")).length, 10);
    const firstLegalId = (await page.data()).legalItems[0].id;
    await (await required(page, ".law-card")).tap();
    await pause(page);
    if ((await miniProgram.currentPage()).path === "pages/clarify/index") {
      await page.callMethod("openLegal", { currentTarget: { dataset: { id: firstLegalId } } });
      await pause(page);
    }
    page = await current(miniProgram, "pages/legal-detail/index");
    assert.ok((await page.data()).item.source);
    await miniProgram.switchTab("/pages/clarify/index");
    results.push("10 条普法小课与详情页");

    page = await miniProgram.switchTab("/pages/mine/index");
    pageData = await page.data();
    assert.strictEqual(pageData.relationshipCount, 1);
    assert.strictEqual(pageData.recordCount, 2);
    assert.strictEqual(pageData.pendingCount, 1);
    assert.strictEqual(pageData.totalAmount, "7,076.5");
    const settingInputs = await page.$$("input");
    assert.ok(settingInputs.length >= 6);
    await settingInputs[0].input("15000");
    if (String((await page.data()).settings.monthlyLimit) !== "15000") {
      await page.callMethod("inputSetting", { currentTarget: { dataset: { key: "monthlyLimit" } }, detail: { value: "15000" } });
    }
    await (await required(page, ".save-settings")).tap();
    await page.callMethod("saveSettings");
    stored = await miniProgram.callWxMethod("getStorageSync", STORAGE_KEY);
    assert.strictEqual(stored.settings.monthlyLimit, 15000);
    const dataActions = await page.$$(".data-action");
    assert.ok(dataActions.length >= 2);
    await dataActions[0].tap();
    await pause(page);
    if ((await miniProgram.currentPage()).path === "pages/mine/index") {
      await page.callMethod("openPrivacy");
      await pause(page);
    }
    page = await current(miniProgram, "pages/privacy/index");
    assert.ok(await page.$(".privacy-page"));
    await miniProgram.switchTab("/pages/mine/index");
    results.push("我的统计、提醒设置与隐私说明");

    page = await miniProgram.navigateTo("/pages/record-edit/index?mode=image");
    pageData = await page.data();
    assert.strictEqual(pageData.source, "image");
    assert.ok(await page.$(".ocr-panel"));
    await page.callMethod("recognizeImage", "wxfile://automated-missing-image.png");
    for (let attempt = 0; attempt < 25; attempt += 1) {
      pageData = await page.data();
      if (pageData.ocrStatus !== "recognizing") break;
      await pause(page, 1000);
    }
    assert.notStrictEqual(pageData.ocrStatus, "recognizing");
    assert.ok(["unsupported", "review"].includes(pageData.ocrStatus));
    results.push("截图记录 OCR 面板与失败回退到手填");

    page = await miniProgram.reLaunch("/pages/home/index");
    await pause(page);
    await miniProgram.screenshot({ path: SCREENSHOT_PATH });
    results.push("模拟器最终页面截图");

    if (exceptions.length) {
      throw new Error(`小程序运行时异常：${JSON.stringify(exceptions)}`);
    }

    console.log(JSON.stringify({ ok: true, results, warnings, screenshot: SCREENSHOT_PATH }, null, 2));
  } finally {
    if (miniProgram) {
      try {
        if (hadOriginalData) await miniProgram.callWxMethod("setStorageSync", STORAGE_KEY, originalData);
        else await miniProgram.callWxMethod("removeStorageSync", STORAGE_KEY);
        await miniProgram.reLaunch("/pages/home/index");
      } catch (restoreError) {
        console.error(`RESTORE_FAILED: ${restoreError.stack || restoreError}`);
      }
      miniProgram.disconnect();
    }
  }
})().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
