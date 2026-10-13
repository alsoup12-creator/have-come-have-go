const assert = require("assert");
const path = require("path");
const root = path.resolve(__dirname, "../miniprogram");
let stored, definition, clipboard, failSave = false, confirm = true;
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const removed = [];
global.wx = {
  env: { USER_DATA_PATH: "wxfile://usr" },
  getStorageSync: () => clone(stored),
  setStorageSync: (_, value) => { if (failSave) throw Error("disk full"); stored = clone(value); },
  setNavigationBarTitle() {}, showToast() {}, showLoading() {}, hideLoading() {},
  showModal: options => options.success?.({ confirm }),
  setClipboardData: options => { clipboard = options.data; },
  switchTab() {}, navigateBack() {},
  getFileSystemManager: () => ({ unlinkSync: file => removed.push(file) })
};
global.Page = value => { definition = value; };
const store = require(path.join(root, "utils/store"));
const media = require(path.join(root, "utils/media"));
const originalTimeout = global.setTimeout;
global.setTimeout = () => 0;

function page(name) {
  const file = path.join(root, "pages", name, "index.js");
  delete require.cache[require.resolve(file)];
  require(file);
  return { ...definition, data: clone(definition.data), setData(patch, callback) { Object.assign(this.data, patch); callback?.(); } };
}
function seed() {
  clipboard = undefined;
  failSave = false;
  confirm = true;
  let data = store.upsertRelationship(store.emptyData(), { id: "rel", name: "测试关系", type: "friend" });
  data = store.upsertRecord(data, {
    id: "rec", relationshipId: "rel", date: store.today(), time: "10:00", title: "周转", amount: 100,
    category: "loan", dueDate: "2026-12-31", interestMode: "yes", interestDetail: "年利率3%",
    materials: ["wxfile://usr/test.png"]
  });
  store.updateClarifyState(data, { relationshipId: "rel", selectedIds: ["rec"] });
}
function composer(mode = "direct") { const p = page("clarify-compose"); p.onLoad({ mode }); return p; }
function changeRecord(patch) { const data = store.load(); store.upsertRecord(data, { ...data.records[0], ...patch }); }
const event = (id, index) => ({ currentTarget: { dataset: { id, index } } });

