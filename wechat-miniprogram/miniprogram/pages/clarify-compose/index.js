const store = require("../../utils/store");
const media = require("../../utils/media");

function directOpening(relation) {
  return ({
    friend: "为了把朋友之间的往来记清楚，也避免以后只靠回忆，我想和你核对下面几笔由我支付的款项。",
    dating: "我们还在了解彼此，我想把下面几笔由我支付的款项说清楚。这不是给关系下结论，只是核对事实和双方理解。",
    matchmaking: "为了避免相亲和交往过程中的款项以后产生误解，我想核对下面几笔由我支付的款项。",
    ambiguous: "我们的关系尚未明确，但款项事实可以先说清楚。我想和你核对下面几笔由我支付的款项。",
    lover: "为了避免以后只靠回忆争论，我想和你把下面几笔由我支付的款项认真核对一下。",
    spouse: "为了把家庭支出和个人款项的事实整理清楚，我想和你核对下面几笔由我支付的款项。"
  })[relation.type] || "我想和你核对下面几笔由我支付的款项。";
}

function buildDirectText(relation, records) {
  const rows = records.map((record, index) => `${index + 1}. ${record.date}${record.time ? ` ${record.time}` : ""}｜${record.title}｜${store.categoryLabel(record.category)}｜¥${store.money(record.amount)}${record.transferMemo ? `｜附言：${record.transferMemo}` : ""}`).join("\n");
  return `${directOpening(relation)}\n\n${rows}\n\n合计：人民币 ${store.money(store.sum(records))} 元\n\n想请你确认：\n1. 是否收到或实际受益于上述款项；\n2. 每笔款项的用途和双方当时的理解；\n3. 是否有需要返还的款项，如有，金额和期限是什么；\n4. 是否有哪一笔需要更正或补充上下文。\n\n这只是根据我方记录发起的事实核对，不因发送上述文字当然成立借款、赠与或其他法律结论。`;
}

function buildConsultationText(relation, records, message) {
  const rows = records.map((record, index) => {
    const materials = store.recordMaterials(record);
    const loan = record.category === "loan" ? `\n   约定归还日：${record.dueDate || "未记录"}\n   利息约定：${interestLabel(record)}${record.interestMode === "yes" && record.interestDetail ? ` · ${record.interestDetail}` : ""}` : "";
    return `${index + 1}. ${record.date}${record.time ? ` ${record.time}` : ""}｜${record.title}｜${store.categoryLabel(record.category)}｜¥${store.money(record.amount)}\n   转账附言：${record.transferMemo || "未记录"}\n   记录说明：${record.note || "未记录"}${loan}\n   对应截图／照片：${materials.length} 张`;
  }).join("\n\n");
  return `咨询事实材料（本机整理）\n\n关系范围：${relation.name} · ${store.relationshipTypeLabel(relation.type)}\n选中记录：${records.length} 笔\n合计金额：人民币 ${store.money(store.sum(records))} 元\n\n补充说明：${String(message || "").trim() || "未填写"}\n\n逐笔记录\n${rows}\n\n说明：本材料只整理用户选择的单方记录与对应材料，不自动判断款项性质，也不形成法律意见。`;
}

function interestLabel(record) {
  return ({ yes: "有利息", no: "无利息", unspecified: "尚未说清" })[record.interestMode] || "尚未说清";
}

function factsSignature(relation, records) {
  return JSON.stringify([relation.id, relation.name, relation.type, records.map(item =>
    [item.id, item.date, item.time || "", item.title, item.category, item.amount, item.transferMemo || "", item.note || "", item.dueDate || "", item.interestMode || "unspecified", item.interestDetail || ""])]);
}

