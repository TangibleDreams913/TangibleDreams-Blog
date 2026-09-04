/* ============================================================
   music.js - 音乐栏目共享逻辑
   功能：音乐清单加载、音乐卡片渲染
   依赖：common.js（Utils / root）
   加载页面：/index.html（精选音乐）、/music/index.html（音乐列表）
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;

  /* 全部音乐列表（MusicList.json） */
  function fetchMusicList() {
    return utils.fetchJSON(root() + "music/MusicList.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[music] MusicList.json 加载失败：", err);
      return [];
    });
  }
  global.fetchMusicList = fetchMusicList;

  /* 首页精选音乐（star.json） */
  function fetchStarMusic() {
    return utils.fetchJSON(root() + "music/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[music] star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarMusic = fetchStarMusic;

  /* 音乐完整路径：src 为 music/ 下的相对路径 */
  function musicUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return root() + "music/" + path;
  }

  /* ---------- 音乐卡片渲染（纯 DOM） ----------
     item: { id, title?, artist?, description?, src } */
  function musicCardHTML(item) {
    var title = item.title || item.id || "未命名音乐";
    var src = musicUrl(item.src);
    var meta = [];
    if (item.artist) meta.push(utils.escapeHTML(item.artist));
    var metaHTML = meta.length
      ? '<div class="mc-meta">' + meta.join('<span class="mc-sep">·</span>') + '</div>'
      : "";

    function getFileExtension(url) {
      const path = url.split('?')[0];
      const parts = path.split('.');
      return parts.length > 1 ? parts.pop().toUpperCase() : '';
    }

    const ext = getFileExtension(src);
    const downloadLabel = ext ? `下载 ${ext}` : '下载 音频文件';

    return '<article class="card music-card">' +
      '<div class="mc-title">' + utils.escapeHTML(title) + '</div>' +
      metaHTML +
      '<div class="mc-desc">' + utils.escapeHTML(item.description || "暂无简介") + '</div>' +
      '<audio class="mc-audio" controls preload="none" src="' + utils.escapeHTML(src) + '"></audio>' +
      '<div class="mc-actions">' +
        '<a class="btn" href="' + utils.escapeHTML(src) + '" download>' + utils.escapeHTML(downloadLabel) + '</a>' +
      '</div>' +
    '</article>';
  }

  function mountMusicList(selector, list, perRow) {
    var box = document.querySelector(selector);
    if (!box) return;
    var items = list || [];
    if (!items.length) {
      box.innerHTML = '<div class="status-box">暂无音乐。</div>';
      return;
    }
    var cls = "project-grid project-grid-" + (perRow || 2);
    box.innerHTML = '<div class="' + cls + '">' +
      items.map(musicCardHTML).join("") + "</div>";
  }
  global.mountMusicList = mountMusicList;
})(window);
