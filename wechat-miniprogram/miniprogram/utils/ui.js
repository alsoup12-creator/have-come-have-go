let recordsReminder = null;

function setRecordsReminder(value) { recordsReminder = value; }
function takeRecordsReminder() {
  const value = recordsReminder;
  recordsReminder = null;
  return value;
}

function statusBarHeight() {
  try {
    return wx.getWindowInfo().statusBarHeight || 24;
  } catch (_) {
    return 24;
  }
}

function fullDate() {
  const date = new Date();
  const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
  return `${date.getMonth() + 1}月${date.getDate()}日${weekdays[date.getDay()]}`;
}

function selectTab(page, index) {
  if (typeof page.getTabBar !== "function") return;
  const tabBar = page.getTabBar();
  if (tabBar) tabBar.setData({ selected: index });
}

module.exports = { fullDate, selectTab, statusBarHeight, setRecordsReminder, takeRecordsReminder };