Page({
  data: {
    mode: "direct",
    relationshipName: "",
    relationshipType: "",
    records: [],
    totalAmount: "0",
    directText: "",
    draftStale: false,
    draftSaveFailed: false,
    consultationMessage: "",
    preview: false,
    materialCount: 0
  },

  onLoad(options) {
    this.mode = options.mode === "consult" ? "consult" : "direct";
    wx.setNavigationBarTitle({ title: this.mode === "direct" ? "编辑沟通内容" : "整理咨询材料" });
    this.refresh();
  },

  onHide() { this.persistDraft(); },
  onUnload() { this.persistDraft(); },

  loadContext() {
    const data = store.load();
    const relation = store.activeRelationship(data);
    const selectedSet = new Set(data.clarifyState.selectedIds || []);
    const records = data.records
      .filter(item => relation && item.relationshipId === relation.id && selectedSet.has(item.id))
      .sort((a, b) => store.compareRecordTime(a, b, 1));
    const contextKey = store.clarifyContextKey(records.map(item => item.id));
    return { data, relation, records, contextKey, draft: data.clarifyDrafts[contextKey] || {} };
  },

  refresh() {
    const context = this.loadContext();
    if (!context.relation || !context.records.length) {
      wx.showModal({ title: "没有已选记录", content: "请返回“说清”页重新选择。", showCancel: false, success: () => wx.navigateBack() });
      return;
    }
    this.contextKey = context.contextKey;
    const hasDraft = typeof context.draft.directText === "string";
    const signature = factsSignature(context.relation, context.records);
    this.draftFacts = hasDraft ? (context.draft.factsSignature || "") : signature;
    const directText = hasDraft ? context.draft.directText : buildDirectText(context.relation, context.records);
    const consultationMessage = context.draft.consultationMessage || "";
    const records = context.records.map((item, index) => ({
      ...item,
      sequence: index + 1,
      amountText: store.money(item.amount),
      categoryLabel: store.categoryLabel(item.category),
      interestLabel: interestLabel(item),
      materials: store.recordMaterials(item).map((path, materialIndex) => ({ path, materialIndex, label: `截图／照片 ${materialIndex + 1}` }))
    }));
    this.setData({
      mode: this.mode,
      relationshipName: context.relation.name,
      relationshipType: store.relationshipTypeLabel(context.relation.type),
      records,
      totalAmount: store.money(store.sum(context.records)),
      directText,
      draftStale: this.draftFacts !== signature,
      consultationMessage,
      materialCount: records.reduce((sum, item) => sum + item.materials.length, 0)
    });
  },

  persistDraft() {
    if (!this.contextKey) return false;
    try {
      store.saveClarifyDraft(store.load(), this.contextKey, {
        directText: this.data.directText,
        factsSignature: this.draftFacts,
        consultationMessage: this.data.consultationMessage
      });
      this.setData({ draftSaveFailed: false });
      this.disableDraftAlert();
      return true;
    } catch (_) {
      const wasFailed = this.data.draftSaveFailed;
      this.setData({ draftSaveFailed: true });
      if (!wasFailed) wx.showToast({ title: "草稿保存失败，请先复制留存", icon: "none" });
      return false;
    }
  },

  markDraftDirty() {
    if (this.draftAlertEnabled || typeof wx.enableAlertBeforeUnload !== "function") return;
    try {
      wx.enableAlertBeforeUnload({ message: "草稿尚未保存，建议先保存或复制留存。" });
      this.draftAlertEnabled = true;
    } catch (_) { /* the save warning remains available on older clients */ }
  },

  disableDraftAlert() {
    if (this.draftAlertEnabled && typeof wx.disableAlertBeforeUnload === "function") {
      try { wx.disableAlertBeforeUnload(); } catch (_) { /* client no longer active */ }
    }
    this.draftAlertEnabled = false;
  },

  inputDirect(event) { this.setData({ directText: event.detail.value }); this.markDraftDirty(); },
  inputMessage(event) { this.setData({ consultationMessage: event.detail.value }); this.markDraftDirty(); },

  regenerateDraft() {
    wx.showModal({
      title: "按最新记录重新生成？",
      content: "将替换当前沟通文字，包括手工修改的部分。需要保留的内容请先记下；也可以取消后自行核对修改。",
      confirmText: "重新生成",
      success: result => {
        if (!result.confirm) return;
        const context = this.loadContext();
        if (!context.relation || !context.records.length) return;
        this.draftFacts = factsSignature(context.relation, context.records);
        this.setData({ directText: buildDirectText(context.relation, context.records), draftStale: false });
        this.persistDraft();
      }
    });
  },

  confirmDraftReviewed() {
    wx.showModal({
      title: "已核对最新记录？",
      content: "请确认沟通文字中的金额、日期和事项与最新记录一致。确认后保留你的编辑内容。",
      confirmText: "已核对",
      success: result => {
        if (!result.confirm) return;
        const context = this.loadContext();
        if (!context.relation || !context.records.length) return;
        this.draftFacts = factsSignature(context.relation, context.records);
        this.setData({ draftStale: false });
        this.persistDraft();
      }
    });
  },

  saveDraft() {
    if (this.persistDraft()) wx.showToast({ title: "已保存在本机", icon: "success" });
  },

  copyContent() {
    this.persistDraft();
    const context = this.loadContext();
    if (!context.relation || !context.records.length) return;
    if (this.mode === "direct" && this.draftFacts !== factsSignature(context.relation, context.records)) {
      this.setData({ draftStale: true });
      wx.showToast({ title: "记录已变化，请先核对沟通稿", icon: "none" });
      return;
    }
    const content = this.mode === "direct"
      ? this.data.directText
      : buildConsultationText(context.relation, context.records, this.data.consultationMessage);
    wx.setClipboardData({ data: content, success: () => wx.showToast({ title: "内容已复制", icon: "none" }) });
  },

  togglePreview() {
    this.persistDraft();
    this.setData({ preview: !this.data.preview });
  },

  async addMaterial(event) {
    if (!this.persistDraft()) return;
    const recordId = event.currentTarget.dataset.id;
    let paths = [];
    let committed = false;
    try {
      wx.showLoading({ title: "正在保存" });
      paths = await media.chooseAndPersistImages(9, `record-${recordId}`);
      if (!paths.length) return;
      const data = store.load();
      const record = data.records.find(item => item.id === recordId);
      if (!record) throw new Error("对应记录已不存在");
      const materials = [...new Set([...store.recordMaterials(record), ...paths])];
      record.image = materials[0] || "";
      record.materials = materials;
      store.save(data);
      committed = true;
      this.refreshPreservingInput();
      wx.showToast({ title: `已加入 ${paths.length} 张`, icon: "none" });
    } catch (_) {
      if (!committed) media.removeLocalFiles(paths);
      wx.showToast({ title: "图片保存失败，请重试", icon: "none" });
    } finally {
      wx.hideLoading();
    }
  },

  refreshPreservingInput() {
    const input = {
      directText: this.data.directText,
      consultationMessage: this.data.consultationMessage
    };
    const facts = this.draftFacts;
    const saved = this.persistDraft();
    this.refresh();
    if (!saved) {
      this.draftFacts = facts;
      this.setData(input);
    }
  },

  previewImage(event) {
    const record = this.data.records.find(item => item.id === event.currentTarget.dataset.id);
    if (!record) return;
    const urls = record.materials.map(item => item.path);
    wx.previewImage({ current: urls[Number(event.currentTarget.dataset.index)] || urls[0], urls });
  },

  removeMaterial(event) {
    const recordId = event.currentTarget.dataset.id;
    const index = Number(event.currentTarget.dataset.index);
    const recordView = this.data.records.find(item => item.id === recordId);
    const path = recordView?.materials[index]?.path;
    if (!path) return;
    wx.showModal({
      title: "移除这张材料？",
      content: "只会从本机整理材料中移除。",
      confirmText: "移除",
      confirmColor: "#9c3f3f",
      success: result => {
        if (!result.confirm) return;
        try {
          const data = store.load();
          const record = data.records.find(item => item.id === recordId);
          if (!record) return;
          const materials = store.recordMaterials(record).filter(item => item !== path);
          record.image = materials[0] || "";
          record.materials = materials;
          store.save(data);
          media.removeLocalFile(path);
          this.refreshPreservingInput();
        } catch (_) {
          wx.showToast({ title: "材料移除失败，请重试", icon: "none" });
        }
      }
    });
  }
});
