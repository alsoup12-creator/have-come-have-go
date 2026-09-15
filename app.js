const STORAGE_KEY = "youjieyouhuan.prototype.v1";
const LANGUAGE_KEY = "youjieyouhuan.prototype.language";

const state = {
  page: "home",
  filter: "all",
  perspective: "self",
  relationshipScope: "all",
  clarifySelected: [],
  clarifyMode: "direct",
  clarifyCategory: "all",
  clarifyMonth: "all",
  language: localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "zh",
  data: loadData(),
  draft: null,
  addStep: 1,
  entryMode: "text"
};

const pageMeta = {
  zh: {
    home: ["今天，也照顾好自己", "今天"], records: ["钱留下的轨迹", "全部记录"],
    clarify: ["该说清的钱", "款项管理"], me: ["只关于你自己", "设置与觉察"]
  },
  en: {
    home: ["Take care of yourself today", "Today"], records: ["Where the money went", "All records"],
    clarify: ["Money worth clarifying", "Money matters"], me: ["This is about you", "Settings & patterns"]
  }
};

const legalKnowledge = [
  {
    id: "loan-delivery", kindZh: "借款", kindEn: "Loans",
    titleZh: "自然人之间借款，通常从实际交付借款时成立",
    titleEn: "A private loan generally forms when the money is actually delivered",
    summaryZh: "《民法典》第667条界定借款合同，第679条规定自然人之间的借款合同，自贷款人提供借款时成立。",
    summaryEn: "Civil Code Articles 667 and 679 define a loan and provide that a loan between natural persons forms when the lender provides the funds.",
    sourceZh: "《中华人民共和国民法典》第667条、第679条",
    sourceEn: "PRC Civil Code, Articles 667 and 679",
    url: "https://www.court.gov.cn/zixun/xiangqing/233181.html"
  },
  {
    id: "transfer-not-enough", kindZh: "证据", kindEn: "Evidence",
    titleZh: "只有转账凭证，不当然等于已经证明借款",
    titleEn: "A transfer record alone does not automatically prove a loan",
    summaryZh: "民间借贷司法解释要求结合借据等债权凭证和其他证据；仅有转账时，仍可能围绕转账原因、双方关系和上下文发生争议。",
    summaryEn: "The private-lending judicial interpretation calls for debt instruments and other evidence. With only a transfer record, the reason, relationship, and context may still be disputed.",
    sourceZh: "最高人民法院民间借贷司法解释第2条、第16条",
    sourceEn: "SPC Provisions on Private Lending, Articles 2 and 16",
    url: "https://gongbao.court.gov.cn/Details/94b6623974526df7d2430a3c73f050.html"
  },
  {
    id: "electronic-evidence", kindZh: "电子证据", kindEn: "Digital evidence",
    titleZh: "聊天、短信、交易记录、录音和图片都可能进入证据范围",
    titleEn: "Chats, texts, transaction records, audio, and images may all be evidence",
    summaryZh: "民事证据规定列举了手机短信、即时通信、电子交易记录、通信记录、图片、音频等电子数据，并强调提交原件或可视为原件的载体。",
    summaryEn: "The civil-evidence provisions include texts, instant messages, electronic transaction and communication records, images, and audio, and emphasize preserving original data or qualifying copies.",
    sourceZh: "最高人民法院民事诉讼证据规定第14条、第15条",
    sourceEn: "SPC Provisions on Civil Evidence, Articles 14 and 15",
    url: "https://www.court.gov.cn/zixun/xiangqing/212721.html"
  },
  {
    id: "gift", kindZh: "赠与", kindEn: "Gifts",
    titleZh: "赠与的核心，是无偿给予并由对方接受",
    titleEn: "A gift centers on a voluntary, uncompensated transfer accepted by the recipient",
    summaryZh: "《民法典》第657条规定，赠与合同是赠与人将自己的财产无偿给予受赠人，受赠人表示接受赠与的合同。",
    summaryEn: "Civil Code Article 657 defines a gift as a voluntary transfer of property without compensation, accepted by the recipient.",
    sourceZh: "《中华人民共和国民法典》第657条",
    sourceEn: "PRC Civil Code, Article 657",
    url: "https://www.court.gov.cn/zixun/xiangqing/233181.html"
  }
];

function en() { return state.language === "en"; }
function text(zh, english) { return en() ? english : zh; }

function displayRelationName(relation) {
  return en() && relation.id === "demo-relation" && relation.name === "她" ? "Her" : relation.name;
}

function displayRecordTitle(record) {
  if (!en()) return record.title;
  return ({
    "一起吃晚餐": "Dinner together", "周末出行车票": "Weekend train tickets",
    "送给对方的手机": "Phone as a gift", "临时周转转账": "Short-term transfer",
    "对方请的电影": "Movie paid by them", "双人晚餐": "Dinner for two"
  })[record.title] || record.title;
}

function applyStaticLocale() {
  const content = en() ? {
    name: "Give & Take", tagline: "A private relationship spending journal",
    headline: "Love can be emotional.<br>Money deserves clarity.",
    intro: "An English interface for cross-border relationships, grounded in PRC law. Keep the facts, notice long-term patterns, and clarify important money when you are ready.",
    points: ["Record meaningful relationship spending", "Add a note, screenshot, receipt, or gift", "Receive calm, factual reminders"],
    local: "Prototype data stays in this browser", nav: ["Today", "Records", "Clarify", "Me"], privacy: "Privacy", add: "Choose how to record"
  } : {
    name: "有来有往", tagline: "关系支出自我觉察工具", headline: "爱可以感性，<br>钱最好清醒。",
    intro: "这不是共同账本。它只帮助你留下事实、看清长期的付出，并把重要的钱及时说清楚。",
    points: ["记录一笔关系支出", "留文字、截图、小票或礼物", "得到克制而明确的提醒"],
    local: "初版数据仅保存在当前浏览器中", nav: ["今天", "记录", "说清", "我的"], privacy: "隐私说明", add: "选择记录方式"
  };
  const relation = scopedRelationship();
  if (!relation) {
    content.headline = text("每段关系都不同，<br>自己的付出要看得见。", "Every relationship differs.<br>Your effort should still be visible.");
  } else if (relation.type === "friend") {
    content.headline = text("情分可以深，<br>往来要清醒。", "Friendship can run deep.<br>Keep the dealings clear.");
  } else if (["dating", "matchmaking", "ambiguous"].includes(relation.type)) {
    content.headline = text("关系可以慢慢走，<br>付出要看得见。", "Let the relationship unfold.<br>Keep your effort visible.");
  } else if (relation.type === "spouse") {
    content.headline = text("日子一起过，<br>承担要看得见。", "Build a life together.<br>Keep responsibility visible.");
  }
  document.documentElement.lang = en() ? "en" : "zh-CN";
  document.title = en() ? "Give & Take · Prototype" : "有来有往 · 初版原型";
  document.getElementById("brandName").textContent = content.name;
  document.querySelector(".brand-mark").textContent = en() ? "G" : "有";
  document.getElementById("brandTagline").textContent = content.tagline;
  document.getElementById("brandHeadline").innerHTML = content.headline;
  document.getElementById("brandIntro").textContent = content.intro;
  ["pointOne", "pointTwo", "pointThree"].forEach((id, i) => document.getElementById(id).textContent = content.points[i]);
  document.getElementById("localOnlyNote").textContent = content.local;
  ["home", "records", "clarify", "me"].forEach((key, i) => document.querySelector(`[data-nav-label="${key}"]`).textContent = content.nav[i]);
  const languageButton = document.querySelector('[data-action="toggle-language"]');
  languageButton.textContent = en() ? "中文" : "EN";
  const privacyButton = document.querySelector('[data-action="show-privacy"]');
  privacyButton.textContent = en() ? "P" : "私";
  privacyButton.setAttribute("aria-label", content.privacy);
  document.querySelector('[data-action="open-entry-menu"]').setAttribute("aria-label", content.add);
  document.querySelector(".phone-frame").setAttribute("aria-label", en() ? "Give & Take prototype" : "有来有往原型");
  document.querySelector(".bottom-nav").setAttribute("aria-label", en() ? "Main navigation" : "主导航");
}

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultData() {
  const relationId = "demo-relation";
  const friendId = "demo-friend";
  const ambiguousId = "demo-ambiguous";
  return {
    demoVersion: 2,
    settings: { monthlyLimit: 12000, yearlyLimit: 100000, singleLimit: 5000, lawyerLine: 30000, notificationsEnabled: false, inactivityDays: 30, lastInactivityNotices: {} },
    activeRelationshipId: relationId,
    relationships: [
      { id: relationId, name: "她", type: "lover", startDate: offsetDate(-120), note: "演示关系" },
      { id: friendId, name: "老周", type: "friend", startDate: offsetDate(-300), note: "演示关系" },
      { id: ambiguousId, name: "小陈", type: "ambiguous", startDate: offsetDate(-50), note: "演示关系" }
    ],
    records: [
      { id: uid(), relationshipId: relationId, date: offsetDate(-2), title: "一起吃晚餐", category: "dining", transferMemo: "", counterparty: "她", amount: 680, payer: "me", nature: "支出记录", note: "这次一起吃晚餐。", dueDate: "", status: "recorded", image: "", source: "text" },
      { id: uid(), relationshipId: relationId, date: offsetDate(-5), title: "周末出行车票", category: "travel", transferMemo: "", counterparty: "她", amount: 1250, payer: "me", nature: "支出记录", note: "周末出行的车票。", dueDate: "", status: "recorded", image: "", source: "text" },
      { id: uid(), relationshipId: relationId, date: offsetDate(-8), title: "送给对方的手机", category: "gift", transferMemo: "生日礼物", counterparty: "她", amount: 6999, payer: "me", nature: "支出记录", note: "送给她的手机。", dueDate: "", status: "recorded", image: "", source: "gift" },
      { id: uid(), relationshipId: relationId, date: offsetDate(-12), title: "临时周转转账", category: "transfer", transferMemo: "临时周转", counterparty: "她", amount: 20000, payer: "me", nature: "待确认", note: "对方说过以后处理，但没有明确日期。", dueDate: "", status: "pending", image: "", source: "text" },
      { id: uid(), relationshipId: friendId, date: offsetDate(-4), title: "朋友生日礼物", category: "gift", transferMemo: "", counterparty: "老周", amount: 1800, payer: "me", nature: "支出记录", note: "生日送的耳机。", dueDate: "", status: "recorded", image: "", source: "gift" },
      { id: uid(), relationshipId: friendId, date: offsetDate(-11), title: "演出门票", category: "gift", transferMemo: "", counterparty: "老周", amount: 1200, payer: "me", nature: "支出记录", note: "又送了一次票。", dueDate: "", status: "recorded", image: "", source: "gift" },
      { id: uid(), relationshipId: friendId, date: offsetDate(-16), title: "帮忙购买电脑", category: "transfer", transferMemo: "帮买电脑", counterparty: "老周", amount: 8200, payer: "me", nature: "待确认", note: "还没有说是否需要返还。", dueDate: "", status: "pending", image: "", source: "text" },
      { id: uid(), relationshipId: ambiguousId, date: offsetDate(-6), title: "周末晚餐", category: "dining", transferMemo: "", counterparty: "小陈", amount: 980, payer: "me", nature: "支出记录", note: "一起吃饭。", dueDate: "", status: "recorded", image: "", source: "text" }
    ]
  };
}

function emptyData() {
  const relationId = "empty-relation";
  return {
    settings: { monthlyLimit: 12000, yearlyLimit: 100000, singleLimit: 5000, lawyerLine: 30000, notificationsEnabled: false, inactivityDays: 30, lastInactivityNotices: {} },
    activeRelationshipId: relationId,
    relationships: [
      { id: relationId, name: "—", type: "lover", startDate: "", note: "" }
    ],
    records: []
  };
}

function uid() { return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`; }

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return normalizeData(saved ? JSON.parse(saved) : defaultData());
  } catch (_) {
    return normalizeData(defaultData());
  }
}

function normalizeData(data) {
  const legacyDemoTitles = new Set(["一起吃晚餐", "周末出行车票", "送给对方的手机", "临时周转转账", "对方请的电影"]);
  const isUntouchedLegacyDemo = !data.demoVersion
    && data.relationships?.length === 1
    && data.relationships[0]?.note === "演示关系"
    && Array.isArray(data.records)
    && data.records.every(record => legacyDemoTitles.has(record.title));
  if (isUntouchedLegacyDemo) return defaultData();
  data.settings = data.settings || {};
  if (!Object.prototype.hasOwnProperty.call(data.settings, "yearlyLimit")) data.settings.yearlyLimit = 100000;
  if (typeof data.settings.notificationsEnabled !== "boolean") data.settings.notificationsEnabled = false;
  if (!Number(data.settings.inactivityDays)) data.settings.inactivityDays = 30;
  if (!data.settings.lastInactivityNotices || typeof data.settings.lastInactivityNotices !== "object") data.settings.lastInactivityNotices = {};
  if (!Array.isArray(data.relationships) || !data.relationships.length) {
    data.relationships = [{ id: "migrated-relation", name: "她", type: "lover", startDate: "", note: "" }];
  }
  if (!data.activeRelationshipId || !data.relationships.some(r => r.id === data.activeRelationshipId)) data.activeRelationshipId = data.relationships[0].id;
  data.records = Array.isArray(data.records) ? data.records : [];
  data.records.forEach(record => {
    if (!record.relationshipId) record.relationshipId = data.activeRelationshipId;
    if (!record.category) record.category = inferCategory(record);
    if (typeof record.transferMemo !== "string") record.transferMemo = "";
    if (!record.payer) record.payer = "me";
  });
  return data;
}

function inferCategory(record) {
  const text = `${record.title || ""}${record.nature || ""}`;
  if (/转账|周转|借款|代付|垫付/.test(text)) return "transfer";
  if (/礼物|赠与|手机/.test(text)) return "gift";
  if (/车票|出行|酒店|住宿/.test(text)) return "travel";
  if (/吃|餐|饭/.test(text)) return "dining";
  return "daily";
}

function activeRelationship() {
  return state.data.relationships.find(r => r.id === state.data.activeRelationshipId) || state.data.relationships[0];
}

function isRelationshipOverviewPage() {
  return state.page === "clarify" || state.page === "me";
}

function scopedRelationship() {
  if (!isRelationshipOverviewPage()) return activeRelationship();
  if (state.relationshipScope === "all") return null;
  return state.data.relationships.find(r => r.id === state.relationshipScope) || null;
}

function relationshipById(id) {
  return state.data.relationships.find(r => r.id === id) || activeRelationship();
}

function activeRecords() {
  const ownRecords = state.data.records.filter(r => r.payer !== "other");
  if (!isRelationshipOverviewPage()) return ownRecords.filter(r => r.relationshipId === activeRelationship().id);
  if (state.relationshipScope === "all") return ownRecords;
  return ownRecords.filter(r => r.relationshipId === state.relationshipScope);
}

function recordsForRelationship(id) {
  return state.data.records.filter(r => r.relationshipId === id && r.payer !== "other");
}

function relationshipTypeLabel(type) {
  const labels = en()
    ? { friend: "Friend", dating: "Dating", matchmaking: "Introduced date", ambiguous: "Seeing each other", lover: "Partner", spouse: "Spouse" }
    : { friend: "朋友", dating: "约会", matchmaking: "相亲", ambiguous: "暧昧", lover: "恋人", spouse: "夫妻" };
  return labels[type] || text("其他", "Other");
}

function categoryLabel(category) {
  const labels = en()
    ? { dining: "Dining", gift: "Gift", transfer: "Transfer", travel: "Travel & stay", daily: "Everyday", other: "Other" }
    : { dining: "餐饮", gift: "礼物", transfer: "转账", travel: "出行住宿", daily: "日常", other: "其他" };
  return labels[category] || text("其他", "Other");
}

function categoryIcon(category) {
  return (en()
    ? { dining: "D", gift: "G", transfer: "T", travel: "R", daily: "E", other: "+" }
    : { dining: "餐", gift: "礼", transfer: "转", travel: "行", daily: "日", other: "记" })[category] || text("记", "+");
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
}

function money(value) {
  return Number(value || 0).toLocaleString(en() ? "en-US" : "zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function monthRecords() {
  const month = new Date().toISOString().slice(0, 7);
  return activeRecords().filter(r => r.date.startsWith(month));
}

function yearRecords() {
  const year = new Date().toISOString().slice(0, 4);
  return activeRecords().filter(r => r.date.startsWith(year));
}

function myMonthSpend() {
  return monthRecords().reduce((sum, r) => sum + Number(r.amount), 0);
}

function myYearSpend() {
  return yearRecords().reduce((sum, r) => sum + Number(r.amount), 0);
}

function pendingRecords() {
  return activeRecords().filter(r => (r.status === "pending" || r.nature === "借款") && r.status !== "settled");
}

function pendingAmount() {
  return pendingRecords().reduce((sum, r) => sum + Number(r.amount), 0);
}

function consecutiveMine() {
  return activeRecords().filter(record => {
    const elapsed = daysSince(record.date);
    return elapsed !== null && elapsed <= 30;
  }).length;
}

function regretAmount() {
  return monthRecords().filter(r => ["regret", "uneasy"].includes(r.feeling)).reduce((sum, r) => sum + Number(r.amount), 0);
}

function daysSince(date) {
  if (!date) return null;
  const start = new Date(`${date}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today - start) / 86400000));
}

