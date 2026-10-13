const store = require("../../utils/store");
const media = require("../../utils/media");

const TYPES = [
  { key: "friend", label: "朋友" },
  { key: "dating", label: "约会" },
  { key: "matchmaking", label: "相亲" },
  { key: "ambiguous", label: "暧昧" },
  { key: "lover", label: "恋人" },
  { key: "spouse", label: "夫妻" },
  { key: "other", label: "其他" }
];

Page({
  data: {
    id: "",
    submitting: false,
    returnToRecord: false,
    types: TYPES,
    typeIndex: 0,
    name: "",
    startDate: "",
    note: "",
    recordCount: 0,
    today: store.today()
  },

  onLoad(options) {
    const relationship = options.id ? store.relationshipById(store.load(), options.id) : null;
    const typeIndex = relationship ? Math.max(0, TYPES.findIndex(item => item.key === relationship.type)) : 0;
    this.setData({
      id: relationship?.id || "",
      returnToRecord: options.returnToRecord === "1",
      typeIndex,
      name: relationship?.name || "",
      startDate: relationship?.startDate || "",
      note: relationship?.note || "",
      recordCount: relationship ? store.recordsForRelationship(store.load(), relationship.id).length : 0
    });
    if (relationship) wx.setNavigationBarTitle({ title: "编辑关系" });
  },

  markDirty() {
    if (this.isDirty) return;
    this.isDirty = true;
    if (typeof wx.enableAlertBeforeUnload === "function") {
      wx.enableAlertBeforeUnload({ message: "填写内容还没有保存，确认离开吗？" });
      this.unsavedAlertEnabled = true;
    }
  },

  disableUnsavedAlert() {
    this.isDirty = false;
    if (this.unsavedAlertEnabled && typeof wx.disableAlertBeforeUnload === "function") wx.disableAlertBeforeUnload();
    this.unsavedAlertEnabled = false;
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) return;
    this.setData({ [field]: event.detail.value });
    this.markDirty();
  },

  onTypeChange(event) {
    this.setData({ typeIndex: Number(event.detail.value) });
    this.markDirty();
  },

  onDateChange(event) {
    this.setData({ startDate: event.detail.value });
    this.markDirty();
  },

  clearDate() {
    this.setData({ startDate: "" });
    this.markDirty();
  },

  submit(event) {
    if (this.data.submitting) return;
    const values = event.detail.value;
    const name = String(values.name || "").trim();
    if (!name) {
      wx.showToast({ title: "请填写关系称呼", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    this.pendingRelationshipId = this.pendingRelationshipId || this.data.id || store.uid();
    try {
      const data = store.upsertRelationship(store.load(), {
        id: this.pendingRelationshipId,
        name,
        type: TYPES[this.data.typeIndex].key,
        startDate: this.data.startDate,
        note: values.note
      });
      if (!this.data.id) data.activeRelationshipId = this.pendingRelationshipId;
      store.save(data);
      this.disableUnsavedAlert();
      wx.showToast({ title: "已保存在本机", icon: "success" });
      setTimeout(() => {
        if (this.data.returnToRecord) wx.redirectTo({ url: "/pages/record-edit/index" });
        else wx.navigateBack({ delta: 1 });
      }, 450);
    } catch (_) {
      this.setData({ submitting: false });
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
    }
  },

  deleteRelationship() {
    if (!this.data.id) return;
    wx.showModal({
      title: "删除这段关系？",
      content: `将同时删除这段关系下的 ${this.data.recordCount} 笔记录、说清草稿和本机图片，且无法恢复。`,
      confirmText: "删除",
      confirmColor: "#9c3f3f",
      success: result => {
        if (!result.confirm) return;
        const data = store.load();
        const paths = data.records
          .filter(item => item.relationshipId === this.data.id)
          .flatMap(store.recordMaterials);
        store.removeRelationship(data, this.data.id);
        media.removeLocalFiles(paths);
        this.disableUnsavedAlert();
        wx.showToast({ title: "已删除", icon: "success" });
        setTimeout(() => wx.navigateBack({ delta: 1 }), 450);
      }
    });
  }
});
