const legal = require("../../utils/legal");

Page({
  data: { item: null },
  onLoad(options) {
    const item = legal.find(options.id);
    if (!item) { wx.navigateBack(); return; }
    this.setData({ item });
    wx.setNavigationBarTitle({ title: item.kind });
  },
  copySource() {
    wx.setClipboardData({ data: `${this.data.item.source}\n${this.data.item.url}`, success: () => wx.showToast({ title: "来源链接已复制", icon: "none" }) });
  }
});
