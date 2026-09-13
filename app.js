const STORAGE_KEY = "youjieyouhuan.prototype.v1";
const LANGUAGE_KEY = "youjieyouhuan.prototype.language";

const state = {
  page: "home",
  filter: "all",
  perspective: "self",
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
    points: ["Record meaningful relationship spending", "Choose a category, add a screenshot or note", "Receive calm, factual reminders"],
    local: "Prototype data stays in this browser", nav: ["Today", "Records", "Clarify", "Me"], privacy: "Privacy", add: "Choose how to record"
  } : {
    name: "有来有往", tagline: "关系支出自我觉察工具", headline: "爱可以感性，<br>钱最好清醒。",
    intro: "这不是共同账本。它只帮助你留下事实、看清长期的付出，并把重要的钱及时说清楚。",
    points: ["记录一笔关系支出", "选类目，留截图或一句话", "得到克制而明确的提醒"],
    local: "初版数据仅保存在当前浏览器中", nav: ["今天", "记录", "说清", "我的"], privacy: "隐私说明", add: "选择记录方式"
  };
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
  return {
    settings: { monthlyLimit: 12000, singleLimit: 5000, lawyerLine: 30000, notificationsEnabled: false, inactivityDays: 30, lastInactivityNotices: {} },
    activeRelationshipId: relationId,
    relationships: [
      { id: relationId, name: "她", type: "lover", startDate: offsetDate(-120), note: "演示关系" }
    ],
    records: [
      { id: uid(), relationshipId: relationId, date: offsetDate(-2), title: "一起吃晚餐", category: "dining", transferMemo: "", counterparty: "她", amount: 680, payer: "me", nature: "支出记录", note: "这次一起吃晚餐。", dueDate: "", status: "recorded", image: "" },
      { id: uid(), relationshipId: relationId, date: offsetDate(-5), title: "周末出行车票", category: "travel", transferMemo: "", counterparty: "她", amount: 1250, payer: "me", nature: "支出记录", note: "周末出行的车票。", dueDate: "", status: "recorded", image: "" },
      { id: uid(), relationshipId: relationId, date: offsetDate(-8), title: "送给对方的手机", category: "gift", transferMemo: "生日礼物", counterparty: "她", amount: 6999, payer: "me", nature: "支出记录", note: "送给她的手机。", dueDate: "", status: "recorded", image: "" },
      { id: uid(), relationshipId: relationId, date: offsetDate(-12), title: "临时周转转账", category: "transfer", transferMemo: "临时周转", counterparty: "她", amount: 20000, payer: "me", nature: "待确认", note: "对方说过以后处理，但没有明确日期。", dueDate: "", status: "pending", image: "" },
      { id: uid(), relationshipId: relationId, date: offsetDate(-18), title: "对方请的电影", category: "daily", transferMemo: "", counterparty: "她", amount: 520, payer: "other", nature: "支出记录", note: "她请我看电影。", dueDate: "", status: "recorded", image: "" }
    ]
  };
}

