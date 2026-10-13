const store = require("../../utils/store");

Page({
  data: {
    relationshipCount: 0,
    recordCount: 0,
    screenshotCount: 0
  },

  onShow() {
    const data = store.load();
    this.setData({
      relationshipCount: data.relationships.length,
      recordCount: data.records.length,
      screenshotCount: data.records.reduce((sum, item) => sum + store.recordMaterials(item).length, 0)
    });
  }
});
