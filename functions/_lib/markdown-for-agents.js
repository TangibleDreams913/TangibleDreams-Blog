/* functions/_lib/markdown-for-agents.js
   Markdown for Agents（内容协商）—— 生成逻辑模块。

   核心职责：当请求携带 `Accept: text/markdown` 时，为本站各「页面」路由
   生成干净、无需抓取 HTML 结构的 Markdown 表示，供智能体 / LLM 直接消费。

   设计要点：
   - 直接读取 JSON / TXT 数据源（经 env.ASSETS），而非对 HTML 做反向转换，
     因此天然是「去格式化的纯文本」，token 更省、结构更清晰。
   - 非页面资源（/assets、/api、/rss.xml、/sitemap.xml、图片等二进制）一律
     透传，不参与 Markdown 协商。
   - 文档约定的关键响应头：
       content-type: text/markdown; charset=utf-8
       vary: accept
       x-markdown-tokens: <估算 token 数>
     （另透传原响应的安全/缓存头，如 HSTS、CSP、Cache-Control。）

   若目标域名接入 Cloudflare 原生「Markdown for Agents（Zone 级）」，本模块
   亦可作为其背后的应用侧兜底，两者可共存：原生特性在边缘做 HTML→Markdown
   转换，本模块对「以 JSON 驱动的列表/阅读」类页面提供更精简的专用表示。
   */

const SITE = "https://tangibledreams.top";

/* ---------- 数据读取（复用 rss.xml.js / sitemap.xml.js 的 ASSETS 约定） ---------- */

async function fetchJSON(env, path, fallback) {
  try {
    const resp = await env.ASSETS.fetch(new Request(SITE + path));
    if (!resp.ok) return fallback;
    return await resp.json();
  } catch (e) {
    return fallback;
  }
}

async function fetchText(env, path, fallback) {
  try {
    const resp = await env.ASSETS.fetch(new Request(SITE + path));
    if (!resp.ok) return fallback;
    return await resp.text();
  } catch (e) {
    return fallback;
  }
}

/* 无默认值的文本读取：成功返回 string，失败返回 null */
async function fetchTextOrNull(env, path) {
  try {
    const resp = await env.ASSETS.fetch(new Request(SITE + path));
    if (!resp.ok) return null;
    return await resp.text();
  } catch (e) {
    return null;
  }
}

/* ---------- 文本工具 ---------- */

/* 清洗单行文本：压缩空白、去除会造成 Markdown 误解析的字符 */
function oneLine(v) {
  return String(v == null ? "" : v).replace(/\s+/g, " ").trim();
}

/* 面板标题装饰：让智能体快速感知栏目边界 */
function section(title) {
  return "## " + title + "\n";
}

/* ---------- Token 估算 ----------
   text/markdown · x-markdown-tokens 的近似值（非精确，仅供预算）。
   中文/日文等 CJK 字符 ≈ 1 token/字；其余按 ASCII 约 1 token/4 字符；空白不重计。 */
function estimateTokens(text) {
  let tokens = 0;
  let asciiRun = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    const isCJK = (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xffef) || // 全角 ASCII
      (code >= 0x3040 && code <= 0x30ff) || // 日文假名
      (code >= 0xac00 && code <= 0xd7af);   // 韩文
    if (isCJK) {
      tokens += 1;
      asciiRun = 0;
    } else {
      asciiRun += 1;
      if (asciiRun === 4) {
        tokens += 1;
        asciiRun = 0;
      }
    }
  }
  if (asciiRun > 0) tokens += 1;
  return Math.max(tokens, 1);
}

/* ---------- 各页面 Markdown 生成 ---------- */

