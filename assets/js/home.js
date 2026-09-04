/* ============================================================
   home.js - 首页专属逻辑
   功能：GitHub 用户信息加载、精选留言卡片渲染
   依赖：common.js（Utils / fetchGitHubJSON / root）+ marked + DOMPurify（留言正文 Markdown）
   首页的文章 / 图片 / 音乐精选由 article.js / images.js / music.js 提供。
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;
  var GITHUB_API = global.GITHUB_API;
  var GITHUB_AVATAR = global.GITHUB_AVATAR;
  var GITHUB_HOME = global.GITHUB_HOME;
  var fetchGitHubJSON = global.fetchGitHubJSON;

  /* ---------- GitHub 用户信息 ----------
     本地数据优先，GitHub API 只在可用时后台覆盖更新。 */
  var FALLBACK_PROFILE = {
    name: "TangibleDreams",
    bio: "When the lights go out and we open our eyes /Out there in the silence I'll be gone /I'll be gone /Let the sun fade out and another one rise /Climbing through tomorrow I'll be gone /I'll be gone",
    location: "Earth",
    company: null,
    followers: 0,
    public_repos: 0
  };

  function fetchLocalProfile() {
    var p = Object.assign({}, FALLBACK_PROFILE);
    p.avatar = GITHUB_AVATAR;
    p.html_url = GITHUB_HOME;
    return Promise.resolve(p);
  }
  global.fetchLocalProfile = fetchLocalProfile;

  function fetchGitHubProfile() {
    return fetchGitHubJSON(GITHUB_API, "profile").then(function (data) {
      var p = {
        name: data.name || FALLBACK_PROFILE.name,
        bio: data.bio || FALLBACK_PROFILE.bio,
        location: data.location || FALLBACK_PROFILE.location,
        company: data.company || FALLBACK_PROFILE.company,
        avatar: GITHUB_AVATAR,
        html_url: GITHUB_HOME,
        followers: data.followers || 0,
        public_repos: data.public_repos || 0
      };
      return p;
    }).catch(function (err) {
      console.warn("[profile] GitHub API 不可用，保留本地数据：", err);
      return null;
    });
  }
  global.fetchGitHubProfile = fetchGitHubProfile;

  /* ---------- 精选留言数据加载 ----------
     guestbook/star.json 存放精选留言的 id 数组，渲染时按 id 调 /api/guestbook?ids= 获取。 */
  function fetchStarGuestbook() {
    return utils.fetchJSON(root() + "guestbook/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[star] guestbook/star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarGuestbook = fetchStarGuestbook;

  /* 卡片渲染复用 gb-card.js 的 window.GBCard（与留言板一致） */
  function mountGuestbookCards(selector, list) {
    var box = document.querySelector(selector);
    if (!box) return;
    var ids = (list || []).filter(function (n) { return typeof n === "number" && n > 0; });
    if (!ids.length) {
      box.innerHTML = '<div class="status-box">暂无精选留言。</div>';
      return;
    }
    box.innerHTML = '<div class="status-box">加载中…</div>';
    fetch("/api/guestbook?ids=" + ids.join(",")).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function (data) {
      var valid = (data && data.list) || [];
      if (!valid.length) {
        box.innerHTML = '<div class="status-box">精选留言加载失败，请稍后重试。</div>';
        return;
      }
      box.innerHTML = '<div class="guestbook-wall">' +
        valid.map(global.GBCard.gbCardHTML).join("") + "</div>";
      global.GBCard.setupClamp(box);
    }).catch(function () {
      box.innerHTML = '<div class="status-box">精选留言加载失败，请稍后重试。</div>';
    });
  }
  global.mountGuestbookCards = mountGuestbookCards;
})(window);
