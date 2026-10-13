function extension(path) {
  const match = String(path || "").match(/\.(jpe?g|png|webp|gif)$/i);
  return match ? `.${match[1].toLowerCase().replace("jpeg", "jpg")}` : ".jpg";
}

function persistTempFile(tempFilePath, prefix = "material") {
  return new Promise((resolve, reject) => {
    const destination = `${wx.env.USER_DATA_PATH}/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}${extension(tempFilePath)}`;
    wx.getFileSystemManager().copyFile({
      srcPath: tempFilePath,
      destPath: destination,
      success: () => resolve(destination),
      fail: error => {
        removeLocalFile(destination);
        reject(error);
      }
    });
  });
}

function chooseImages(count = 9) {
  return new Promise((resolve, reject) => {
    wx.chooseMedia({
      count,
      mediaType: ["image"],
      sourceType: ["album", "camera"],
      sizeType: ["compressed"],
      success: resolve,
      fail: error => {
        if (String(error?.errMsg || "").includes("cancel")) resolve({ tempFiles: [] });
        else reject(error);
      }
    });
  });
}

async function chooseAndPersistImages(count = 9, prefix = "material") {
  const result = await chooseImages(count);
  const files = (result.tempFiles || []).filter(item => item.tempFilePath);
  const paths = [];
  try {
    for (const file of files) paths.push(await persistTempFile(file.tempFilePath, prefix));
    return paths;
  } catch (error) {
    removeLocalFiles(paths);
    throw error;
  }
}

function removeLocalFile(path) {
  if (!String(path || "").startsWith(wx.env.USER_DATA_PATH)) return;
  try { wx.getFileSystemManager().unlinkSync(path); } catch (_) { /* already absent */ }
}

function removeLocalFiles(paths) {
  [...new Set((paths || []).filter(Boolean))].forEach(removeLocalFile);
}

module.exports = {
  chooseAndPersistImages,
  removeLocalFile,
  removeLocalFiles
};