/* 首页 */
async function renderHome(env) {
  const novelList = await fetchJSON(env, "/article/NovelList.json", []);
  const imgList = await fetchJSON(env, "/images/ImageList.json", []);
  const musicList = await fetchJSON(env, "/music/MusicList.json", []);

  let md = section("站点索引") + "\n";
  md += "TangibleDreams 的个人博客站点，包含文章、图片、音乐与留言板。\n\n";
  md += "导航：\n";
  md += "- [首页](/)\n";
  md += "- [文章](/article/index.html)\n";
  md += "- [图片](/images/index.html)\n";
  md += "- [音乐](/music/index.html)\n";
  md += "- [留言](/guestbook/index.html)\n";
  md += "- [好友](/friend/index.html)\n";
  md += "- [关于](/about/index.html)\n";
  md += "- [RSS](/rss.xml)\n\n";

  if (Array.isArray(novelList) && novelList.length) {
    md += section("精选文章") + "\n";
    md += "| 标题 | 作者 | 简介 | 阅读 |\n";
    md += "| --- | --- | --- | --- |\n";
    novelList.forEach(function (it) {
      const title = oneLine(it.title || it.id || "未命名文章");
      const author = oneLine(it.author || "");
      const desc = oneLine(it.description || "");
      const url = "/article/reader.html?id=" + encodeURIComponent(it.id || "");
      md += "| " + cell(title) + " | " + cell(author) + " | " + cell(desc) + " | [" +
        oneLine(title) + "](" + url + ") |\n";
    });
    md += "\n";
  }

  if (Array.isArray(imgList) && imgList.length) {
    md += section("图片") + "\n";
    imgList.forEach(function (it) {
      const title = oneLine(it.title || it.id || "未命名图片");
      const desc = oneLine(it.description || "");
      md += "- " + title + (desc ? " — " + desc : "") + "\n";
    });
    md += "\n";
  }

  if (Array.isArray(musicList) && musicList.length) {
    md += section("音乐") + "\n";
    musicList.forEach(function (it) {
      const title = oneLine(it.title || it.id || "未命名曲目");
      const artist = oneLine(it.artist || "");
      md += "- " + title + (artist ? " — " + artist : "") + "\n";
    });
    md += "\n";
  }

  md += section("访问说明") + "\n";
  md += "本站支持内容协商：携带 `Accept: text/markdown` 请求本页即可获得本 Markdown 表示；无该头时返回 HTML（浏览器默认）。\n";
  return md;
}

/* 文章列表：/article/index.html，也作为任意 /article/* 的兜底 */
async function renderArticleList(env) {
  const novelList = await fetchJSON(env, "/article/NovelList.json", []);
  let md = section("全部文章") + "\n\n";

  if (!Array.isArray(novelList) || !novelList.length) {
    md += "暂未收录文章，请等待博主上传。\n";
    return md;
  }

  md += "| 标题 | 作者 | 简介 | 阅读 |\n";
  md += "| --- | --- | --- | --- |\n";
  novelList.forEach(function (it) {
    const title = oneLine(it.title || it.id || "未命名文章");
    const author = oneLine(it.author || "");
    const desc = oneLine(it.description || "");
    const url = "/article/reader.html?id=" + encodeURIComponent(it.id || "");
    md += "| " + cell(title) + " | " + cell(author) + " | " + cell(desc) + " | [" +
      oneLine(title) + "](" + url + ") |\n";
  });
  md += "\n";
  return md;
}

/* 文章阅读页：/article/reader.html?id=xxx —— 直接输出正文纯文本 */
async function renderArticleReader(env, id) {
  const novelList = await fetchJSON(env, "/article/NovelList.json", []);
  const item = (Array.isArray(novelList) ? novelList : []).find(function (it) {
    return String(it.id) === String(id);
  });

  if (!item) {
    return "## 未找到该文章\n\n未找到 id 为 `" + oneLine(id) + "` 的文章。\n";
  }

  const title = oneLine(item.title || item.id || "未命名文章");
  const author = oneLine(item.author || "");
  const desc = oneLine(item.description || "");
  const updated = oneLine(item.updated || "");

  /* 正文：原文 TXT 直接作为纯文本（去首行标题结构，保留正文段落） */
  const raw = (await fetchTextOrNull(env, "/article/" + (item.file || ""))) || "";
  let body = raw.replace(/^[\s\u3000]*《?[^》\n]*》?[\s\S]*?\n[\s\u3000]*={2,}[^\n]*\n?/m, "").trim();

  let md = "# " + title + "\n\n";
  const meta = [];
  if (author) meta.push("作者：" + author);
  if (updated) meta.push("更新于 " + updated);
  if (meta.length) md += meta.join(" · ") + "\n\n";
  if (desc) md += "> " + desc + "\n\n";
  md += "---\n\n";
  md += body ? body + "\n" : "（正文暂缺）\n";

  /* 阅读与下载链接 */
  md += "\n---\n\n";
  md += "- [阅读原文](/article/reader.html?id=" + encodeURIComponent(String(item.id)) + ")\n";
  if (item.file) md += "- [下载 TXT](/article/" + encodeURIComponent(item.file) + ")\n";
  if (item.updated) md += "- 更新：" + updated + "\n";
  return md;
}

