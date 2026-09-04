/* functions/rss.xml.js
   动态生成 RSS 2.0 订阅源 → /rss.xml
   读取 /article/NovelList.json，将每部文章作为一条 item。 */
const SITE = "https://tangibledreams.top";
const article = "/article/";
const SUMMARY_MAX = 200;

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

function extractSummary(text, max) {
  var clean = String(text || "").replace(/\s+/g, " ").trim();
  if (clean.length > max) clean = clean.slice(0, max) + "…";
  return clean;
}

function formatDate(updated) {
  var d = new Date(updated);
  if (isNaN(d.getTime())) return "";
  return d.toUTCString();
}

export async function onRequestGet(context) {
  var env = context.env;
  var list = [];
  if (env && env.ASSETS) {
    try {
      var resp = await env.ASSETS.fetch(new Request(SITE + article + "NovelList.json"));
      if (resp.ok) list = await resp.json();
    } catch (e) {}
  }
  if (!Array.isArray(list)) list = [];

  var xml = '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n  <channel>\n';
  xml += "    <title>" + escapeXML("TangibleDreams 的博客") + "</title>\n";
  xml += "    <link>" + SITE + "</link>\n";
  xml += "    <description>" + escapeXML("记录文章、图片与音乐分享") + "</description>\n";
  xml += "    <language>zh-CN</language>\n";
  xml += "    <lastBuildDate>" + new Date().toUTCString() + "</lastBuildDate>\n";

  list.forEach(function (it) {
    var url = SITE + novelHref(it.id);
    var title = it.title || it.id || "未命名文章";
    var desc = it.description || it.author || "";
    xml += "    <item>\n";
    xml += "      <title>" + escapeXML(title) + "</title>\n";
    xml += "      <link>" + escapeXML(url) + "</link>\n";
    xml += "      <guid>" + escapeXML(url) + "</guid>\n";
    xml += "      <description>" + escapeXML(extractSummary(desc, SUMMARY_MAX)) + "</description>\n";
    if (it.updated) xml += "      <pubDate>" + escapeXML(formatDate(it.updated)) + "</pubDate>\n";
    xml += "    </item>\n";
  });

  xml += "  </channel>\n</rss>\n";

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
