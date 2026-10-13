const store = require("../../utils/store");
const ui = require("../../utils/ui");

function consecutivePaymentMonths(records) {
  const months = new Set(records.map(item => String(item.date).slice(0, 7)).filter(value => /^\d{4}-\d{2}$/.test(value)));
  let cursor = new Date();
  cursor.setDate(1);
  let count = 0;
  while (count < 120) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    if (!months.has(key)) break;
    count += 1;
    cursor.setMonth(cursor.getMonth() - 1);
  }
  return count;
}

Page({
  data: {
    hasRelationship: false,
    relationship: null,
    relationshipNames: [],
    relationshipIndex: 0,
    monthAmount: "0",
    yearAmount: "0",
    totalAmount: "0",
    recordCount: 0,
    latestRecords: [],
    reminders: [],
    fullDate: ui.fullDate(),
    perspective: "self",
    monthLimit: "0",
    percent: 0,
    idealResponse: ""
  },

  onShow() {
    ui.selectTab(this, 0);
    this.setData({ fullDate: ui.fullDate() });
    this.refresh();
  },

  refresh() {
    const data = store.load();
    const relationship = store.activeRelationship(data);
    const relationshipNames = data.relationships.map(item => item.name);
    const relationshipIndex = Math.max(0, data.relationships.findIndex(item => item.id === data.activeRelationshipId));
    if (!relationship) {
      this.setData({ hasRelationship: false, relationshipNames, relationshipIndex });
      return;
    }
    const records = store.recordsForRelationship(data, relationship.id)
      .sort((a, b) => store.compareRecordTime(a, b));
    const currentMonth = store.today().slice(0, 7);
    const currentYear = store.today().slice(0, 4);
    const monthAmount = store.sum(records.filter(item => item.date.startsWith(currentMonth)));
    const yearAmount = store.sum(records.filter(item => item.date.startsWith(currentYear)));
    const totalAmount = store.sum(records);
    const monthlyLimit = Number(data.settings.monthlyLimit || 0);
    const percent = monthlyLimit > 0 ? Math.min(100, Math.round(monthAmount / monthlyLimit * 100)) : 0;
    const yearlyLimit = Number(data.settings.yearlyLimit || 0);
    const singleLimit = Number(data.settings.singleLimit || 0);
    const lawyerLine = Number(data.settings.lawyerLine || 0);
    const pendingCount = records.filter(item => singleLimit > 0 && Number(item.amount) >= singleLimit).length;
    const countLimit = Number(data.settings.oneSidedCountLimit || 0);
    const monthCountLimit = Number(data.settings.oneSidedMonthLimit || 0);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 29);
    const cutoffText = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
    const recentCount = records.filter(item => String(item.date) >= cutoffText && String(item.date) <= store.today()).length;
    const consecutiveMonths = consecutivePaymentMonths(records);
    const reminders = [];
    if (monthlyLimit > 0 && monthAmount >= monthlyLimit) reminders.push({ id: "month", title: "本月支出已达到你设置的提醒线", body: `当前记录为 ¥${store.money(monthAmount)}。这里只提示累计金额，是否调整由你决定。`, target: "records" });
    if (yearlyLimit > 0 && yearAmount >= yearlyLimit) reminders.push({ id: "year", title: "本年支出已达到你设置的提醒线", body: `当前记录为 ¥${store.money(yearAmount)}。数字只用于回看事实。`, target: "records" });
    if (pendingCount) reminders.push({ id: "pending", title: `${pendingCount} 笔支出达到单笔提醒线`, body: "可以停一下，看看是否需要和对方说清，或整理对应材料。", target: "clarify" });
    if (lawyerLine > 0 && totalAmount >= lawyerLine) reminders.push({ id: "material", title: "累计金额达到材料整理提醒线", body: "可以检查付款截图、附言和前后沟通是否已经妥善保存。", target: "clarify" });
    if (countLimit > 0 && recentCount >= countLimit) reminders.push({ id: "count", title: "最近30天的付款次数达到提醒线", body: `当前记录为 ${recentCount} 次。这里只呈现持续模式，不评价你的选择。`, target: "records" });
    if (monthCountLimit > 0 && consecutiveMonths >= monthCountLimit) reminders.push({ id: "months", title: "连续付款月份达到提醒线", body: `已经连续 ${consecutiveMonths} 个月留下付款记录，可以回看这段持续模式。`, target: "records" });
    this.setData({
      hasRelationship: true,
      relationship: {
        ...relationship,
        typeLabel: store.relationshipTypeLabel(relationship.type),
        typeInitial: store.relationshipTypeLabel(relationship.type).slice(0, 1)
      },
      relationshipNames,
      relationshipIndex,
      monthAmount: store.money(monthAmount),
      yearAmount: store.money(yearAmount),
      totalAmount: store.money(totalAmount),
      recordCount: records.length,
      latestRecords: records.slice(0, 3).map(item => ({
        ...item,
        categoryInitial: store.categoryLabel(item.category).slice(0, 1),
        categoryLabel: store.categoryLabel(item.category),
        amountText: store.money(item.amount),
        sourceLabel: ({ text: "文字记录", image: "截图记录", receipt: "小票记录", gift: "礼物记录" })[item.source] || "文字记录"
      })),
      reminders,
      monthLimit: store.money(monthlyLimit),
      percent,
      idealResponse: this.idealResponse(relationship, records[0])
    });
  },

  idealResponse(relationship, record) {
    if (!record) return "我会看见并尊重你的付出，也愿意认真回应。";
    if (relationship.type === "friend") return "我会记得你的照顾，不把这份帮助当作理所当然。";
    if (record.category === "gift") return "谢谢你准备这份心意。我会认真记得，也愿意回应。";
    if (relationship.type === "spouse") return "这次开支由你承担。我会看见这份辛苦，也愿意共同分担。";
    return "我会认真看见并尊重你的付出，也愿意用行动回应。";
  },

  setPerspective(event) {
    this.setData({ perspective: event.currentTarget.dataset.value });
  },

  onRelationshipChange(event) {
    const data = store.load();
    const index = Number(event.detail.value);
    const relationship = data.relationships[index];
    if (!relationship) return;
    data.activeRelationshipId = relationship.id;
    store.save(data);
    this.refresh();
  },

  addRecord() {
    if (!this.data.hasRelationship) {
      wx.navigateTo({ url: "/pages/relationship-edit/index" });
      return;
    }
    wx.navigateTo({ url: "/pages/record-edit/index" });
  },

  addRelationship() {
    wx.navigateTo({ url: "/pages/relationship-edit/index" });
  },

  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  },

  openReminder(event) {
    if (event.currentTarget.dataset.target === "clarify") {
      const data = store.load();
      store.updateClarifyState(data, {
        relationshipId: data.activeRelationshipId,
        selectedIds: [],
        mode: event.currentTarget.dataset.id === "material" ? "consult" : "direct",
        scope: event.currentTarget.dataset.id === "material" ? "all" : "alert",
        month: "all",
        category: "all"
      });
    } else {
      ui.setRecordsReminder({
        relationshipId: store.load().activeRelationshipId,
        kind: event.currentTarget.dataset.id
      });
    }
    wx.switchTab({
      url: event.currentTarget.dataset.target === "clarify" ? "/pages/clarify/index" : "/pages/records/index",
      fail: () => ui.takeRecordsReminder()
    });
  },

  openRecords() { wx.switchTab({ url: "/pages/records/index" }); },
  openRecord(event) { wx.navigateTo({ url: `/pages/record-detail/index?id=${event.currentTarget.dataset.id}` }); }
});