function inactivityState(relation = activeRelationship()) {
  const latest = state.data.records
    .filter(r => r.relationshipId === relation.id)
    .map(r => r.date)
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0];
  const baseDate = latest || relation.startDate;
  const elapsed = daysSince(baseDate);
  const threshold = Number(state.data.settings.inactivityDays || 30);
  return { due: elapsed !== null && elapsed >= threshold, elapsed, threshold, baseDate };
}

function relationshipMonthRecords(relationId) {
  const month = new Date().toISOString().slice(0, 7);
  return recordsForRelationship(relationId).filter(record => record.date.startsWith(month));
}

function relationshipMonthSpend(relationId) {
  return relationshipMonthRecords(relationId).reduce((sum, record) => sum + Number(record.amount), 0);
}

function relationshipYearRecords(relationId) {
  const year = new Date().toISOString().slice(0, 4);
  return recordsForRelationship(relationId).filter(record => record.date.startsWith(year));
}

function relationshipYearSpend(relationId) {
  return relationshipYearRecords(relationId).reduce((sum, record) => sum + Number(record.amount), 0);
}

function relationshipBoundaryAlert(relation) {
  if (!relation || !["friend", "dating", "matchmaking", "ambiguous"].includes(relation.type)) return null;
  const recent = recordsForRelationship(relation.id).filter(record => {
    const elapsed = daysSince(record.date);
    return elapsed !== null && elapsed <= 45;
  });
  const gifts = recent.filter(record => record.category === "gift");
  const singleLimit = Number(state.data.settings.singleLimit || 0);
  const large = singleLimit > 0 ? recent.filter(record => Number(record.amount) >= singleLimit) : [];
  if (gifts.length < 2 && !large.length) return null;
  const reasons = [];
  if (gifts.length >= 2) reasons.push(text(`45天内连续记录了 ${gifts.length} 次送礼`, `${gifts.length} gifts recorded within 45 days`));
  if (large.length) reasons.push(text(`${large.length} 笔达到大额提醒线`, `${large.length} payment${large.length === 1 ? "" : "s"} reached the large-payment line`));
  return { relation, reasons, amount: recent.reduce((sum, record) => sum + Number(record.amount), 0) };
}

function boundaryAlertsForScope() {
  const relations = scopedRelationship() ? [scopedRelationship()] : state.data.relationships;
  return relations.map(relationshipBoundaryAlert).filter(Boolean);
}

function relationSelfCopy(relation) {
  if (!relation) return {
    hero: text("本月全部关系支出", "This month's spending across relationships"),
    principleTitle: text("先看见自己的全部付出", "See the full picture of what you gave"),
    principleBody: text("这里汇总所有关系中的主动记录。点击上方任一关系，可以只看那段关系的金额、频率和需要说清的事项。", "This brings together your entries across relationships. Choose one above to focus on its amount, frequency, and matters to clarify.")
  };
  const copy = {
    friend: ["这段友谊中，本月由你承担", "朋友之间也可以有清楚的边界", "真正的朋友不会把照顾当作理所当然。记录不是计较，只是看见自己长期承担了什么。"],
    dating: ["这段约会中，本月由你承担", "关系还在了解，投入可以慢一点", "在关系尚未稳定时，看见金额和频率，可以帮助你判断这是否仍是自己愿意的节奏。"],
    matchmaking: ["这段相亲关系中，本月由你承担", "关系还在了解，投入不必超前", "相亲阶段的支出与礼物应当和关系进展相匹配。先记录事实，再决定要不要继续。"],
    ambiguous: ["这段关系中，本月由你承担", "关系没有说清，付出更要看清", "暧昧可以保留空间，但大额付款和连续送礼不应在含糊中变成默认。"],
    lover: ["这段感情中，本月由你承担", "记录下来，是对自己付出的尊重", "不必记录每一笔小钱。更值得留下的是单笔较大、长期单方面付款，或让你心里没底的支出。"],
    spouse: ["共同生活中，本月由你承担", "共同生活，也要看见彼此承担", "家庭支出未必需要逐笔计算，但长期由一方承担的金额、重大给付和财产安排值得留下。"]
  }[relation.type] || ["本月由你承担", "记录下来，是对自己付出的尊重", "不必记录每一笔小钱，重要的付出值得留下。"];
  return { hero: text(copy[0], "Paid by you this month"), principleTitle: text(copy[1], "Keeping a record respects what you contributed"), principleBody: text(copy[2], "Keep the larger payments, repeated patterns, and facts that may matter later.") };
}

function natureIcon(nature) {
  return ({ "共同消费": "餐", "家庭共同支出": "家", "家庭款项待确认": "?", "赠与": "礼", "借款": "借", "代付/垫付": "垫", "待确认": "?", "个人承担": "己" })[nature] || "记";
}

function feelingLabel(feeling) {
  return ({ worth: "值得", normal: "一般", regret: "有点后悔", uneasy: "心里没底" })[feeling] || "未记录";
}

function formatDate(date) {
  const d = new Date(`${date}T00:00:00`);
  return en() ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d) : `${d.getMonth() + 1}月${d.getDate()}日`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>'"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[ch]);
}

function render({ preserveScroll = false } = {}) {
  const view = document.getElementById("appView");
  const previousScrollTop = view.scrollTop;
  applyStaticLocale();
  const [title, dateLabel] = pageMeta[state.language][state.page];
  const relation = scopedRelationship();
  document.getElementById("pageTitle").textContent = state.page === "home" && state.perspective === "ideal" && relation
    ? idealPageTitle(relation)
    : title;
  document.getElementById("todayLabel").textContent = state.page === "home" ? fullDate() : dateLabel;
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.page === state.page));
  view.innerHTML = renderRelationshipStrip() + ({ home: renderHome, records: renderRecords, clarify: renderClarify, me: renderMe })[state.page]();
  view.scrollTop = preserveScroll ? previousScrollTop : 0;
  maybeNotifyInactive();
}

function renderRelationshipStrip() {
  const relations = state.data.relationships.filter(relation => relation.id !== "empty-relation");
  if (!relations.length) {
    return `<div class="relationship-strip empty-relationship-strip">
      <button class="relationship-current" data-action="open-new-relationship"><span class="relationship-avatar">＋</span><span><small>${text("还没有建立关系", "No relationship yet")}</small><b>${text("新建一段关系开始记录", "Create one to start recording")}</b></span><i>›</i></button>
    </div>`;
  }
  if (!isRelationshipOverviewPage()) {
    const relation = activeRelationship();
    return `<div class="relationship-strip">
      <button class="relationship-current" data-action="open-relationships"><span class="relationship-avatar">${escapeHTML(relationshipTypeLabel(relation.type).slice(0,1))}</span><span><small>${text("当前关系", "Current relationship")}</small><b>${escapeHTML(displayRelationName(relation))} · ${relationshipTypeLabel(relation.type)}</b></span><i>⌄</i></button>
      <button class="relationship-new" data-action="open-new-relationship">＋ ${text("新建关系", "New")}</button>
    </div>`;
  }
  const allSpend = relations.reduce((sum, relation) => sum + relationshipMonthSpend(relation.id), 0);
  const allYearSpend = relations.reduce((sum, relation) => sum + relationshipYearSpend(relation.id), 0);
  const cards = relations.map(relation => {
    const alert = relationshipBoundaryAlert(relation);
    return `<button class="relationship-scope-card ${state.relationshipScope === relation.id ? "active" : ""}" data-action="set-relationship-scope" data-id="${relation.id}">
      <span class="relationship-card-top"><i>${escapeHTML(relationshipTypeLabel(relation.type).slice(0,1))}</i><em>${relationshipTypeLabel(relation.type)}${alert ? " · !" : ""}</em></span>
      <b>${escapeHTML(displayRelationName(relation))}</b>
      <small>${text(`本月 ¥${money(relationshipMonthSpend(relation.id))} · 本年 ¥${money(relationshipYearSpend(relation.id))}`, `Month ¥${money(relationshipMonthSpend(relation.id))} · Year ¥${money(relationshipYearSpend(relation.id))}`)}</small>
    </button>`;
  }).join("");
  return `<section class="relationship-overview">
    <div class="relationship-overview-head"><div><b>${text("关系总览", "Relationship overview")}</b><span>${text("点一段关系看单独统计", "Choose one for its own statistics")}</span></div><div><button data-action="open-relationships">${text("管理", "Manage")}</button><button data-action="open-new-relationship">＋ ${text("新建", "New")}</button></div></div>
    <div class="relationship-card-grid">
      <button class="relationship-scope-card all ${state.relationshipScope === "all" ? "active" : ""}" data-action="set-relationship-scope" data-id="all"><span class="relationship-card-top"><i>全</i><em>${text(`${relations.length} 段关系`, `${relations.length} relationships`)}</em></span><b>${text("全部关系", "All relationships")}</b><small>${text(`本月 ¥${money(allSpend)} · 本年 ¥${money(allYearSpend)}`, `Month ¥${money(allSpend)} · Year ¥${money(allYearSpend)}`)}</small></button>
      ${cards}
    </div>
  </section>`;
}

