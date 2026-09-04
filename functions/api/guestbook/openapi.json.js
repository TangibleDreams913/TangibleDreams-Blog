/* functions/api/guestbook/openapi.json.js
   → GET /api/guestbook/openapi.json
   返回留言板 API 的 OpenAPI 3.1 规范（application/openapi+json;version=3.1）。
   由 /.well-known/api-catalog 的 service-desc 指向。 */

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "TangibleDreams 留言板 API",
    version: "1.0.0",
    description:
      "本站留言板（Guestbook）公开 API，用于读取与发布留言。\n" +
      "运行于 Cloudflare Pages Functions + D1（SQLite）。",
    license: { name: "MIT" }
  },
  servers: [{ url: "https://tangibledreams.top" }],
  paths: {
    "/api/guestbook": {
      get: {
        summary: "获取留言列表",
        description:
          "返回全部留言（按 id 倒序）。可用 ?ids=1,2,3 按 id 批量获取（首页精选留言）。",
        parameters: [
          {
            name: "ids",
            in: "query",
            required: false,
            description: "逗号分隔的留言 id 列表，仅返回这些留言。",
            schema: { type: "string", example: "1,2,3" }
          }
        ],
        responses: {
          "200": {
            description: "留言列表",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MessageList" }
              }
            }
          },
          "500": {
            description: "服务器内部错误",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" }
              }
            }
          }
        }
      },
      post: {
        summary: "发布留言",
        description:
          "发布一条留言。同一 IP 每 10 分钟限 1 条。昵称、正文必填，头像 URL 可选。",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MessageInput" }
            }
          }
        },
        responses: {
          "201": {
            description: "创建成功，返回新留言",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Message" }
              }
            }
          },
          "400": {
            description: "请求参数错误",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" }
              }
            }
          },
          "429": {
            description: "留言过于频繁",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" }
              }
            }
          },
          "500": {
            description: "服务器内部错误",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Error" }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Message: {
        type: "object",
        properties: {
          id: { type: "integer", description: "留言唯一 id" },
          nickname: { type: "string", description: "昵称" },
          body: { type: "string", description: "留言正文（Markdown）" },
          avatar: { type: "string", description: "头像 URL，可为空" },
          created_at: { type: "string", format: "date-time", description: "创建时间（ISO 8601）" }
        },
        required: ["id", "nickname", "body", "created_at"]
      },
      MessageList: {
        type: "object",
        properties: {
          list: {
            type: "array",
            items: { $ref: "#/components/schemas/Message" }
          }
        },
        required: ["list"]
      },
      MessageInput: {
        type: "object",
        properties: {
          nickname: { type: "string", maxLength: 32, description: "昵称（必填）" },
          body: { type: "string", maxLength: 2000, description: "留言正文（必填）" },
          avatar: {
            type: "string",
            maxLength: 500,
            description: "头像 URL，须以 http(s):// 开头（可选）"
          }
        },
        required: ["nickname", "body"]
      },
      Error: {
        type: "object",
        properties: {
          error: { type: "string", description: "错误信息" }
        },
        required: ["error"]
      }
    }
  }
};

export async function onRequestGet() {
  return new Response(JSON.stringify(SPEC, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/openapi+json;version=3.1",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
