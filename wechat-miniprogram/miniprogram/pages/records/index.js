const store = require("../../utils/store");
const ui = require("../../utils/ui");

Page({
  data: {
    hasRelationship: false,
    relationshipNames: [],
    relationshipIndex: 0,
    relationshipName: "",
    filters: [
      { key: "all", label: "全部" },
      { key: "pending", label: "达到单笔提醒线" },
      { key: "gift", label: "礼物" },
      { key: "transfer", label: "转账" },
      { key: "image", label: "有截图" }
    ],
    activeFilter: "all",
    years: [{ key: "all", label: "全部年份" }],
    months: [{ key: "all", label: "全部月份" }],
    yearIndex: 0,
    monthIndex: 0,
    sortKey: "time",
    sortDirection: "desc",
    records: [],
    reminderLabel: "",
    totalAmount: "0"
  },

  onShow() {
    ui.selectTab(this, 1);
    const reminder = ui.takeRecordsReminder();
    if (reminder && reminder.relationshipId === store.load().activeRelationshipId) {
      this.reminderScope = reminder;
      this.setData({ activeFilter: "all", yearIndex: 0, monthIndex: 0 });
    }
    this.refresh();
  },

  refresh() {
    const data = store.load();
    const relationship = store.activeRelationship(data);
    const relationshipNames = data.relationships.map(item => item.name);
    const relationshipIndex = Math.max(0, data.relationships.findIndex(item => item.id === data.activeRelationshipId));
    if (!relationship) {
      this.setData({ hasRelationship: false, relationshipNames, records: [], totalAmount: "0" });
      return;
    }
    const source = store.recordsForRelationship(data, relationship.id);
    const yearKeys = [...new Set(source.map(item => String(item.date).slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    const reminder = this.reminderScope?.relationshipId === relationship.id ? this.reminderScope : null;
    const today = store.today();
    const reminderYear = ["month", "year"].includes(reminder?.kind) ? today.slice(0, 4) : "all";
    const selectedYear = reminder ? reminderYear : (this.data.years[this.data.yearIndex]?.key || "all");
    const years = [{ key: "all", label: "全部年份" }, ...yearKeys.map(key => ({ key, label: `${key}年` }))];
    const safeYear = years.some(item => item.key === selectedYear) ? selectedYear : "all";
    const monthKeys = [...new Set(source.filter(item => safeYear === "all" || String(item.date).startsWith(safeYear)).map(item => String(item.date).slice(5, 7)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    const selectedMonth = reminder ? (reminder.kind === "month" ? today.slice(5, 7) : "all") : (this.data.months[this.data.monthIndex]?.key || "all");
    const months = [{ key: "all", label: "全部月份" }, ...monthKeys.map(key => ({ key, label: `${Number(key)}月` }))];
    const safeMonth = months.some(item => item.key === selectedMonth) ? selectedMonth : "all";
    const limit = Number(data.settings.singleLimit || 0);
    let records = [...source];
    if (reminder?.kind === "month") records = records.filter(item => String(item.date).startsWith(today.slice(0, 7)));
    else if (reminder?.kind === "year") records = records.filter(item => String(item.date).startsWith(today.slice(0, 4)));
    else if (reminder?.kind === "count") {
      const [year, month, day] = today.split("-").map(Number);
      const cutoff = new Date(year, month - 1, day);
      cutoff.setDate(cutoff.getDate() - 29);
      const start = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;
      records = records.filter(item => String(item.date) >= start && String(item.date) <= today);
    }
    if (safeYear !== "all") records = records.filter(item => String(item.date).startsWith(safeYear));
    if (safeMonth !== "all") records = records.filter(item => String(item.date).slice(5, 7) === safeMonth);
    if (this.data.activeFilter === "pending") records = records.filter(item => limit > 0 && Number(item.amount) >= limit);
    else if (this.data.activeFilter === "image") records = records.filter(item => store.recordMaterials(item).length);
    else if (this.data.activeFilter !== "all") records = records.filter(item => item.category === this.data.activeFilter);
    const direction = this.data.sortDirection === "asc" ? 1 : -1;
    records.sort((a, b) => this.data.sortKey === "amount"
      ? (Number(a.amount) - Number(b.amount)) * direction
      : store.compareRecordTime(a, b, direction));
    this.setData({
      hasRelationship: true,
      reminderLabel: ({ month: "本月提醒记录", year: "本年提醒记录", count: "最近30天付款记录", months: "连续付款月份 · 全部记录" })[reminder?.kind] || "",
      relationshipNames,
      relationshipIndex,
      relationshipName: relationship.name,
      years,
      months,
      yearIndex: Math.max(0, years.findIndex(item => item.key === safeYear)),
      monthIndex: Math.max(0, months.findIndex(item => item.key === safeMonth)),
      records: records.map(item => ({
        ...item,
        categoryLabel: store.categoryLabel(item.category),
        amountText: store.money(item.amount),
        sourceLabel: ({ text: "文字记录", image: "截图记录", receipt: "小票记录", gift: "礼物记录" })[item.source] || "文字记录",
        materialCount: store.recordMaterials(item).length,
        pending: limit > 0 && Number(item.amount) >= limit
      })),
      totalAmount: store.money(store.sum(records))
    });
  },

  onRelationshipChange(event) {
    const data = store.load();
    const relationship = data.relationships[Number(event.detail.value)];
    if (!relationship) return;
    data.activeRelationshipId = relationship.id;
    store.save(data);
    this.reminderScope = null;
    this.setData({ yearIndex: 0, monthIndex: 0 }, () => this.refresh());
  },
  onYearChange(event) { this.reminderScope = null; this.setData({ yearIndex: Number(event.detail.value), monthIndex: 0 }, () => this.refresh()); },
  onMonthChange(event) { this.reminderScope = null; this.setData({ monthIndex: Number(event.detail.value) }, () => this.refresh()); },
  clearReminderScope() {
    this.reminderScope = null;
    this.setData({ activeFilter: "all", yearIndex: 0, monthIndex: 0 }, () => this.refresh());
  },
  setFilter(event) { this.setData({ activeFilter: event.currentTarget.dataset.key }, () => this.refresh()); },
  setSort(event) {
    const key = event.currentTarget.dataset.key;
    const direction = this.data.sortKey === key && this.data.sortDirection === "desc" ? "asc" : "desc";
    this.setData({ sortKey: key, sortDirection: direction }, () => this.refresh());
  },
  addRecord() { wx.navigateTo({ url: this.data.hasRelationship ? "/pages/record-edit/index" : "/pages/relationship-edit/index" }); },
  openRecord(event) { wx.navigateTo({ url: `/pages/record-detail/index?id=${event.currentTarget.dataset.id}` }); }
});
