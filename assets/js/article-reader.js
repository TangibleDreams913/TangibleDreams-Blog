/* ============================================================
   article-reader.js - 文章在线阅读页专属逻辑
   功能：按 ?id= 从 NovelList.json 查找文章，加载 TXT 并渲染阅读界面
   依赖：common.js（Utils / root）、article.js（fetchNovelList）
   加载页面：/article/reader.html
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;

  function escapeHtml(s) {
    return utils.escapeHTML(s);
  }

  /* 将 TXT 文本按段落渲染进阅读容器；
     保留原文换行，同时支持字号调整。 */
  function renderText(text) {
    var body = document.getElementById("reader-body");
    if (!body) return;
    body.textContent = text;

    var count = document.getElementById("reader-count");
    var countFoot = document.getElementById("reader-count-foot");
    var label = "全文字数：" + text.replace(/\s/g, "").length;
    if (count) count.textContent = label;
    if (countFoot) countFoot.textContent = label;
  }

  function initReader() {
    var params = new URLSearchParams(window.location.search);
    var id = params.get("id") || "";

    var titleEl = document.getElementById("reader-title");
    var metaEl = document.getElementById("reader-meta");
    var descEl = document.getElementById("reader-desc");
    var bodyEl = document.getElementById("reader-body");
    var backEl = document.getElementById("reader-back");
    var downloadEl = document.getElementById("reader-download");

    if (!id) {
      window.location.replace(root() + "article/index.html");
      return;
    }

    if (bodyEl) bodyEl.innerHTML = '<div class="status-box">加载中…</div>';

    fetchNovelList().then(function (list) {
      var item = null;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === id) { item = list[i]; break; }
      }
      if (!item) {
            window.location.replace(root() + "article/index.html");
            return;
      }

      var titleTag = document.querySelector('title');
      if (titleTag && item.title) {
          titleTag.textContent = item.title + ' - TangibleDreams';
      }

      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
          var descText = item.description || ('阅读文章《' + item.title + '》');
          if (descText.length > 150) {
              descText = descText.substring(0, 150) + '...';
          }
          if (descText.length < 25) {
              descText = '阅读《' + item.title + '》 - TangibleDreams 个人博客文章';
              if (descText.length > 150) {
                  descText = descText.substring(0, 150) + '...';
              }
          }
          metaDesc.setAttribute('content', descText);
      }

      var canonicalLink = document.querySelector('link[rel="canonical"]');
      if (canonicalLink) {
          canonicalLink.href = window.location.href;
      } 
      else {
          var newCanonical = document.createElement('link');
          newCanonical.rel = 'canonical';
          newCanonical.href = window.location.href;
          document.head.appendChild(newCanonical);
      }

      if (titleEl) titleEl.textContent = item.title || item.id;
      if (descEl) descEl.textContent = item.description || "";
      if (backEl) backEl.href = root() + "article/index.html";

      var meta = [];
      if (item.author) meta.push("作者：" + item.author);
      if (item.updated) meta.push("更新于 " + item.updated);
      if (metaEl) metaEl.innerHTML = meta.map(function (t) {
        return '<span>' + escapeHtml(t) + '</span>';
      }).join('<span class="reader-meta-sep">·</span>');

      if (downloadEl && item.file) {
        downloadEl.href = root() + "article/" + item.file;
        downloadEl.setAttribute("download", "");
        downloadEl.style.display = "inline-flex";
      }

      /* 加载 TXT 正文 */
      var fileUrl = root() + "article/" + (item.file || "");
      fetch(fileUrl).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      }).then(function (text) {
        renderText(text);
      }).catch(function (err) {
        console.warn("[reader] 正文加载失败：", err);
        if (bodyEl) bodyEl.innerHTML = '<div class="status-box">正文加载失败，请稍后重试。</div>';
      });
    });
  }

  /* 字号控制：A- / A+ */
  function bindFontSize() {
    var body = document.getElementById("reader-body");
    var smaller = document.getElementById("reader-font-smaller");
    var larger = document.getElementById("reader-font-larger");
    if (!body) return;
    var KEY = "reader_font_size";
    var MIN = 14, MAX = 28, DEFAULT = 17;
    var cur = parseInt(localStorage.getItem(KEY), 10) || DEFAULT;
    cur = Math.max(MIN, Math.min(MAX, cur));
    body.style.fontSize = cur + "px";
    if (smaller) {
      smaller.addEventListener("click", function () {
        cur = Math.max(MIN, cur - 1);
        body.style.fontSize = cur + "px";
        try { localStorage.setItem(KEY, String(cur)); } catch (e) {}
      });
    }
    if (larger) {
      larger.addEventListener("click", function () {
        cur = Math.min(MAX, cur + 1);
        body.style.fontSize = cur + "px";
        try { localStorage.setItem(KEY, String(cur)); } catch (e) {}
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindFontSize();
    initReader();
  });
})(window);