function fullDate() {
  return new Intl.DateTimeFormat(en() ? "en-US" : "zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
}

function renderHome() {
  const relation = scopedRelationship();
  const spend = myMonthSpend();
  const yearlySpend = myYearSpend();
  const limit = Number(state.data.settings.monthlyLimit || 0);
  const yearlyLimit = Number(state.data.settings.yearlyLimit || 0);
  const percent = limit > 0 ? Math.min(100, Math.round(spend / limit * 100)) : 0;
  const pending = pendingRecords().length;
  const streak = consecutiveMine();
  const inactivity = relation ? inactivityState(relation) : null;
  const selfCopy = relationSelfCopy(relation);
  if (state.perspective === "ideal" && relation) return renderIdealHome({ relation, spend, limit, percent, streak });
  const insights = [];

  if (limit > 0 && spend >= limit) insights.push(`<article class="insight-card peach" data-action="go-me"><div class="insight-top"><div><h4>${text("你已越过自己设置的本月提醒线", "You have crossed your monthly reminder line")}</h4><p>${text("不是说你花错了，只是想问：这是你原本愿意承担的程度吗？", "This does not mean you spent wrongly. Is this still what you meant to take on?")}</p></div><span class="arrow">›</span></div></article>`);
  if (yearlyLimit > 0 && yearlySpend >= yearlyLimit) insights.push(`<article class="insight-card peach" data-action="go-me"><div class="insight-top"><div><h4>${text("你已越过自己设置的本年提醒线", "You have crossed your yearly reminder line")}</h4><p>${text(`今年这段关系中，你已记录 ¥${money(yearlySpend)}。停一下，看看这是否仍是你愿意的累计程度。`, `You have recorded ¥${money(yearlySpend)} in this relationship this year. Pause and consider whether this cumulative level still feels chosen.`)}</p></div><span class="arrow">›</span></div></article>`);
  boundaryAlertsForScope().forEach(alert => insights.push(`<article class="insight-card quiet-alert" data-action="set-relationship-scope" data-id="${alert.relation.id}"><div class="insight-top"><div><h4>${text(`和${displayRelationName(alert.relation)}的关系，真的到这一步了吗？`, `Has your relationship with ${displayRelationName(alert.relation)} really reached this point?`)}</h4><p>${escapeHTML(alert.reasons.join("，"))}。${text("对方有过相应的付出吗？你从这段关系中得到了什么？先停一下看看。", "Has the other person contributed in return? What are you receiving from this relationship? Pause and take a look.")}</p></div><span class="arrow">›</span></div></article>`));
  if (streak >= 3) insights.push(`<article class="insight-card sage" data-action="go-records"><div class="insight-top"><div><h4>${text(`最近30天，你记录了 ${streak} 次自己的支出`, `${streak} of your payments were recorded in the last 30 days`)}</h4><p>${text("不需要替对方记账，只需要问问自己：这样的频率仍然是你愿意的吗？对方有没有用其他方式回应？", "You do not need to keep the other person's accounts. Ask whether this pace still feels chosen, and whether care is being returned in other ways.")}</p></div><span class="arrow">›</span></div></article>`);
  if (pending) insights.push(`<article class="insight-card amber" data-action="go-clarify"><div class="insight-top"><div><h4>${text(`${pending} 笔钱还没有说清楚`, `${pending} item${pending === 1 ? "" : "s"} may need clarification`)}</h4><p>${text("越早确认，越不需要在以后靠回忆争论。", "Clear facts early, so you do not have to argue from memory later.")}</p></div><span class="arrow">›</span></div></article>`);
  if (state.data.settings.notificationsEnabled && inactivity?.due) insights.push(`<article class="insight-card quiet-alert" data-action="preview-inactivity"><div class="insight-top"><div><h4>${text("这段关系还在继续吗？", "Is this relationship still active?")}</h4><p>${text(`已经 ${inactivity.elapsed} 天没有留下记录。走散了，也是看清了；如果你仍在持续付出，请不要逃避对自己的审视。`, `No record for ${inactivity.elapsed} days. If you have moved apart, that is clarity too. If you are still giving, do not look away from the pattern.`)}</p></div><span class="arrow">›</span></div></article>`);

  return `
    ${renderPerspectiveSwitch()}
    <section class="hero-card">
      <div class="hero-label">${selfCopy.hero}</div>
      <div class="hero-value">¥ ${money(spend)}</div>
      <div class="hero-sub">${relation ? text("只记录你的支出 · 对方是否也有回应，由你自己观察", "Only your spending is recorded · You decide whether care is returned") : text(`${state.data.relationships.filter(item => item.id !== "empty-relation").length} 段关系 · ${monthRecords().length} 笔本月记录`, `${state.data.relationships.filter(item => item.id !== "empty-relation").length} relationships · ${monthRecords().length} entries this month`)}</div>
      <div class="hero-progress"><span style="width:${percent}%"></span></div>
      <div class="hero-foot"><span>${limit > 0 ? `${text("自设月度提醒线", "Your monthly line")} ¥${money(limit)}` : text("尚未设置月度提醒线", "No monthly line set")}</span><span>${limit > 0 ? `${percent}%` : "—"}</span></div>
    </section>
    ${renderEntryGrid()}
    <article class="record-principle"><b>${selfCopy.principleTitle}</b><p>${selfCopy.principleBody}</p></article>
    <div class="section-head"><h3>${text("给此刻的你", "For you, right now")}</h3><button data-action="show-principle">${text("提醒原则", "Why reminders?")}</button></div>
    ${insights.join("") || `<article class="insight-card sage"><h4>${text("目前没有需要特别提醒的事", "Nothing needs special attention right now")}</h4><p>${text("记录不是为了算计，而是为了不在情绪里忘记自己。", "This is not scorekeeping. It is a way to remember yourself clearly.")}</p></article>`}
    <div class="section-head"><h3>${text("最近记录", "Recent records")}</h3><button data-action="go-records">${text("查看全部", "View all")}</button></div>
    <div class="record-list">${renderRecordCards([...activeRecords()].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 3))}</div>
  `;
}

function renderPerspectiveSwitch() {
  const relation = scopedRelationship();
  if (!relation || relation.id === "empty-relation") return "";
  return `<div class="perspective-switch" aria-label="${text("视角切换", "Perspective")}">
    <button class="${state.perspective === "self" ? "active" : ""}" data-action="set-perspective" data-perspective="self">${text("我的记录", "My record")}</button>
    <button class="${state.perspective === "ideal" ? "active" : ""}" data-action="set-perspective" data-perspective="ideal">${idealPerspectiveLabel(relation)}</button>
  </div>`;
}

function renderEntryGrid() {
  return `<div class="quick-grid">
    <button class="quick-card" data-action="open-add-text"><b>${text("文", "T")}</b><span>${text("文字记录<br>写下一笔事实", "Text entry<br>Save the facts")}</span></button>
    <button class="quick-card" data-action="open-add-image"><b>${text("图", "S")}</b><span>${text("截图记录<br>付款或聊天凭证", "Screenshot<br>Payment or chat")}</span></button>
    <button class="quick-card" data-action="open-add-receipt"><b>${text("票", "R")}</b><span>${text("拍摄小票<br>留下消费凭证", "Receipt<br>Take a photo")}</span></button>
    <button class="quick-card" data-action="open-add-gift"><b>${text("礼", "G")}</b><span>${text("礼物记录<br>备注名称和金额", "Gift<br>Name and amount")}</span></button>
  </div>`;
}

function idealPerspectiveLabel(relation) {
  return ({
    friend: text("好朋友会怎样回应", "A good friend's response"),
    dating: text("如果约会被认真回应", "If the date responded with care"),
    matchmaking: text("如果相亲对象认真回应", "If the introduced date responded"),
    ambiguous: text("如果这份付出被看见", "If this effort were seen"),
    lover: text(`理想中的${displayRelationName(relation)}`, "The ideal response"),
    spouse: text("理想中的共同承担", "Ideal shared responsibility")
  })[relation.type] || text("理想回应", "The ideal response");
}

function idealPageTitle(relation) {
  return ({
    friend: text("今天，好朋友会这样记得", "Today, through a good friend's response"),
    dating: text("今天，如果约会被认真回应", "Today, if the date responded with care"),
    matchmaking: text("今天，如果相亲对象认真回应", "Today, if the introduced date responded"),
    ambiguous: text("今天，如果这份付出被看见", "Today, if this effort were seen"),
    lover: text(`今天，${displayRelationName(relation)}这样看见你`, `Today, through ${displayRelationName(relation)}'s ideal eyes`),
    spouse: text("今天，如果彼此都认真承担", "Today, if responsibility were truly shared")
  })[relation.type] || text("今天，如果这份付出被看见", "Today, if this effort were seen");
}

function idealMeta(relation) {
  return ({
    friend: { hero: text("在一个真正的好朋友眼里", "Through a good friend's eyes"), sub: text("这个月，你为这段友谊承担的金额", "What you contributed to this friendship this month"), list: text("好朋友会默默记下", "A good friend would remember"), mirror: text("这是为付款方呈现的理想朋友回应，不代表现实中的朋友真的这样想。", "This is an imagined response from a good friend, not a claim about what your real friend thinks.") },
    dating: { hero: text("如果对方尊重彼此的节奏", "If the other person respected the pace"), sub: text("这个月，你在这段约会中的投入", "What you put into this dating relationship this month"), list: text("认真了解你的人，也会看见这些", "Someone getting to know you would notice this"), mirror: text("这是理想回应，不代表现实中的对方已经承诺关系或回报。", "This is an ideal response, not a promise or commitment from the real person.") },
    matchmaking: { hero: text("如果相亲中的投入被认真看见", "If your effort in this introduced date were seen"), sub: text("这个月，你为了解彼此承担的金额", "What you spent while getting to know each other"), list: text("合适的回应，不会把投入当作默认", "A respectful response would not take this for granted"), mirror: text("这是理想回应，不代表对方接受了特定关系或法律义务。", "This is an ideal response, not acceptance of a relationship or legal obligation.") },
    ambiguous: { hero: text("如果含糊的关系也有清楚的尊重", "If an undefined relationship still showed clear respect"), sub: text("这个月，你在尚未说清的关系中的投入", "What you contributed while the relationship remained undefined"), list: text("关系可以含糊，尊重不该含糊", "The relationship may be undefined; respect should not be"), mirror: text("这是理想回应，不代表现实中的对方已确认关系或款项性质。", "This is an ideal response, not confirmation of the relationship or any payment's nature.") },
    lover: { hero: text(`在理想中的${displayRelationName(relation)}眼里`, "Seen through an ideal response"), sub: text("这个月，你为这段感情认真付出的金额", "What you contributed to the relationship this month"), list: text("如果爱也认真看见付出", "If love also noticed the effort"), mirror: text(`这是为付款方呈现的“理想回应”，不代表现实中的${displayRelationName(relation)}真实这样想。`, "This is an imagined ideal response for the person who paid. It is not a claim about what the other person actually thinks.") },
    spouse: { hero: text("如果共同生活真正看见彼此", "If shared life truly saw both people"), sub: text("这个月，你为共同生活承担的金额", "What you contributed to shared life this month"), list: text("共同生活，不该把一方的承担变成默认", "Shared life should not make one person's effort automatic"), mirror: text("这是理想中的共同承担，不代表对家庭财产或债务作出法律判断。", "This imagines shared responsibility; it is not a legal view on marital property or debt.") }
  })[relation.type] || { hero: text("如果这份付出被认真看见", "If this effort were seen"), sub: text("这个月，你认真付出的金额", "What you contributed this month"), list: text("理想回应", "An ideal response"), mirror: text("这只是理想回应，不代表现实中的对方真实这样想。", "This is only an ideal response, not a claim about reality.") };
}

function idealVoiceForRecord(record) {
  const relation = record ? relationshipById(record.relationshipId) : scopedRelationship() || activeRelationship();
  if (!record) return relation.type === "friend"
    ? text("好朋友会默默记下你的照顾。真正的朋友不会把这一切当作理所当然。", "A good friend would quietly remember your care and never treat it as something owed.")
    : text("你的付出不是理所当然。认真回应你的人，会看见、记住，也愿意承担。", "Your contribution is not automatic. Someone responding with care would see it, remember it, and contribute too.");
  if (relation.type === "friend") {
    if (record.category === "gift") return text("好朋友会默默记下这份礼物。真正的朋友不会当作理所当然，我也想在合适的时候认真回应。", "A good friend would remember this gift and never take it for granted. I want to respond thoughtfully too.");
    if (record.category === "transfer") return text("你愿意在我需要时帮忙，我应该主动把这笔钱怎么安排说清楚。真正的朋友不会让信任一直悬着。", "You helped when I needed it. A real friend should clarify the arrangement instead of leaving trust hanging.");
    return text("今天又是你付钱。好朋友会记得彼此的照顾，下次该我来。", "You paid again today. A good friend remembers mutual care; next time should be my turn.");
  }
  if (["dating", "matchmaking"].includes(relation.type)) return text("我们还在了解彼此，你的投入不该被默认。我会认真记得，也会用行动回应。", "We are still getting to know each other. Your effort should not become the default; I would remember it and respond through my actions.");
  if (relation.type === "ambiguous") return text("关系还没有说清，我更不该把你的付出当作理所当然。尊重应该比关系名称更早出现。", "The relationship is not yet defined, which makes it even more important not to take your effort for granted.");
  if (relation.type === "spouse" && record.category !== "transfer") return text("家里的开支今天又是你在承担。一起生活不是把一个人的辛苦当成默认，我也应该主动分担。", "You covered another household expense today. Sharing a life should not make one person's effort invisible; I should contribute too.");
  if (record.category === "gift") return text("很高兴收到这份礼物。这份心意不是理所当然，下次我也想认真为你做点什么。", "I am happy to receive this gift. Your thoughtfulness is not something I should take for granted; I want to return that care.");
  if (record.category === "transfer") return text("你愿意在我需要的时候转这笔钱，但工作和赚钱都不容易。我应该主动把安排说清楚。", "You transferred this when I needed it, but earning money is never effortless. I should clarify the arrangement.");
  if (record.category === "dining") return text("今天又是你付钱。工作都不容易，我会好好记得。下次该我来。", "You paid again today. We both work hard, and I will remember that. Next time should be on me.");
  return text("你的付出不是理所当然。我会认真记住，也会在下一次主动回应。", "Your contribution is not automatic. I would remember it and respond more actively next time.");
}

function renderIdealHome({ relation, spend, limit, percent, streak }) {
  const latestPaid = [...activeRecords()].sort((a,b) => b.date.localeCompare(a.date))[0];
  const meta = idealMeta(relation);
  return `
    ${renderPerspectiveSwitch()}
    <section class="hero-card ideal-hero">
      <div class="hero-label">${meta.hero}</div>
      <div class="hero-value">¥ ${money(spend)}</div>
      <div class="hero-sub">${meta.sub}</div>
      <div class="hero-progress"><span style="width:${percent}%"></span></div>
      <div class="hero-foot"><span>${text("每一笔都值得被看见", "Every contribution deserves to be seen")}</span><span>${text(`近30天 ${streak} 次记录`, `${streak} entries in 30 days`)}</span></div>
    </section>
    <article class="ideal-voice">
      <small>${text("如果这份付出被认真看见", "If this contribution were truly seen")}</small>
      <h4>${escapeHTML(idealVoiceForRecord(latestPaid))}</h4>
      <p>${latestPaid ? `${formatDate(latestPaid.date)} · ${escapeHTML(displayRecordTitle(latestPaid))} · ¥${money(latestPaid.amount)}` : text("从一笔记录开始", "Start with one record")}</p>
    </article>
    <p class="mirror-note">${meta.mirror}</p>
    ${renderEntryGrid()}
    <div class="section-head"><h3>${meta.list}</h3><button data-action="show-ideal-meaning">${text("这是什么？", "What is this?")}</button></div>
    ${[...activeRecords()].sort((a,b) => b.date.localeCompare(a.date)).slice(1,3).map(r => `<article class="insight-card peach"><h4>${escapeHTML(idealVoiceForRecord(r))}</h4><p>${formatDate(r.date)} · ${escapeHTML(displayRecordTitle(r))} · ¥${money(r.amount)}</p></article>`).join("")}
  `;
}

function renderRecordCards(records) {
  if (!records.length) return `<div class="empty-state"><div class="empty-icon">○</div><h3>${text("还没有记录", "No records yet")}</h3><p>${text("记下事实即可，不需要马上给每笔钱下结论。", "Save the facts. You do not need to decide what every payment means right away.")}</p></div>`;
  return records.map(r => {
    const source = ({
      image: text("截图记录", "Screenshot"),
      receipt: text("小票记录", "Receipt"),
      gift: text("礼物记录", "Gift"),
      text: text("文字记录", "Text entry")
    })[r.source] || (r.image ? text("截图记录", "Screenshot") : text("文字记录", "Text entry"));
    return `
    <article class="record-card" data-action="record-detail" data-id="${r.id}">
      <div class="record-icon">${categoryIcon(r.category)}</div>
      <div class="record-main"><b>${escapeHTML(displayRecordTitle(r))}</b><span>${source} · ${formatDate(r.date)} · ${categoryLabel(r.category)}${r.status === "pending" ? text(" · 稍后说清", " · Clarify later") : ""}</span></div>
      <div class="record-amount"><b>−¥${money(r.amount)}</b><span>${text("你的支出", "Your spending")}</span></div>
    </article>
  `; }).join("");
}

function renderRecords() {
  const filters = [
    ["all", text("全部", "All")], ["pending", text("稍后说清", "Clarify later")], ["gift", text("礼物", "Gifts")], ["transfer", text("转账", "Transfers")], ["image", text("有截图", "With screenshot")]
  ];
  let records = [...activeRecords()].sort((a,b) => b.date.localeCompare(a.date));
  if (state.filter === "pending") records = records.filter(r => r.status === "pending");
  if (["gift", "transfer"].includes(state.filter)) records = records.filter(r => r.category === state.filter);
  if (state.filter === "image") records = records.filter(r => r.image);
  const scope = scopedRelationship();
  const legacyCount = state.data.records.filter(record => record.payer === "other" && (!scope || record.relationshipId === scope.id)).length;
  return `
    <div class="page-intro"><h3>${text("每一笔，都是当时的你", "Each record preserves a moment")}</h3><p>${text("这里留下的是事实，不是对一段关系的判决。", "These are facts you saved, not a verdict on the relationship.")}</p></div>
    ${legacyCount ? `<p class="legacy-note">${text(`旧版保留的 ${legacyCount} 笔“对方付款”记录未计入当前统计，但仍存在于本地备份中。`, `${legacyCount} legacy entries paid by the other person are excluded from current statistics but remain in the local backup.`)}</p>` : ""}
    <div class="filter-row">${filters.map(([key, label]) => `<button class="filter-chip ${state.filter === key ? "active" : ""}" data-action="set-filter" data-filter="${key}">${label}</button>`).join("")}</div>
    <div class="record-list">${renderRecordCards(records)}</div>
  `;
}

function renderEvidenceOverview(records) {
  const withScreenshot = records.filter(record => record.image).length;
  const withMemo = records.filter(record => record.transferMemo).length;
  const withNote = records.filter(record => record.note).length;
  const item = (labelZh, labelEn, value, total) => `<div class="evidence-chip"><i>${value ? "✓" : "○"}</i><span>${text(labelZh, labelEn)}</span><b>${value}/${total}</b></div>`;
  return `<article class="evidence-overview">
    <div class="evidence-head"><div><small>${text("咨询前先整理事实材料", "Organize the facts before seeking advice")}</small><h4>${text("不需要再做复杂问卷", "No long questionnaire needed")}</h4></div><button data-action="show-evidence-checklist">${text("材料清单", "Checklist")}</button></div>
    <p>${text("先看付款截图、转账附言和前后对话，再提醒你确认是否还有通话录音、短信、邮件或其他原始记录。", "Start with the payment screenshot, transfer memo, and surrounding conversation. Then check for call recordings, texts, email, or other original records.")}</p>
    <div class="evidence-grid">${item("付款截图", "Payment screenshot", withScreenshot, records.length)}${item("转账附言", "Transfer memo", withMemo, records.length)}${item("自己留下的话", "Your note", withNote, records.length)}</div>
  </article>`;
}

function renderLegalKnowledge() {
  return `<div class="section-head law-section-head"><h3>${text("法律小课 · 中国法", "Legal basics · PRC law")}</h3><span>${text("初期静态展示 · 后续可定期更新", "Static for now · Updatable later")}</span></div>
    <div class="law-feed">${legalKnowledge.map(item => `<button class="law-card" data-action="show-law" data-law-id="${item.id}"><span>${en() ? item.kindEn : item.kindZh}</span><b>${en() ? item.titleEn : item.titleZh}</b><small>${en() ? item.sourceEn : item.sourceZh}</small></button>`).join("")}</div>
    <p class="law-disclaimer">${text("只做普法提示，不根据你的单方记录自动作出法律结论。法条、司法解释和案例更新后，应由律师审核再推送。", "General legal education only. The app does not draw legal conclusions from one person's records. Updates should be lawyer-reviewed before publication.")}</p>`;
}

function clarifyCandidateRecords() {
  let records = [...activeRecords()].sort((a, b) => b.date.localeCompare(a.date));
  if (state.clarifyMonth !== "all") records = records.filter(record => record.date.startsWith(state.clarifyMonth));
  if (state.clarifyCategory !== "all") records = records.filter(record => record.category === state.clarifyCategory);
  return records;
}

function selectedClarifyRecords() {
  const selected = new Set(state.clarifySelected);
  return state.data.records.filter(record => selected.has(record.id) && record.payer !== "other");
}

function monthHeading(month) {
  const [year, value] = month.split("-");
  return en() ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long" }).format(new Date(`${month}-01T00:00:00`)) : `${year}年${Number(value)}月`;
}

function renderClarifyGroups(records) {
  if (!records.length) return `<div class="empty-state compact"><div class="empty-icon">○</div><h3>${text("这个范围内没有记录", "No entries in this range")}</h3><p>${text("换一个月份或类目看看。", "Try another month or category.")}</p></div>`;
  const selected = new Set(state.clarifySelected);
  const monthGroups = new Map();
  records.forEach(record => {
    const month = record.date.slice(0, 7);
    if (!monthGroups.has(month)) monthGroups.set(month, new Map());
    const categories = monthGroups.get(month);
    if (!categories.has(record.category)) categories.set(record.category, []);
    categories.get(record.category).push(record);
  });
  const hasSelection = selected.size > 0;
  return [...monthGroups.entries()].map(([month, categories]) => {
    const monthRecordsList = [...categories.values()].flat();
    const selectedMonthRecords = monthRecordsList.filter(record => selected.has(record.id));
    const monthAmount = (hasSelection ? selectedMonthRecords : monthRecordsList).reduce((sum, record) => sum + Number(record.amount), 0);
    const monthSummary = hasSelection
      ? text(`已选 ${selectedMonthRecords.length}/${monthRecordsList.length} 笔 · ¥${money(monthAmount)}`, `Selected ${selectedMonthRecords.length}/${monthRecordsList.length} · ¥${money(monthAmount)}`)
      : text(`当前范围 ${monthRecordsList.length} 笔 · ¥${money(monthAmount)}`, `${monthRecordsList.length} in view · ¥${money(monthAmount)}`);
    const categoryBlocks = [...categories.entries()].map(([category, items]) => {
      const selectedItems = items.filter(record => selected.has(record.id));
      const categoryCount = hasSelection ? text(`已选 ${selectedItems.length}/${items.length} 笔`, `Selected ${selectedItems.length}/${items.length}`) : text(`${items.length} 笔`, `${items.length}`);
      return `<div class="clarify-category-group"><h5><span>${categoryIcon(category)} ${categoryLabel(category)}</span><em>${categoryCount}</em></h5>${items.map(record => `<article class="clarify-record-row ${selected.has(record.id) ? "selected" : ""}">
      <button class="clarify-check" data-action="toggle-clarify-record" data-id="${record.id}" aria-label="${text("选择记录", "Select entry")}">${selected.has(record.id) ? "✓" : ""}</button>
      <div><b>${escapeHTML(displayRecordTitle(record))}</b><span>${formatDate(record.date)}${record.transferMemo ? ` · ${text("附言", "Memo")}: ${escapeHTML(record.transferMemo)}` : ""}</span></div>
      <strong>¥${money(record.amount)}</strong>
      <button class="clarify-detail" data-action="record-detail" data-id="${record.id}">${text("详情", "Details")}</button>
    </article>`).join("")}</div>`;
    }).join("");
    return `<section class="clarify-month-group"><div class="clarify-month-head"><b>${monthHeading(month)}</b><span>${monthSummary}</span></div>${categoryBlocks}</section>`;
  }).join("");
}

function renderClarify() {
  const records = clarifyCandidateRecords();
  const selectedRecords = selectedClarifyRecords();
  const selectedAmount = selectedRecords.reduce((sum, record) => sum + Number(record.amount), 0);
  const selectedRelationCount = new Set(selectedRecords.map(record => record.relationshipId)).size;
  const directReady = selectedRecords.length > 0 && selectedRelationCount === 1;
  const months = [...new Set(activeRecords().map(record => record.date.slice(0, 7)))].sort((a, b) => b.localeCompare(a));
  const categories = [["all", text("全部类目", "All categories")], ["transfer", text("转账", "Transfers")], ["gift", text("礼物", "Gifts")], ["dining", text("餐饮", "Dining")], ["travel", text("出行", "Travel")], ["daily", text("日常", "Everyday")], ["other", text("其他", "Other")]];
  return `
    <div class="page-intro"><h3>${text("先选范围，再决定怎么说", "Choose the scope, then choose how to speak")}</h3><p>${text("按时间和类目整理自己的付款。可以只选一笔，也可以全选一段时间。", "Organize your payments by time and category. Choose one entry or a whole period.")}</p></div>
    ${en() ? `<article class="jurisdiction-note"><b>English interface · PRC law first</b><p>This version is intended for cross-border marriages and relationships involving China. Changing the interface language does not change the governing law. Other cross-border rules can be added later after legal review.</p></article>` : ""}
    <div class="clarify-filter-panel">
      <div class="clarify-time-filter"><label>${text("付款时间", "Payment time")}</label><select data-clarify-month><option value="all">${text("全部时间", "All time")}</option>${months.map(month => `<option value="${month}" ${state.clarifyMonth === month ? "selected" : ""}>${monthHeading(month)}</option>`).join("")}</select></div>
      <div class="filter-row compact-filter">${categories.map(([key, label]) => `<button class="filter-chip ${state.clarifyCategory === key ? "active" : ""}" data-action="set-clarify-category" data-category="${key}">${label}</button>`).join("")}</div>
      <div class="selection-toolbar"><span>${text(`当前范围 ${records.length} 笔`, `${records.length} entries in view`)}</span><div><button data-action="select-all-clarify">${text("全选当前范围", "Select all shown")}</button><button data-action="clear-clarify-selection">${text("清空", "Clear")}</button></div></div>
    </div>
    <div class="clarify-selection-summary"><div><small>${text("已选择", "Selected")}</small><b>${selectedRecords.length} ${text("笔", "entries")} · ${selectedRelationCount} ${text("段关系", "relationships")}</b></div><strong>¥ ${money(selectedAmount)}</strong></div>
    <div class="clarify-group-list">${renderClarifyGroups(records)}</div>
    ${renderEvidenceOverview(selectedRecords.length ? selectedRecords : records)}
    <div class="section-head"><h3>${text("你想怎么处理？", "How would you like to proceed?")}</h3></div>
    <div class="clarify-mode-switch"><button class="${state.clarifyMode === "direct" ? "active" : ""}" data-action="set-clarify-mode" data-mode="direct">${text("和对方说清", "Clarify together")}</button><button class="${state.clarifyMode === "consult" ? "active" : ""}" data-action="set-clarify-mode" data-mode="consult">${text("请律师看看", "Ask a lawyer")}</button></div>
    ${state.clarifyMode === "direct" ? `<article class="clarify-path-card direct"><i>直</i><div><h4>${text("把选中的范围发给对方确认", "Ask the other person to confirm the selected scope")}</h4><p>${text("生成克制的确认页面：先核对付款事实，再询问款项性质、是否返还及期限。正式小程序中由你主动转发给微信联系人。", "Create a neutral confirmation page covering payment facts, purpose, repayment, and timing. In the Mini Program, you would choose whether to share it.")}</p>${selectedRelationCount > 1 ? `<small>${text("一次只能向同一段关系中的对方发起确认，请缩小范围。", "A confirmation can only cover one relationship at a time. Narrow the selection.")}</small>` : ""}<button data-action="prepare-direct" ${directReady ? "" : "disabled"}>${text("生成对方确认内容", "Create confirmation content")}</button></div></article>` : `<article class="clarify-path-card lawyer"><i>询</i><div><h4>${text("整理成一份咨询材料", "Prepare a consultation summary")}</h4><p>${text("把选中的记录、材料完整度和你的说明整理成事实摘要。小程序不绑定任何律所或律师，最后由你主动转发给自己选择的律师。", "Turn the selected entries, evidence status, and your note into a factual summary. The Mini Program is not tied to any lawyer or firm; you choose whom to share it with.")}</p><button data-action="prepare-consultation" ${selectedRecords.length ? "" : "disabled"}>${text("整理咨询材料", "Prepare consultation material")}</button></div></article>`}
    <p class="disclaimer">${text("单方记录、对方确认和正式电子签署的效力不同。当前网页原型只做本地预览，不创建真实微信链接，也不向任何律师或机构发送数据。", "A private note, the other person's confirmation, and a formal e-signature have different effects. This web prototype only previews locally: it creates no real WeChat link and sends nothing to any lawyer or organization.")}</p>
    ${renderLegalKnowledge()}
  `;
}

function renderMe() {
  const monthSpend = myMonthSpend();
  const yearlySpend = myYearSpend();
  const scope = scopedRelationship();
  const singleLimit = Number(state.data.settings.singleLimit || 0);
  const yearlyLargeCount = singleLimit > 0 ? yearRecords().filter(record => Number(record.amount) >= singleLimit).length : 0;
  return `
    <div class="page-intro"><h3>${text("看看最近的自己", "Look at your recent pattern")}</h3><p>${text("数字只是镜子。它帮助你觉察模式，不替你决定应该爱谁、应该花多少。", "Numbers are a mirror. They can reveal a pattern, but they do not decide whom to love or how much to spend.")}</p></div>
    <div class="metric-grid">
      <div class="metric-card"><span>${text(scope ? "这段关系本月支出" : "全部关系本月支出", scope ? "This relationship this month" : "All relationships this month")}</span><strong>¥${money(monthSpend)}</strong></div>
      <div class="metric-card"><span>${text(scope ? "这段关系本年支出" : "全部关系本年支出", scope ? "This relationship this year" : "All relationships this year")}</span><strong>¥${money(yearlySpend)}</strong></div>
      <div class="metric-card"><span>${text("本月留下记录", "Records this month")}</span><strong>${monthRecords().length}</strong><small>${text("笔", "")}</small></div>
      <div class="metric-card"><span>${text("本年留下记录", "Records this year")}</span><strong>${yearRecords().length}</strong><small>${text("笔", "")}</small></div>
      <div class="metric-card"><span>${text("本年大额支出", "Large payments this year")}</span><strong>${yearlyLargeCount}</strong><small>${text("笔", "")}</small></div>
      <div class="metric-card"><span>${text("尚未说清", "Not yet clear")}</span><strong>${activeRecords().filter(r => r.status === "pending").length}</strong><small>${text("笔", "")}</small></div>
    </div>
    <div class="section-head"><h3>${text("你自己设定的提醒线", "Reminder lines you set")}</h3></div>
    <div class="settings-card">
      <div class="settings-row"><div><b>${text("月度累计提醒线", "Monthly total line")}</b><span>${text("本月累计达到后提醒你回看", "Review when the monthly total reaches it")}</span></div><input type="number" min="0" data-setting="monthlyLimit" value="${state.data.settings.monthlyLimit}"></div>
      <div class="settings-row"><div><b>${text("年度累计提醒线", "Yearly total line")}</b><span>${text("本年累计达到后提醒你回看", "Review when the yearly total reaches it")}</span></div><input type="number" min="0" data-setting="yearlyLimit" value="${state.data.settings.yearlyLimit}"></div>
      <div class="settings-row"><div><b>${text("单笔大额提醒线", "Single large-payment line")}</b><span>${text("达到后提醒这笔值得留下", "Suggest keeping a record")}</span></div><input type="number" min="0" data-setting="singleLimit" value="${state.data.settings.singleLimit}"></div>
      <div class="settings-row"><div><b>${text("材料整理提醒线", "Record-review line")}</b><span>${text("累计达到后，提醒你检查截图、附言和上下文", "Remind you to check screenshots, memos, and context")}</span></div><input type="number" min="0" data-setting="lawyerLine" value="${state.data.settings.lawyerLine}"></div>
    </div>
    <p class="local-reminder-note">${text("这些金额全部由你自行设置，不代表法律标准；某项填写 0，表示关闭该类金额提醒。", "You set every amount yourself. They are not legal standards; enter 0 to turn off that reminder.")}</p>
    <div class="section-head"><h3>${text("关系状态提醒", "Relationship status reminder")}</h3><button data-action="preview-inactivity">${text("预览提醒", "Preview")}</button></div>
    <div class="settings-card">
      <div class="settings-row"><div><b>${text("开启通知", "Enable notifications")}</b><span>${text("长期没有记录时，提醒你确认关系状态", "Check in after a long gap")}</span></div><button class="toggle-control ${state.data.settings.notificationsEnabled ? "on" : ""}" role="switch" aria-checked="${state.data.settings.notificationsEnabled}" data-action="toggle-notifications"><i></i></button></div>
      <div class="settings-row"><div><b>${text("多久没有记录后提醒", "Remind after no records for")}</b><span>${text("按当前关系最后一笔记录计算", "Counted from the latest entry")}</span></div><div class="number-suffix"><input type="number" min="7" data-setting="inactivityDays" value="${state.data.settings.inactivityDays}"><em>${text("天", "days")}</em></div></div>
    </div>
    <p class="local-reminder-note">${text("当前是纯本地原型：应用内提醒可以体验；浏览器通知需由你主动授权，并且页面关闭后不能保证后台送达。正式小程序需接入合规的微信订阅消息。", "This is a local prototype. In-app reminders work here; browser notifications require your permission and may not arrive after the page closes. A production Mini Program needs compliant subscription messages.")}</p>
    <div class="section-head"><h3>${text("正式小程序阶段", "Production-stage requirements")}</h3></div>
    <div class="settings-card">
      <div class="roadmap-item"><i class="roadmap-dot"></i><div><b>${text("聊天截图多选与顺序整理", "Multi-select and order chat screenshots")}</b><span>${text("只处理用户主动选择的截图，不读取微信文字聊天记录。", "Only user-selected screenshots are processed; text chat history is not read.")}</span></div></div>
      <div class="roadmap-item"><i class="roadmap-dot"></i><div><b>${text("双方确认与可靠电子签", "Mutual confirmation and reliable e-signing")}</b><span>${text("需要身份核验、版本固化、时间记录和签署服务。", "Identity checks, fixed versions, timestamps, and a signing service are needed.")}</span></div></div>
      <div class="roadmap-item"><i class="roadmap-dot"></i><div><b>${text("用户主动转发咨询材料", "User-initiated consultation sharing")}</b><span>${text("只临时保存用户确认分享的副本，并提供有效期、撤回和删除。", "Only the confirmed shared copy is stored temporarily, with expiry, revocation, and deletion.")}</span></div></div>
      <div class="roadmap-item"><i class="roadmap-dot"></i><div><b>${text("微信订阅消息提醒", "Compliant reminder delivery")}</b><span>${text("需要遵守微信消息模板、用户订阅和发送场景限制。", "Messages must follow platform consent, template, and sending rules.")}</span></div></div>
    </div>
    <div class="section-head"><h3>${text("隐私与数据", "Privacy & data")}</h3><button data-action="show-privacy">${text("打开隐私中心", "Open privacy center")}</button></div>
    <article class="privacy-summary-card"><div><i>本地</i><span><b>${text("记录默认不出设备", "Records stay on device")}</b><small>${text("不绑定律所 · 不自动共享 · 不后台同步", "No firm tie-in · no automatic sharing or sync")}</small></span></div><button data-action="show-privacy">${text("管理", "Manage")}</button></article>
    <button class="danger-link" data-action="reset-demo">${text("恢复初始演示数据", "Reset demo data")}</button>
  `;
}

function newDraft() {
  const relation = activeRelationship();
  return { id: uid(), relationshipId: relation.id, date: new Date().toISOString().slice(0,10), title: "", category: "dining", transferMemo: "", counterparty: relation.name, amount: "", payer: "me", nature: "支出记录", note: "", dueDate: "", status: "recorded", image: "", source: "text" };
}

function relationshipLegalHint(type) {
  return ({
    friend: "朋友之间也可能成立借款或赠与，重点看是否约定返还、款项用途及双方后续表达。",
    dating: "约会消费与单独的大额转账应分开观察；谁付款本身不能直接推出谁欠谁。",
    matchmaking: "相亲背景可能影响婚嫁目的判断，但仍要结合金额、用途、双方表达和关系进展。",
    ambiguous: "暧昧关系容易留下含糊表达。亲密不排除借款，也不能仅凭转账认定赠与。",
    lover: "恋爱关系不排除借款；日常消费、一般赠与和附特定目的的大额给付需要分别判断。",
    spouse: "夫妻款项还要区分个人财产、共同财产、家庭共同生活支出及一方个人债务。"
  })[type] || "关系标签只提供判断背景，不会单独决定款项性质。";
}

function openAdd(mode = "text") {
  if (!state.data.relationships.some(relation => relation.id !== "empty-relation")) return showNewRelationship();
  state.entryMode = mode;
  state.draft = newDraft();
  state.draft.source = mode;
  if (mode === "gift") state.draft.category = "gift";
  renderAddModal();
}

function openEntryMenu() {
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card">
    <div class="modal-head"><h3>${text("你想怎么记？", "How would you like to record it?")}</h3><button class="close-button" data-action="close-modal">×</button></div>
    <p class="entry-menu-hint">${text("下一步可以明确选择这笔支出属于哪段关系。这里只记录你自己的支出。", "Next, choose which relationship this spending belongs to. Only your own spending is recorded.")}</p>
    <div class="entry-menu">
      <button class="entry-option" data-action="open-add-text"><i>${text("文", "T")}</i><span><b>${text("文字记录", "Text entry")}</b><span>${text("金额、类目，再给自己留一句话", "Amount, category, and one sentence for yourself")}</span></span><em>›</em></button>
      <button class="entry-option" data-action="open-add-image"><i>${text("图", "S")}</i><span><b>${text("截图记录", "Screenshot entry")}</b><span>${text("选择截图，补上金额和类目即可", "Choose a screenshot, then add amount and category")}</span></span><em>›</em></button>
      <button class="entry-option receipt" data-action="open-add-receipt"><i>${text("票", "R")}</i><span><b>${text("拍摄小票", "Photograph receipt")}</b><span>${text("拍下或选择一张小票，再补金额和类目", "Take or choose a receipt, then add amount and category")}</span></span><em>›</em></button>
      <button class="entry-option gift" data-action="open-add-gift"><i>${text("礼", "G")}</i><span><b>${text("礼物记录", "Gift entry")}</b><span>${text("简单备注礼物名称和金额", "Simply note the gift and its amount")}</span></span><em>›</em></button>
    </div>
  </div></div>`;
}

function renderAddModal() {
  const d = state.draft;
  const root = document.getElementById("modalRoot");
  {
    const categories = ["dining", "gift", "transfer", "travel", "daily", "other"].map(value => [value, categoryLabel(value)]);
    const sourceText = ({
      text: text("文字记录 · 先把事实留下来", "Text entry · Save the facts first"),
      image: text("截图记录 · 图片只保存在当前设备", "Screenshot entry · Image stays on this device"),
      receipt: text("小票记录 · 拍摄或选择后仅保存在当前设备", "Receipt entry · The photo stays on this device"),
      gift: text("礼物记录 · 记下礼物名称和金额即可", "Gift entry · Note the gift and its amount")
    })[state.entryMode];
    const titleLabel = ({
      text: text("这笔是什么？（可不填）", "What was this for? (optional)"),
      image: text("截图里的这笔是什么？（可不填）", "What does the screenshot show? (optional)"),
      receipt: text("这张小票是什么？（可不填）", "What is this receipt for? (optional)"),
      gift: text("礼物是什么？（可不填）", "What was the gift? (optional)")
    })[state.entryMode];
    const titlePlaceholder = state.entryMode === "gift" ? text("例如：手机、手表、生日礼物", "e.g. phone, watch, birthday gift") : text("例如：晚餐、车票、临时周转", "e.g. dinner, tickets, temporary help");
    const needsImage = state.entryMode === "image" || state.entryMode === "receipt";
    const relationshipChoices = state.data.relationships.filter(relation => relation.id !== "empty-relation").map(relation => `<button class="record-relation-choice ${d.relationshipId === relation.id ? "active" : ""}" data-action="set-record-relationship" data-id="${relation.id}"><i>${relationshipTypeLabel(relation.type).slice(0,1)}</i><span><b>${escapeHTML(displayRelationName(relation))}</b><small>${relationshipTypeLabel(relation.type)}</small></span></button>`).join("");
    const simpleBody = `
      <div class="source-banner">${sourceText}</div>
      <div class="record-relation-picker"><label>${text("这笔支出属于哪段关系？", "Which relationship does this spending belong to?")}</label><div>${relationshipChoices}</div></div>
      <div class="form-grid" style="margin-top:14px">
        <div class="form-field"><label>${text("金额", "Amount")}</label><input data-draft="amount" type="number" min="0" step="0.01" value="${escapeHTML(d.amount)}" placeholder="0.00"></div>
        <div class="form-field"><label>${text("日期", "Date")}</label><input data-draft="date" type="date" value="${d.date}"></div>
      </div>
      <div class="form-field"><label>${titleLabel}</label><input data-draft="title" value="${escapeHTML(d.title)}" placeholder="${titlePlaceholder}"></div>
      <div class="own-spending-label"><i>我</i><span><b>${text("这是一笔我的支出", "This is my spending")}</b><small>${text("不记录对方流水；是否得到回应，留给后续提醒", "The other person's transactions are not recorded; reciprocity is handled through reflection prompts")}</small></span></div>
      ${state.entryMode === "gift" ? "" : `<div class="choice-question compact-question"><label>${text("选个类目就行", "Choose a category")}</label><div class="category-grid">${categories.map(([value,label]) => `<button class="category-button ${d.category === value ? "active" : ""}" data-action="set-choice" data-field="category" data-value="${value}"><i>${categoryIcon(value)}</i>${label}</button>`).join("")}</div></div>`}
      ${needsImage ? `<label class="upload-zone compact-upload" for="receiptFile">
        ${d.image ? `<img src="${d.image}" alt="${text("图片预览", "Image preview")}">` : `<div><b>${state.entryMode === "receipt" ? text("拍摄或选择一张小票", "Take or choose a receipt") : text("选择付款或聊天截图", "Choose a payment or chat screenshot")}</b><span>${text("只处理你主动选择的图片，不读取整个相册", "Only the image you select is processed; the whole album is never read")}<br>${text("原型压缩后仅存于当前浏览器", "The compressed image stays in this browser")}</span></div>`}
      </label>
      <input id="receiptFile" type="file" accept="image/*" ${state.entryMode === "receipt" ? 'capture="environment"' : ""} hidden>` : ""}
      ${d.category === "transfer" ? `<div class="form-field"><label>${text("转账附言（可不填）", "Transfer memo (optional)")}</label><input data-draft="transferMemo" value="${escapeHTML(d.transferMemo)}" placeholder="${text("例如：临时周转、房租、生日礼物", "e.g. short-term help, rent, birthday gift")}"></div>` : ""}
      <div class="form-field"><label>${text("给自己留一句话（可不填）", "One sentence for yourself (optional)")}</label><textarea rows="3" data-draft="note" placeholder="${text("发生了什么，按你自己的话记下来就好", "What happened, in your own words")}">${escapeHTML(d.note)}</textarea></div>
      <p class="recording-nudge">${text("不必现在给这笔钱下结论。先把真实发生的事留下来。", "You do not need to decide what this money means now. Save what happened first.")}</p>
    `;
    root.innerHTML = `<div class="modal-backdrop"><div class="modal-card"><div class="modal-head"><h3>${text("快速记一笔", "Quick entry")}</h3><button class="close-button" data-action="close-modal">×</button></div>${simpleBody}<div class="modal-actions"><button class="primary-button" data-action="save-record">${text("保存记录", "Save record")}</button></div></div></div>`;
    return;
  }
}

function choiceButtons(field, choices, active) {
  return choices.map(([value, label]) => `<button class="choice-button ${active === value ? "active" : ""}" data-action="set-choice" data-field="${field}" data-value="${value}">${label}</button>`).join("");
}

function applyNature(d) {
  const relationType = relationshipById(d.relationshipId).type;
  if (d.expectedReturn === "yes") {
    d.nature = d.payer === "me" ? "借款" : "个人承担";
    d.status = d.payer === "me" ? "pending" : "recorded";
  } else if (d.expectedReturn === "unclear") {
    d.nature = relationType === "spouse" ? "家庭款项待确认" : "待确认";
    d.status = "pending";
  } else if (d.beneficiary === "both") {
    d.nature = relationType === "spouse" ? "家庭共同支出" : "共同消费";
    d.status = "recorded";
  } else if (d.beneficiary === "other" && d.payer === "me") {
    d.nature = "赠与";
    d.status = "recorded";
  } else {
    d.nature = "个人承担";
    d.status = "recorded";
  }
}

function natureExplanation(d) {
  if (d.nature === "借款") return "你明确期待返还，因此先进入“需要说清”的列表。下一步可以生成沟通草稿，并邀请对方确认。";
  if (d.nature === "待确认") return "你目前还说不清是否需要返还。系统保留这个不确定性，不强行替你下结论。";
  if (d.nature === "家庭款项待确认") return "夫妻身份会影响财产判断，但仍需结合款项来源、用途、双方约定及是否用于共同生活继续确认。";
  if (d.nature === "家庭共同支出") return "在夫妻关系背景下且双方共同受益，暂记为家庭共同支出；这不等于对财产归属作出最终法律认定。";
  if (d.nature === "赠与") return "对方主要受益，而且你记录为不需要返还，因此暂记为赠与；这不替代双方对事实的确认。";
  if (d.nature === "共同消费") return "双方共同受益，而且不期待返还，因此暂记为共同消费。";
  return "根据目前记录，暂归入个人承担。你以后仍可以修改。";
}

function validateDraftStep() {
  if (state.addStep === 1) {
    syncDraftInputs();
    if (!Number(state.draft.amount) || Number(state.draft.amount) <= 0) return toast("请先填写正确金额"), false;
    if (!state.draft.title.trim()) return toast("请简单写下这笔钱的用途"), false;
  }
  if (state.addStep === 2) syncDraftInputs();
  return true;
}

function syncDraftInputs() {
  document.querySelectorAll("[data-draft]").forEach(input => state.draft[input.dataset.draft] = input.value);
}

function saveDraft() {
  syncDraftInputs();
  const relation = relationshipById(state.draft.relationshipId);
  state.draft.payer = "me";
  state.draft.counterparty = relation.name;
  if (!Number(state.draft.amount) || Number(state.draft.amount) <= 0) return toast(text("先填一个正确金额", "Enter a valid amount first"));
  if ((state.entryMode === "image" || state.entryMode === "receipt") && !state.draft.image) {
    return toast(state.entryMode === "receipt" ? text("请先拍摄或选择一张小票", "Take or choose a receipt first") : text("请先选择一张截图", "Choose a screenshot first"));
  }
  state.draft.amount = Number(state.draft.amount);
  const noteTitle = state.draft.transferMemo || state.draft.note;
  state.draft.title = state.draft.title || (noteTitle ? noteTitle.trim().slice(0, 36) : text(`${categoryLabel(state.draft.category)}记录`, `${categoryLabel(state.draft.category)} record`));
  const singleLimit = Number(state.data.settings.singleLimit || 0);
  const isLarge = singleLimit > 0 && state.draft.amount >= singleLimit;
  const needsReview = state.draft.category === "transfer";
  state.draft.attention = isLarge || needsReview;
  state.draft.status = needsReview ? "pending" : "recorded";
  state.draft.nature = needsReview ? "待确认" : "支出记录";
  state.data.records.push({ ...state.draft });
  state.data.activeRelationshipId = relation.id;
  saveData();
  closeModal();
  state.page = "home";
  render();
  toast(needsReview ? text("已记下；以后需要时再说清", "Saved. Clarify it later if needed") : isLarge ? text("已记下；这笔值得认真留着", "Saved. This one is worth keeping") : text("已经替你记下来了", "Record saved"));
}

function showRecord(id) {
  const r = state.data.records.find(item => item.id === id);
  if (!r) return;
  const canClarify = r.status === "pending" || r.nature === "借款";
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop"><div class="modal-card">
      <div class="modal-head"><h3>${escapeHTML(displayRecordTitle(r))}</h3><button class="close-button" data-action="close-modal">×</button></div>
      ${r.image ? `<img class="detail-image" src="${r.image}" alt="${text("记录截图", "Record screenshot")}">` : ""}
      <div class="detail-lines">
        <div class="detail-line"><span>${text("金额", "Amount")}</span><b>¥${money(r.amount)}</b></div>
        <div class="detail-line"><span>${text("日期", "Date")}</span><b>${formatDate(r.date)}</b></div>
        <div class="detail-line"><span>${text("记录视角", "Record perspective")}</span><b>${text("我的支出", "My spending")}</b></div>
        <div class="detail-line"><span>${text("类目", "Category")}</span><b>${categoryLabel(r.category)}</b></div>
        <div class="detail-line"><span>${text("记录状态", "Status")}</span><b>${r.status === "pending" ? text("以后可说清", "Clarify later") : text("已记录", "Recorded")}</b></div>
        ${r.transferMemo ? `<div class="detail-line"><span>${text("转账附言", "Transfer memo")}</span><b>${escapeHTML(r.transferMemo)}</b></div>` : ""}
        ${r.dueDate ? `<div class="detail-line"><span>${text("期望还款日", "Expected repayment date")}</span><b>${formatDate(r.dueDate)}</b></div>` : ""}
      </div>
      ${canClarify ? `<article class="record-evidence-note"><b>${text("需要说清或咨询时，先核对这笔钱的上下文", "Check the context before clarification or consultation")}</b><p>${text(`付款截图：${r.image ? "已有" : "未添加"} · 转账附言：${r.transferMemo ? "已有" : "未添加"} · 自己留下的话：${r.note ? "已有" : "未添加"}`, `Payment screenshot: ${r.image ? "saved" : "not added"} · Transfer memo: ${r.transferMemo ? "saved" : "not added"} · Your note: ${r.note ? "saved" : "not added"}`)}</p><small>${text("再确认是否保留了前后聊天、通话录音、短信、邮件、借条或后续还款记录。", "Also check for surrounding chats, call recordings, texts, email, an IOU, or later repayments.")}</small></article>` : ""}
      ${r.note ? `<article class="insight-card sage" style="margin-top:12px"><h4>${text("当时记下的话", "Your note at the time")}</h4><p>${escapeHTML(r.note)}</p></article>` : ""}
      <div class="modal-actions">
        ${canClarify ? `<button class="secondary-button" data-action="generate-doc" data-id="${r.id}">${text("生成沟通草稿", "Create a conversation draft")}</button>` : ""}
        <button class="primary-button" data-action="close-modal">${text("知道了", "Done")}</button>
      </div>
    </div></div>`;
}

function generateDocument(id) {
  const r = state.data.records.find(item => item.id === id);
  if (!r) return;
  const isLoan = r.nature === "借款";
  const docText = en()
    ? (isLoan
      ? `Loan Facts Confirmation (PRC-law oriented conversation draft)\n\nRecipient: ${r.counterparty || "________"}\nLender: ________\n\nThe parties propose to confirm that on ${r.date}, the lender paid the recipient ¥${money(r.amount)} for “${displayRecordTitle(r)}”. The parties intend to treat the payment as a loan to be repaid by the recipient.\n\n${r.dueDate ? `Proposed repayment date: ${r.dueDate}.` : "Repayment date: to be agreed."}\n\nAdditional note: ${r.note || "None"}\n\nConfirm the amount, delivery of funds, agreement to lend, repayment date, interest, and dispute terms before creating a formal document. Cross-border elements may require additional review.`
      : `Payment Nature Confirmation (PRC-law oriented conversation draft)\n\nAmount: ¥${money(r.amount)}\nPayment date: ${r.date}\nCategory: ${categoryLabel(r.category)}\nMatter: ${displayRecordTitle(r)}\nTransfer memo: ${r.transferMemo || "None"}\n\nOnly the payment facts have been saved. No legal characterization has been made. If needed, clarify:\n\n1. Whether the payment was received;\n2. Whether it was a loan, gift, shared expense, advance payment, or something else;\n3. If repayment is expected, the amount and date;\n4. Whether any conditions applied.\n\nNote saved at the time: ${r.note || "None"}\n\nCross-border elements may require additional review.`)
    : (isLoan
      ? `借款事实确认（沟通草稿）\n\n确认人：${r.counterparty || "________"}\n出借人：________\n\n双方拟确认：于 ${r.date}，出借人向确认人支付人民币 ${money(r.amount)} 元，用途为“${r.title}”。该款项拟按借款处理，由确认人负责返还。\n\n${r.dueDate ? `拟定返还日期：${r.dueDate}。` : "返还日期：双方另行确认。"}\n\n补充说明：${r.note || "无"}\n\n请双方确认金额、款项交付事实、借款合意、返还期限、利息及争议解决方式后，再形成正式文件。`
      : `款项性质确认（沟通草稿）\n\n涉及款项：人民币 ${money(r.amount)} 元\n支付日期：${r.date}\n类目：${categoryLabel(r.category)}\n事项：${r.title}\n转账附言：${r.transferMemo || "无"}\n\n目前仅保存了付款事实，尚未对款项性质作出判断。需要时可再确认：\n\n1. 是否收到上述款项；\n2. 款项属于借款、赠与、共同消费、代付或其他性质；\n3. 如需返还，返还金额与期限是什么；\n4. 是否还有其他附带条件。\n\n记录人当时留下的话：${r.note || "无"}`);
  document.getElementById("modalRoot").innerHTML = `
    <div class="modal-backdrop"><div class="modal-card">
      <div class="modal-head"><h3>${isLoan ? text("借款事实确认", "Loan facts confirmation") : text("款项性质确认", "Payment nature confirmation")}</h3><button class="close-button" data-action="close-modal">×</button></div>
      <div class="document-preview" id="documentText">${escapeHTML(docText)}</div>
      <p class="disclaimer">${text("本内容仅为根据单方输入生成的沟通草稿，不代表对款项性质作出法律认定，也不等于对方已经确认或完成电子签署。", "This PRC-law oriented draft is based on one person's entry. It is not a legal conclusion, the other person's confirmation, or a completed e-signature. Cross-border issues require separate review.")}</p>
      <div class="modal-actions"><button class="secondary-button" data-action="download-doc" data-id="${r.id}">${text("下载文字草稿", "Download draft")}</button><button class="primary-button" data-action="copy-doc">${text("复制内容", "Copy")}</button></div>
    </div></div>`;
}

function directOpening(relation) {
  return ({
    friend: text("为了把朋友之间的往来记清楚，也避免以后只靠回忆，我想和你核对下面几笔由我支付的款项。", "To keep our financial dealings as friends clear, I would like to confirm the payments below."),
    dating: text("我们还在了解彼此，我想把下面几笔由我支付的款项说清楚。这不是给关系下结论，只是核对事实和双方理解。", "We are still getting to know each other. I would like to clarify the payments below without defining the relationship."),
    matchmaking: text("为了避免相亲和交往过程中的款项以后产生误解，我想核对下面几笔由我支付的款项。", "To avoid later misunderstandings while we get to know each other, I would like to confirm the payments below."),
    ambiguous: text("我们的关系尚未明确，但款项事实可以先说清楚。我想和你核对下面几笔由我支付的款项。", "Our relationship may still be undefined, but the payment facts can be clear. I would like to confirm the payments below."),
    lover: text("为了避免以后只靠回忆争论，我想和你把下面几笔由我支付的款项认真核对一下。", "To avoid relying on memory later, I would like us to confirm the payments below."),
    spouse: text("为了把家庭支出和个人款项的事实整理清楚，我想和你核对下面几笔由我支付的款项。", "To distinguish household expenses from personal payments, I would like us to confirm the payments below.")
  })[relation.type] || text("我想和你核对下面几笔由我支付的款项。", "I would like to confirm the payments below.");
}

function prepareDirect() {
  const records = selectedClarifyRecords().sort((a, b) => a.date.localeCompare(b.date));
  const relationIds = [...new Set(records.map(record => record.relationshipId))];
  if (!records.length) return toast(text("请先选择至少一笔记录", "Select at least one entry"));
  if (relationIds.length !== 1) return toast(text("直面模式一次只能选择同一段关系", "Direct mode can only cover one relationship at a time"));
  const relation = relationshipById(relationIds[0]);
  const total = records.reduce((sum, record) => sum + Number(record.amount), 0);
  const rows = records.map((record, index) => `${index + 1}. ${record.date}｜${displayRecordTitle(record)}｜${categoryLabel(record.category)}｜¥${money(record.amount)}${record.transferMemo ? `｜${text("附言", "Memo")}: ${record.transferMemo}` : ""}`).join("\n");
  const body = en()
    ? `${directOpening(relation)}\n\n${rows}\n\nTotal: ¥${money(total)}\n\nPlease confirm:\n1. Whether you received or benefited from the payments above;\n2. The purpose and nature of each payment;\n3. Whether any amount should be repaid, and if so, the amount and timing;\n4. Whether any item needs correction or added context.\n\nThis page records one person's entries and does not itself establish a debt or legal conclusion.`
    : `${directOpening(relation)}\n\n${rows}\n\n合计：人民币 ${money(total)} 元\n\n想请你确认：\n1. 是否收到或实际受益于上述款项；\n2. 每笔款项的用途和双方当时的理解；\n3. 是否有需要返还的款项，如有，金额和期限是什么；\n4. 是否有哪一笔需要更正或补充上下文。\n\n这只是根据我方记录发起的事实核对，不因发送本页面当然成立借款、赠与或其他法律结论。`;
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card">
    <div class="modal-head"><div><small class="modal-kicker">${text("直面模式 · 对方确认页预览", "Direct mode · Confirmation preview")}</small><h3>${escapeHTML(displayRelationName(relation))} · ${records.length} ${text("笔款项", "payments")}</h3></div><button class="close-button" data-action="close-modal">×</button></div>
    <div class="document-preview" id="documentText">${escapeHTML(body)}</div>
    <p class="disclaimer">${text("正式小程序中，可把这一确认页作为小程序卡片由你主动转发给微信联系人。当前网页原型不会生成真实链接，也不会联系对方。", "In the Mini Program, you could choose to share this confirmation page as a card. This web prototype creates no real link and contacts nobody.")}</p>
    <div class="modal-actions"><button class="secondary-button" data-action="copy-doc">${text("复制沟通文字", "Copy message")}</button><button class="primary-button" data-action="prototype-wechat-share">${text("预览微信转发", "Preview WeChat share")}</button></div>
  </div></div>`;
}

function prepareConsultation() {
  const records = selectedClarifyRecords();
  if (!records.length) return toast(text("请先选择至少一笔记录", "Select at least one entry"));
  const amount = records.reduce((sum, record) => sum + Number(record.amount), 0);
  const screenshots = records.filter(record => record.image).length;
  const memos = records.filter(record => record.transferMemo).length;
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card">
    <div class="modal-head"><div><small class="modal-kicker">${text("咨询材料 · 本地整理", "Consultation material · Local preparation")}</small><h3>${text("先把需要咨询的事实整理好", "Organize the facts you want advice on")}</h3></div><button class="close-button" data-action="close-modal">×</button></div>
    <div class="lawyer-package-summary"><div><span>${text("选中记录", "Selected")}</span><b>${records.length} ${text("笔", "entries")}</b></div><div><span>${text("合计金额", "Total")}</span><b>¥${money(amount)}</b></div><div><span>${text("已有图片", "Images")}</span><b>${screenshots}/${records.length}</b></div><div><span>${text("已有附言", "Memos")}</span><b>${memos}/${records.length}</b></div></div>
    <div class="form-field"><label>${text("给咨询律师的说明（可不填）", "A note for the lawyer you choose (optional)")}</label><textarea id="consultationMessage" rows="5" placeholder="${text("例如：这些钱我一直没好意思问，现在想知道该先怎么整理和沟通。", "For example: I have not known how to raise this and want advice on organizing the facts first.")}"></textarea></div>
    <article class="privacy-status"><span>私</span><div><b>${text("此刻仍只在你的设备上", "Still on your device")}</b><p>${text("下一步只是完整预览。小程序不会预设或推荐接收律师；正式转发时，由你自己选择微信联系人。", "The next step is only a full preview. The app does not preselect or recommend a lawyer; you choose the WeChat contact when sharing.")}</p></div></article>
    <div class="modal-actions"><button class="secondary-button" data-action="close-modal">${text("暂不处理", "Not now")}</button><button class="primary-button" data-action="preview-consultation-package">${text("查看完整预览", "Review full material")}</button></div>
  </div></div>`;
}

function previewConsultationPackage() {
  const records = selectedClarifyRecords().sort((a, b) => a.date.localeCompare(b.date));
  const message = document.getElementById("consultationMessage")?.value.trim() || text("未填写", "Not provided");
  const relationGroups = new Map();
  records.forEach(record => {
    if (!relationGroups.has(record.relationshipId)) relationGroups.set(record.relationshipId, []);
    relationGroups.get(record.relationshipId).push(record);
  });
  const groups = [...relationGroups.entries()].map(([relationId, items]) => {
    const relation = relationshipById(relationId);
    return `${displayRelationName(relation)} · ${relationshipTypeLabel(relation.type)}\n${items.map((record, index) => `  ${index + 1}. ${record.date}｜${displayRecordTitle(record)}｜${categoryLabel(record.category)}｜¥${money(record.amount)}｜${record.image ? text("有图片", "image saved") : text("无图片", "no image")}｜${record.transferMemo || text("无附言", "no memo")}`).join("\n")}`;
  }).join("\n\n");
  const total = records.reduce((sum, record) => sum + Number(record.amount), 0);
  const body = en()
    ? `Legal Consultation Fact Summary (Sharing Preview)\n\nYour note:\n${message}\n\nSelected scope: ${records.length} entries, total ¥${money(total)}\n\n${groups}\n\nEvidence to check: surrounding chats, call recordings, texts, email, IOUs, and later repayments.\n\nThis package contains one person's records only. It is not a legal conclusion and should be reviewed with the lawyer you choose.`
    : `法律咨询事实材料（转发预览）\n\n一、我的说明\n${message}\n\n二、选中范围\n共 ${records.length} 笔，合计人民币 ${money(total)} 元\n\n${groups}\n\n三、建议进一步核对\n前后聊天、通话录音、短信、邮件、借条及后续还款记录。\n\n本材料仅整理用户单方记录，不构成法律结论；款项性质和处理路径仍需你自行选择的律师结合完整材料判断。`;
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card">
    <div class="modal-head"><div><small class="modal-kicker">${text("转发前的最后一步", "Final step before sharing")}</small><h3>${text("你准备转发这些材料", "Material you are preparing to share")}</h3></div><button class="close-button" data-action="close-modal">×</button></div>
    <div class="document-preview" id="documentText">${escapeHTML(body)}</div>
    <p class="disclaimer">${text("当前网页原型没有临时分享服务器。点击“预览微信转发”不会上传或发送数据；正式版只有在你确认后，才会为所选副本生成可撤销、会过期的分享链接。", "This web prototype has no temporary sharing service. Previewing WeChat sharing uploads and sends nothing. A production version would create a revocable, expiring link for the selected copy only after your confirmation.")}</p>
    <div class="modal-actions"><button class="secondary-button" data-action="download-consultation-package">${text("下载自己留存", "Download a copy")}</button><button class="primary-button" data-action="prototype-wechat-share">${text("预览微信转发", "Preview WeChat share")}</button></div>
  </div></div>`;
}

function documentForRecord(id) {
  const r = state.data.records.find(item => item.id === id);
  if (!r) return "";
  generateDocument(id);
  return document.getElementById("documentText")?.innerText || "";
}

function downloadText(filename, text) {
  const blob = new Blob(["\ufeff", text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function privacyStats() {
  const serialized = JSON.stringify(state.data);
  const bytes = new Blob([serialized]).size;
  const size = bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return {
    relationships: state.data.relationships.filter(relation => relation.id !== "empty-relation").length,
    records: state.data.records.length,
    screenshots: state.data.records.filter(record => Boolean(record.image)).length,
    size
  };
}

function exportLocalData() {
  const payload = {
    app: "有来有往 / Give & Take",
    version: 1,
    exportedAt: new Date().toISOString(),
    notice: text("这是用户主动导出的本地备份，可能包含关系称呼、金额、备注和截图。请自行安全保管。", "This user-initiated local backup may contain relationship names, amounts, notes, and screenshots. Store it securely."),
    data: state.data
  };
  downloadText(`有来有往-本地备份-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
  toast(text("本地备份已生成，没有上传", "Local backup created; nothing was uploaded"));
}

function clearLocalData() {
  const confirmed = confirm(text("确定清除全部本地关系、记录和截图吗？此操作无法撤销。建议先导出备份。", "Delete all local relationships, records, and screenshots? This cannot be undone. Export a backup first if needed."));
  if (!confirmed) return;
  state.data = emptyData();
  state.page = "home";
  state.filter = "all";
  state.perspective = "self";
  state.relationshipScope = "all";
  state.clarifySelected = [];
  saveData();
  closeModal();
  render();
  toast(text("全部个人记录和截图已从本地清除", "All personal records and screenshots were deleted locally"));
}

function evidencePack() {
  const relation = activeRelationship();
  const lines = en()
    ? ["Relationship Payment Matter Summary (prototype)", `Generated: ${new Date().toLocaleString("en-US")}`, `Relationship: ${displayRelationName(relation)} · ${relationshipTypeLabel(relation.type)}`, "", "1. Summary", `Amount needing clarification or follow-through: ¥${money(pendingAmount())}`, `Related records: ${pendingRecords().length}`, "", "2. Records"]
    : ["关系款项事项摘要（原型生成）", `生成时间：${new Date().toLocaleString("zh-CN")}`, `当前关系：${relation.name} · ${relationshipTypeLabel(relation.type)}`, "", "一、汇总", `待确认或待履行金额：人民币 ${money(pendingAmount())} 元`, `相关记录：${pendingRecords().length} 笔`, "", "二、逐笔记录"];
  pendingRecords().sort((a,b) => a.date.localeCompare(b.date)).forEach((r, i) => {
    lines.push(en() ? `${i + 1}. ${r.date} | ${displayRecordTitle(r)} | ¥${money(r.amount)} | Clarify later | Note: ${r.note || "None"}` : `${i + 1}. ${r.date}｜${r.title}｜¥${money(r.amount)}｜暂记为${r.nature}｜备注：${r.note || "无"}`);
  });
  lines.push("", text("三、重要说明", "3. Important notice"), text("本摘要仅整理用户单方记录，不代表对方认可，也不构成律师意见。原始转账凭证、聊天记录、双方身份及款项交付情况仍需另行核验。", "This summary organizes one person's records only. It is not the other person's acknowledgment or legal advice. Original payment evidence, messages, identities, and delivery of funds still require verification."));
  downloadText(text("关系款项事项摘要.txt", "relationship-payment-summary.txt"), lines.join("\n"));
  toast(text("事项摘要已生成", "Matter summary created"));
}

async function compressImage(file) {
  if (!file || !file.type.startsWith("image/")) return;
  if (file.size > 12 * 1024 * 1024) return toast(text("图片过大，请选择 12MB 以内的截图", "Image is too large. Choose one under 12 MB"));
  const raw = await fileToDataURL(file);
  const img = await loadImage(raw);
  const max = 1200;
  const ratio = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  state.draft.image = canvas.toDataURL("image/jpeg", .76);
  renderAddModal();
  toast(state.entryMode === "receipt" ? text("小票已加入，请核对金额和类目", "Receipt added. Check the amount and category") : text("截图已加入，请核对金额和类目", "Screenshot added. Check the amount and category"));
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
}
function loadImage(src) {
  return new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
}

function closeModal() { document.getElementById("modalRoot").innerHTML = ""; }

let toastTimer;
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function showInactivityReminder() {
  const relation = activeRelationship();
  const inactivity = inactivityState(relation);
  const timing = inactivity.elapsed === null ? text("这是一条提醒预览。现在还没有足够的记录来计算间隔。", "This is a preview. There are not enough records yet to calculate the gap.") : text(`这是一条提醒预览。距离最近一次记录已经 ${inactivity.elapsed} 天。`, `This is a preview. It has been ${inactivity.elapsed} days since the latest record.`);
  simpleModal(text("这段关系还在继续吗？", "Is this relationship still active?"), `<article class="insight-card quiet-alert"><h4>${text("走散了，也是看清了", "Growing apart is clarity too")}</h4><p>${timing} ${text("如果关系仍在继续，而你也仍在付出，请不要逃避对自己的审视。记录不是为了计较，而是为了尊重你自己。", "If the relationship continues and you are still giving, do not look away from your own pattern. Recording is not scorekeeping; it is self-respect.")}</p></article><article class="insight-card sage"><h4>${text("你们是平等的主体", "You are equal people")}</h4><p>${text("彼此的时间、劳动和金钱都值得被看见，也应该得到互相尊重。", "Both people's time, work, and money deserve to be seen and respected.")}</p></article>`);
}

async function toggleNotifications() {
  const settings = state.data.settings;
  if (settings.notificationsEnabled) {
    settings.notificationsEnabled = false;
    saveData(); render(); toast(text("关系状态提醒已关闭", "Relationship reminders are off"));
    return;
  }
  let browserUnavailable = !("Notification" in window);
  if ("Notification" in window && Notification.permission === "default") {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") browserUnavailable = true;
    } catch (_) {
      browserUnavailable = true;
    }
  }
  if ("Notification" in window && Notification.permission === "denied") browserUnavailable = true;
  settings.notificationsEnabled = true;
  saveData(); render();
  toast(browserUnavailable ? text("已开启应用内提醒；浏览器通知未授权", "In-app reminders are on; browser notifications are unavailable") : text("关系状态提醒已开启", "Relationship reminders are on"));
}

