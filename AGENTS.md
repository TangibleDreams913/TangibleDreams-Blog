# 仓库约定（请先读）

本仓库是 <https://tangibledreams.top> 的**开源镜像**：**只包含代码与示例数据**。
站点的真实内容与媒体文件不在本仓库中（它们只保留在私有的部署副本里）。

## 请勿改动这些文件

下列清单是**占位示例数据**（记录里带 `example-*` 字样），供使用者参考格式，**请保持示例状态**：

- `music/MusicList.json`、`music/star.json`
- `images/ImageList.json`、`images/star.json`
- `friend/FriendList.json`
- `assets/bg/bg-light.jpg`、`assets/bg/bg-dark.jpg`、`assets/bg/char.png`
  （**空白占位图**：纯色 1920x1080 + 全透明 507x1201，合计约 52 KB。
   `assets/css/common.css` 会引用这三个路径，缺了会 404，所以必须保留；
   但真实背景与立绘属于内容与媒体，只留在部署副本里。详见 `assets/bg/README.txt`。）

不要用真实站点的数据覆盖它们，也不要"顺手补齐"示例里引用的文件。

## 请勿提交媒体与素材

`music/songs/`、`images/photos/`、`images/thumbs/`、`article/articles/`
已在 `.gitignore` 中忽略（媒体与素材不随本仓库分发）。
不要用 `git add -f` 之类手段绕过忽略规则。

`assets/bg/` 是例外：它需要被跟踪（里面是上面那三张占位图，少了会 404），
因此**不要**把 `/assets/bg/` 加进 `.gitignore`，也不要用真实图片替换占位图。

## 关于构建告警

`npm run build` 会执行图片缩略图与音频转码（`scripts/convert-audio.mjs`，
把 wav / flac 等转成 mp3，并把清单的 `src` 改写为 mp3、原始文件记入 `download`）。
因为示例数据没有对应的源文件，构建时会输出「源文件不存在，跳过」——
这是**预期行为**，不要为了消除该告警而新增媒体文件或改写示例 JSON。

## 欢迎的改动

代码与文档：`assets/`、`functions/`、`scripts/`、`*.html`、`package.json`、
`wrangler.toml`、`README.md` 等。改动与站点部署副本保持同步即可，
注意不要连带同步内容数据与媒体（见上）。
