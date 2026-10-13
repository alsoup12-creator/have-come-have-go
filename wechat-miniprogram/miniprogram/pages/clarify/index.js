const store = require("../../utils/store");
const ui = require("../../utils/ui");
const legal = require("../../utils/legal");

const CATEGORY_FILTERS = [
  { key: "all", label: "全部类目" },
  { key: "loan", label: "借贷" },
  { key: "transfer", label: "转账" },
  { key: "gift", label: "礼物" },
  { key: "dining", label: "餐饮" },
  { key: "travel", label: "出行" },
  { key: "other", label: "其他" }
];

Page({
  data: {
    hasRelationship: false,
    relationshipName: "",
    singleLimit: "0",
    scope: "alert",
    scopeOptions: [
      { key: "alert", label: "提醒记录", count: 0 },
      { key: "below", label: "未提醒", count: 0 },
      { key: "all", label: "全部", count: 0 }
    ],
    scopeDescription: "",
    emptyTitle: "这个范围内没有记录",
    emptyDescription: "",
    records: [],
    selectedCount: 0,
    selectedHiddenCount: 0,
    selectedAmount: "0",
    mode: "direct",
    monthIndex: 0,
    monthOptions: [{ key: "all", label: "全部时间" }],
    category: "all",
    categoryFilters: CATEGORY_FILTERS,
    evidence: { screenshot: 0, memo: 0, note: 0, total: 0 },
    legalItems: legal.ITEMS
  },

  onShow() {
    ui.selectTab(this, 2);
    this.refresh();
  },

  refresh() {
    const data = store.load();
    const relationship = store.activeRelationship(data);
    if (!relationship) {
      this.setData({ hasRelationship: false, records: [], selectedCount: 0 });
      return;
    }
    let state = data.clarifyState;
    if (state.relationshipId !== relationship.id) {
      data.clarifyState = { relationshipId: relationship.id, selectedIds: [], mode: "direct", scope: "alert", month: "all", category: "all" };
      store.save(data);
      state = data.clarifyState;
    }
    const limit = Number(data.settings.singleLimit || 0);
    const allRecords = store.recordsForRelationship(data, relationship.id)
      .filter(item => item.payer !== "other")
      .sort((a, b) => store.compareRecordTime(a, b));
    const alertRecords = allRecords.filter(item => limit > 0 && Number(item.amount) >= limit);
    const belowRecords = allRecords.filter(item => !(limit > 0 && Number(item.amount) >= limit));
    const scope = ["alert", "below", "all"].includes(state.scope) ? state.scope : "alert";
    const scopeRecords = scope === "alert" ? alertRecords : (scope === "below" ? belowRecords : allRecords);
    const monthKeys = [...new Set(scopeRecords.map(item => String(item.date).slice(0, 7)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    const monthOptions = [{ key: "all", label: "全部时间" }, ...monthKeys.map(key => ({ key, label: `${key.slice(0, 4)}年${Number(key.slice(5))}月` }))];
    if (!monthOptions.some(item => item.key === state.month)) state.month = "all";
    let records = scopeRecords;
    if (state.month !== "all") records = records.filter(item => String(item.date).startsWith(state.month));
    if (state.category !== "all") records = records.filter(item => item.category === state.category);
    const selectedSet = new Set(state.selectedIds);
    const selected = allRecords.filter(item => selectedSet.has(item.id));
    const visibleIds = new Set(records.map(item => item.id));
    const selectedHiddenCount = selected.filter(item => !visibleIds.has(item.id)).length;
    const evidenceBase = selected.length ? selected : records;
    const scopeDescription = scope === "alert"
      ? (limit > 0
        ? `默认只显示由你支付且单笔达到 ¥${store.money(limit)} 的记录。找不到某笔时，可切换到“未提醒”或“全部”。`
        : "单笔提醒线目前已关闭，因此没有自动提醒记录。你仍可切换到“全部”手动选择。")
      : (scope === "below"
        ? "这里是未达到当前单笔提醒线的记录，也可以由你自行选择并整理。"
        : "这里显示当前关系中由你支付的全部记录，无论是否达到提醒线。")
    const emptyTitle = scope === "alert" ? "暂无提醒记录" : (scope === "below" ? "暂无未提醒记录" : "当前关系还没有记录");
    const emptyDescription = scope === "alert"
      ? "没有记录达到当前单笔提醒线；可切换到“全部”手动选择。"
      : (scope === "below" ? "当前记录均已达到提醒线，可查看“提醒记录”或“全部”。" : "先新增一笔记录，再回来选择需要核对的事实。")
    this.setData({
      hasRelationship: true,
      relationshipName: relationship.name,
      singleLimit: store.money(limit),
      scope,
      scopeOptions: [
        { key: "alert", label: "提醒记录", count: alertRecords.length },
        { key: "below", label: "未提醒", count: belowRecords.length },
        { key: "all", label: "全部", count: allRecords.length }
      ],
      scopeDescription,
      emptyTitle,
      emptyDescription,
      records: records.map(item => ({
        ...item,
        checked: selectedSet.has(item.id),
        alerted: limit > 0 && Number(item.amount) >= limit,
        categoryLabel: store.categoryLabel(item.category),
        amountText: store.money(item.amount),
        materialCount: store.recordMaterials(item).length
      })),
      selectedCount: selected.length,
      selectedHiddenCount,
      selectedAmount: store.money(store.sum(selected)),
      mode: state.mode,
      monthIndex: Math.max(0, monthOptions.findIndex(item => item.key === state.month)),
      monthOptions,
      category: state.category,
      evidence: {
        screenshot: evidenceBase.filter(item => store.recordMaterials(item).length).length,
        memo: evidenceBase.filter(item => item.transferMemo).length,
        note: evidenceBase.filter(item => item.note).length,
        total: evidenceBase.length
      }
    });
  },

  persistState(patch) {
    store.updateClarifyState(store.load(), patch);
    this.refresh();
  },

  toggleRecord(event) {
    const data = store.load();
    const id = event.currentTarget.dataset.id;
    const selected = new Set(data.clarifyState.selectedIds || []);
    if (selected.has(id)) selected.delete(id);
    else selected.add(id);
    this.persistState({ selectedIds: [...selected] });
  },

  selectAll() {
    const data = store.load();
    const visibleIds = this.data.records.map(item => item.id);
    const selected = new Set(data.clarifyState.selectedIds || []);
    const allVisibleSelected = visibleIds.length && visibleIds.every(id => selected.has(id));
    visibleIds.forEach(id => allVisibleSelected ? selected.delete(id) : selected.add(id));
    this.persistState({ selectedIds: [...selected] });
  },

  clearSelection() { this.persistState({ selectedIds: [] }); },

  onMonthChange(event) {
    const option = this.data.monthOptions[Number(event.detail.value)];
    this.persistState({ month: option?.key || "all" });
  },

  setScope(event) { this.persistState({ scope: event.currentTarget.dataset.scope, month: "all" }); },
  setCategory(event) { this.persistState({ category: event.currentTarget.dataset.key }); },
  setMode(event) { this.persistState({ mode: event.currentTarget.dataset.mode }); },

  openComposer() {
    if (!this.data.selectedCount) {
      wx.showToast({ title: "请先选择至少一笔记录", icon: "none" });
      return;
    }
    wx.navigateTo({ url: `/pages/clarify-compose/index?mode=${this.data.mode}` });
  },

  showChecklist() {
    wx.showModal({
      title: "咨询或核对前，先看这些",
      content: "1. 付款或转账完整截图\n2. 前后完整对话\n3. 转账附言原文\n4. 通话录音、短信、邮件、银行流水、借条及后续还款记录\n\n请尽量保留原始载体，不要只保留裁剪图。",
      showCancel: false,
      confirmText: "知道了"
    });
  },

  openLegal(event) {
    wx.navigateTo({ url: `/pages/legal-detail/index?id=${event.currentTarget.dataset.id}` });
  }
});
