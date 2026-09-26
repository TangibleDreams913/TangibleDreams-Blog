/* ============================================================
   theme-init.js - 主题初始化逻辑
   - 优先使用 localStorage 中 10 分钟内的手动选择
   - 否则跟随系统或浏览器 prefers-color-scheme
   - 监听系统或浏览器主题变化，手动选择过期或不存在时实时跟随
   ============================================================ */
(function () {
  var STORAGE_KEY = "theme";
  var TS_KEY = "theme-ts";
  var TTL = 10 * 60 * 1000;

  function manualThemeValid() {
    try {
      var t = localStorage.getItem(STORAGE_KEY);
      var ts = localStorage.getItem(TS_KEY);
      if (t !== "dark" && t !== "light") return null;
      if (!ts) return null;
      return (Date.now() - Number(ts) < TTL) ? t : null;
    } catch (e) { return null; }
  }

  function systemTheme() {
    return (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark" : "light";
  }

  function setAttr(t) {
    document.documentElement.setAttribute("data-theme", t);
  }

  try {
    var t = manualThemeValid();
    if (!t) t = systemTheme();
    setAttr(t);

    if (window.matchMedia) {
      var mql = window.matchMedia("(prefers-color-scheme: dark)");
      var onChange = function (e) {
        if (manualThemeValid()) return;
        setAttr(e.matches ? "dark" : "light");
      };
      if (mql.addEventListener) mql.addEventListener("change", onChange);
      else if (mql.addListener) mql.addListener(onChange);
    }
  }
  catch (e) {
    setAttr("light");
  }
})();
