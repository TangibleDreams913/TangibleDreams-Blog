# TangibleDreams-Blog

个人博客站点，部署于 Cloudflare Pages。零构建即可运行，图片缩略图通过可选构建脚本自动生成。

在线访问：<https://tangibledreams.top>

特别感谢[Xander Xiao](https://github.com/ckckh2023/)的[Xiao-Blog](https://github.com/ckckh2023/Xiao-Blog)的项目源代码！本项目大量使用了此项目的源代码和架构逻辑。

## 功能特性

- **首页**：聚合博主信息、精选文章 / 精选图片 / 精选音乐 / 精选留言
- **文章**：TXT 静态文件 + JSON 清单，支持列表搜索、在线阅读、字号调节、下载
- **图片**：PNG 静态文件 + JSON 清单，构建脚本自动生成 WebP 缩略图，点击图片灯箱预览
- **音乐**：WAV 静态文件 + JSON 清单，HTML5 在线播放 + 下载
- **留言板**：Cloudflare D1 持久化，Markdown 内容，IP 加盐哈希 + 频率限制
- **好友页**：当前为占位符，后续可扩展
- **关于页**：站点统计、联系方式、隐私政策
- **RSS 订阅**：Edge Function 动态生成 RSS 2.0（以文章更新为条目）
- **Markdown for Agents**：内容协商，智能体请求 `Accept: text/markdown` 时返回干净的去格式化 Markdown（默认仍返回 HTML）
- **主题系统**：深浅色切换，`theme-init.js` 在 head 最早加载防 FOUC 闪白
- **完整 SEO**：sitemap.xml / robots.txt / OG meta / Twitter Card

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML / CSS / JavaScript |
| Markdown | marked 4.3 + DOMPurify（留言板） |
| 后端 | Cloudflare Pages Functions |
| 数据库 | Cloudflare D1 SQLite |
| 缩略图 | Node.js + sharp（仅构建时） |
| 部署 | Cloudflare Pages + wrangler CLI |

## 目录结构

```text
├── index.html              # 首页（聚合精选内容）
├── wrangler.toml           # Cloudflare Pages 配置（D1 绑定）
├── schema.sql              # 留言板建表 SQL
├── package.json            # 构建脚本（图片缩略图）
├── scripts/
│   └── generate-thumbnails.mjs
├── article/
│   ├── index.html          # 文章列表
│   ├── reader.html         # 文章在线阅读页
│   ├── NovelList.json      # 文章清单
│   ├── star.json           # 首页精选文章
│   └── books/              # 存放 TXT 文件
├── images/
│   ├── index.html          # 图片画廊
│   ├── ImageList.json      # 图片清单
│   ├── star.json           # 首页精选图片
│   ├── photos/             # 存放 PNG 原图
│   └── thumbs/             # 构建脚本生成的 WebP 缩略图
├── music/
│   ├── index.html          # 音乐列表
│   ├── MusicList.json      # 音乐清单
│   ├── star.json           # 首页精选音乐
│   └── songs/              # 存放 WAV 文件
├── guestbook/              # 留言板
├── friend/                 # 好友页（占位符）
├── about/                  # 关于页
└── functions/
    ├── _middleware.js            # 全局中间件（Link 头 + Markdown 协商）
    ├── _lib/
    │   └── markdown-for-agents.js # Markdown for Agents 生成逻辑（内容协商）
    ├── api/guestbook.js
    ├── rss.xml.js
    └── sitemap.xml.js
```

各栏目下 `star.json` 为首页精选数据源；若不需要精选，可保持空数组 `[]`。

### 智能体 / Markdown 协商

本站为智能体（AI / LLM）提供干净的去格式化文本，规避对复杂 HTML 布局的抓取：

```bash
# 请求 Markdown 表示（任意「页面」路由）
curl -H "Accept: text/markdown" https://tangibledreams.top/
curl -H "Accept: text/markdown" https://tangibledreams.top/images/
curl -H "Accept: text/markdown" "https://tangibledreams.top/article/reader.html?id=weinidingzhi"
```

- 携带 `Accept: text/markdown` → 返回 `Content-Type: text/markdown`，并带 `x-markdown-tokens`（近似 token 数）和 `content-signal` 头。
- 未携带该头（浏览器默认）→ 仍返回普通 HTML。
- 列表/阅读类页面直接由 JSON / TXT 数据源生成 Markdown，而非对 HTML 做反向转换，因此天然是「去格式化」的纯文本，更加节省Token。
- 非页面资源（`/assets`、`/api`、`/rss.xml`、`/sitemap.xml` 及图片等二进制）不参与 Markdown 协商，保持原样。
- 若目标域名接入 Cloudflare 原生「Markdown for Agents（Zone 级）」，本模块可作为应用侧兜底，两者可共存。

## 本地开发

```bash
npm install          # 安装 sharp（首次）
npm run build        # 生成图片缩略图（无图片时会跳过）
wrangler pages dev .
```

默认监听 `http://localhost:8788`。留言板 API 需要 D1 绑定，本地 dev 会自动读取 `wrangler.toml` 配置。

## 部署

```bash
# 生产部署（先构建缩略图，再部署）
npm run deploy

# 或者手动分步
npm run build
wrangler pages deploy . --project-name=tangibledreams

# 数据库初始化（首次或重置）
wrangler d1 execute td-guestbook --remote --file=./schema.sql
```

如果使用 Cloudflare Pages 的 Git 集成，请在构建配置中设置：

- 构建命令：`npm install && npm run build`
- 输出目录：`.`

## 内容维护

### 文章

1. 将 TXT 文件放入 `article/books/`；
2. 在 `article/NovelList.json` 中登记：

   ```json
   {
     "id": "my-novel",
     "title": "文章标题",
     "author": "作者",
     "description": "简介",
     "file": "books/my-novel.txt",
     "updated": "2026-08-31"
   }
   ```

3. 如需首页展示，同步加入 `article/star.json`。

### 图片

1. 将 PNG/JPG 等格式的原图放入 `images/photos/`；
2. 运行 `npm run build` 自动在 `images/thumbs/` 生成同名 `.webp` 缩略图；
3. 在 `images/ImageList.json` 中登记：

   ```json
   {
     "id": "my-photo",
     "title": "图片标题",
     "description": "描述",
     "src": "photos/my-photo.png",
     "thumb": "thumbs/my-photo.webp",
     "date": "2026-08-31"
   }
   ```

4. 如需首页展示，同步加入 `images/star.json`。

### 音乐

1. 将 WAV/MP3 等格式的音频文件放入 `music/songs/`；
2. 在 `music/MusicList.json` 中登记：

   ```json
   {
     "id": "my-song",
     "title": "曲名",
     "artist": "艺术家",
     "description": "简介",
     "src": "songs/my-song.wav"
   }
   ```

3. 如需首页展示，同步加入 `music/star.json`。

## 致谢

本博客的构建与运行，离不开一系列优秀技术与服务的支撑，在此谨致以诚挚谢意。

首先，感谢 **Cloudflare Pages** 提供的边缘计算平台与持续部署能力，让代码能够以极低的延迟分发至全球各地，并为站点提供了可靠的托管环境与自动化构建流程。

感谢 **Edge Runtime** 带来的轻量级、高性能的边缘函数执行环境，使得动态逻辑得以在靠近用户的位置高效处理，显著提升了响应速度与用户体验。

感谢 **D1** 作为强大的全球分布式 SQLite 数据库，以简洁的接口和优异的读写性能，为站点的数据持久化提供了坚实后盾，同时保持了极低的运维成本。

感谢 **sharp** 这一高性能图像处理库，让图片的实时缩放、格式转换与优化变得高效而优雅，极大改善了多媒体内容的加载表现。

最后，特别感谢 **Xander Xiao** 及其开源的 **Xiao-Blog** 项目。本站在设计思路、技术选型与实现细节上深受其启发，Xiao-Blog 的简洁美学与工程实践为本站的诞生提供了宝贵的参照与起点。

每一行代码、每一次请求，都凝聚着这些技术背后的智慧与心血。再次感谢所有开源贡献者与平台维护者，正是你们的付出，让创造与分享变得如此简单。
