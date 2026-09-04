/* ============================================================
   article.js - 文章栏目共享逻辑
   功能：文章清单加载、文章卡片渲染
   依赖：common.js（Utils / root）
   加载页面：/index.html（精选文章）、/article/index.html（全部文章）
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;

  /* 全部文章列表（NovelList.json） */
  function fetchNovelList() {
    return utils.fetchJSON(root() + "article/NovelList.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[novel] NovelList.json 加载失败：", err);
      return [];
    });
  }
  global.fetchNovelList = fetchNovelList;

  /* 首页精选文章（star.json） */
  function fetchStararticle() {
    return utils.fetchJSON(root() + "article/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[novel] star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStararticle = fetchStararticle;

  /* ---------- 文章卡片渲染（纯 DOM） ----------
     item: { id, title, author?, description?, file, updated? }
     在线阅读跳 reader.html，下载直接指向 TXT 文件。 */
  function novelCardHTML(item) {
    var id = encodeURIComponent(item.id || "");
    var readUrl = root() + "article/reader.html?id=" + id;
    var fileUrl = root() + "article/" + (item.file || "");
    var meta = [];
    if (item.author) meta.push(utils.escapeHTML(item.author));
    if (item.updated) meta.push("更新于 " + utils.escapeHTML(item.updated));
    var metaHTML = meta.length
      ? '<div class="nc-meta">' + meta.map(function (t) {
          return '<span>' + t + '</span>';
        }).join('<span class="nc-sep">·</span>') + '</div>'
      : "";

    return '<article class="card novel-card">' +
      '<div class="nc-title">' + utils.escapeHTML(item.title || item.id || "未命名文章") + '</div>' +
      metaHTML +
      '<div class="nc-desc">' + utils.escapeHTML(item.description || "暂无简介") + '</div>' +
      '<div class="nc-actions">' +
        '<a class="btn btn-primary" href="' + utils.escapeHTML(readUrl) + '">在线阅读</a>' +
        '<a class="btn" href="' + utils.escapeHTML(fileUrl) + '" download>下载 TXT</a>' +
      '</div>' +
    '</article>';
  }

  function mountNovelGrid(selector, list, perRow) {
    var box = document.querySelector(selector);
    if (!box) return;
    var items = list || [];
    if (!items.length) {
      box.innerHTML = '<div class="status-box">暂无文章。</div>';
      return;
    }
    var cls = "project-grid project-grid-" + (perRow || 2);
    box.innerHTML = '<div class="' + cls + '">' +
      items.map(novelCardHTML).join("") + "</div>";
  }
  global.mountNovelGrid = mountNovelGrid;
})(window);
