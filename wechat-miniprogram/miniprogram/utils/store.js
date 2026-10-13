const STORAGE_KEY = "zhiwangsilai.data.v1";
const SCHEMA_VERSION = 2;

const DEFAULT_SETTINGS = {
  monthlyLimit: 12000,
  yearlyLimit: 100000,
  singleLimit: 5000,
  oneSidedCountLimit: 3,
  oneSidedMonthLimit: 3,
  lawyerLine: 30000
};

function uid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function today() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function emptyData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeRelationshipId: "",
    relationships: [],
    records: [],
    settings: { ...DEFAULT_SETTINGS },
    clarifyState: {
      relationshipId: "",
      selectedIds: [],
      mode: "direct",
      scope: "alert",
      month: "all",
      category: "all"
    },
    clarifyDrafts: {}
  };
}

function normalize(input) {
  const data = input && typeof input === "object" ? input : emptyData();
  data.schemaVersion = SCHEMA_VERSION;
  data.relationships = Array.isArray(data.relationships) ? data.relationships : [];
  data.records = Array.isArray(data.records) ? data.records : [];
  data.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  data.clarifyState = {
    relationshipId: "",
    selectedIds: [],
    mode: "direct",
    scope: "alert",
    month: "all",
    category: "all",
    ...(data.clarifyState || {})
  };
  data.clarifyState.selectedIds = Array.isArray(data.clarifyState.selectedIds)
    ? data.clarifyState.selectedIds
    : [];
  data.clarifyDrafts = data.clarifyDrafts && typeof data.clarifyDrafts === "object"
    ? data.clarifyDrafts
    : {};
  if (!data.relationships.some(item => item.id === data.activeRelationshipId)) {
    data.activeRelationshipId = data.relationships[0]?.id || "";
  }
  data.records = data.records
    .filter(item => data.relationships.some(relation => relation.id === item.relationshipId))
    .map(item => ({
      ...item,
      payer: item.payer || "me",
      nature: item.nature || "支出记录",
      feeling: item.feeling || "neutral",
      source: item.source || (item.image ? "image" : "text"),
      image: item.image || "",
      materials: Array.isArray(item.materials) ? item.materials.filter(Boolean) : []
    }));
  const recordIds = new Set(data.records.map(item => item.id));
  data.clarifyState.selectedIds = data.clarifyState.selectedIds.filter(id => recordIds.has(id));
  return data;
}

function load() {
  try {
    return normalize(wx.getStorageSync(STORAGE_KEY));
  } catch (_) {
    return emptyData();
  }
}

function save(data) {
  const normalized = normalize(data);
  wx.setStorageSync(STORAGE_KEY, normalized);
  return normalized;
}

function relationshipById(data, id) {
  return data.relationships.find(item => item.id === id) || null;
}

function activeRelationship(data) {
  return relationshipById(data, data.activeRelationshipId);
}

function recordsForRelationship(data, relationshipId) {
  return data.records.filter(item => item.relationshipId === relationshipId);
}

function sum(records) {
  return records.reduce((total, item) => total + Number(item.amount || 0), 0);
}

