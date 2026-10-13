const store = require("./utils/store");

App({
  onLaunch() {
    store.load();
  },
  globalData: {
    productName: "知往思来"
  }
});