function maybeNotifyInactive() {
  const settings = state.data.settings;
  if (!settings.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
  const relation = activeRelationship();
  const inactivity = inactivityState(relation);
  if (!inactivity.due) return;
  const lastNotice = settings.lastInactivityNotices[relation.id];
  if (lastNotice && daysSince(lastNotice) < 7) return;
  try {
    new Notification(text("有来有往：这段关系还在继续吗？", "Give & Take: Is this relationship still active?"), {
      body: text(`你与${relation.name}已经 ${inactivity.elapsed} 天没有留下记录。走散了，也是看清了；如果仍在付出，请认真看见自己。`, `No record with ${displayRelationName(relation)} for ${inactivity.elapsed} days. If you are still giving, take a clear look at your pattern.`)
    });
  } catch (_) { return; }
  settings.lastInactivityNotices[relation.id] = new Date().toISOString().slice(0, 10);
  saveData();
}

function simpleModal(title, content, button = text("知道了", "Done")) {
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card"><div class="modal-head"><h3>${title}</h3><button class="close-button" data-action="close-modal">×</button></div>${content}<div class="modal-actions"><button class="primary-button" data-action="close-modal">${button}</button></div></div></div>`;
}

function showEvidenceChecklist() {
  simpleModal(text("咨询或核对前，先看这些", "Check these before advice or confirmation"), `
    <div class="lawyer-checklist">
      <article><i>1</i><div><b>${text("付款或转账截图", "Payment or transfer screenshot")}</b><p>${text("看金额、时间、收款方、交易单号和完整页面。", "Check the amount, time, recipient, transaction ID, and full screen.")}</p></div></article>
      <article><i>2</i><div><b>${text("前后完整对话", "The surrounding conversation")}</b><p>${text("不只截一句“收到”，要保留借钱原因、是否承诺返还、用途和后续催款。", "Keep more than a single “received” message: preserve the reason, any promise to repay, purpose, and follow-up requests.")}</p></div></article>
      <article><i>3</i><div><b>${text("转账附言", "Transfer memo")}</b><p>${text("例如“借款”“周转”“礼物”“房租”，原文是什么就保留什么。", "Preserve the exact wording, such as “loan,” “temporary help,” “gift,” or “rent.”")}</p></div></article>
      <article><i>4</i><div><b>${text("其他原始记录", "Other original records")}</b><p>${text("确认是否还有通话录音、短信、邮件、银行流水、借条或对方后续还款。", "Check for call recordings, texts, email, bank statements, IOUs, or later repayments.")}</p></div></article>
    </div>
    <p class="disclaimer">${text("原型只提醒材料种类，不读取、不上传这些内容。不要只保留裁剪图；是否能作为证据及证明力大小，应结合原始载体和具体案件判断。", "The prototype only reminds you what may exist; it does not read or upload any of it. Keep originals, not only cropped images. Admissibility and weight depend on the original data and the specific case.")}</p>`);
}

function showShareBoundary() {
  simpleModal(text("对外分享前，由你决定分享什么", "You decide what leaves your device"), `
    <div class="privacy-flow">
      <article><i>1</i><div><b>${text("默认关闭", "Off by default")}</b><p>${text("日常记录、关系称呼和截图不会因为金额达到提醒线而自动发送。", "Reaching a reminder threshold never sends records, relationship names, or screenshots.")}</p></div></article>
      <article><i>2</i><div><b>${text("逐项选择", "Choose item by item")}</b><p>${text("正式版应先让你选择具体记录、是否包含截图和联系方式，再展示完整预览。", "A production version must let you choose specific records, whether screenshots are included, and contact details, followed by a full preview.")}</p></div></article>
      <article><i>3</i><div><b>${text("确认后才生成分享副本", "Create a shared copy only after confirmation")}</b><p>${text("跨设备查看需要临时分享服务。只有你确认后，所选副本才可加密上传并生成随机链接；未选记录仍留在本地。", "Cross-device viewing needs a temporary sharing service. Only after confirmation may the selected copy be encrypted and assigned a random link; unselected records stay local.")}</p></div></article>
      <article><i>4</i><div><b>${text("联系人由你选择", "You choose the recipient")}</b><p>${text("产品不绑定、不推荐任何律所或律师。你在微信转发界面自行选择联系人，分享链接应支持到期、撤回和删除。", "The product is tied to no lawyer or firm. You choose the contact in WeChat, and the shared link should support expiry, revocation, and deletion.")}</p></div></article>
    </div>
    <p class="privacy-strong-note">${text("当前原型没有分享服务器或真实微信链接。所有转发按钮只展示预览，不会上传或发送任何数据。", "This prototype has no sharing server or real WeChat link. Sharing buttons only preview the flow and upload or send nothing.")}</p>`);
}

function showPrivacyCenter() {
  const stats = privacyStats();
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card privacy-center">
    <div class="modal-head"><div><small>${text("隐私中心", "Privacy center")}</small><h3>${text("你的记录，默认只属于你", "Your records stay private by default")}</h3></div><button class="close-button" data-action="close-modal">×</button></div>
    <article class="privacy-status"><span>✓</span><div><b>${text("当前未连接业务服务器", "No application server connected")}</b><p>${text("没有账户同步、微信钱包读取、自动共享或后台上传。", "No account sync, WeChat wallet access, automatic sharing, or background upload.")}</p></div></article>
    <div class="privacy-stat-grid">
      <div><strong>${stats.relationships}</strong><span>${text("段关系", "relationships")}</span></div>
      <div><strong>${stats.records}</strong><span>${text("笔记录", "records")}</span></div>
      <div><strong>${stats.screenshots}</strong><span>${text("张截图", "screenshots")}</span></div>
      <div><strong>${stats.size}</strong><span>${text("约占本地", "approx. local")}</span></div>
    </div>
    <div class="privacy-section"><h4>${text("当前保存在哪里", "Where data is stored")}</h4>
      <article><b>${text("文字、金额、关系和设置", "Text, amounts, relationships, settings")}</b><p>${text("保存在当前浏览器的本地存储中。换设备或清理浏览器数据后不会自动恢复。", "Stored in this browser's local storage. It will not automatically return on another device or after browser data is cleared.")}</p></article>
      <article><b>${text("你主动选择的截图", "Screenshots you select")}</b><p>${text("只处理选中的图片，压缩后保存在本地；不读取整个相册，也不做后台上传。", "Only the selected image is processed and compressed locally. The app does not read the whole album or upload in the background.")}</p></article>
      <article><b>${text("提醒", "Reminders")}</b><p>${text("当前仅在应用打开时计算，浏览器通知另行请求授权。正式微信提醒必须再次由用户订阅，并只保存发送所需的最少信息。", "Currently calculated while the app is open; browser notifications require separate permission. Production WeChat reminders must require a separate subscription and retain only what is needed to send them.")}</p></article>
    </div>
    <div class="privacy-boundary"><b>${text("只有两个动作可能离开本地", "Only two future actions may leave the device")}</b><p>${text("① 你主动订阅微信提醒；② 你主动生成给对方或律师的临时分享副本。两者都必须分别确认，不能使用一次总授权代替。", "1. You actively subscribe to WeChat reminders. 2. You create a temporary shared copy for the other person or a lawyer. Each requires separate confirmation; one blanket consent is not enough.")}</p><button data-action="show-share-boundary">${text("查看对外分享边界", "See sharing boundary")}</button></div>
    <p class="disclaimer">${text("本地保存不等于加密证据保管。请勿将当前原型作为唯一备份；点击法律小课的官方链接会打开外部网站，但不会附带你的记录。", "Local storage is not an encrypted evidence vault. Do not use this prototype as your only backup. Official legal links open external websites without attaching your records.")}</p>
    <div class="privacy-actions"><button class="secondary-button" data-action="export-local-data">${text("导出本地备份", "Export local backup")}</button><button class="privacy-delete" data-action="clear-local-data">${text("清除全部个人数据", "Delete all personal data")}</button></div>
  </div></div>`;
}

function showLaw(id) {
  const item = legalKnowledge.find(entry => entry.id === id);
  if (!item) return;
  simpleModal(en() ? item.kindEn : item.kindZh, `<article class="law-detail"><h4>${en() ? item.titleEn : item.titleZh}</h4><p>${en() ? item.summaryEn : item.summaryZh}</p><small>${en() ? item.sourceEn : item.sourceZh}</small><a href="${item.url}" target="_blank" rel="noreferrer">${text("查看官方原文 ↗", "Open official source ↗")}</a></article><p class="disclaimer">${text("这是普法摘要，不是针对你的个案意见。", "This is general legal education, not advice on your case.")}</p>`);
}

function showRelationships() {
  const activeId = state.data.activeRelationshipId;
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card">
    <div class="modal-head"><h3>${text("我的关系", "My relationships")}</h3><button class="close-button" data-action="close-modal">×</button></div>
    <div class="relationship-list">${state.data.relationships.map(relation => `<button class="relationship-item ${relation.id === activeId ? "active" : ""}" data-action="select-relationship" data-id="${relation.id}"><i>${relationshipTypeLabel(relation.type).slice(0,1)}</i><span><b>${escapeHTML(displayRelationName(relation))}</b><span>${relationshipTypeLabel(relation.type)} · ${text(`${state.data.records.filter(r => r.relationshipId === relation.id).length} 笔记录`, `${state.data.records.filter(r => r.relationshipId === relation.id).length} records`)}</span></span><em>${relation.id === activeId ? text("当前", "Current") : text("切换", "Switch")}</em></button>`).join("")}</div>
    <button class="primary-button" style="width:100%" data-action="open-new-relationship">＋ ${text("新建关系", "New relationship")}</button>
    <p class="disclaimer">${text("不同关系分别统计。关系类型会调整后续询问和提示，但不会单独决定一笔钱在法律上属于什么。", "Each relationship is tracked separately. Its type can shape later prompts, but never determines the legal nature of a payment on its own.")}</p>
  </div></div>`;
}

function showNewRelationship() {
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card">
    <div class="modal-head"><h3>${text("新建关系", "New relationship")}</h3><button class="close-button" data-action="close-modal">×</button></div>
    <div class="form-field"><label>${text("怎么称呼对方？", "What should this person be called?")}</label><input id="relationshipName" placeholder="${text("例如：小周、她、老公", "e.g. Alex, my partner")}"></div>
    <div class="form-field"><label>${text("目前是什么关系？", "What is the relationship?")}</label><select id="relationshipType">${["friend","dating","matchmaking","ambiguous","lover","spouse"].map(type => `<option value="${type}" ${type === "lover" ? "selected" : ""}>${relationshipTypeLabel(type)}</option>`).join("")}</select></div>
    <div class="form-field"><label>${text("关系开始时间（可选）", "Start date (optional)")}</label><input id="relationshipStart" type="date"></div>
    <div class="form-field"><label>${text("只给自己看的备注（可选）", "Private note (optional)")}</label><textarea id="relationshipNote" rows="3" placeholder="${text("例如：2026年春天开始交往", "e.g. Started dating in spring 2026")}"></textarea></div>
    <article class="insight-card sage"><h4>${text("为什么要区分关系？", "Why does relationship type matter?")}</h4><p>${text("同样一笔转账，发生在朋友、相亲、恋爱或婚姻中，需要追问的事实不同。但关系名称只是背景，不是法律答案。", "The same transfer may raise different questions between friends, dates, partners, or spouses. The label is context, not a legal answer.")}</p></article>
    <div class="modal-actions"><button class="secondary-button" data-action="open-relationships">${text("返回", "Back")}</button><button class="primary-button" data-action="save-relationship">${text("建立关系", "Create")}</button></div>
  </div></div>`;
}

function saveRelationship() {
  const name = document.getElementById("relationshipName")?.value.trim();
  if (!name) return toast(text("请先填写对方称呼", "Enter a name first"));
  const relation = { id: uid(), name, type: document.getElementById("relationshipType").value, startDate: document.getElementById("relationshipStart").value, note: document.getElementById("relationshipNote").value.trim() };
  const replacingEmpty = state.data.relationships.some(item => item.id === "empty-relation");
  if (replacingEmpty) {
    state.data.records.forEach(record => {
      if (record.relationshipId === "empty-relation") {
        record.relationshipId = relation.id;
        if (!record.counterparty || record.counterparty === "—") record.counterparty = name;
      }
    });
    state.data.relationships = state.data.relationships.filter(item => item.id !== "empty-relation");
  }
  state.data.relationships.push(relation);
  state.data.activeRelationshipId = relation.id;
  state.perspective = "self";
  saveData(); closeModal(); state.page = "home"; render(); toast(text(`已建立“${name}”这段关系`, `Relationship “${name}” created`));
}

document.addEventListener("click", async event => {
  const target = event.target.closest("[data-action], [data-page]");
  if (!target) return;
  if (target.dataset.page) {
    if (state.page === target.dataset.page) return;
    state.page = target.dataset.page;
    render();
    return;
  }
  const action = target.dataset.action;
  if (action === "toggle-language") {
    state.language = en() ? "zh" : "en";
    localStorage.setItem(LANGUAGE_KEY, state.language);
    closeModal(); render({ preserveScroll: state.page === "clarify" });
  }
  if (action === "open-relationships") showRelationships();
  if (action === "open-new-relationship") showNewRelationship();
  if (action === "save-relationship") saveRelationship();
  if (action === "select-relationship") { state.data.activeRelationshipId = target.dataset.id; state.perspective = "self"; saveData(); closeModal(); state.page = "home"; render(); toast(text("已切换当前关系", "Relationship switched")); }
  if (action === "set-relationship-scope") {
    if (isRelationshipOverviewPage()) state.relationshipScope = target.dataset.id;
    else if (target.dataset.id !== "all") { state.data.activeRelationshipId = target.dataset.id; saveData(); }
    state.perspective = "self";
    state.clarifySelected = [];
    render({ preserveScroll: state.page === "clarify" });
  }
  if (action === "open-entry-menu") openEntryMenu();
  if (action === "open-add-text") openAdd("text");
  if (action === "open-add-image") openAdd("image");
  if (action === "open-add-receipt") openAdd("receipt");
  if (action === "open-add-gift") openAdd("gift");
  if (action === "set-record-relationship") {
    state.draft.relationshipId = target.dataset.id;
    state.draft.counterparty = relationshipById(target.dataset.id).name;
    renderAddModal();
  }
  if (action === "set-perspective") { state.perspective = target.dataset.perspective; render(); }
  if (action === "close-modal") closeModal();
  if (action === "next-step" && validateDraftStep()) { state.addStep += 1; renderAddModal(); }
  if (action === "prev-step") { syncDraftInputs(); state.addStep -= 1; renderAddModal(); }
  if (action === "set-choice") { state.draft[target.dataset.field] = target.dataset.value; renderAddModal(); }
  if (action === "save-record") saveDraft();
  if (action === "set-filter") { state.filter = target.dataset.filter; render(); }
  if (action === "set-clarify-category") { state.clarifyCategory = target.dataset.category; render({ preserveScroll: true }); }
  if (action === "toggle-clarify-record") {
    state.clarifySelected = state.clarifySelected.includes(target.dataset.id)
      ? state.clarifySelected.filter(id => id !== target.dataset.id)
      : [...state.clarifySelected, target.dataset.id];
    render({ preserveScroll: true });
  }
  if (action === "select-all-clarify") {
    state.clarifySelected = [...new Set([...state.clarifySelected, ...clarifyCandidateRecords().map(record => record.id)])];
    render({ preserveScroll: true });
  }
  if (action === "clear-clarify-selection") { state.clarifySelected = []; render({ preserveScroll: true }); }
  if (action === "set-clarify-mode") { state.clarifyMode = target.dataset.mode; render({ preserveScroll: true }); }
  if (action === "prepare-direct") prepareDirect();
  if (action === "prepare-consultation") prepareConsultation();
  if (action === "preview-consultation-package") previewConsultationPackage();
  if (action === "prototype-wechat-share") toast(text("正式小程序中将由你主动选择微信联系人；当前没有生成或发送链接", "In the Mini Program you would choose a contact; no link was created or sent here"));
  if (action === "download-consultation-package") {
    const packageText = document.getElementById("documentText")?.innerText || "";
    downloadText(text("法律咨询事实材料.txt", "legal-consultation-fact-summary.txt"), packageText);
  }
  if (action === "record-detail") showRecord(target.dataset.id);
  if (action === "generate-doc") generateDocument(target.dataset.id);
  if (action === "copy-doc") {
    const copiedText = document.getElementById("documentText")?.innerText || "";
    try { await navigator.clipboard.writeText(copiedText); toast(text("内容已复制", "Copied")); } catch (_) { toast(text("浏览器未允许复制，请手动选择文本", "Copy was blocked. Select the text manually")); }
  }
  if (action === "download-doc") {
    const draftText = document.getElementById("documentText")?.innerText || "";
    downloadText(text("款项确认沟通草稿.txt", "payment-conversation-draft.txt"), draftText);
  }
  if (action === "evidence-pack") evidencePack();
  if (action === "go-records") { state.page = "records"; render(); }
  if (action === "go-clarify") { state.page = "clarify"; render(); }
  if (action === "go-me") { state.page = "me"; render(); }
  if (action === "preview-inactivity") showInactivityReminder();
  if (action === "show-evidence-checklist") showEvidenceChecklist();
  if (action === "show-share-boundary") showShareBoundary();
  if (action === "show-law") showLaw(target.dataset.lawId);
  if (action === "export-local-data") exportLocalData();
  if (action === "clear-local-data") clearLocalData();
  if (action === "toggle-notifications") await toggleNotifications();
  if (action === "show-reflection") simpleModal("后来不太舒服的支出", `<article class="insight-card peach"><h4>本月合计 ¥${money(regretAmount())}</h4><p>这些记录被你标记为“有点后悔”或“心里没底”。数字并不说明你做错了，只是提醒你看看当时发生了什么。</p></article>${renderRecordCards(monthRecords().filter(r => ["regret","uneasy"].includes(r.feeling)))}`);
  if (action === "show-principle") simpleModal(text("提醒原则", "Reminder principles"), `<article class="insight-card sage"><h4>${text("尊重你自己", "Respect yourself")}</h4><p>${text("记录下来，就是对你自己付出的尊重。都是你的血汗钱，值得被认真看见。", "Keeping a record respects the work behind what you gave. Your money deserves to be seen clearly.")}</p></article><article class="insight-card peach"><h4>${text("平等，不是计较", "Equality is not scorekeeping")}</h4><p>${text("你们是平等的主体，彼此的劳动、金钱与心意都应该互相尊重。", "Both people are equal. Each person's work, money, and care deserve mutual respect.")}</p></article><article class="insight-card quiet-alert"><h4>${text("只记录真正需要看见的", "Record what truly needs to be seen")}</h4><p>${text("不鼓励逐笔记录小额日常；更值得关注的是大额给付、长期单方面付款，以及需要留存事实的支出。", "Do not log every small daily purchase. Focus on larger payments, long one-sided patterns, and facts that may matter later.")}</p></article>`);
  if (action === "show-ideal-meaning") {
    const relation = scopedRelationship() || activeRelationship();
    const meta = idealMeta(relation);
    simpleModal(text("理想回应，不是现实推断", "An ideal response, not a claim about reality"), `<article class="insight-card peach"><h4>${meta.list}</h4><p>${text("这段话只给付款方看，是把你可能期待却没有说出口的尊重呈现出来。它不代表现实中的对方真的这样想，也不会发送给对方。", "This voice is only for the person who paid. It gives words to the respect you may wish to hear, but does not claim the real person thinks this, and nothing is sent.")}</p></article>`);
  }
  if (action === "show-privacy") showPrivacyCenter();
  if (action === "reset-demo") { if (confirm(text("确定恢复初始演示数据吗？你新增的本地记录会被清除。", "Reset the demo? Your local records will be removed."))) { state.data = defaultData(); state.relationshipScope = "all"; state.clarifySelected = []; state.perspective = "self"; saveData(); render(); toast(text("已恢复演示数据", "Demo data reset")); } }
});

document.addEventListener("change", event => {
  if (event.target.id === "receiptFile") compressImage(event.target.files[0]);
  if (event.target.matches("[data-clarify-month]")) { state.clarifyMonth = event.target.value; render({ preserveScroll: true }); }
  if (event.target.matches("[data-setting]")) {
    state.data.settings[event.target.dataset.setting] = Number(event.target.value || 0);
    saveData(); render({ preserveScroll: true }); toast(text("设置已保存", "Setting saved"));
  }
});

document.addEventListener("input", event => {
  if (state.draft && event.target.matches("[data-draft]")) state.draft[event.target.dataset.draft] = event.target.value;
});

document.getElementById("modalRoot").addEventListener("click", event => {
  if (event.target.classList.contains("modal-backdrop")) closeModal();
});

render();