/* 图片画廊 */
async function renderImageGallery(env) {
  const imgList = await fetchJSON(env, "/images/ImageList.json", []);
  let md = section("图片画廊") + "\n\n";
  if (!Array.isArray(imgList) || !imgList.length) {
    md += "暂未收录图片，请等待博主上传。\n";
    return md;
  }
  imgList.forEach(function (it) {
    const title = oneLine(it.title || it.id || "未命名图片");
    const desc = oneLine(it.description || "");
    const date = oneLine(it.date || "");
    const src = it.src ? "/images/" + it.src : "";
    md += "## " + title + "\n\n";
    if (date) md += "- 日期：" + date + "\n";
    if (desc) md += "- 描述：" + desc + "\n";
    if (src) md += "- 原图：" + src + "\n";
    md += "\n";
  });
  return md;
}

/* 音乐收藏 */
async function renderMusicGallery(env) {
  const musicList = await fetchJSON(env, "/music/MusicList.json", []);
  let md = section("音乐收藏") + "\n\n";
  if (!Array.isArray(musicList) || !musicList.length) {
    md += "暂未收录音乐，请等待博主上传。\n";
    return md;
  }
  musicList.forEach(function (it) {
    const title = oneLine(it.title || it.id || "未命名曲目");
    const artist = oneLine(it.artist || "");
    const desc = oneLine(it.description || "");
    const src = it.src ? "/music/" + it.src : "";
    md += "## " + title + "\n\n";
    if (artist) md += "- 艺术家：" + artist + "\n";
    if (desc) md += "- 描述：" + desc + "\n";
    if (src) md += "- 音频：" + src + "\n";
    md += "\n";
  });
  return md;
}

/* 好友 */
async function renderFriends(env) {
  const friendList = await fetchJSON(env, "/friend/FriendList.json", []);
  let md = section("开发者好友") + "\n\n";
  if (!Array.isArray(friendList) || !friendList.length) {
    md += "暂无好友。\n";
    return md;
  }
  friendList.forEach(function (it) {
    const id = oneLine(it.id || "");
    const bio = oneLine(it.bio || "");
    const url = oneLine(it.url || "");
    md += "- **" + (id || "未命名") + "**" + (bio ? "：" + bio : "") + "\n";
    if (url) md += "  - 主页：" + url + "\n";
  });
  return md;
}

/* 关于页：站点统计 + 联系方式 + 隐私（说明性静态内容） */
async function renderAbout(env) {
  const articleList = await fetchJSON(env, "/article/NovelList.json", []);
  const imgList = await fetchJSON(env, "/images/ImageList.json", []);
  const musicList = await fetchJSON(env, "/music/MusicList.json", []);

  let md = section("关于本站") + "\n\n";
  md += "TangibleDreams 的个人博客站点，部署于 Cloudflare Pages。\n\n";

  md += section("网站统计") + "\n";
  md += "- 文章：" + (Array.isArray(articleList) ? articleList.length : 0) + " 部\n";
  md += "- 图片：" + (Array.isArray(imgList) ? imgList.length : 0) + " 张\n";
  md += "- 音乐：" + (Array.isArray(musicList) ? musicList.length : 0) + " 首\n";
  md += "\n";

  md += section("联系方式") + "\n";
  md += "- GitHub：[TangibleDreams913](https://github.com/TangibleDreams913)\n";
  md += "- Bilibili：[Bilibili 主页](https://space.bilibili.com/1452367100)\n\n";

  md += section("隐私政策") + "\n";
  md += "- 不存储敏感信息；QQ 号仅用于生成头像，不落库。\n";
  md += "- 无第三方追踪器（无 GA / 无百度统计）、不写追踪 Cookie。\n";
  md += "- 后端仅为 Cloudflare D1 SQLite 数据库。\n\n";

  md += section("订阅") + "\n";
  md += "- [RSS](/rss.xml)\n";
  return md;
}

