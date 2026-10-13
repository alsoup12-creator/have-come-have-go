const assert = require("assert");
const path = require("path");
const root = path.resolve(__dirname, "../miniprogram");
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const OriginalDate = global.Date;
global.Date = class extends OriginalDate {
  constructor(...args) { super(...(args.length ? args : [2026, 0, 5, 12])); }
};
let stored, definition, clipboard, quota, writes, failWrite, failCopy, copyCount, afterCopy;
let notices, removed, files, leavingAlert;
global.wx = {
  env: { USER_DATA_PATH: "wxfile://usr" },
  getStorageSync: () => clone(stored),
  setStorageSync: (_, value) => {
    writes += 1;
    if (quota || writes === failWrite) throw Error("storage limit exceeded");
    stored = clone(value);
  },
  setNavigationBarTitle() {}, showLoading() {}, hideLoading() {},
  showToast: options => notices.push(options.title),
  showModal: options => options.success?.({ confirm: true }),
  navigateBack() {}, switchTab() {},
  enableAlertBeforeUnload() { leavingAlert = true; },
  disableAlertBeforeUnload() { leavingAlert = false; },
  setClipboardData: options => { clipboard = options.data; options.success?.(); },
  chooseMedia: options => options.success({ tempFiles: [{ tempFilePath: "one.png" }, { tempFilePath: "two.png" }] }),
  getFileSystemManager: () => ({
    copyFile(options) {
      copyCount += 1;
      files.add(options.destPath);
      if (copyCount === failCopy) options.fail({ errMsg: "copyFile:fail storage limit exceeded" });
      else { afterCopy?.(copyCount); options.success(); }
    },
    unlinkSync(file) { removed.push(file); files.delete(file); }
  })
};
global.Page = value => { definition = value; };
const store = require(path.join(root, "utils/store"));
const media = require(path.join(root, "utils/media"));
const ui = require(path.join(root, "utils/ui"));
function page(name) {
  const file = path.join(root, "pages", name, "index.js");
  delete require.cache[require.resolve(file)];
  require(file);
  return { ...definition, data: clone(definition.data), setData(patch, cb) { Object.assign(this.data, patch); cb?.(); } };
}
function seed() {
  quota = false; writes = 0; failWrite = -1; failCopy = -1; copyCount = 0; afterCopy = null;
  notices = []; removed = []; clipboard = undefined; files = new Set(["wxfile://usr/original.png"]);
  leavingAlert = false;
  ui.takeRecordsReminder();
  let data = store.upsertRelationship(store.emptyData(), { id: "rel", name: "测试关系", type: "friend" });
  data = store.upsertRecord(data, { id: "rec", relationshipId: "rel", title: "测试款项", category: "loan", amount: 15000, date: store.today(), materials: ["wxfile://usr/original.png"] });
  store.updateClarifyState(data, { selectedIds: ["rec"], relationshipId: "rel" });
  writes = 0;
}
function composer() { const p = page("clarify-compose"); p.onLoad({ mode: "consult" }); return p; }
const materialEvent = { currentTarget: { dataset: { id: "rec", index: 0 } } };
function remind(home, kind) { home.openReminder({ currentTarget: { dataset: { target: "records", id: kind } } }); }

