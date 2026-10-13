const store = require("../../utils/store");
const media = require("../../utils/media");
const ui = require("../../utils/ui");

Page({
  data: {
    relationships: [],
    relationshipCount: 0,
    recordCount: 0,
    totalAmount: "0",
    monthAmount: "0",
    yearAmount: "0",
    pendingCount: 0,
    screenshotCount: 0,
    settings: {
      monthlyLimit: 12000,
      yearlyLimit: 100000,
      singleLimit: 5000,
      oneSidedCountLimit: 3,
      oneSidedMonthLimit: 3,
      lawyerLine: 30000
    }
  },

  onShow() {
    ui.selectTab(this, 3);
    this.refresh();
  },

  refresh() {
    const data = store.load();
    const relationships = data.relationships.map(item => {
      const records = store.recordsForRelationship(data, item.id);
      return {
        ...item,
        typeLabel: store.relationshipTypeLabel(item.type),
        recordCount: records.length,
        amountText: store.money(store.sum(records)),
        active: item.id === data.activeRelationshipId
      };
    });
    const today = store.today();
    const singleLimit = Number(data.settings.singleLimit || 0);
    this.setData({
      relationships,
      relationshipCount: relationships.length,
      recordCount: data.records.length,
      totalAmount: store.money(store.sum(data.records)),
      monthAmount: store.money(store.sum(data.records.filter(item => String(item.date).startsWith(today.slice(0, 7))))),
      yearAmount: store.money(store.sum(data.records.filter(item => String(item.date).startsWith(today.slice(0, 4))))),
      pendingCount: data.records.filter(item => singleLimit > 0 && Number(item.amount) >= singleLimit).length,
      screenshotCount: data.records.reduce((sum, item) => sum + store.recordMaterials(item).length, 0),
      settings: data.settings
    });
  },

  addRelationship() {
    wx.navigateTo({ url: "/pages/relationship-edit/index" });
  },

  editRelationship(event) {
    wx.navigateTo({ url: `/pages/relationship-edit/index?id=${event.currentTarget.dataset.id}` });
  },

  chooseRelationship(event) {
    const data = store.load();
    data.activeRelationshipId = event.currentTarget.dataset.id;
    store.save(data);
    this.refresh();
    wx.showToast({ title: "已切换当前关系", icon: "none" });
  },

  inputSetting(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({ [`settings.${key}`]: event.detail.value });
  },

  saveSettings() {
    const data = store.load();
    data.settings = {
      ...data.settings,
      monthlyLimit: Math.max(0, Number(this.data.settings.monthlyLimit || 0)),
      yearlyLimit: Math.max(0, Number(this.data.settings.yearlyLimit || 0)),
      singleLimit: Math.max(0, Number(this.data.settings.singleLimit || 0)),
      oneSidedCountLimit: Math.max(0, Number(this.data.settings.oneSidedCountLimit || 0)),
      oneSidedMonthLimit: Math.max(0, Number(this.data.settings.oneSidedMonthLimit || 0)),
      lawyerLine: Math.max(0, Number(this.data.settings.lawyerLine || 0))
    };
    store.save(data);
    wx.showToast({ title: "设置已保存", icon: "success" });
  },

  exportData() {
    const data = store.load();
    const payload = {
      product: "知往思来",
      exportedAt: new Date().toISOString(),
      data
    };
    wx.setClipboardData({
      data: JSON.stringify(payload),
      success: () => wx.showToast({ title: "数据文本已复制", icon: "none" })
    });
  },

  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  },

  clearAll() {
    wx.showModal({
      title: "清除全部本地数据？",
      content: "关系、记录、说清草稿、设置和本机图片将从这台设备删除，且无法恢复。如需留存，可先复制数据文本并另存图片。",
      confirmText: "全部清除",
      confirmColor: "#9c3f3f",
      success: result => {
        if (!result.confirm) return;
        const data = store.load();
        const paths = data.records.flatMap(store.recordMaterials);
        store.clear();
        media.removeLocalFiles(paths);
        this.refresh();
        wx.showToast({ title: "已清除", icon: "success" });
      }
    });
  }
});
