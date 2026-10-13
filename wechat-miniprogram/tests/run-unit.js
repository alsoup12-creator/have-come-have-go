const assert = require("assert");
const path = require("path");

const storage = new Map();
const removedFiles = [];
global.wx = {
  env: { USER_DATA_PATH: "wxfile://usr" },
  getStorageSync(key) { return storage.get(key); },
  setStorageSync(key, value) { storage.set(key, JSON.parse(JSON.stringify(value))); },
  getFileSystemManager() { return { unlinkSync(file) { removedFiles.push(file); } }; }
};

const store = require(path.resolve(__dirname, "..", "miniprogram", "utils", "store"));
const media = require(path.resolve(__dirname, "..", "miniprogram", "utils", "media"));
const ocr = require(path.resolve(__dirname, "..", "miniprogram", "utils", "ocr"));
const legal = require(path.resolve(__dirname, "..", "miniprogram", "utils", "legal"));

let data = store.emptyData();
assert.strictEqual(data.schemaVersion, 2);
assert.strictEqual(data.clarifyState.scope, "alert");
assert.deepStrictEqual(data.relationships, []);
assert.deepStrictEqual(data.records, []);

data = store.upsertRelationship(data, { name: "自动验收关系", type: "friend", note: "仅用于测试" });
assert.strictEqual(data.relationships.length, 1);
assert.strictEqual(data.activeRelationshipId, data.relationships[0].id);

const relationshipId = data.activeRelationshipId;
data = store.upsertRecord(data, {
  relationshipId,
  date: "2026-09-20",
  time: "14:35",
  title: "测试转账",
  amount: 6788.5,
  category: "transfer",
  transferMemo: "临时周转",
  note: "测试事实",
  source: "image",
  image: "wxfile://first.png",
  materials: ["wxfile://first.png", "wxfile://second.png", "wxfile://second.png"]
});

assert.strictEqual(data.records.length, 1);
assert.strictEqual(store.sum(data.records), 6788.5);
assert.strictEqual(store.money(6788.5), "6,788.5");
assert.deepStrictEqual(store.recordMaterials(data.records[0]), ["wxfile://first.png", "wxfile://second.png"]);

data = store.updateClarifyState(data, { relationshipId, selectedIds: [data.records[0].id], mode: "consult" });
const contextKey = store.clarifyContextKey(data.clarifyState.selectedIds);
data = store.saveClarifyDraft(data, contextKey, { consultationMessage: "请核对事实" });
assert.strictEqual(data.clarifyDrafts[contextKey].consultationMessage, "请核对事实");

const normalized = store.normalize({ relationships: data.relationships, records: [{ id: "orphan", relationshipId: "missing" }] });
assert.deepStrictEqual(normalized.records, []);

const parsed = ocr.extractFields([
  "微信支付",
  "商户名称：示例商店",
  "实际支付 ￥6,788.50",
  "优惠 200.00",
  "交易时间 2026年9月20日 14:35:18",
  "交易单号 202609201435180001"
].join("\n"), "2026-09-22");
assert.deepStrictEqual(parsed, { amount: "6788.5", date: "2026-09-20", time: "14:35", title: "示例商店", amounts: ["6788.5"] });
assert.strictEqual(ocr.extractFields("付款金额：1234.56", "2026-09-24").amount, "1234.56");
assert.strictEqual(ocr.extractFields("付款金额\n123.45", "2026-09-24").amount, "123.45");
assert.strictEqual(ocr.extractFields("收款方\n张三", "2026-09-24").title, "张三");
assert.strictEqual(ocr.extractFields("余额\n￥999.00\n付款金额\n123.45", "2026-09-24").amount, "123.45");
const ambiguous = ocr.extractFields("付款金额 100.00\n转账金额 200.00", "2026-09-24");
assert.strictEqual(ambiguous.amount, "");
assert.deepStrictEqual(ambiguous.amounts, ["100", "200"]);
assert.strictEqual(ocr.extractFields("交易单号 1234567890123456789", "2026-09-24").amount, "");

const fullWidth = ocr.extractFields("付款金额：￥１２３．４５\n付款时间：2026／09／21 08：06", "2026-09-22");
assert.strictEqual(fullWidth.amount, "123.45");
assert.strictEqual(fullWidth.date, "2026-09-21");
assert.strictEqual(fullWidth.time, "08:06");

const future = ocr.extractFields("支付金额 88.00\n支付时间 2027-01-01 10:30", "2026-09-22");
assert.strictEqual(future.date, "");
assert.strictEqual(future.amount, "88");

assert.strictEqual(legal.ITEMS.length, 10);
assert.ok(legal.ITEMS.every(item => item.id && item.title && item.summary && item.source));

data = store.removeRecord(data, data.records[0].id);
assert.deepStrictEqual(data.records, []);
assert.deepStrictEqual(data.clarifyState.selectedIds, []);
assert.deepStrictEqual(data.clarifyDrafts, {});

data = store.upsertRecord(data, {
  relationshipId,
  date: "2026-09-21",
  title: "删除关系测试",
  amount: 100,
  category: "transfer"
});
data = store.updateClarifyState(data, { relationshipId, selectedIds: [data.records[0].id] });
data = store.saveClarifyDraft(data, store.clarifyContextKey(data.clarifyState.selectedIds), { directText: "待删除草稿" });
data = store.removeRelationship(data, relationshipId);
assert.deepStrictEqual(data.relationships, []);
assert.deepStrictEqual(data.records, []);
assert.deepStrictEqual(data.clarifyState.selectedIds, []);
assert.strictEqual(data.clarifyState.relationshipId, "");
assert.deepStrictEqual(data.clarifyDrafts, {});

media.removeLocalFiles(["wxfile://usr/one.png", "wxfile://usr/one.png", "https://example.com/not-local.png"]);
assert.deepStrictEqual(removedFiles, ["wxfile://usr/one.png"]);

console.log("Unit checks passed: storage CRUD, draft cleanup, local-file cleanup, normalization, material de-duplication, OCR parsing.");
