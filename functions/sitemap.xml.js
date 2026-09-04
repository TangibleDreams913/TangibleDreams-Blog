/* functions/sitemap.xml.js
   动态生成 sitemap → /sitemap.xml
   读取 /article/NovelList.json，将每部文章阅读页加入 sitemap；
   叠加静态栏目页（首页、文章/图片/音乐/好友/留言/关于、rss.xml）。 */
const SITE = "https://tangibledreams.top";
const article = "/article/";

function novelHref(id) {
  return article + "reader.html?id=" + encodeURIComponent(id);
}

function escapeXML(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* 静态栏目页：loc / changefreq / priority */
var STATIC_PAGES = [
  { loc: "/", changefreq: "weekly", priority: "1.0" },
  { loc: "/article/index.html", changefreq: "weekly", priority: "0.8" },
  { loc: "/images/index.html", changefreq: "weekly", priority: "0.6" },
  { loc: "/music/index.html", changefreq: "weekly", priority: "0.6" },
  { loc: "/friend/index.html", changefreq: "monthly", priority: "0.4" },
  { loc: "/guestbook/index.html", changefreq: "weekly", priority: "0.5" },
  { loc: "/about/index.html", changefreq: "monthly", priority: "0.4" },
  { loc: "/rss.xml", changefreq: "weekly", priority: "0.3" }
];

export async function onRequestGet(context) {
  var env = context.env;
  var article = [];
  if (env && env.ASSETS) {
    try {
      var resp = await env.ASSETS.fetch(new Request(SITE + article + "NovelList.json"));
      if (resp.ok) article = await resp.json();
    } catch (e) {}
  }
  if (!Array.isArray(article)) article = [];

  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  STATIC_PAGES.forEach(function (p) {
    xml += "  <url>\n";
    xml += "    <loc>" + escapeXML(SITE + p.loc) + "</loc>\n";
    xml += "    <changefreq>" + p.changefreq + "</changefreq>\n";
    xml += "    <priority>" + p.priority + "</priority>\n";
    xml += "  </url>\n";
  });

  article.forEach(function (it) {
    xml += "  <url>\n";
    xml += "    <loc>" + escapeXML(SITE + novelHref(it.id)) + "</loc>\n";
    xml += "    <changefreq>monthly</changefreq>\n";
    xml += "    <priority>0.7</priority>\n";
    xml += "  </url>\n";
  });

  xml += "</urlset>\n";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
