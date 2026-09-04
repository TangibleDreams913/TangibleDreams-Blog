/* about.js - 关于页：网站统计 + 博主信息填充 */
(function (global) {
  "use strict";

  var fetchGitHubJSON = global.fetchGitHubJSON;
  var GITHUB_API = global.GITHUB_API;
  var utils = global.Utils;

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
    fetch("/article/NovelList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/images/ImageList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/music/MusicList.json").then(function (r) { return r.json(); }).catch(function () { return []; }),
    fetch("/api/guestbook").then(function (r) { return r.json(); }).catch(function () { return { list: [] }; })
  ]).then(function (res) {
    setNum("stat-article", (Array.isArray(res[0]) ? res[0] : []).length);
    setNum("stat-images", (Array.isArray(res[1]) ? res[1] : []).length);
    setNum("stat-music", (Array.isArray(res[2]) ? res[2] : []).length);
    setNum("stat-guestbook", (res[3] && res[3].list) ? res[3].list.length : 0);
  });

  /* 从 GitHub API 补充博主信息（bio / email / blog） */
  if (typeof fetchGitHubJSON === "function" && typeof GITHUB_API === "string") {
    fetchGitHubJSON(GITHUB_API).then(function (data) {
      if (!data) return;
      if (data.bio) {
        var bio = document.getElementById("about-bio");
        if (bio) bio.textContent = data.bio;
      }
      if (data.email) {
        var email = document.getElementById("about-email");
        if (email) {
          email.setAttribute("href", "mailto:" + data.email);
          email.textContent = data.email;
        }
      }
      if (data.blog) {
        var blog = document.getElementById("about-blog");
        var url = data.blog;
        if (url.indexOf("http") !== 0) url = "https://" + url;
        if (blog) blog.innerHTML = '<a href="' + utils.escapeHTML(url) + '" target="_blank" rel="noopener">' + utils.escapeHTML(data.blog) + "</a>";
      }
    }).catch(function () {});
  }
})(window);
