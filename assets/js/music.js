/* ============================================================
   music.js - 音乐栏目共享逻辑
   功能：音乐清单加载、音乐卡片渲染
   依赖：common.js（Utils / root）+ music-player.js（自定义播放器，可选）
   加载页面：/index.html（精选音乐）、/music/index.html（音乐列表）
   说明：卡片内的播放器由 music-player.js 渲染（替换原生 <audio controls>）；
         该模块未加载时自动回退原生播放器，两者互不依赖。
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

  /* ---------- 播放器（与播放器实现解耦） ----------
     优先交给 music-player.js 渲染自定义播放器；
     模块缺失时回退原生 <audio controls>，页面功能不依赖脚本加载顺序。 */
  function playerHTML(item, src, title) {
    if (global.MusicPlayer && global.MusicPlayer.playerHTML) {
      return global.MusicPlayer.playerHTML({
        id: item.id,
        title: title,
        artist: item.artist,
        src: src
      });
    }
    return '<audio class="mc-audio" controls preload="none" src="' +
      utils.escapeHTML(src) + '"></audio>';
  }

  /* ---------- 音乐卡片渲染（纯 DOM） ----------
     item: { id, title?, artist?, description?, src, download? }
     src      —— 在线播放用的文件（构建脚本会把 wav 等格式换成同目录 mp3）
     download —— 下载按钮指向的原始文件（wav / flac 等，无损音质）；缺省时退回 src */
  function musicCardHTML(item) {
    var title = item.title || item.id || "未命名音乐";
    var src = musicUrl(item.src);
    var downloadSrc = musicUrl(item.download || item.src);
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

    /* 按钮文案按"下载文件"的扩展名走，例如 下载 WAV */
    const ext = getFileExtension(downloadSrc);
    const downloadLabel = ext ? `下载 ${ext}` : '下载 音频文件';

    return '<article class="card music-card">' +
      '<div class="mc-title">' + utils.escapeHTML(title) + '</div>' +
      metaHTML +
      '<div class="mc-desc">' + utils.escapeHTML(item.description || "暂无简介") + '</div>' +
      playerHTML(item, src, title) +
      '<div class="mc-actions">' +
        '<a class="btn" href="' + utils.escapeHTML(downloadSrc) + '" download>' + utils.escapeHTML(downloadLabel) + '</a>' +
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
    /* 重渲染（如搜索过滤）前先卸载旧播放器，避免旧音频脱离文档后仍在播放 */
    if (global.MusicPlayer && global.MusicPlayer.teardown) global.MusicPlayer.teardown(box);
    box.innerHTML = '<div class="' + cls + '">' +
      items.map(musicCardHTML).join("") + "</div>";
    /* 渲染完成后为卡片内的自定义播放器绑定事件（幂等，搜索重渲染可重复调用） */
    if (global.MusicPlayer && global.MusicPlayer.setup) global.MusicPlayer.setup(box);
  }
  global.mountMusicList = mountMusicList;
})(window);