function emptyData() {
  const relationId = "empty-relation";
  return {
    settings: { monthlyLimit: 12000, singleLimit: 5000, lawyerLine: 30000, notificationsEnabled: false, inactivityDays: 30, lastInactivityNotices: {} },
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
  data.settings = data.settings || {};
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

function relationshipById(id) {
  return state.data.relationships.find(r => r.id === id) || activeRelationship();
}

function activeRecords() {
  return state.data.records.filter(r => r.relationshipId === state.data.activeRelationshipId);
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

function myMonthSpend() {
  return monthRecords().filter(r => r.payer === "me").reduce((sum, r) => sum + Number(r.amount), 0);
}

function counterpartMonthSpend() {
  return monthRecords().filter(r => r.payer === "other").reduce((sum, r) => sum + Number(r.amount), 0);
}

function pendingRecords() {
  return activeRecords().filter(r => (r.status === "pending" || r.nature === "借款") && r.status !== "settled");
}

function pendingAmount() {
  return pendingRecords().filter(r => r.payer === "me").reduce((sum, r) => sum + Number(r.amount), 0);
}

function consecutiveMine() {
  const sorted = [...activeRecords()].sort((a, b) => b.date.localeCompare(a.date));
  let count = 0;
  for (const record of sorted) {
    if (record.payer !== "me") break;
    count += 1;
  }
  return count;
}

function regretAmount() {
  return monthRecords().filter(r => r.payer === "me" && ["regret", "uneasy"].includes(r.feeling)).reduce((sum, r) => sum + Number(r.amount), 0);
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

function render() {
  applyStaticLocale();
  const [title, dateLabel] = pageMeta[state.language][state.page];
  const relation = activeRelationship();
  document.getElementById("pageTitle").textContent = state.page === "home" && state.perspective === "ideal"
    ? text(`今天，${displayRelationName(relation)}这样看见你`, `Today, through ${displayRelationName(relation)}'s ideal eyes`)
    : title;
  document.getElementById("todayLabel").textContent = state.page === "home" ? fullDate() : dateLabel;
  document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.page === state.page));
  const view = document.getElementById("appView");
  view.innerHTML = renderRelationshipStrip() + ({ home: renderHome, records: renderRecords, clarify: renderClarify, me: renderMe })[state.page]();
  view.scrollTop = 0;
  maybeNotifyInactive();
}

function renderRelationshipStrip() {
  const relation = activeRelationship();
  if (relation.id === "empty-relation") {
    return `<div class="relationship-strip empty-relationship-strip">
      <button class="relationship-current" data-action="open-new-relationship"><span class="relationship-avatar">＋</span><span><small>${text("还没有建立关系", "No relationship yet")}</small><b>${text("新建一段关系开始记录", "Create one to start recording")}</b></span><i>›</i></button>
    </div>`;
  }
  return `<div class="relationship-strip">
    <button class="relationship-current" data-action="open-relationships"><span class="relationship-avatar">${escapeHTML(relationshipTypeLabel(relation.type).slice(0,1))}</span><span><small>${text("当前关系", "Current relationship")}</small><b>${escapeHTML(displayRelationName(relation))} · ${relationshipTypeLabel(relation.type)}</b></span><i>⌄</i></button>
    <button class="relationship-new" data-action="open-new-relationship">＋ ${text("新建关系", "New")}</button>
  </div>`;
}

function fullDate() {
  return new Intl.DateTimeFormat(en() ? "en-US" : "zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());
}

function renderHome() {
  const spend = myMonthSpend();
  const limit = Number(state.data.settings.monthlyLimit || 1);
  const percent = Math.min(100, Math.round(spend / limit * 100));
  const pending = pendingRecords().length;
  const streak = consecutiveMine();
  const inactivity = inactivityState();
  if (state.perspective === "ideal") return renderIdealHome({ spend, limit, percent, pending, streak });
  const insights = [];

  if (spend >= limit) insights.push(`<article class="insight-card peach" data-action="go-me"><div class="insight-top"><div><h4>${text("你已越过本月提醒线", "You have crossed your monthly reminder line")}</h4><p>${text("不是说你花错了，只是想问：这是你原本愿意承担的程度吗？", "This does not mean you spent wrongly. Is this still what you meant to take on?")}</p></div><span class="arrow">›</span></div></article>`);
  if (streak >= 3) insights.push(`<article class="insight-card sage" data-action="go-records"><div class="insight-top"><div><h4>${text(`最近 ${streak} 次都由你付款`, `You paid the last ${streak} times`)}</h4><p>${text("只呈现事实，不替你判断关系。你可以回头看看这段时间的付出。", "Just the facts, without judging the relationship. Take a look at the pattern over time.")}</p></div><span class="arrow">›</span></div></article>`);
  if (pending) insights.push(`<article class="insight-card amber" data-action="go-clarify"><div class="insight-top"><div><h4>${text(`${pending} 笔钱还没有说清楚`, `${pending} item${pending === 1 ? "" : "s"} may need clarification`)}</h4><p>${text("越早确认，越不需要在以后靠回忆争论。", "Clear facts early, so you do not have to argue from memory later.")}</p></div><span class="arrow">›</span></div></article>`);
  if (state.data.settings.notificationsEnabled && inactivity.due) insights.push(`<article class="insight-card quiet-alert" data-action="preview-inactivity"><div class="insight-top"><div><h4>${text("这段关系还在继续吗？", "Is this relationship still active?")}</h4><p>${text(`已经 ${inactivity.elapsed} 天没有留下记录。走散了，也是看清了；如果你仍在持续付出，请不要逃避对自己的审视。`, `No record for ${inactivity.elapsed} days. If you have moved apart, that is clarity too. If you are still giving, do not look away from the pattern.`)}</p></div><span class="arrow">›</span></div></article>`);

  return `
    ${renderPerspectiveSwitch()}
    <section class="hero-card">
      <div class="hero-label">${text("本月由你承担", "Paid by you this month")}</div>
      <div class="hero-value">¥ ${money(spend)}</div>
      <div class="hero-sub">${text(`对方记录支出 ¥${money(counterpartMonthSpend())} · 只基于你的记录`, `Recorded as paid by them: ¥${money(counterpartMonthSpend())} · Based only on your entries`)}</div>
      <div class="hero-progress"><span style="width:${percent}%"></span></div>
      <div class="hero-foot"><span>${text("提醒线", "Reminder line")} ¥${money(limit)}</span><span>${percent}%</span></div>
    </section>
    ${renderEntryGrid(pending)}
    <article class="record-principle"><b>${text("记录下来，是对自己付出的尊重", "Keeping a record respects what you contributed")}</b><p>${text("不必记录每一笔小钱。更值得留下的是：单笔较大、长期单方面付款，或让你心里没底的支出。都是你的血汗钱，值得被认真看见。", "You do not need to log every small purchase. Keep the larger payments, long one-sided patterns, and anything whose facts may matter later.")}</p></article>
    <div class="section-head"><h3>${text("给此刻的你", "For you, right now")}</h3><button data-action="show-principle">${text("提醒原则", "Why reminders?")}</button></div>
    ${insights.join("") || `<article class="insight-card sage"><h4>${text("目前没有需要特别提醒的事", "Nothing needs special attention right now")}</h4><p>${text("记录不是为了算计，而是为了不在情绪里忘记自己。", "This is not scorekeeping. It is a way to remember yourself clearly.")}</p></article>`}
    <div class="section-head"><h3>${text("最近记录", "Recent records")}</h3><button data-action="go-records">${text("查看全部", "View all")}</button></div>
    <div class="record-list">${renderRecordCards([...activeRecords()].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 3))}</div>
  `;
}

function renderPerspectiveSwitch() {
  const relation = activeRelationship();
  if (relation.id === "empty-relation") return "";
  return `<div class="perspective-switch" aria-label="${text("视角切换", "Perspective")}">
    <button class="${state.perspective === "self" ? "active" : ""}" data-action="set-perspective" data-perspective="self">${text("我的记录", "My record")}</button>
    <button class="${state.perspective === "ideal" ? "active" : ""}" data-action="set-perspective" data-perspective="ideal">${text(`理想中的${displayRelationName(relation)}`, "The ideal response")}</button>
  </div>`;
}

function renderEntryGrid(pending) {
  return `<div class="quick-grid">
    <button class="quick-card" data-action="open-add-text"><b>${text("文", "T")}</b><span>${text("文字记录<br>写下一笔事实", "Text entry<br>Save the facts")}</span></button>
    <button class="quick-card" data-action="open-add-image"><b>${text("图", "S")}</b><span>${text("截图记录<br>付款或聊天凭证", "Screenshot<br>Payment or chat")}</span></button>
    <button class="quick-card" data-action="open-wechat-sync"><b>${text("微", "W")}</b><span>${text("微信付款同步<br>像积分一样记下", "WeChat sync<br>Concept demo")}</span></button>
    <button class="quick-card" data-action="go-clarify"><b>${pending}</b><span>${text("需要说清<br>的款项", "May need<br>clarifying")}</span></button>
  </div>`;
}

function idealVoiceForRecord(record) {
  const relation = record ? relationshipById(record.relationshipId) : activeRelationship();
  if (!record) return text("他愿意为这段关系认真付出。我希望自己也能看见、记住，并好好回应。", "He shows up for this relationship. I want to notice it, remember it, and respond with care.");
  if (relation.type === "spouse" && record.category !== "transfer") return text("家里的开支今天又是他在承担。一起生活不是把一个人的辛苦当成默认，我也应该主动分担并记得他的付出。", "He covered another household expense today. Sharing a life should not make one person's effort invisible; I want to contribute too.");
  if (relation.type === "friend" && ["dining", "travel", "daily"].includes(record.category)) return text("今天又是他付钱。朋友之间的照顾不该只有一边，下次我来，也要让他感受到被惦记。", "He paid again today. Care between friends should not flow only one way—next time, I want it to be my turn.");
  if (record.category === "gift") return text(`今天很高兴收到他送的${record.title.replace(/^送给对方的/, "")}。这份心意不是理所当然，下次我也想认真为他做点什么。`, "I am happy to receive this gift. His thoughtfulness is not something I should take for granted; I want to return that care.");
  if (record.category === "transfer") return text("他愿意在我需要的时候转这笔钱，但工作和赚钱都不容易。我应该主动把安排说清楚，不能让他的信任悬在那里。", "He transferred this when I needed it, but earning money is never effortless. I should clarify the arrangement instead of leaving his trust hanging.");
  if (record.category === "dining") return text("今天又是他付钱。工作都不容易，我得好好记下来。下次不能再让他付钱了，我要坚持。", "He paid again today. We both work hard, and I want to remember that. Next meal really should be on me.");
  return text("他的付出不是理所当然。我想认真记住，也想在下一次主动回应。", "His contribution is not automatic. I want to remember it and respond more actively next time.");
}

function renderIdealHome({ spend, limit, percent, pending, streak }) {
  const latestPaid = [...activeRecords()].filter(r => r.payer === "me").sort((a,b) => b.date.localeCompare(a.date))[0];
  return `
    ${renderPerspectiveSwitch()}
    <section class="hero-card ideal-hero">
      <div class="hero-label">${text(`在理想中的${displayRelationName(activeRelationship())}眼里`, "Seen through an ideal response")}</div>
      <div class="hero-value">¥ ${money(spend)}</div>
      <div class="hero-sub">${text("这个月，他为这段关系认真付出的金额", "What you contributed to the relationship this month")}</div>
      <div class="hero-progress"><span style="width:${percent}%"></span></div>
      <div class="hero-foot"><span>${text("每一笔都值得被看见", "Every contribution deserves to be seen")}</span><span>${text(`${Math.min(streak, 9)} 次连续付款`, `${Math.min(streak, 9)} in a row`)}</span></div>
    </section>
    <article class="ideal-voice">
      <small>${text("如果这份付出被认真看见", "If this contribution were truly seen")}</small>
      <h4>${escapeHTML(idealVoiceForRecord(latestPaid))}</h4>
      <p>${latestPaid ? `${formatDate(latestPaid.date)} · ${escapeHTML(displayRecordTitle(latestPaid))} · ¥${money(latestPaid.amount)}` : text("从一笔记录开始", "Start with one record")}</p>
    </article>
    <p class="mirror-note">${text("这是为付款方呈现的“理想回应”，不代表现实中的她真实这样想。", "This is an imagined ideal response for the person who paid. It is not a claim about what the other person actually thinks.")}</p>
    ${renderEntryGrid(pending)}
    <div class="section-head"><h3>${text("她也许会这样记得", "What an ideal response might sound like")}</h3><button data-action="show-ideal-meaning">${text("这是什么？", "What is this?")}</button></div>
    ${[...activeRecords()].filter(r => r.payer === "me").sort((a,b) => b.date.localeCompare(a.date)).slice(1,3).map(r => `<article class="insight-card peach"><h4>${escapeHTML(idealVoiceForRecord(r))}</h4><p>${formatDate(r.date)} · ${escapeHTML(displayRecordTitle(r))} · ¥${money(r.amount)}</p></article>`).join("")}
  `;
}

function renderRecordCards(records) {
  if (!records.length) return `<div class="empty-state"><div class="empty-icon">○</div><h3>${text("还没有记录", "No records yet")}</h3><p>${text("记下事实即可，不需要马上给每笔钱下结论。", "Save the facts. You do not need to decide what every payment means right away.")}</p></div>`;
  return records.map(r => {
    const source = r.source === "wechat-demo" ? text("微信同步示例", "WeChat demo") : r.image ? text("截图记录", "Screenshot") : text("文字记录", "Text entry");
    return `
    <article class="record-card" data-action="record-detail" data-id="${r.id}">
      <div class="record-icon">${categoryIcon(r.category)}</div>
      <div class="record-main"><b>${escapeHTML(displayRecordTitle(r))}</b><span>${source} · ${formatDate(r.date)} · ${categoryLabel(r.category)}${r.status === "pending" ? text(" · 稍后说清", " · Clarify later") : ""}</span></div>
      <div class="record-amount"><b>${r.payer === "me" ? "−" : "+"}¥${money(r.amount)}</b><span>${r.payer === "me" ? text("你付款", "You paid") : text("对方付款", "They paid")}</span></div>
    </article>
  `; }).join("");
}

function renderRecords() {
  const filters = [
    ["all", text("全部", "All")], ["mine", text("我付款", "I paid")], ["other", text("对方付款", "They paid")], ["pending", text("稍后说清", "Clarify later")], ["image", text("有截图", "With screenshot")]
  ];
  let records = [...activeRecords()].sort((a,b) => b.date.localeCompare(a.date));
  if (state.filter === "mine") records = records.filter(r => r.payer === "me");
  if (state.filter === "other") records = records.filter(r => r.payer === "other");
  if (state.filter === "pending") records = records.filter(r => r.status === "pending");
  if (state.filter === "image") records = records.filter(r => r.image);
  return `
    <div class="page-intro"><h3>${text("每一笔，都是当时的你", "Each record preserves a moment")}</h3><p>${text("这里留下的是事实，不是对一段关系的判决。", "These are facts you saved, not a verdict on the relationship.")}</p></div>
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
    <div class="evidence-head"><div><small>${text("律师通常先看事实材料", "What a lawyer usually checks first")}</small><h4>${text("不需要再做复杂问卷", "No long questionnaire needed")}</h4></div><button data-action="show-evidence-checklist">${text("材料清单", "Checklist")}</button></div>
    <p>${text("先看付款截图、转账附言和前后对话，再提醒你确认是否还有通话录音、短信、邮件或其他原始记录。", "Start with the payment screenshot, transfer memo, and surrounding conversation. Then check for call recordings, texts, email, or other original records.")}</p>
    <div class="evidence-grid">${item("付款截图", "Payment screenshot", withScreenshot, records.length)}${item("转账附言", "Transfer memo", withMemo, records.length)}${item("自己留下的话", "Your note", withNote, records.length)}</div>
  </article>`;
}

function renderLegalKnowledge() {
  return `<div class="section-head law-section-head"><h3>${text("法律小课 · 中国法", "Legal basics · PRC law")}</h3><span>${text("初期静态展示 · 后续可定期更新", "Static for now · Updatable later")}</span></div>
    <div class="law-feed">${legalKnowledge.map(item => `<button class="law-card" data-action="show-law" data-law-id="${item.id}"><span>${en() ? item.kindEn : item.kindZh}</span><b>${en() ? item.titleEn : item.titleZh}</b><small>${en() ? item.sourceEn : item.sourceZh}</small></button>`).join("")}</div>
    <p class="law-disclaimer">${text("只做普法提示，不根据你的单方记录自动作出法律结论。法条、司法解释和案例更新后，应由律师审核再推送。", "General legal education only. The app does not draw legal conclusions from one person's records. Updates should be lawyer-reviewed before publication.")}</p>`;
}

function renderClarify() {
  const records = pendingRecords().sort((a,b) => b.date.localeCompare(a.date));
  const risk = pendingAmount() >= state.data.settings.lawyerLine;
  return `
    <div class="page-intro"><h3>${text("该说清的钱，及时说清", "Clarify important money in time")}</h3><p>${text("“待确认”不是法律结论，只表示你目前还没有得到足够明确的共同意思。", "“Clarify later” is not a legal conclusion. It only means the shared understanding is not clear yet.")}</p></div>
    ${en() ? `<article class="jurisdiction-note"><b>English interface · PRC law first</b><p>This version is intended for cross-border marriages and relationships involving China. Changing the interface language does not change the governing law. Other cross-border rules can be added later after legal review.</p></article>` : ""}
    ${renderEvidenceOverview(records)}
    <div class="clarify-total"><small>${text("待确认或待履行金额", "Amount needing clarification or follow-through")}</small><strong>¥ ${money(pendingAmount())}</strong><span class="status-pill">${text(`${records.length} 笔正在关注`, `${records.length} item${records.length === 1 ? "" : "s"} watched`)}</span></div>
    ${risk ? `<article class="insight-card red"><h4>${text("金额已达到你的法律关注线", "The amount has reached your legal-attention line")}</h4><p>${text("建议先整理事实和证据，再决定是否需要律师判断。原型不会替你自动联系任何人。", "Organize the facts and evidence first, then decide whether to ask a lawyer. This prototype never contacts anyone for you.")}</p><div class="clarify-actions"><button class="small-button" data-action="show-lawyer-boundary">${text("律师介入边界", "Sharing boundary")}</button><button class="small-button primary" data-action="evidence-pack">${text("生成事项摘要", "Create matter summary")}</button></div></article>` : ""}
    <div class="section-head"><h3>${text("款项列表", "Payment list")}</h3></div>
    <div class="record-list">${renderRecordCards(records)}</div>
    ${!records.length ? "" : `<p class="disclaimer">${text("提示：单方记录、对方确认和正式电子签署的效力不同。初版生成的文本仅作为沟通草稿。", "A private note, the other person's confirmation, and a formal e-signature do not have the same legal effect. Prototype text is only a communication draft.")}</p>`}
    ${renderLegalKnowledge()}
  `;
}

function renderMe() {
  const mySpend = myMonthSpend();
  const total = mySpend + counterpartMonthSpend();
  const share = total ? Math.round(mySpend / total * 100) : 0;
  return `
    <div class="page-intro"><h3>${text("看看最近的自己", "Look at your recent pattern")}</h3><p>${text("数字只是镜子。它帮助你觉察模式，不替你决定应该爱谁、应该花多少。", "Numbers are a mirror. They can reveal a pattern, but they do not decide whom to love or how much to spend.")}</p></div>
    <div class="metric-grid">
      <div class="metric-card"><span>${text("本月由你承担", "Your share this month")}</span><strong>${share}</strong><small>%</small></div>
      <div class="metric-card"><span>${text("本月留下记录", "Records this month")}</span><strong>${monthRecords().length}</strong><small>${text("笔", "")}</small></div>
      <div class="metric-card"><span>${text("连续由你付款", "Paid by you in a row")}</span><strong>${consecutiveMine()}</strong><small>${text("次", "")}</small></div>
      <div class="metric-card"><span>${text("尚未说清", "Not yet clear")}</span><strong>${activeRecords().filter(r => r.status === "pending").length}</strong><small>${text("笔", "")}</small></div>
    </div>
    <div class="section-head"><h3>${text("你的提醒线", "Your reminder lines")}</h3></div>
    <div class="settings-card">
      <div class="settings-row"><div><b>${text("每月关系支出", "Monthly relationship spending")}</b><span>${text("达到后提醒你回看", "Remind you when reached")}</span></div><input type="number" min="0" data-setting="monthlyLimit" value="${state.data.settings.monthlyLimit}"></div>
      <div class="settings-row"><div><b>${text("单笔大额支出", "Single large payment")}</b><span>${text("达到后提醒这笔值得留下", "Suggest keeping a record")}</span></div><input type="number" min="0" data-setting="singleLimit" value="${state.data.settings.singleLimit}"></div>
      <div class="settings-row"><div><b>${text("法律关注金额", "Legal-attention amount")}</b><span>${text("建议整理材料而非直接下结论", "Organize facts before drawing conclusions")}</span></div><input type="number" min="0" data-setting="lawyerLine" value="${state.data.settings.lawyerLine}"></div>
    </div>
    <div class="section-head"><h3>${text("关系状态提醒", "Relationship status reminder")}</h3><button data-action="preview-inactivity">${text("预览提醒", "Preview")}</button></div>
    <div class="settings-card">
      <div class="settings-row"><div><b>${text("开启通知", "Enable notifications")}</b><span>${text("长期没有记录时，提醒你确认关系状态", "Check in after a long gap")}</span></div><button class="toggle-control ${state.data.settings.notificationsEnabled ? "on" : ""}" role="switch" aria-checked="${state.data.settings.notificationsEnabled}" data-action="toggle-notifications"><i></i></button></div>
      <div class="settings-row"><div><b>${text("多久没有记录后提醒", "Remind after no records for")}</b><span>${text("按当前关系最后一笔记录计算", "Counted from the latest entry")}</span></div><div class="number-suffix"><input type="number" min="7" data-setting="inactivityDays" value="${state.data.settings.inactivityDays}"><em>${text("天", "days")}</em></div></div>
    </div>
    <p class="local-reminder-note">${text("当前是纯本地原型：应用内提醒可以体验；浏览器通知需由你主动授权，并且页面关闭后不能保证后台送达。正式小程序需接入微信订阅消息或服务号。", "This is a local prototype. In-app reminders work here; browser notifications require your permission and may not arrive after the page closes. A production app needs a compliant messaging service.")}</p>
    <div class="section-head"><h3>${text("正式小程序阶段", "Production-stage requirements")}</h3></div>
    <div class="settings-card">
      <div class="roadmap-item"><i class="roadmap-dot"></i><div><b>${text("微信账单导入能力核实", "Verify payment-import access")}</b><span>${text("普通授权并不等于可以读取用户全部个人交易流水。", "Ordinary user authorization does not automatically allow full transaction-history access.")}</span></div></div>
      <div class="roadmap-item"><i class="roadmap-dot"></i><div><b>${text("双方确认与可靠电子签", "Mutual confirmation and reliable e-signing")}</b><span>${text("需要身份核验、版本固化、时间记录和签署服务。", "Identity checks, fixed versions, timestamps, and a signing service are needed.")}</span></div></div>
      <div class="roadmap-item"><i class="roadmap-dot"></i><div><b>${text("订阅消息或服务号提醒", "Compliant reminder delivery")}</b><span>${text("需要遵守微信消息模板、用户订阅和发送场景限制。", "Messages must follow platform consent, template, and sending rules.")}</span></div></div>
    </div>
    <div class="section-head"><h3>${text("隐私与数据", "Privacy & data")}</h3><button data-action="show-privacy">${text("打开隐私中心", "Open privacy center")}</button></div>
    <article class="privacy-summary-card"><div><i>本地</i><span><b>${text("记录默认不出设备", "Records stay on device")}</b><small>${text("律师共享与后台同步均未开启", "Lawyer sharing and cloud sync are off")}</small></span></div><button data-action="show-privacy">${text("管理", "Manage")}</button></article>
    <button class="danger-link" data-action="reset-demo">${text("恢复初始演示数据", "Reset demo data")}</button>
  `;
}

function newDraft() {
  const relation = activeRelationship();
  return { id: uid(), relationshipId: relation.id, date: new Date().toISOString().slice(0,10), title: "", category: "dining", transferMemo: "", counterparty: relation.name, amount: "", payer: "me", nature: "支出记录", note: "", dueDate: "", status: "recorded", image: "" };
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
  state.entryMode = mode;
  state.draft = newDraft();
  renderAddModal();
}

function openEntryMenu() {
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card">
    <div class="modal-head"><h3>${text("你想怎么记？", "How would you like to record it?")}</h3><button class="close-button" data-action="close-modal">×</button></div>
    <div class="entry-menu">
      <button class="entry-option" data-action="open-add-text"><i>${text("文", "T")}</i><span><b>${text("文字记录", "Text entry")}</b><span>${text("金额、类目，再给自己留一句话", "Amount, category, and one sentence for yourself")}</span></span><em>›</em></button>
      <button class="entry-option" data-action="open-add-image"><i>${text("图", "S")}</i><span><b>${text("截图记录", "Screenshot entry")}</b><span>${text("选择截图，补上金额和类目即可", "Choose a screenshot, then add amount and category")}</span></span><em>›</em></button>
      <button class="entry-option wechat" data-action="open-wechat-sync"><i>${text("微", "W")}</i><span><b>${text("微信付款同步", "WeChat Pay sync")}</b><span>${text("像商场积分一样，支付后形成待确认记录", "A concept demo: create an entry after payment")}</span></span><em>›</em></button>
    </div>
  </div></div>`;
}

function showWechatSync() {
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card">
    <div class="modal-head"><h3>${text("微信付款记录同步", "WeChat Pay record sync")}</h3><button class="close-button" data-action="close-modal">×</button></div>
    <div class="sync-card"><div class="sync-card-head"><div class="sync-logo">${text("微", "W")}</div><div><h4>${text("支付后，自动形成一笔待完善记录", "Create a draft record after payment")}</h4></div></div><p>${text("产品设想类似商场积分：用户授权后，在平台允许的支付场景中获得金额、时间和商户信息，再由用户补充“这笔钱是什么”。", "The concept works like a loyalty-points flow: with consent and only where the platform permits, amount, time, and merchant details form a draft for the user to complete.")}</p></div>
    <div class="sync-example"><div><b>${text("双人晚餐 · 同步示例", "Dinner for two · Sync demo")}</b><span>${text("今天 19:28 · 微信支付", "Today 19:28 · WeChat Pay")}</span></div><strong>¥268</strong></div>
    <p class="disclaimer">${text("当前是本地原型，未连接真实微信账户，也不会读取你的微信钱包或聊天记录。下面只用示例数据体验后续分类流程。", "This local prototype is not connected to a real WeChat account and does not read your wallet or chats. The next step uses sample data only.")}</p>
    <div class="modal-actions"><button class="secondary-button" data-action="open-entry-menu">${text("换一种记录方式", "Choose another method")}</button><button class="primary-button" data-action="sync-demo">${text("用示例体验同步", "Try the sync demo")}</button></div>
  </div></div>`;
}

function startWechatDemo() {
  state.entryMode = "wechat";
  state.draft = { ...newDraft(), title: text("双人晚餐", "Dinner for two"), category: "dining", note: text("微信支付形成的待完善示例。", "Draft created from the WeChat Pay demo."), amount: 268, payer: "me", source: "wechat-demo" };
  renderAddModal();
}

function renderAddModal() {
  const d = state.draft;
  const root = document.getElementById("modalRoot");
  {
    const categories = ["dining", "gift", "transfer", "travel", "daily", "other"].map(value => [value, categoryLabel(value)]);
    const sourceText = state.entryMode === "wechat" ? text("微信同步示例 · 简单核对后保存", "WeChat sync demo · Check and save") : state.entryMode === "image" ? text("截图记录 · 图片只保存在当前设备", "Screenshot entry · Image stays on this device") : text("快速记录 · 先把事实留下来", "Quick entry · Save the facts first");
    const simpleBody = `
      <div class="source-banner">${sourceText}</div>
      <div class="form-grid" style="margin-top:14px">
        <div class="form-field"><label>${text("金额", "Amount")}</label><input data-draft="amount" type="number" min="0" step="0.01" value="${escapeHTML(d.amount)}" placeholder="0.00"></div>
        <div class="form-field"><label>${text("日期", "Date")}</label><input data-draft="date" type="date" value="${d.date}"></div>
      </div>
      <div class="choice-question compact-question"><label>${text("谁付的？", "Who paid?")}</label><div class="choice-row two">${choiceButtons("payer", [["me",text("我付的", "I paid")],["other",text("对方付的", "They paid")]], d.payer)}</div></div>
      <div class="choice-question compact-question"><label>${text("选个类目就行", "Choose a category")}</label><div class="category-grid">${categories.map(([value,label]) => `<button class="category-button ${d.category === value ? "active" : ""}" data-action="set-choice" data-field="category" data-value="${value}"><i>${categoryIcon(value)}</i>${label}</button>`).join("")}</div></div>
      <label class="upload-zone compact-upload" for="receiptFile">
        ${d.image ? `<img src="${d.image}" alt="${text("截图预览", "Screenshot preview")}">` : `<div><b>${state.entryMode === "image" ? text("选择付款或聊天截图", "Choose a payment or chat screenshot") : text("需要的话，加一张截图", "Add a screenshot if useful")}</b><span>${text("只选择这一张图片，不读取整个相册", "Only the selected image is used; the whole album is never read")}<br>${text("原型压缩后仅存于当前浏览器", "The compressed image stays in this browser")}</span></div>`}
      </label>
      <input id="receiptFile" type="file" accept="image/*" hidden>
      ${d.category === "transfer" ? `<div class="form-field"><label>${text("转账附言（可不填）", "Transfer memo (optional)")}</label><input data-draft="transferMemo" value="${escapeHTML(d.transferMemo)}" placeholder="${text("例如：临时周转、房租、生日礼物", "e.g. short-term help, rent, birthday gift")}"></div>` : ""}
      <div class="form-field"><label>${text("给自己留一句话（可不填）", "One sentence for yourself (optional)")}</label><textarea rows="3" data-draft="note" placeholder="${text("发生了什么，按你自己的话记下来就好", "What happened, in your own words")}">${escapeHTML(d.note)}</textarea></div>
      <p class="recording-nudge">${text("不必现在给这笔钱下结论。先把真实发生的事留下来。", "You do not need to decide what this money means now. Save what happened first.")}</p>
    `;
    root.innerHTML = `<div class="modal-backdrop"><div class="modal-card"><div class="modal-head"><h3>${text("快速记一笔", "Quick entry")}</h3><button class="close-button" data-action="close-modal">×</button></div>${simpleBody}<div class="modal-actions"><button class="primary-button" data-action="save-record">${text("保存记录", "Save record")}</button></div></div></div>`;
    return;
  }
  let body = "";
  if (state.addStep === 1) body = `
    <div class="step-indicator"><span class="active"></span><span></span><span></span></div>
    ${state.entryMode === "image" ? `<label class="upload-zone" for="receiptFile">
      ${d.image ? `<img src="${d.image}" alt="截图预览">` : `<div><b>上传付款或聊天截图</b><span>原型会压缩后仅存于当前浏览器<br>识别功能暂以人工核对字段代替</span></div>`}
    </label>
    <input id="receiptFile" type="file" accept="image/*" hidden>` : `<div class="source-banner">文字记录 · 先写下事实，后面再判断它的性质</div>`}
    <div class="form-grid" style="margin-top:14px">
      <div class="form-field"><label>金额</label><input data-draft="amount" type="number" min="0" step="0.01" value="${escapeHTML(d.amount)}" placeholder="0.00"></div>
      <div class="form-field"><label>日期</label><input data-draft="date" type="date" value="${d.date}"></div>
    </div>
    <div class="form-field"><label>这笔钱是做什么的？</label><input data-draft="title" value="${escapeHTML(d.title)}" placeholder="例如：帮对方临时周转"></div>
    <div class="form-grid">
      <div class="form-field"><label>涉及谁</label><input data-draft="counterparty" value="${escapeHTML(d.counterparty)}" placeholder="对方昵称"></div>
      <div class="form-field"><label>谁付款</label><select data-draft="payer"><option value="me" ${d.payer === "me" ? "selected" : ""}>我付款</option><option value="other" ${d.payer === "other" ? "selected" : ""}>对方付款</option></select></div>
    </div>
    <p class="recording-nudge">不必勉强自己记每一笔小钱。大额、连续单方付款，或让你不舒服的支出，更值得留下。</p>
  `;
  if (state.addStep === 2) body = `
    <div class="step-indicator"><span class="active"></span><span class="active"></span><span></span></div>
    ${state.entryMode === "wechat" ? `<div class="source-banner">微信同步示例 · ${escapeHTML(d.title)} · ¥${money(d.amount)} · ${formatDate(d.date)}</div>` : ""}
    <div class="relation-legal-note"><b>当前关系：${escapeHTML(relationshipById(d.relationshipId).name)} · ${relationshipTypeLabel(relationshipById(d.relationshipId).type)}</b><p>${relationshipLegalHint(relationshipById(d.relationshipId).type)}</p></div>
    <div class="choice-question"><label>这笔钱主要是谁实际使用或受益？</label><div class="choice-row">${choiceButtons("beneficiary", [["both","共同"],["other","对方"],["self","自己"]], d.beneficiary)}</div></div>
    <div class="choice-question"><label>付款时，你是否期待以后返还？</label><div class="choice-row">${choiceButtons("expectedReturn", [["yes","要返还"],["no","不用还"],["unclear","说不清"]], d.expectedReturn)}</div></div>
    <div class="choice-question"><label>现在回头看，你的感受是？</label><div class="choice-row">${choiceButtons("feeling", [["worth","值得"],["normal","一般"],["regret","有点后悔"],["uneasy","心里没底"]], d.feeling)}</div></div>
    <div class="form-field"><label>还想记下什么？（可选）</label><textarea rows="3" data-draft="note" placeholder="例如：当时对方说下个月还">${escapeHTML(d.note)}</textarea></div>
    ${d.expectedReturn === "yes" ? `<div class="form-field"><label>期望还款日（可选）</label><input data-draft="dueDate" type="date" value="${d.dueDate}"></div>` : ""}
  `;
  if (state.addStep === 3) {
    applyNature(d);
    body = `
      <div class="step-indicator"><span class="active"></span><span class="active"></span><span class="active"></span></div>
      <div class="nature-result"><small>根据你刚才记录的事实</small><strong>暂记为：${d.nature}</strong><p>${natureExplanation(d)}</p></div>
      <div class="detail-lines">
        <div class="detail-line"><span>金额</span><b>¥${money(d.amount)}</b></div>
        <div class="detail-line"><span>谁付款</span><b>${d.payer === "me" ? "你" : "对方"}</b></div>
        <div class="detail-line"><span>主要受益</span><b>${({both:"共同",other:"对方",self:"自己"})[d.beneficiary]}</b></div>
        <div class="detail-line"><span>返还期待</span><b>${({yes:"需要返还",no:"不用返还",unclear:"尚未说清"})[d.expectedReturn]}</b></div>
        <div class="detail-line"><span>你的感受</span><b>${feelingLabel(d.feeling)}</b></div>
      </div>
      <p class="disclaimer">这只是记录分类，不是法律定性。若涉及争议，应结合聊天内容、转账事实、双方关系与后续履行综合判断。</p>
      ${d.payer === "me" && Number(d.amount) >= Number(state.data.settings.singleLimit || 0) ? `<article class="self-respect-note"><b>尊重你自己</b><p>都是你的血汗钱，值得记录。你们是平等的主体，应该互相尊重；记录下来，就是对你自己付出的尊重。</p></article>` : ""}
    `;
  }
  const firstTitle = state.entryMode === "image" ? "截图记一笔" : "文字记一笔";
  root.innerHTML = `<div class="modal-backdrop"><div class="modal-card"><div class="modal-head"><h3>${[firstTitle, "这笔钱，对你意味着什么？", "先这样记下来"][state.addStep - 1]}</h3><button class="close-button" data-action="close-modal">×</button></div>${body}<div class="modal-actions">${state.addStep > 1 ? `<button class="secondary-button" data-action="prev-step">上一步</button>` : ""}<button class="primary-button" data-action="${state.addStep === 3 ? "save-record" : "next-step"}">${state.addStep === 3 ? "保存记录" : "继续"}</button></div></div></div>`;
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
  if (!Number(state.draft.amount) || Number(state.draft.amount) <= 0) return toast(text("先填一个正确金额", "Enter a valid amount first"));
  state.draft.amount = Number(state.draft.amount);
  const noteTitle = state.draft.transferMemo || state.draft.note;
  state.draft.title = state.draft.title || (noteTitle ? noteTitle.trim().slice(0, 36) : text(`${categoryLabel(state.draft.category)}记录`, `${categoryLabel(state.draft.category)} record`));
  const isLarge = state.draft.amount >= Number(state.data.settings.singleLimit || 0);
  const needsReview = state.draft.category === "transfer";
  state.draft.attention = isLarge || needsReview;
  state.draft.status = needsReview ? "pending" : "recorded";
  state.draft.nature = needsReview ? "待确认" : "支出记录";
  state.data.records.push({ ...state.draft });
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
        <div class="detail-line"><span>${text("付款人", "Paid by")}</span><b>${r.payer === "me" ? text("你", "You") : text("对方", "Them")}</b></div>
        <div class="detail-line"><span>${text("类目", "Category")}</span><b>${categoryLabel(r.category)}</b></div>
        <div class="detail-line"><span>${text("记录状态", "Status")}</span><b>${r.status === "pending" ? text("以后可说清", "Clarify later") : text("已记录", "Recorded")}</b></div>
        ${r.transferMemo ? `<div class="detail-line"><span>${text("转账附言", "Transfer memo")}</span><b>${escapeHTML(r.transferMemo)}</b></div>` : ""}
        ${r.dueDate ? `<div class="detail-line"><span>${text("期望还款日", "Expected repayment date")}</span><b>${formatDate(r.dueDate)}</b></div>` : ""}
      </div>
      ${canClarify ? `<article class="record-evidence-note"><b>${text("律师会先核对这笔钱的上下文", "A lawyer will first check the context")}</b><p>${text(`付款截图：${r.image ? "已有" : "未添加"} · 转账附言：${r.transferMemo ? "已有" : "未添加"} · 自己留下的话：${r.note ? "已有" : "未添加"}`, `Payment screenshot: ${r.image ? "saved" : "not added"} · Transfer memo: ${r.transferMemo ? "saved" : "not added"} · Your note: ${r.note ? "saved" : "not added"}`)}</p><small>${text("再确认是否保留了前后聊天、通话录音、短信、邮件、借条或后续还款记录。", "Also check for surrounding chats, call recordings, texts, email, an IOU, or later repayments.")}</small></article>` : ""}
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
  toast(text("截图已加入，请核对金额和类目", "Screenshot added. Check the amount and category"));
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
  simpleModal(text("律师通常先看这些", "What a lawyer usually checks first"), `
    <div class="lawyer-checklist">
      <article><i>1</i><div><b>${text("付款或转账截图", "Payment or transfer screenshot")}</b><p>${text("看金额、时间、收款方、交易单号和完整页面。", "Check the amount, time, recipient, transaction ID, and full screen.")}</p></div></article>
      <article><i>2</i><div><b>${text("前后完整对话", "The surrounding conversation")}</b><p>${text("不只截一句“收到”，要保留借钱原因、是否承诺返还、用途和后续催款。", "Keep more than a single “received” message: preserve the reason, any promise to repay, purpose, and follow-up requests.")}</p></div></article>
      <article><i>3</i><div><b>${text("转账附言", "Transfer memo")}</b><p>${text("例如“借款”“周转”“礼物”“房租”，原文是什么就保留什么。", "Preserve the exact wording, such as “loan,” “temporary help,” “gift,” or “rent.”")}</p></div></article>
      <article><i>4</i><div><b>${text("其他原始记录", "Other original records")}</b><p>${text("确认是否还有通话录音、短信、邮件、银行流水、借条或对方后续还款。", "Check for call recordings, texts, email, bank statements, IOUs, or later repayments.")}</p></div></article>
    </div>
    <p class="disclaimer">${text("原型只提醒材料种类，不读取、不上传这些内容。不要只保留裁剪图；是否能作为证据及证明力大小，应结合原始载体和具体案件判断。", "The prototype only reminds you what may exist; it does not read or upload any of it. Keep originals, not only cropped images. Admissibility and weight depend on the original data and the specific case.")}</p>`);
}

function showLawyerBoundary() {
  simpleModal(text("联系律师前，由你决定分享什么", "You decide what a lawyer receives"), `
    <div class="privacy-flow">
      <article><i>1</i><div><b>${text("默认关闭", "Off by default")}</b><p>${text("日常记录、关系称呼和截图不会因为金额达到提醒线而自动发送。", "Reaching a reminder threshold never sends records, relationship names, or screenshots.")}</p></div></article>
      <article><i>2</i><div><b>${text("逐项选择", "Choose item by item")}</b><p>${text("正式版应先让你选择具体记录、是否包含截图和联系方式，再展示完整预览。", "A production version must let you choose specific records, whether screenshots are included, and contact details, followed by a full preview.")}</p></div></article>
      <article><i>3</i><div><b>${text("一次授权", "One-time authorization")}</b><p>${text("只有你确认本次咨询及材料范围后，选中的副本才可加密传给指定律师。", "Only after you confirm the consultation and its scope may selected copies be encrypted and sent to the chosen lawyer.")}</p></div></article>
      <article><i>4</i><div><b>${text("可查、可撤、可删", "Review, revoke, delete")}</b><p>${text("正式版需显示接收人、访问记录、保存期限，并提供撤回授权和申请删除入口。", "A production version must show recipients, access history, retention, revocation, and deletion controls.")}</p></div></article>
    </div>
    <p class="privacy-strong-note">${text("当前原型没有律师账户、上传接口或发送按钮。生成事项摘要只会下载到你的设备。", "This prototype has no lawyer account, upload endpoint, or send button. Creating a matter summary only downloads it to your device.")}</p>`);
}

function showPrivacyCenter() {
  const stats = privacyStats();
  document.getElementById("modalRoot").innerHTML = `<div class="modal-backdrop"><div class="modal-card privacy-center">
    <div class="modal-head"><div><small>${text("隐私中心", "Privacy center")}</small><h3>${text("你的记录，默认只属于你", "Your records stay private by default")}</h3></div><button class="close-button" data-action="close-modal">×</button></div>
    <article class="privacy-status"><span>✓</span><div><b>${text("当前未连接业务服务器", "No application server connected")}</b><p>${text("没有账户同步、微信钱包读取、律师共享或后台上传。", "No account sync, WeChat wallet access, lawyer sharing, or background upload.")}</p></div></article>
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
    <div class="privacy-boundary"><b>${text("只有两个动作可能离开本地", "Only two future actions may leave the device")}</b><p>${text("① 你主动订阅微信提醒；② 你主动发起律师咨询并确认分享范围。两者都不能使用一次总授权代替。", "1. You actively subscribe to WeChat reminders. 2. You start a lawyer consultation and confirm what to share. Neither may be covered by one blanket consent.")}</p><button data-action="show-lawyer-boundary">${text("查看律师介入边界", "See lawyer-sharing boundary")}</button></div>
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
  if (target.dataset.page) { state.page = target.dataset.page; render(); return; }
  const action = target.dataset.action;
  if (action === "toggle-language") {
    state.language = en() ? "zh" : "en";
    localStorage.setItem(LANGUAGE_KEY, state.language);
    closeModal(); render();
  }
  if (action === "open-relationships") showRelationships();
  if (action === "open-new-relationship") showNewRelationship();
  if (action === "save-relationship") saveRelationship();
  if (action === "select-relationship") { state.data.activeRelationshipId = target.dataset.id; state.perspective = "self"; saveData(); closeModal(); state.page = "home"; render(); toast(text("已切换当前关系", "Relationship switched")); }
  if (action === "open-entry-menu") openEntryMenu();
  if (action === "open-add-text") openAdd("text");
  if (action === "open-add-image") openAdd("image");
  if (action === "open-wechat-sync") showWechatSync();
  if (action === "sync-demo") startWechatDemo();
  if (action === "set-perspective") { state.perspective = target.dataset.perspective; render(); }
  if (action === "close-modal") closeModal();
  if (action === "next-step" && validateDraftStep()) { state.addStep += 1; renderAddModal(); }
  if (action === "prev-step") { syncDraftInputs(); if (state.entryMode === "wechat" && state.addStep === 2) showWechatSync(); else { state.addStep -= 1; renderAddModal(); } }
  if (action === "set-choice") { state.draft[target.dataset.field] = target.dataset.value; renderAddModal(); }
  if (action === "save-record") saveDraft();
  if (action === "set-filter") { state.filter = target.dataset.filter; render(); }
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
  if (action === "show-lawyer-boundary") showLawyerBoundary();
  if (action === "show-law") showLaw(target.dataset.lawId);
  if (action === "export-local-data") exportLocalData();
  if (action === "clear-local-data") clearLocalData();
  if (action === "toggle-notifications") await toggleNotifications();
  if (action === "show-reflection") simpleModal("后来不太舒服的支出", `<article class="insight-card peach"><h4>本月合计 ¥${money(regretAmount())}</h4><p>这些记录被你标记为“有点后悔”或“心里没底”。数字并不说明你做错了，只是提醒你看看当时发生了什么。</p></article>${renderRecordCards(monthRecords().filter(r => ["regret","uneasy"].includes(r.feeling)))}`);
  if (action === "show-principle") simpleModal(text("提醒原则", "Reminder principles"), `<article class="insight-card sage"><h4>${text("尊重你自己", "Respect yourself")}</h4><p>${text("记录下来，就是对你自己付出的尊重。都是你的血汗钱，值得被认真看见。", "Keeping a record respects the work behind what you gave. Your money deserves to be seen clearly.")}</p></article><article class="insight-card peach"><h4>${text("平等，不是计较", "Equality is not scorekeeping")}</h4><p>${text("你们是平等的主体，彼此的劳动、金钱与心意都应该互相尊重。", "Both people are equal. Each person's work, money, and care deserve mutual respect.")}</p></article><article class="insight-card quiet-alert"><h4>${text("只记录真正需要看见的", "Record what truly needs to be seen")}</h4><p>${text("不鼓励逐笔记录小额日常；更值得关注的是大额给付、长期单方面付款，以及需要留存事实的支出。", "Do not log every small daily purchase. Focus on larger payments, long one-sided patterns, and facts that may matter later.")}</p></article>`);
  if (action === "show-ideal-meaning") {
    const name = escapeHTML(activeRelationship().name);
    simpleModal(text("理想回应，不是现实推断", "An ideal response, not a claim about reality"), `<article class="insight-card peach"><h4>${text("这段话只给付款方看", "This voice is only for the person who paid")}</h4><p>${text(`系统借“理想中的${name}”的声音，把你可能期待却没有说出口的回应呈现出来。它不代表现实中的${name}真的这样想，也不会发送给对方。`, `The app gives words to the acknowledgment you may wish to hear. It does not claim ${name} truly thinks this, and nothing is sent to them.`)}</p></article>`);
  }
  if (action === "show-privacy") showPrivacyCenter();
  if (action === "reset-demo") { if (confirm(text("确定恢复初始演示数据吗？你新增的本地记录会被清除。", "Reset the demo? Your local records will be removed."))) { state.data = defaultData(); saveData(); render(); toast(text("已恢复演示数据", "Demo data reset")); } }
});

document.addEventListener("change", event => {
  if (event.target.id === "receiptFile") compressImage(event.target.files[0]);
  if (event.target.matches("[data-setting]")) {
    state.data.settings[event.target.dataset.setting] = Number(event.target.value || 0);
    saveData(); render(); toast(text("设置已保存", "Setting saved"));
  }
});

document.addEventListener("input", event => {
  if (state.draft && event.target.matches("[data-draft]")) state.draft[event.target.dataset.draft] = event.target.value;
});

document.getElementById("modalRoot").addEventListener("click", event => {
  if (event.target.classList.contains("modal-backdrop")) closeModal();
});

render();
