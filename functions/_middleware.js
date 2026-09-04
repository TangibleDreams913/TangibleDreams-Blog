/* functions/_middleware.js
   全局中间件（Cloudflare Pages Functions，等价于 Workers 边缘方案）：

   1) Markdown for Agents（内容协商）
      当请求携带 `Accept: text/markdown`（且指向本站「页面」路由）时，
      返回干净、去格式化的 Markdown 表示（Content-Type: text/markdown），
      供智能体 / LLM 直接消费，无需抓取 HTML 结构。否则返回原始 HTML。
      详见 ./_lib/markdown-for-agents.js。

   2) Link 响应头（RFC 8288 / RFC 9727 §3）
      为所有响应注入 Link 响应头，供智能体/自动化工具发现本站的机器可读资源
      （API 目录、OpenAPI 规范、文档），并补充指向 Markdown 表示的关系。

   Link 关系类型：
     api-catalog  —— 指向 API 目录（/.well-known/api-catalog）
     service-desc —— 指向机器可读的 API 描述（OpenAPI 3.1 规范）
     service-doc  —— 指向人读的 API 文档
     describedby  —— 指向描述本站该资源的资源（OpenAPI 规范 / Markdown 表示）
   */

import { markdownForAgents } from "./_lib/markdown-for-agents.js";

const SITE = "https://tangibledreams.top";

export async function onRequest(context) {
  /* 先尝试 Markdown 内容协商：命中且客户端偏好 text/markdown 时直接返回 Markdown */
  const markdown = await markdownForAgents(context);
  if (markdown) return markdown;

  const response = await context.next();
  const headers = new Headers(response.headers);

  const links = [
    '<' + SITE + '/.well-known/api-catalog>; rel="api-catalog"',
    '<' + SITE + '/api/guestbook/openapi.json>; rel="service-desc"; type="application/openapi+json;version=3.1"',
    '<' + SITE + '/api/guestbook/docs>; rel="service-doc"; type="text/html"',
    '<' + SITE + '/api/guestbook/openapi.json>; rel="describedby"; type="application/openapi+json;version=3.1"'
  ].join(", ");

  /* 若已有 Link 头则追加，避免覆盖 */
  const existing = headers.get("Link");
  headers.set("Link", existing ? existing + ", " + links : links);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
