/* functions/.well-known/api-catalog.js
   API Catalog（RFC 9727）→ /.well-known/api-catalog
   以 Linkset（application/linkset+json）形式发布本站公开 API 列表，
   供智能体/自动化工具通过 /.well-known/api-catalog 发现并调用。
   参考：https://www.rfc-editor.org/rfc/rfc9727#appendix-A
   （站点域名为 tangibledreams.top） */

const SITE = "https://tangibledreams.top";

/* Linkset：每个 entry 以 API 基址为 anchor，
   service-desc 指向 OpenAPI 规范，service-doc 指向人读文档，
   status 指向健康检查端点。 */
const CATALOG = {
  linkset: [
    {
      anchor: SITE + "/api/guestbook",
      "service-desc": [
        {
          href: SITE + "/api/guestbook/openapi.json",
          type: "application/openapi+json;version=3.1"
        }
      ],
      "service-doc": [
        {
          href: SITE + "/api/guestbook/docs",
          type: "text/html"
        }
      ],
      status: [
        {
          href: SITE + "/api/guestbook/status",
          type: "application/json"
        }
      ]
    }
  ]
};

export async function onRequestGet() {
  return new Response(JSON.stringify(CATALOG, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/linkset+json",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
