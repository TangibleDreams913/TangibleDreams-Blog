/* about.js - 关于页：网站统计 + 博主信息填充
   站内数据全部来自本站静态清单与 D1 留言接口，不从 GitHub 等外部接口拉取。 */
(function (global) {
  "use strict";

  var SITE_BIRTH = new Date("2026-08-31T00:00:00+08:00").getTime();

  function setNum(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  /* 运行天数 */
  var days = Math.max(0, Math.floor((Date.now() - SITE_BIRTH) / 86400000));
  setNum("stat-days", days);

  /* 最后更新时间 */
  var updated = document.getElementById("stat-updated");
  if (updated && document.lastModified) {
    var d = new Date(document.lastModified);
    if (!isNaN(d.getTime())) {
      updated.textContent = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
    } else {
      updated.textContent = document.lastModified;
    }
  }

  /* 并行拉取各数据源计算统计 */
  Promise.all([
    fetch("/article/ArticleList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/images/ImageList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/music/MusicList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/api/guestbook").then(function (r) { return r.json(); }).catch(function () { return { list: [] }; })
  ]).then(function (res) {
    setNum("stat-article", (Array.isArray(res[0]) ? res[0] : []).length);
    setNum("stat-images", (Array.isArray(res[1]) ? res[1] : []).length);
    setNum("stat-music", (Array.isArray(res[2]) ? res[2] : []).length);
    setNum("stat-guestbook", (res[3] && res[3].list) ? res[3].list.length : 0);
  });
})(window);