(async () => {
  seed();
  let p = composer();
  p.inputMessage({ detail: { value: "尚未保存的新说明" } });
  assert.equal(leavingAlert, true);
  const before = clone(stored); quota = true;
  assert.doesNotThrow(() => p.onHide());
  assert.doesNotThrow(() => p.onUnload());
  p.saveDraft();
  assert.equal(p.data.draftSaveFailed, true);
  assert.equal(p.data.consultationMessage, "尚未保存的新说明");
  assert.equal(leavingAlert, true, "failed saving must keep the leave warning");
  assert.deepEqual(stored, before);
  assert(notices.some(text => text.includes("保存失败")));
  assert(!notices.includes("已保存在本机"));
  p.copyContent(); assert(clipboard.includes("尚未保存的新说明"));
  p.togglePreview(); assert.equal(p.data.preview, true);
  assert.equal(p.data.consultationMessage, "尚未保存的新说明");
  quota = false; p.saveDraft();
  assert.equal(p.data.draftSaveFailed, false);
  assert.equal(leavingAlert, false);
  assert.equal(composer().data.consultationMessage, "尚未保存的新说明");
  console.log("PASS failed draft save: lifecycle safe, explicit warning, current text copy, retry recovery");

  seed(); failCopy = 2;
  await assert.rejects(media.chooseAndPersistImages(9, "regression"));
  assert.deepEqual([...files], ["wxfile://usr/original.png"]);
  assert.equal(removed.length, 2, "both successful and partially copied new files rolled back");
  assert(!removed.includes("wxfile://usr/original.png"));
  seed(); const successfulPaths = await media.chooseAndPersistImages(9, "regression");
  assert.equal(successfulPaths.length, 2); assert.equal(removed.length, 0);
  const originalChoose = wx.chooseMedia;
  wx.chooseMedia = options => options.fail({ errMsg: "chooseMedia:fail cancel" });
  assert.deepEqual(await media.chooseAndPersistImages(), []);
  wx.chooseMedia = originalChoose;
  console.log("PASS batch images: partial failure rollback, old image retained, success and cancellation");

  seed(); p = composer(); failWrite = 2;
  await p.addMaterial(materialEvent);
  assert.deepEqual(stored.records[0].materials, ["wxfile://usr/original.png"]);
  assert.deepEqual([...files], ["wxfile://usr/original.png"]);
  assert(notices.includes("图片保存失败，请重试"));
  seed(); p = composer();
  afterCopy = count => { if (count === 2) stored.records = []; };
  await p.addMaterial(materialEvent);
  assert.deepEqual([...files], ["wxfile://usr/original.png"]);
  console.log("PASS uncommitted material rollback on record save failure or missing record");

  seed(); p = composer(); failWrite = 3;
  afterCopy = count => { if (count === 2) p.inputMessage({ detail: { value: "选图期间的新输入" } }); };
  await p.addMaterial(materialEvent);
  assert.equal(stored.records[0].materials.length, 3);
  assert.equal(files.size, 3); assert.equal(removed.length, 0);
  assert.equal(p.data.consultationMessage, "选图期间的新输入");
  assert.equal(p.data.draftSaveFailed, true);
  assert.equal(p.data.materialCount, 3);
  quota = true; p.copyContent(); assert(clipboard.includes("选图期间的新输入"));
  assert(clipboard.includes("3 张"));
  console.log("PASS committed images survive subsequent draft failure and new input stays visible");

  seed(); p = composer(); quota = true;
  p.removeMaterial(materialEvent);
  assert.deepEqual(stored.records[0].materials, ["wxfile://usr/original.png"]);
  assert.equal(removed.length, 0);
  assert(notices.includes("材料移除失败，请重试"));
  console.log("PASS failed material removal leaves old image and record intact");

  seed();
  const data = store.load();
  data.relationships.push({ id: "other", name: "其他关系", type: "friend" });
  data.records = [
    ["today", "2026-01-05", "loan"], ["year", "2026-01-01", "gift"],
    ["boundary", "2025-12-07", "transfer"], ["outside", "2025-12-06", "transfer"],
    ["old", "2024-01-01", "loan"], ["future", "2026-01-06", "gift"]
  ].map(([id, date, category]) => ({ ...data.records[0], id, date, category }));
  data.records.push({ ...data.records[0], id: "other-record", relationshipId: "other" });
  store.save(data);
  const home = page("home"); home.refresh();
  const list = page("records"); list.refresh();
  list.setFilter({ currentTarget: { dataset: { key: "gift" } } });
  list.onYearChange({ detail: { value: list.data.years.findIndex(item => item.key === "2024") } });
  assert.equal(list.data.records.length, 0);
  remind(home, "month"); list.onShow();
  assert.equal(list.data.activeFilter, "all");
  assert.deepEqual(list.data.records.map(item => item.id), ["future", "today", "year"]);
  assert.equal(list.data.reminderLabel, "本月提醒记录");
  remind(home, "year"); list.onShow();
  assert.deepEqual(list.data.records.map(item => item.id), ["future", "today", "year"]);
  assert.equal(list.data.monthIndex, 0);
  remind(home, "count"); list.onShow();
  assert.deepEqual(list.data.records.map(item => item.id), ["today", "year", "boundary"]);
  assert.equal(list.data.reminderLabel, "最近30天付款记录");
  list.clearReminderScope(); assert.equal(list.data.records.length, 6);
  list.setFilter({ currentTarget: { dataset: { key: "gift" } } });
  list.onShow(); assert.equal(list.data.activeFilter, "gift"); assert.equal(list.data.records.length, 2);
  remind(home, "count"); list.onShow();
  list.onYearChange({ detail: { value: list.data.years.findIndex(item => item.key === "2024") } });
  assert.equal(list.data.reminderLabel, ""); assert.deepEqual(list.data.records.map(item => item.id), ["old"]);
  wx.switchTab = options => options.fail?.();
  remind(home, "month"); assert.equal(ui.takeRecordsReminder(), null);
  console.log("PASS reminder navigation: old filters cleared, month/year/30-day bounds, relationship isolation, manual filters and failed navigation");
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { global.Date = OriginalDate; });
