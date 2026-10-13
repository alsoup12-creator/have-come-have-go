const store = require("../../utils/store");
const media = require("../../utils/media");

Page({
  data: { id: "", record: null, materials: [], reachesLine: false },
  onLoad(options) { this.setData({ id: options.id || "" }); },
  onShow() { this.refresh(); },
  refresh() {
    const data = store.load();
    const record = data.records.find(item => item.id === this.data.id);
    if (!record) { wx.navigateBack(); return; }
    const relationship = store.relationshipById(data, record.relationshipId);
    const materials = store.recordMaterials(record).map((path, index) => ({ path, index }));
    const limit = Number(data.settings.singleLimit || 0);
    this.setData({
      record: {
        ...record,
        relationshipName: relationship?.name || "",
        categoryLabel: store.categoryLabel(record.category),
        amountText: store.money(record.amount),
        sourceLabel: ({ text: "文字记录", image: "截图记录", receipt: "小票记录", gift: "礼物记录" })[record.source] || "文字记录",
        interestLabel: ({ yes: "有利息", no: "无利息", unspecified: "尚未说清" })[record.interestMode] || "尚未说清"
      },
      materials,
      reachesLine: limit > 0 && Number(record.amount) >= limit
    });
  },
  previewImage(event) {
    const urls = this.data.materials.map(item => item.path);
    wx.previewImage({ current: urls[Number(event.currentTarget.dataset.index)] || urls[0], urls });
  },
  edit() { wx.navigateTo({ url: `/pages/record-edit/index?id=${this.data.id}` }); },
  copyIou() {
    const record = this.data.record;
    const text = `借条参考文本\n\n借款人：${record.relationshipName || "________"}\n出借人：________\n\n借款人确认于 ${record.date} 收到出借人交付的借款人民币 ${record.amountText} 元。\n\n借款用途：${record.title || record.transferMemo || "________"}\n利息约定：${record.interestLabel}${record.interestDetail ? ` · ${record.interestDetail}` : ""}\n归还日期：${record.dueDate || "双方另行确认"}\n\n借款人签字：________\n身份证号／联系方式：________\n签署日期：________\n\n使用前请结合实际约定补充完整，并由双方核对后签署。请保留款项交付和双方沟通原始记录；具体争议或时效问题应咨询执业律师。`;
    wx.setClipboardData({ data: text, success: () => wx.showToast({ title: "参考文本已复制", icon: "none" }) });
  },
  openClarify(event) {
    const mode = event.currentTarget.dataset.mode;
    const data = store.load();
    const record = data.records.find(item => item.id === this.data.id);
    if (!record) return;
    data.activeRelationshipId = record.relationshipId;
    const limit = Number(data.settings.singleLimit || 0);
    const scope = limit > 0 && Number(record.amount) >= limit ? "alert" : "below";
    data.clarifyState = { relationshipId: record.relationshipId, selectedIds: [record.id], mode, scope, month: "all", category: "all" };
    store.save(data);
    wx.navigateTo({ url: `/pages/clarify-compose/index?mode=${mode}` });
  },
  deleteRecord() {
    wx.showModal({
      title: "删除这条记录？",
      content: "记录、说清草稿及其本机截图将被删除，删除后无法恢复。",
      confirmText: "删除",
      confirmColor: "#9c3f3f",
      success: result => {
        if (!result.confirm) return;
        const data = store.load();
        const record = data.records.find(item => item.id === this.data.id);
        store.removeRecord(data, this.data.id);
        media.removeLocalFiles(store.recordMaterials(record));
        wx.showToast({ title: "已删除", icon: "success" });
        setTimeout(() => wx.navigateBack({ delta: 1 }), 450);
      }
    });
  }
});
