/* ============================================================
   music-player.js - 自定义音乐播放器（替换浏览器原生 <audio controls>）
   被 music.js（首页精选音乐 / 音乐列表卡片）复用，与数据加载、卡片渲染解耦：
     · 只负责"把一段音频放出来"的交互与外观，不关心清单从哪来、路径怎么拼；
     · 播放地址由调用方传入（src 必须是可直接访问的完整地址）；
     · 未加载本模块时，music.js 自动回退到原生播放器。
   对外接口（window.MusicPlayer）：
    playerHTML(item)   → 播放器 HTML（item: { src, title?, artist?, id? }）
     setup(container)   → 为容器内所有 .music-player 绑定事件（可重复调用）
     teardown(container)→ 卸载容器内的播放器：暂停并注销（列表重渲染前调用，
                          避免旧 <audio> 被移除后仍在后台播放的"幽灵播放"）
     pauseAll()         → 暂停页面上所有播放器
     formatTime(sec)    → 秒 → mm:ss / h:mm:ss
   依赖：common.js（Utils.escapeHTML）
   样式：assets/css/music.css（.music-player / .mp-*）
   ============================================================ */

(function (global) {
  "use strict";

  var utils = global.Utils;

  /* ---------- 存储键（音量 / 静音为全站共享偏好，与主题一样写入 localStorage） ---------- */
  var STORAGE_VOLUME = "mp_volume";
  var STORAGE_MUTED = "mp_muted";

  /* ---------- 内联 SVG 图标（currentColor，随明暗主题自适应） ---------- */
  var ICON_PLAY =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    /* 三角形外接矩形水平居中于视框中心（x 5.3~18.7，中心 12），避免视觉偏右 */
    '<path d="M5.3 5.2a1.2 1.2 0 0 1 1.83-1.02l11 6.8a1.2 1.2 0 0 1 0 2.04l-11 6.8A1.2 1.2 0 0 1 5.3 ' +
    '18.8V5.2Z"/></svg>';

  var ICON_PAUSE =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<rect x="7" y="4.5" width="3.6" height="15" rx="1.3"/>' +
    '<rect x="13.4" y="4.5" width="3.6" height="15" rx="1.3"/></svg>';

  var ICON_VOLUME =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M4.6 9.4h2.7l4-3.6a.9.9 0 0 1 1.5.67v11.06a.9.9 0 0 1-1.5.67l-4-3.6H4.6a1.4 ' +
    '1.4 0 0 1-1.4-1.4v-3.4a1.4 1.4 0 0 1 1.4-1.4Z"/>' +
    '<path d="M15.9 8.5a1 1 0 0 1 1.4.03 4.9 4.9 0 0 1 0 6.94 1 1 0 0 1-1.44-1.39 2.9 2.9 0 0 ' +
    '0 0-4.16 1 1 0 0 1 .04-1.42Z"/>' +
    '<path d="M18.8 5.7a1 1 0 0 1 1.4.03 9.1 9.1 0 0 1 0 12.54 1 1 0 0 1-1.44-1.39 7.1 7.1 0 0 ' +
    '0 0-9.76 1 1 0 0 1 .04-1.42Z"/></svg>';

  var ICON_MUTED =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M4.6 9.4h2.7l4-3.6a.9.9 0 0 1 1.5.67v11.06a.9.9 0 0 1-1.5.67l-4-3.6H4.6a1.4 ' +
    '1.4 0 0 1-1.4-1.4v-3.4a1.4 1.4 0 0 1 1.4-1.4Z"/>' +
    '<path d="M15.3 9.3a1 1 0 0 1 1.4 0l1.3 1.3 1.3-1.3a1 1 0 0 1 1.4 1.4L19.4 12l1.3 1.3a1 1 0 ' +
    '0 1-1.4 1.4L18 13.4l-1.3 1.3a1 1 0 0 1-1.4-1.4l1.3-1.3-1.3-1.3a1 1 0 0 1 0-1.4Z"/></svg>';

  /* ---------- 全局共享状态 ---------- */
  var players = [];              /* 已绑定的播放器记录，用于互斥播放与全局音量同步 */
  var volume = readVolume();     /* 0~1 */
  var muted = readMuted();
  var lastVolume = volume > 0 ? volume : 1; /* 静音前的音量，取消静音时恢复 */

  function readVolume() {
    try {
      var v = parseFloat(localStorage.getItem(STORAGE_VOLUME));
      if (isFinite(v) && v >= 0 && v <= 1) return v;
    } catch (e) {}
    return 1;
  }
  function readMuted() {
    try { return localStorage.getItem(STORAGE_MUTED) === "1"; } catch (e) { return false; }
  }
  function savePrefs() {
    try {
      localStorage.setItem(STORAGE_VOLUME, String(volume));
      localStorage.setItem(STORAGE_MUTED, muted ? "1" : "0");
    } catch (e) {}
  }

  /* ---------- 小工具 ---------- */
  function esc(s) {
    return utils && utils.escapeHTML ? utils.escapeHTML(s) : String(s == null ? "" : s);
  }

  /* 秒 → mm:ss（≥1 小时为 h:mm:ss；时长未知返回 --:--） */
  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return "--:--";
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return (h > 0 ? h + ":" + p(m) : String(m)) + ":" + p(s);
  }

  /* ---------- 播放器 HTML ----------
     item: { src(必填，可直接访问的地址), title?, artist?, id? }
     结构：隐藏的原生 <audio> 作为播放引擎 + 自绘控件（播放/暂停、进度、时间、音量） */
  function playerHTML(item) {
    item = item || {};
    var src = item.src || "";
    var title = item.title || item.id || "未命名音乐";
    var artist = item.artist || "";

    return '<div class="music-player" data-title="' + esc(title) + '" data-artist="' + esc(artist) + '">' +
      /* 原生控件隐藏，仅作解码 / 播放引擎；preload="none" 不预载音频，首次点击才请求 */
      '<audio class="mp-audio" preload="none" playsinline src="' + esc(src) + '"></audio>' +
      '<div class="mp-row mp-main">' +
        '<button class="mp-play" type="button" aria-label="播放 ' + esc(title) + '" aria-pressed="false">' +
          '<span class="mp-icon mp-icon-play">' + ICON_PLAY + '</span>' +
          '<span class="mp-icon mp-icon-pause">' + ICON_PAUSE + '</span>' +
        '</button>' +
        '<input class="mp-seek" type="range" min="0" max="1000" step="1" value="0" ' +
          'aria-label="播放进度：' + esc(title) + '">' +
      '</div>' +
      '<div class="mp-row mp-sub">' +
        '<span class="mp-time"><span class="mp-cur">0:00</span>' +
          '<span class="mp-dur">--:--</span></span>' +
        '<span class="mp-state" role="status" aria-live="polite"></span>' +
        '<span class="mp-volume">' +
          '<button class="mp-mute" type="button" aria-label="静音">' +
            '<span class="mp-icon mp-icon-volume">' + ICON_VOLUME + '</span>' +
            '<span class="mp-icon mp-icon-muted">' + ICON_MUTED + '</span>' +
          '</button>' +
          '<input class="mp-vol" type="range" min="0" max="100" step="1" ' +
            'value="' + Math.round((muted ? 0 : volume) * 100) + '" aria-label="音量">' +
        '</span>' +
      '</div>' +
    '</div>';
  }

  /* ---------- 系统媒体控件（锁屏 / 媒体键显示曲目信息，可选能力） ---------- */
  function updateMediaSession(title, artist) {
    try {
      if (!global.navigator || !global.navigator.mediaSession || !global.MediaMetadata) return;
      global.navigator.mediaSession.metadata = new global.MediaMetadata({
        title: title || "",
        artist: artist || ""
      });
    } catch (e) {}
  }

  /* ---------- 互斥播放：同一时间只响一个 ---------- */
  function pauseOthers(current) {
    for (var i = 0; i < players.length; i++) {
      var a = players[i].audio;
      if (a !== current && !a.paused) a.pause();
    }
  }
  function pauseAll() { pauseOthers(null); }

  /* ---------- 全局音量：作用于所有播放器，并同步各自 UI ---------- */
  function applyVolume() {
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      p.audio.volume = volume;
      p.audio.muted = muted || volume === 0;
      p.syncMute();
    }
    savePrefs();
  }

  /* ---------- 绑定单个播放器 ---------- */
  function bindPlayer(el) {
    if (el._mpBound) return;
    var audio = el.querySelector(".mp-audio");
    var playBtn = el.querySelector(".mp-play");
    var seek = el.querySelector(".mp-seek");
    if (!audio || !playBtn || !seek) return;
    el._mpBound = true;

    var cur = el.querySelector(".mp-cur");
    var dur = el.querySelector(".mp-dur");
    var stateEl = el.querySelector(".mp-state");
    var muteBtn = el.querySelector(".mp-mute");
    var volRange = el.querySelector(".mp-vol");
    var title = el.getAttribute("data-title") || "音乐";
    var record = { audio: audio, syncMute: syncMute };
    players.push(record);

    audio.volume = volume;
    audio.muted = muted || volume === 0;

    function setState(text) { if (stateEl) stateEl.textContent = text || ""; }

    function setPlaying(on) {
      if (on) el.classList.add("is-playing");
      else el.classList.remove("is-playing");
      playBtn.setAttribute("aria-pressed", on ? "true" : "false");
      playBtn.setAttribute("aria-label", (on ? "暂停 " : "播放 ") + title);
    }

    /* 进度条：value 0~1000 映射 0~100%，染色由 CSS 变量 --mp-played 控制 */
    function paintSeek(pct) {
      pct = Math.max(0, Math.min(1, isFinite(pct) ? pct : 0));
      seek.value = String(Math.round(pct * 1000));
      seek.style.setProperty("--mp-played", (pct * 100).toFixed(2) + "%");
    }

    function syncMute() {
      var isMuted = muted || volume === 0 || audio.muted;
      if (isMuted) el.classList.add("is-muted");
      else el.classList.remove("is-muted");
      if (muteBtn) muteBtn.setAttribute("aria-label", isMuted ? "取消静音" : "静音");
      if (volRange) {
        volRange.value = String(Math.round((volume === 0 ? 0 : volume) * 100));
        volRange.style.setProperty("--mp-played", (volume * 100).toFixed(2) + "%");
      }
    }
    syncMute();

    /* 时长未知（preload="none" 首次点击前）时进度条不可用，拿到 metadata 后再解锁 */
    seek.disabled = true;

    /* ---------- 播放 / 暂停 ---------- */
    playBtn.addEventListener("click", function () {
      if (audio.paused) {
        pauseOthers(audio);
        var p = audio.play();
        /* 浏览器可能因自动播放策略拒绝，或用户连点导致 AbortError；后者忽略 */
        if (p && p.catch) {
          p.catch(function (err) {
            if (err && err.name === "AbortError") return;
            /* error 事件已给出更具体的原因（如 404）时保留原提示 */
            if (!el.classList.contains("is-error")) {
              el.classList.add("is-error");
              setState("播放失败，请重试");
            }
            setPlaying(false);
          });
        }
      } else {
        audio.pause();
      }
    });

    /* ---------- 拖动 / 键盘调节进度 ---------- */
    seek.addEventListener("input", function () {
      var pct = Number(seek.value) / 1000;
      seek.style.setProperty("--mp-played", (pct * 100).toFixed(2) + "%");
      var d = audio.duration;
      if (isFinite(d) && d > 0) {
        audio.currentTime = pct * d;
        if (cur) cur.textContent = formatTime(pct * d);
      }
    });

    audio.addEventListener("timeupdate", function () {
      /* 用户正聚焦进度条（拖动 / 方向键）时不回写，避免与手动调节打架 */
      if (document.activeElement === seek) return;
      var d = audio.duration;
      if (isFinite(d) && d > 0) paintSeek(audio.currentTime / d);
      if (cur) cur.textContent = formatTime(audio.currentTime);
    });

    /* ---------- 播放状态 ---------- */
    audio.addEventListener("play", function () {
      el.classList.remove("is-error");
      setState("");
      setPlaying(true);
      updateMediaSession(title, el.getAttribute("data-artist") || "");
    });
    audio.addEventListener("pause", function () { setPlaying(false); });
    audio.addEventListener("ended", function () {
      setPlaying(false);
      paintSeek(0);
      if (cur) cur.textContent = formatTime(0);
      audio.currentTime = 0;
    });

    /* ---------- 时长 ---------- */
    function syncDuration() {
      var d = audio.duration;
      if (!isFinite(d) || d <= 0) return; /* 时长未知：保持"--:--"与禁用态，不回写进度 */
      seek.disabled = false;
      el.classList.add("is-ready");
      if (dur) dur.textContent = formatTime(d);
      paintSeek(audio.currentTime / d);
    }
    audio.addEventListener("loadedmetadata", syncDuration);
    audio.addEventListener("durationchange", syncDuration);

    /* ---------- 缓冲 / 失败提示 ---------- */
    audio.addEventListener("waiting", function () {
      el.classList.add("is-loading");
      setState("缓冲中…");
    });
    audio.addEventListener("playing", function () {
      el.classList.remove("is-loading", "is-error");
      setState("");
    });
    audio.addEventListener("canplay", function () {
      el.classList.remove("is-loading");
      if (!el.classList.contains("is-error")) setState("");
    });
    audio.addEventListener("error", function () {
      el.classList.remove("is-loading");
      el.classList.add("is-error");
      setPlaying(false);
      setState("音频加载失败");
    });

    /* ---------- 音量 / 静音 ---------- */
    if (volRange) {
      volRange.addEventListener("input", function () {
        volume = Number(volRange.value) / 100;
        if (volume > 0) { muted = false; lastVolume = volume; }
        else muted = true;
        applyVolume();
      });
    }
    if (muteBtn) {
      muteBtn.addEventListener("click", function () {
        if (muted || volume === 0) {
          muted = false;
          if (volume === 0) volume = lastVolume || 1;
        } else {
          lastVolume = volume;
          muted = true;
        }
        applyVolume();
      });
    }
  }

  /* ---------- 对外：为容器内所有播放器绑定事件（幂等，可对同一容器重复调用） ---------- */
  function setup(container) {
    if (!container || !container.querySelectorAll) return;
    var list = container.querySelectorAll(".music-player");
    for (var i = 0; i < list.length; i++) bindPlayer(list[i]);
  }

  /* ---------- 对外：卸载容器内的播放器 ----------
     列表搜索 / 重渲染前调用：先暂停再移除引用，否则旧的 <audio> 被 innerHTML
     替换掉之后仍会继续播放（浏览器中脱离文档的媒体元素不会自动停止）。 */
  function teardown(container) {
    if (!container || !container.querySelectorAll) return;
    var list = Array.prototype.slice.call(container.querySelectorAll(".music-player"));
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var audio = el.querySelector(".mp-audio");
      if (audio) {
        try { audio.pause(); } catch (e) {}
        audio.removeAttribute("src"); /* 断开媒体资源，交由 GC 回收 */
      }
      el._mpBound = false;
      for (var j = players.length - 1; j >= 0; j--) {
        if (players[j].audio === audio) players.splice(j, 1);
      }
    }
  }

  global.MusicPlayer = {
    playerHTML: playerHTML,
    setup: setup,
    teardown: teardown,
    pauseAll: pauseAll,
    formatTime: formatTime,
    /* 供调用方探测：容器内是否已有自定义播放器 */
    count: function (container) {
      return container && container.querySelectorAll
        ? container.querySelectorAll(".music-player").length : 0;
    }
  };
})(window);