(async () => {
  seed();
  let p = composer();
  p.inputDirect({ detail: { value: "我的手改内容：100元" } });
  p.persistDraft();
  changeRecord({ amount: 200 });
  p = composer();
  assert.equal(p.data.totalAmount, "200");
  assert.equal(p.data.directText, "我的手改内容：100元");
  assert.equal(p.data.draftStale, true);
  p.copyContent();
  assert.equal(clipboard, undefined);
  p.persistDraft();
  assert.equal(composer().data.draftStale, true, "saving must not silently approve stale facts");
  confirm = false;
  p.regenerateDraft();
  assert.equal(p.data.directText, "我的手改内容：100元");
  confirm = true;
  p.regenerateDraft();
  assert(p.data.directText.includes("200"));
  assert.equal(p.data.draftStale, false);
  p.copyContent();
  assert(clipboard.includes("200"));
  changeRecord({ title: "修改后的事项" });
  p = composer();
  p.inputDirect({ detail: { value: "我已手动核对新事项和200元" } });
  p.confirmDraftReviewed();
  p.copyContent();
  assert.equal(clipboard, "我已手动核对新事项和200元");
  assert.equal(composer().data.draftStale, false);
  store.upsertRelationship(store.load(), { id: "rel", name: "改名后的关系", type: "lover" });
  assert.equal(composer().data.draftStale, true);
  console.log("PASS draft fact changes, preserved edits, blocked copy, regenerate and manual review");

  seed();
  store.saveClarifyDraft(store.load(), "rec", { directText: "旧版草稿" });
  assert.equal(composer().data.draftStale, true);
  seed();
  p = composer(); p.inputDirect({ detail: { value: "" } }); p.persistDraft();
  assert.equal(composer().data.directText, "", "an intentionally empty draft must stay empty");
  console.log("PASS legacy drafts require review; empty drafts remain empty");

  seed();
  p = composer("consult");
  p.inputMessage({ detail: { value: "刚填写尚未保存的说明" } });
  p.removeMaterial(event("rec", 0));
  assert.equal(p.data.consultationMessage, "刚填写尚未保存的说明");
  assert.equal(p.data.materialCount, 0);
  media.chooseAndPersistImages = async () => ["wxfile://usr/new.png"];
  p.inputMessage({ detail: { value: "添加图片前的新说明" } });
  await p.addMaterial(event("rec"));
  assert.equal(p.data.consultationMessage, "添加图片前的新说明");
  assert.equal(p.data.materialCount, 1);
  p.copyContent();
  assert(clipboard.includes("2026-12-31"));
  assert(clipboard.includes("有利息 · 年利率3%"));
  assert(clipboard.includes("添加图片前的新说明"));
  changeRecord({ interestMode: "no" }); p.refresh(); p.copyContent();
  assert(clipboard.includes("利息约定：无利息"));
  assert(!clipboard.includes("年利率3%"));
  console.log("PASS material add/remove preserves input; consultation exports loan terms");

  for (const name of ["record-edit", "relationship-edit"]) {
    seed();
    p = page(name); p.onLoad({});
    const submitEvent = { detail: { value: { title: "新增款项", amount: "150", name: "新增关系" } } };
    const key = name === "record-edit" ? "records" : "relationships";
    const initialCount = stored[key].length;
    failSave = true;
    p.submit(submitEvent);
    assert.equal(p.data.submitting, false, "failed save allows retry");
    assert.equal(stored[key].length, initialCount);
    failSave = false;
    p.submit(submitEvent); p.submit(submitEvent);
    assert.equal(stored[key].length, initialCount + 1);
    assert.equal(p.data.submitting, true);
  }
  console.log("PASS record and relationship double submit blocked; failed saves can retry");

  seed();
  let data = store.load();
  data.records = Array.from({ length: 10 }, (_, i) => ({ ...data.records[0], id: `r${i}`, amount: 3000 }));
  data.clarifyState = { relationshipId: "rel", scope: "below", month: "1999-01", category: "gift", selectedIds: ["r0"], mode: "direct" };
  store.save(data);
  const home = page("home"); home.refresh();
  assert(home.data.reminders.some(item => item.id === "material"));
  home.openReminder({ currentTarget: { dataset: { target: "clarify", id: "material" } } });
  let clarify = page("clarify"); clarify.refresh();
  assert.equal(clarify.data.records.length, 10);
  assert.equal(clarify.data.scope, "all");
  assert.equal(clarify.data.mode, "consult");
  assert.equal(clarify.data.selectedCount, 0);
  data = store.load(); data.records[0].amount = 6000; store.save(data);
  home.openReminder({ currentTarget: { dataset: { target: "clarify", id: "pending" } } });
  clarify.refresh();
  assert.equal(clarify.data.records.length, 1);
  assert.equal(clarify.data.scope, "alert");
  console.log("PASS cumulative and single reminders reset stale filters and open correct scopes");

  seed(); data = store.load();
  data.records = [
    { ...data.records[0], id: "late", time: "10:00", createdAt: 1 },
    { ...data.records[0], id: "early", time: "09:00", createdAt: 2 },
    { ...data.records[0], id: "unknown", time: "", createdAt: 3 }
  ];
  data.clarifyState.selectedIds = data.records.map(item => item.id);
  store.save(data);
  const records = page("records"); records.refresh();
  assert.deepEqual(records.data.records.map(item => item.id), ["late", "early", "unknown"]);
  records.setSort({ currentTarget: { dataset: { key: "time" } } });
  assert.deepEqual(records.data.records.map(item => item.id), ["early", "late", "unknown"]);
  home.refresh();
  assert.equal(home.data.latestRecords[0].id, "late");
  assert.deepEqual(composer().data.records.map(item => item.id), ["early", "late", "unknown"]);
  console.log("PASS actual time sorting across list, home and consultation; unknown times last");
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { global.setTimeout = originalTimeout; });
