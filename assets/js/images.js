/* ============================================================
   images.js - 图片栏目共享逻辑
   功能：图片清单加载、缩略图卡片渲染、灯箱预览
   依赖：common.js（Utils / root）
   加载页面：/index.html（精选图片）、/images/index.html（图片画廊）
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;
  var root = global.root;

  /* 全部图片列表（ImageList.json） */
  function fetchImageList() {
    return utils.fetchJSON(root() + "images/ImageList.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[image] ImageList.json 加载失败：", err);
      return [];
    });
  }
  global.fetchImageList = fetchImageList;

  /* 首页精选图片（star.json） */
  function fetchStarImages() {
    return utils.fetchJSON(root() + "images/star.json").then(function (list) {
      return Array.isArray(list) ? list : [];
    }).catch(function (err) {
      console.warn("[image] star.json 加载失败：", err);
      return [];
    });
  }
  global.fetchStarImages = fetchStarImages;

  /* 图片完整路径：src 为 images/ 下的相对路径 */
  function imageUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return root() + "images/" + path;
  }

  /* ---------- 图片卡片渲染（纯 DOM） ----------
     item: { id, title?, description?, src, thumb?, date? }
     有 thumb 用缩略图，否则回退原图。 */
  function imageCardHTML(item, idx) {
    var src = imageUrl(item.src);
    var thumb = imageUrl(item.thumb || item.src);
    var title = item.title || item.id || "";
    var desc = utils.escapeHTML(item.description || "");

    return '<article class="card image-card">' +
      '<button class="img-thumb-btn" type="button" data-index="' + idx + '" aria-label="查看大图：' +
        utils.escapeHTML(title) + '">' +
        '<img class="img-thumb" src="' + utils.escapeHTML(thumb) + '" alt="' +
          utils.escapeHTML(title) + '" loading="lazy">' +
      '</button>' +
      '<div class="ic-title">' + utils.escapeHTML(title) + '</div>' +
      (desc ? '<div class="ic-desc">' + desc + '</div>' : '') +
    '</article>';
  }

  function mountImageGrid(selector, list, perRow) {
    var box = document.querySelector(selector);
    if (!box) return;
    var items = list || [];
    if (!items.length) {
      box.innerHTML = '<div class="status-box">暂无图片。</div>';
      return;
    }
    box._imageItems = items;
    var cls = "project-grid project-grid-" + (perRow || 2);
    box.innerHTML = '<div class="' + cls + '">' +
      items.map(function (item, idx) { return imageCardHTML(item, idx); }).join("") + "</div>";

    if (!box._imageBound) {
      box.addEventListener("click", function (e) {
        var btn = e.target.closest(".img-thumb-btn");
        if (!btn) return;
        var idx = parseInt(btn.getAttribute("data-index"), 10);
        var item = (box._imageItems || [])[idx];
        if (item) openImageLightbox(item);
      });
      box._imageBound = true;
    }
  }
  global.mountImageGrid = mountImageGrid;

  /* ---------- 灯箱（纯 DOM，首次调用时创建） ---------- */
  var lightbox = null;

  function closeImageLightbox() {
    if (lightbox) {
      lightbox.remove();
      lightbox = null;
      document.removeEventListener("keydown", onLightboxKey);
    }
  }
  function onLightboxKey(e) {
    if (e.key === "Escape") closeImageLightbox();
  }

  function openImageLightbox(item) {
    closeImageLightbox();
    var src = imageUrl(item.src);
    var title = utils.escapeHTML(item.title || item.id || "");
    var desc = utils.escapeHTML(item.description || "");

    lightbox = document.createElement("div");
    lightbox.className = "img-lightbox-mask";
    lightbox.innerHTML =
      '<div class="img-lightbox" role="dialog" aria-modal="true" aria-label="图片预览">' +
        '<button class="img-lightbox-close" type="button" aria-label="关闭">✕</button>' +
        '<img class="img-lightbox-img" src="' + utils.escapeHTML(src) + '" alt="' + title + '">' +
        '<div class="img-lightbox-info">' +
          '<div class="img-lightbox-title">' + title + '</div>' +
          (desc ? '<div class="img-lightbox-desc">' + desc + '</div>' : '') +
        '</div>' +
      '</div>';
    document.body.appendChild(lightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeImageLightbox();
      else if (e.target.closest(".img-lightbox-close")) closeImageLightbox();
      else if (e.target.closest(".img-lightbox-img")) closeImageLightbox();
    });
    document.addEventListener("keydown", onLightboxKey);
  }
  global.openImageLightbox = openImageLightbox;
  global.closeImageLightbox = closeImageLightbox;
})(window);