function money(value) {
  const number = Number(value || 0);
  return number.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

// Unknown times follow known times on the same date, in either direction.
function compareRecordTime(a, b, direction = -1) {
  const dateOrder = String(a.date || "").localeCompare(String(b.date || ""));
  if (dateOrder) return dateOrder * direction;
  const timeA = /^\d{2}:\d{2}$/.test(a.time || "") ? a.time : "";
  const timeB = /^\d{2}:\d{2}$/.test(b.time || "") ? b.time : "";
  if (Boolean(timeA) !== Boolean(timeB)) return timeA ? -1 : 1;
  return (timeA.localeCompare(timeB) || Number(a.createdAt || 0) - Number(b.createdAt || 0) || String(a.id).localeCompare(String(b.id))) * direction;
}

function categoryLabel(category) {
  return ({
    dining: "餐饮",
    gift: "礼物",
    transfer: "转账",
    travel: "出行住宿",
    loan: "借贷",
    other: "其他"
  })[category] || "其他";
}

function relationshipTypeLabel(type) {
  return ({
    friend: "朋友",
    dating: "约会",
    matchmaking: "相亲",
    ambiguous: "暧昧",
    lover: "恋人",
    spouse: "夫妻",
    other: "其他"
  })[type] || "其他";
}

function upsertRelationship(data, value) {
  const next = normalize(data);
  const relationship = {
    id: value.id || uid(),
    name: String(value.name || "").trim(),
    type: value.type || "other",
    startDate: value.startDate || "",
    note: String(value.note || "").trim(),
    updatedAt: Date.now()
  };
  const index = next.relationships.findIndex(item => item.id === relationship.id);
  if (index >= 0) next.relationships[index] = relationship;
  else next.relationships.push(relationship);
  if (!next.activeRelationshipId) next.activeRelationshipId = relationship.id;
  return save(next);
}

function upsertRecord(data, value) {
  const next = normalize(data);
  const record = {
    id: value.id || uid(),
    relationshipId: value.relationshipId,
    date: value.date || today(),
    time: String(value.time || "").trim(),
    title: String(value.title || "").trim(),
    category: value.category || "other",
    amount: Number(value.amount || 0),
    transferMemo: String(value.transferMemo || "").trim(),
    note: String(value.note || "").trim(),
    dueDate: value.dueDate || "",
    interestMode: value.interestMode || "unspecified",
    interestDetail: String(value.interestDetail || "").trim(),
    payer: value.payer || "me",
    nature: value.nature || "支出记录",
    feeling: value.feeling || "neutral",
    source: value.source || (value.image ? "image" : "text"),
    image: value.image || "",
    materials: Array.isArray(value.materials) ? value.materials.filter(Boolean) : [],
    createdAt: Number(value.createdAt || Date.now()),
    updatedAt: Date.now()
  };
  const index = next.records.findIndex(item => item.id === record.id);
  if (index >= 0) next.records[index] = record;
  else next.records.push(record);
  next.activeRelationshipId = record.relationshipId;
  return save(next);
}

function removeRecord(data, id) {
  const next = normalize(data);
  next.records = next.records.filter(item => item.id !== id);
  next.clarifyState.selectedIds = next.clarifyState.selectedIds.filter(recordId => recordId !== id);
  Object.keys(next.clarifyDrafts).forEach(key => {
    if (key.split("|").includes(id)) delete next.clarifyDrafts[key];
  });
  return save(next);
}

function removeRelationship(data, id) {
  const next = normalize(data);
  const removedIds = new Set(next.records.filter(item => item.relationshipId === id).map(item => item.id));
  next.relationships = next.relationships.filter(item => item.id !== id);
  next.records = next.records.filter(item => item.relationshipId !== id);
  next.clarifyState.selectedIds = next.clarifyState.selectedIds.filter(recordId => !removedIds.has(recordId));
  if (next.clarifyState.relationshipId === id) next.clarifyState.relationshipId = "";
  Object.keys(next.clarifyDrafts).forEach(key => {
    if (key.split("|").some(recordId => removedIds.has(recordId))) delete next.clarifyDrafts[key];
  });
  if (next.activeRelationshipId === id) next.activeRelationshipId = next.relationships[0]?.id || "";
  return save(next);
}

function clear() {
  const data = emptyData();
  wx.setStorageSync(STORAGE_KEY, data);
  return data;
}

function recordMaterials(record) {
  return [...new Set([record?.image, ...(record?.materials || [])].filter(Boolean))];
}

function clarifyContextKey(recordIds) {
  return [...recordIds].sort().join("|");
}

function updateClarifyState(data, value) {
  const next = normalize(data);
  next.clarifyState = { ...next.clarifyState, ...(value || {}) };
  return save(next);
}

function saveClarifyDraft(data, contextKey, value) {
  const next = normalize(data);
  next.clarifyDrafts[contextKey] = {
    ...(next.clarifyDrafts[contextKey] || {}),
    ...(value || {}),
    updatedAt: Date.now()
  };
  return save(next);
}

module.exports = {
  STORAGE_KEY,
  activeRelationship,
  categoryLabel,
  clarifyContextKey,
  compareRecordTime,
  clear,
  emptyData,
  load,
  money,
  normalize,
  recordsForRelationship,
  relationshipById,
  relationshipTypeLabel,
  recordMaterials,
  removeRecord,
  removeRelationship,
  save,
  saveClarifyDraft,
  sum,
  today,
  uid,
  updateClarifyState,
  upsertRecord,
  upsertRelationship
};
