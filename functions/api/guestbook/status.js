/* functions/api/guestbook/status.js
   → GET /api/guestbook/status
   返回留言板 API 的健康检查状态（application/json）。
   由 /.well-known/api-catalog 的 status 指向。 */

export async function onRequestGet() {
  const health = {
    status: "ok",
    service: "guestbook",
    time: new Date().toISOString()
  };
  return new Response(JSON.stringify(health, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}
