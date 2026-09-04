/* functions/api/guestbook/docs.js
   → GET /api/guestbook/docs
   返回留言板 API 的人读文档（text/html）。
   由 /.well-known/api-catalog 的 service-doc 指向。 */

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>留言板 API 文档 · TangibleDreams</title>
<style>
  body{max-width:820px;margin:40px auto;padding:0 20px;font:16px/1.7 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#222}
  h1{border-bottom:2px solid #eee;padding-bottom:8px}
  h2{margin-top:32px;color:#0b5}
  code,pre{background:#f5f5f5;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
  code{padding:2px 5px;font-size:90%}
  pre{padding:12px 16px;overflow-x:auto}
  table{border-collapse:collapse;width:100%;margin:12px 0}
  th,td{border:1px solid #ddd;padding:8px 10px;text-align:left;vertical-align:top}
  th{background:#fafafa}
  .muted{color:#666}
</style>
</head>
<body>
<h1>留言板 API · TangibleDreams</h1>
<p class="muted">公开 API 文档。OpenAPI 规范见 <a href="/api/guestbook/openapi.json">/api/guestbook/openapi.json</a>。</p>

<h2>基础信息</h2>
<ul>
  <li>Base URL：<code>https://tangibledreams.top</code></li>
  <li>内容类型：<code>application/json</code></li>
  <li>数据存储：Cloudflare D1（SQLite）</li>
</ul>

<h2>获取留言列表</h2>
<p><code>GET /api/guestbook</code></p>
<p>返回全部留言（按 id 倒序）。</p>
<pre>curl "https://tangibledreams.top/api/guestbook"</pre>

<p>按 id 批量获取（首页精选）：</p>
<p><code>GET /api/guestbook?ids=1,2,3</code></p>
<pre>curl "https://tangibledreams.top/api/guestbook?ids=1,2,3"</pre>

<h3>响应示例</h3>
<pre>{
  "list": [
    {
      "id": 1,
      "nickname": "访客",
      "body": "你好，世界！",
      "avatar": "",
      "created_at": "2026-01-01T00:00:00.000Z"
    }
  ]
}</pre>

<h2>发布留言</h2>
<p><code>POST /api/guestbook</code></p>
<p>提交 JSON body，同一 IP 每 10 分钟限 1 条。</p>
<pre>curl -X POST "https://tangibledreams.top/api/guestbook" \\
  -H "Content-Type: application/json" \\
  -d '{"nickname":"访客","body":"你好，世界！","avatar":""}'</pre>

<h3>请求字段</h3>
<table>
  <tr><th>字段</th><th>类型</th><th>必填</th><th>说明</th></tr>
  <tr><td>nickname</td><td>string</td><td>是</td><td>昵称，最长 32 字符</td></tr>
  <tr><td>body</td><td>string</td><td>是</td><td>留言正文（Markdown），最长 2000 字符</td></tr>
  <tr><td>avatar</td><td>string</td><td>否</td><td>头像 URL，须以 http(s):// 开头，最长 500 字符</td></tr>
</table>

<h3>状态码</h3>
<table>
  <tr><th>状态码</th><th>含义</th></tr>
  <tr><td>200</td><td>获取成功</td></tr>
  <tr><td>201</td><td>发布成功</td></tr>
  <tr><td>400</td><td>请求参数错误</td></tr>
  <tr><td>429</td><td>留言过于频繁（10 分钟内）</td></tr>
  <tr><td>500</td><td>服务器内部错误</td></tr>
</table>

<h2>健康检查</h2>
<p><code>GET /api/guestbook/status</code> 返回服务健康状态，见 <a href="/api/guestbook/status">/api/guestbook/status</a>。</p>

<hr>
<p class="muted">© TangibleDreams · 基于 ckckh2023 的 xiao-blog 构建 · MIT License</p>
</body>
</html>`;

export async function onRequestGet() {
  return new Response(HTML, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