/* 留言板：从公开 JSON API 读取留言（Markdown 正文直接保留） */
async function renderGuestbook(env) {
  let md = section("留言板") + "\n\n";
  let list = [];
  try {
    const resp = await env.ASSETS.fetch(new Request(SITE + "/api/guestbook"));
    if (resp.ok) {
      const data = await resp.json();
      list = (data && Array.isArray(data.list)) ? data.list : [];
    }
  } catch (e) {
    list = [];
  }

  if (!list.length) {
    md += "暂无留言。\n";
    return md;
  }

  list.forEach(function (g) {
    const nick = oneLine(g.nickname || "匿名");
    const body = String(g.body || "").trim();
    md += "## " + nick + "\n\n";
    if (g.created_at) md += "- 时间：" + oneLine(g.created_at) + "\n";
    if (body) {
      md += "\n" + body + "\n";
    }
    md += "\n";
  });
  return md;
}

/* ---------- 路由分发 ---------- */

/* 判断请求是否指向可协商的「页面」（与静态资源、API、XML 区分开） */
function isNegotiablePage(pathname) {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/" || p === "/index.html") return true;
  return (
    p === "/article" || p === "/article/index.html" || /^\/article\/reader\.html$/i.test(p) ||
    p === "/images" || p === "/images/index.html" ||
    p === "/music" || p === "/music/index.html" ||
    p === "/about" || p === "/about/index.html" ||
    p === "/friend" || p === "/friend/index.html" ||
    p === "/guestbook" || p === "/guestbook/index.html"
  );
}

/* 根据请求生成 Markdown 正文（不包含 frontmatter）。
   返回 { body, title, description }，meta 由数据源推导，不依赖 HTML 抓取，
   因此可安全绕开 /article/index.html 等目录页的 308 重定向。 */
async function buildMarkdown(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  const p = pathname.replace(/\/+$/, "") || "/";

  if (p === "/" || p === "/index.html") {
    return Object.assign({ body: await renderHome(context.env) }, {
      title: "TangibleDreams",
      description: "TangibleDreams 的个人博客 - 首页"
    });
  }
  if (/^\/article\/reader\.html$/i.test(p)) {
    return renderArticleReaderMeta(context.env, url.searchParams.get("id") || "");
  }
  if (p === "/article" || p === "/article/index.html") {
    return Object.assign({ body: await renderArticleList(context.env) }, {
      title: "TangibleDreams - 文章",
      description: "TangibleDreams 的文章收藏与在线阅读"
    });
  }
  if (p === "/images" || p === "/images/index.html") {
    return Object.assign({ body: await renderImageGallery(context.env) }, {
      title: "TangibleDreams - 图片",
      description: "TangibleDreams 的图片画廊"
    });
  }
  if (p === "/music" || p === "/music/index.html") {
    return Object.assign({ body: await renderMusicGallery(context.env) }, {
      title: "TangibleDreams - 音乐",
      description: "TangibleDreams 的音乐收藏与在线播放"
    });
  }
  if (p === "/friend" || p === "/friend/index.html") {
    return Object.assign({ body: await renderFriends(context.env) }, {
      title: "TangibleDreams - 好友",
      description: "TangibleDreams 的好友列表"
    });
  }
  if (p === "/about" || p === "/about/index.html") {
    return Object.assign({ body: await renderAbout(context.env) }, {
      title: "TangibleDreams - 关于",
      description: "关于本站与博主的信息、联系方式、隐私政策"
    });
  }
  if (p === "/guestbook" || p === "/guestbook/index.html") {
    return Object.assign({ body: await renderGuestbook(context.env) }, {
      title: "TangibleDreams - 留言",
      description: "TangibleDreams 的留言板"
    });
  }
  /* 兜底（正常不会到达这里，isNegotiablePage 已覆盖全部页面路由） */
  return Object.assign({ body: await renderHome(context.env) }, {
    title: "TangibleDreams",
    description: "TangibleDreams 的个人博客 - 首页"
  });
}

