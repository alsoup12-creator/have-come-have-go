Component({
  data: {
    selected: 0,
    tabs: [
      { pagePath: "/pages/home/index", text: "今天", icon: "/assets/icons/today-line.png", selectedIcon: "/assets/icons/today-filled.png" },
      { pagePath: "/pages/records/index", text: "记录", icon: "/assets/icons/records-line.png", selectedIcon: "/assets/icons/records-filled.png" },
      { pagePath: "/pages/clarify/index", text: "说清", icon: "/assets/icons/clarify-line.png", selectedIcon: "/assets/icons/clarify-filled.png" },
      { pagePath: "/pages/mine/index", text: "我的", icon: "/assets/icons/mine-line.png", selectedIcon: "/assets/icons/mine-filled.png" }
    ]
  },

  methods: {
    switchTab(event) {
      const index = Number(event.currentTarget.dataset.index);
      const tab = this.data.tabs[index];
      if (!tab) return;
      wx.switchTab({ url: tab.pagePath });
    },

    addRecord() {
      const data = wx.getStorageSync("zhiwangsilai.data.v1");
      if (!data?.relationships?.length) {
        wx.navigateTo({ url: "/pages/relationship-edit/index?returnToRecord=1" });
        return;
      }
      wx.showActionSheet({
        itemList: ["文字记录", "截图记录", "拍摄小票", "礼物记录"],
        success: result => {
          const mode = ["text", "image", "receipt", "gift"][result.tapIndex] || "text";
          wx.navigateTo({ url: `/pages/record-edit/index?mode=${mode}` });
        }
      });
    }
  }
});
