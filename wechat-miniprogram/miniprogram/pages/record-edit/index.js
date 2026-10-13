const store = require("../../utils/store");
const media = require("../../utils/media");
const ocr = require("../../utils/ocr");

const CATEGORIES = [
  { key: "loan", label: "借贷" },
  { key: "transfer", label: "转账" },
  { key: "gift", label: "礼物" },
  { key: "dining", label: "餐饮" },
  { key: "travel", label: "出行住宿" },
  { key: "other", label: "其他" }
];

const INTERESTS = [
  { key: "unspecified", label: "尚未说清" },
  { key: "no", label: "无利息" },
  { key: "yes", label: "有利息" }
];

Page({
  data: {
    id: "",
    submitting: false,
    relationshipNames: [],
    relationshipIds: [],
    relationshipIndex: 0,
    categories: CATEGORIES,
    categoryIndex: 1,
    interests: INTERESTS,
    interestIndex: 0,
    date: store.today(),
    today: store.today(),
    time: "",
    title: "",
    amount: "",
    transferMemo: "",
    note: "",
    dueDate: "",
    interestDetail: "",
    isLoan: false,
    source: "text",
    sourceLabel: "文字记录",
    materials: [],
    ocrStatus: "idle",
    ocrMessage: "",
    ocrCandidates: [],
    ocrRawText: "",
    ocrShowRaw: false,
    ocrAmounts: [],
    ocrSupported: true
  },

  onLoad(options) {
    this.ocrManualFields = new Set();
    const data = store.load();
    if (!data.relationships.length) {
      wx.showModal({
        title: "请先建立关系",
        content: "每笔记录都需要明确属于哪一段关系。",
        showCancel: false,
        success: () => wx.redirectTo({ url: "/pages/relationship-edit/index?returnToRecord=1" })
      });
      return;
    }
    const relationshipNames = data.relationships.map(item => item.name);
    const relationshipIds = data.relationships.map(item => item.id);
    let relationshipIndex = Math.max(0, relationshipIds.indexOf(data.activeRelationshipId));
    const record = options.id ? data.records.find(item => item.id === options.id) : null;
    if (record) relationshipIndex = Math.max(0, relationshipIds.indexOf(record.relationshipId));
    const mode = record?.source || options.mode || "text";
    const defaultCategory = mode === "gift" ? "gift" : "transfer";
    const categoryIndex = record ? Math.max(0, CATEGORIES.findIndex(item => item.key === record.category)) : Math.max(0, CATEGORIES.findIndex(item => item.key === defaultCategory));
    const interestIndex = record ? Math.max(0, INTERESTS.findIndex(item => item.key === record.interestMode)) : 0;
    this.originalMaterialPaths = new Set(store.recordMaterials(record));
    this.addedMaterialPaths = new Set();
    this.saved = false;
    this.setData({
      id: record?.id || "",
      relationshipNames,
      relationshipIds,
      relationshipIndex,
      categoryIndex,
      interestIndex,
      date: record?.date || store.today(),
      time: record?.time || "",
      title: record?.title || "",
      amount: record?.amount ? String(record.amount) : "",
      transferMemo: record?.transferMemo || "",
      note: record?.note || "",
      dueDate: record?.dueDate || "",
      interestDetail: record?.interestDetail || "",
      isLoan: CATEGORIES[categoryIndex]?.key === "loan",
      source: mode,
      sourceLabel: ({ text: "文字记录", image: "截图记录", receipt: "小票记录", gift: "礼物记录" })[mode] || "文字记录",
      materials: store.recordMaterials(record).map((path, index) => ({ path, index }))
    });
    wx.setNavigationBarTitle({ title: record ? "编辑记录" : (({ text: "文字记录", image: "截图记录", receipt: "小票记录", gift: "礼物记录" })[mode] || "新增记录") });
  },

  onUnload() {
    if (this.ocrSession && typeof this.ocrSession.stop === "function") {
      try { this.ocrSession.stop(); } catch (_) { /* session already stopped */ }
    }
    this.ocrSession = null;
    if (!this.saved) media.removeLocalFiles([...(this.addedMaterialPaths || [])]);
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

  onRelationshipChange(event) {
    this.setData({ relationshipIndex: Number(event.detail.value) });
    this.markDirty();
  },

  onCategoryChange(event) {
    const categoryIndex = Number(event.detail.value);
    this.setData({ categoryIndex, isLoan: CATEGORIES[categoryIndex].key === "loan" });
    this.markDirty();
  },

  onInterestChange(event) {
    this.setData({ interestIndex: Number(event.detail.value) });
    this.markDirty();
  },

  onDateChange(event) {
    this.ocrManualFields.add("date");
    this.setData({ date: event.detail.value });
    this.markDirty();
  },

  onTimeChange(event) {
    this.ocrManualFields.add("time");
    this.setData({ time: event.detail.value });
    this.markDirty();
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) return;
    this.ocrManualFields.add(field);
    this.setData({ [field]: event.detail.value });
    this.markDirty();
  },

  onDueDateChange(event) {
    this.setData({ dueDate: event.detail.value });
    this.markDirty();
  },

  clearDueDate() {
    this.setData({ dueDate: "" });
    this.markDirty();
  },

  async addImages() {
    try {
      wx.showLoading({ title: "正在保存" });
      const paths = await media.chooseAndPersistImages(9, "record");
      if (!paths.length) return;
      paths.forEach(path => this.addedMaterialPaths.add(path));
      const merged = [...new Set([...this.data.materials.map(item => item.path), ...paths])];
      this.setData({ materials: merged.map((path, index) => ({ path, index })) });
      this.markDirty();
      if (["image", "receipt"].includes(this.data.source)) this.recognizeImage(paths[0]);
    } catch (_) {
      wx.showToast({ title: "图片保存失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  previewImage(event) {
    const urls = this.data.materials.map(item => item.path);
    wx.previewImage({ current: urls[Number(event.currentTarget.dataset.index)] || urls[0], urls });
  },

  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    const current = [...this.data.materials];
    const [removed] = current.splice(index, 1);
    if (removed && this.addedMaterialPaths.has(removed.path)) {
      media.removeLocalFile(removed.path);
      this.addedMaterialPaths.delete(removed.path);
    }
    this.setData({ materials: current.map((item, nextIndex) => ({ path: item.path, index: nextIndex })) });
    this.markDirty();
  },

  ensureOCRSession() {
    if (this.ocrSession) return Promise.resolve(this.ocrSession);
    if (this.ocrSessionPromise) return this.ocrSessionPromise;
    if (typeof wx.createVKSession !== "function" || typeof wx.createOffscreenCanvas !== "function") {
      return Promise.reject(new Error("当前微信版本不支持本机 OCR"));
    }
    this.ocrSessionPromise = new Promise((resolve, reject) => {
      wx.createSelectorQuery().in(this).select("#ocr-webgl").node().exec(result => {
        const canvas = result?.[0]?.node;
        if (!canvas) { reject(new Error("OCR 画布初始化失败")); return; }
        canvas.width = 2;
        canvas.height = 2;
        const gl = canvas.getContext("webgl");
        if (!gl) { reject(new Error("当前设备无法初始化 OCR")); return; }
        let session;
        try {
          session = wx.createVKSession({ track: { OCR: { mode: 2 } }, version: "v1", gl });
        } catch (error) { reject(error); return; }
        session.on("updateAnchors", anchors => {
          const text = (anchors || []).flatMap(anchor => [anchor.text, anchor.subtext]).filter(Boolean).join("\n");
          if (text && this.ocrResultResolver) this.ocrResultResolver(text);
        });
        session.start(error => {
          if (error) { reject(error); return; }
          this.ocrSession = session;
          resolve(session);
        });
      });
    }).finally(() => { this.ocrSessionPromise = null; });
    return this.ocrSessionPromise;
  },

  async recognizeImage(path) {
    if (!path || this.data.ocrStatus === "recognizing") return;
    this.setData({ ocrStatus: "recognizing", ocrMessage: "正在使用微信本机能力识别图片…", ocrCandidates: [], ocrRawText: "", ocrAmounts: [], ocrShowRaw: false });
    try {
      const session = await Promise.race([
        this.ensureOCRSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("OCR 初始化超时")), 12000))
      ]);
      const info = await new Promise((resolve, reject) => wx.getImageInfo({ src: path, success: resolve, fail: reject }));
      const maxSide = 2000;
      const ratio = Math.min(1, maxSide / Math.max(info.width, info.height));
      const width = Math.max(1, Math.round(info.width * ratio));
      const height = Math.max(1, Math.round(info.height * ratio));
      const canvas = wx.createOffscreenCanvas({ type: "2d", width, height });
      const context = canvas.getContext("2d");
      const image = canvas.createImage();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; image.src = path; });
      context.drawImage(image, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      const rawText = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => { this.ocrResultResolver = null; reject(new Error("识别超时")); }, 20000);
        this.ocrResultResolver = text => { clearTimeout(timer); this.ocrResultResolver = null; resolve(text); };
        try { session.runOCR({ frameBuffer: imageData.data.buffer, width, height }); }
        catch (error) { clearTimeout(timer); this.ocrResultResolver = null; reject(error); }
      });
      const fields = ocr.extractFields(rawText, store.today());
      const patch = {};
      const candidates = [];
      [["amount", "金额", fields.amount], ["date", "日期", fields.date], ["time", "时间", fields.time], ["title", "对象", fields.title]].forEach(([field, label, value]) => {
        if (!value) return;
        candidates.push(`${label} ${field === "amount" ? `¥${value}` : value}`);
        if (!this.ocrManualFields.has(field) && (!this.data.id || !this.data[field])) patch[field] = value;
      });
      const count = Object.keys(patch).length;
      this.setData({
        ...patch,
        ocrRawText: rawText,
        ocrAmounts: fields.amounts || [],
        ocrStatus: candidates.length ? "done" : "review",
        ocrMessage: fields.amounts.length > 1 ? "发现多个可能金额，请对照图片点选；其余预填内容也请核对" : (candidates.length ? `识别到 ${candidates.length} 项，已预填 ${count} 项，请逐项核对` : "没有稳定读出金额或时间，请查看识别原文或手动填写"),
        ocrCandidates: candidates
      });
      if (count) this.markDirty();
    } catch (error) {
      if (!this.ocrSession) this.ocrSessionPromise = null;
      this.setData({ ocrStatus: "unsupported", ocrSupported: false, ocrMessage: `${error?.message || "当前设备未完成识别"}，请手动填写` });
    }
  },

  retryOCR() {
    this.setData({ ocrStatus: "idle", ocrSupported: true }, () => this.recognizeImage(this.data.materials[0]?.path));
  },

  toggleOCRRaw() {
    this.setData({ ocrShowRaw: !this.data.ocrShowRaw });
  },

  selectOCRAmount(event) {
    const amount = String(event.currentTarget.dataset.amount);
    if (!this.data.ocrAmounts.includes(amount)) return;
    this.ocrManualFields.add("amount");
    this.setData({ amount });
    this.markDirty();
  },

  submit(event) {
    if (this.data.submitting) return;
    const values = event.detail.value;
    const title = String(values.title || "").trim();
    const amount = Number(values.amount || 0);
    if (!title) {
      wx.showToast({ title: "请填写事项名称", icon: "none" });
      return;
    }
    if (!Number.isFinite(amount) || !(amount > 0)) {
      wx.showToast({ title: "请填写有效金额", icon: "none" });
      return;
    }
    this.setData({ submitting: true });
    this.pendingRecordId = this.pendingRecordId || this.data.id || store.uid();
    try {
      const existing = this.data.id ? store.load().records.find(item => item.id === this.data.id) : null;
      const materialPaths = this.data.materials.map(item => item.path);
      store.upsertRecord(store.load(), {
        ...existing,
        id: this.pendingRecordId,
        relationshipId: this.data.relationshipIds[this.data.relationshipIndex],
        date: this.data.date,
        time: this.data.time,
        title,
        amount,
        category: CATEGORIES[this.data.categoryIndex].key,
        transferMemo: values.transferMemo,
        note: values.note,
        dueDate: this.data.isLoan ? this.data.dueDate : "",
        interestMode: this.data.isLoan ? INTERESTS[this.data.interestIndex].key : "unspecified",
        interestDetail: this.data.isLoan ? values.interestDetail : "",
        source: this.data.source,
        image: materialPaths[0] || "",
        materials: materialPaths
      });
      media.removeLocalFiles([...this.originalMaterialPaths].filter(path => !materialPaths.includes(path)));
      this.saved = true;
      this.addedMaterialPaths.clear();
      this.disableUnsavedAlert();
      wx.showToast({ title: "已保存在本机", icon: "success" });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 450);
    } catch (_) {
      this.setData({ submitting: false });
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
    }
  }
});