/* 文章阅读页：连同 frontmatter 元信息一起返回，正文直接输出纯文本 */
async function renderArticleReaderMeta(env, id) {
  const novelList = await fetchJSON(env, "/article/NovelList.json", []);
  const item = (Array.isArray(novelList) ? novelList : []).find(function (it) {
    return String(it.id) === String(id);
  });
  const title = oneLine((item && (item.title || item.id)) || "文章阅读");
  const description = oneLine((item && item.description) || "");
  return {
    body: await renderArticleReader(env, id),
    title: "TangibleDreams - " + title,
    description: description
  };
}

/* 将请求正文 + frontmatter 打包为最终 Markdown（不依赖 context.next()） */
async function composeMarkdown(context) {
  const { body, title, description } = await buildMarkdown(context);

  let md = "";
  if (title) {
    md += "---\n";
    md += "title: " + safeYAML(title) + "\n";
    if (description) md += "description: " + safeYAML(description) + "\n";
    md += "---\n\n";
  }
  md += body;

  const tokenCount = estimateTokens(md);
  const headers = new Headers();
  headers.set("Content-Type", "text/markdown; charset=utf-8");
  headers.set("Content-Language", "zh-CN");
  headers.set("Vary", "Accept");
  headers.set("Cache-Control", "public, max-age=300"); /* 数据源驱动，短缓存 */
  headers.set("x-markdown-tokens", String(tokenCount));
  headers.set("content-signal", "ai-train=yes, search=yes, ai-input=yes");

  return new Response(md, { status: 200, headers });
}

/* 单行单元格：转义 Markdown 表格中的竖线与换行 */
function cell(v) {
  return oneLine(v).replace(/\|/g, "\\|").replace(/\*\*/g, "");
}

/* YAML frontmatter 单行值：防注入 */
function safeYAML(v) {
  return String(v).replace(/["\\]/g, function (c) { return "\\" + c; }).replace(/\n/g, " ");
}

/* ---------- 对外入口：主协商逻辑 ---------- */
export async function markdownForAgents(context) {
  const { request } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  /* 仅对协商性页面响应 Markdown；其余（assets/api/xml/二进制）透传给原处理 */
  if (!isNegotiablePage(pathname)) return undefined;

  const accept = request.headers.get("Accept") || "";
  if (!wantsMarkdown(accept)) return undefined;

  return await composeMarkdown(context);
}

/* Accept 头解析：是否应返回 Markdown 表示。
   只有当客户端「显式」声明接受 text/markdown（q 大于 0）时才返回 Markdown，
   避免浏览器（其 Accept 含通配质量值，但不偏好 markdown）意外拿到
   Markdown 而破坏渲染。

   关键约定（RFC 9110 / Cloudflare Markdown for Agents）：
   - 智能体：Accept: text/markdown → 返回 Markdown。
   - 浏览器：text/html 等 + 通配质量值 → 不返回 Markdown（无显式 text/markdown）。
   - 客户端若显式写 text/markdown;q=0，视为不接受，返回 HTML。 */
function wantsMarkdown(accept) {
  const segs = parseAccept(accept);
  let mdQ = null;      /* text/markdown 或 text/* 的 q */
  let mdExplicit = false; /* 是否显式写出 text/markdown */

  for (const s of segs) {
    const t = s.type;
    if (t === "text/markdown") {
      mdExplicit = true;
      mdQ = Math.max(mdQ === null ? s.q : mdQ, s.q);
    } else if (t === "text/*") {
      mdQ = Math.max(mdQ === null ? s.q : mdQ, s.q);
    }
  }

  /* 未显式提及 text/markdown => 视为非 Markdown 客户端，返回 HTML */
  if (!mdExplicit) return false;
  return mdQ > 0;
}

/* 一次解析：扁平化为 { type, q } 列表 */
function parseAccept(accept) {
  const out = [];
  String(accept || "").split(",").forEach(function (part) {
    const seg = part.trim();
    if (!seg) return;
    const pieces = seg.split(";");
    const type = (pieces[0] || "").trim().toLowerCase();
    let q = 1;
    pieces.slice(1).forEach(function (prm) {
      const kv = prm.split("=");
      if (kv[0] && kv[0].trim().toLowerCase() === "q") {
        const qv = parseFloat(kv[1]);
        if (!isNaN(qv)) q = qv;
      }
    });
    if (type) out.push({ type: type, q: q });
  });
  return out;
}
