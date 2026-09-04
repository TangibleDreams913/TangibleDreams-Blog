/* scripts/generate-thumbnails.mjs
   扫描 images/photos/ 下的 PNG/JPG/WebP 图片，
   在 images/thumbs/ 生成同名 .webp 缩略图（最长边 480px）。
   用法：npm run build
   说明：ImageList.json 中的 thumb 字段请填 "thumbs/<文件名>.webp"。 */

import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PHOTOS = path.join(ROOT, "images", "photos");
const THUMBS = path.join(ROOT, "images", "thumbs");
const MAX_WIDTH = 480;
const EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

async function main() {
  await mkdir(THUMBS, { recursive: true });

  let files = [];
  try {
    files = await readdir(PHOTOS);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  const images = files.filter(function (f) {
    return EXTENSIONS.has(path.extname(f).toLowerCase());
  });

  if (!images.length) {
    console.log("images/photos/ 下暂无图片，跳过缩略图生成。");
    return;
  }

  let count = 0;
  for (const file of images) {
    const src = path.join(PHOTOS, file);
    const base = path.parse(file).name;
    const out = path.join(THUMBS, base + ".webp");
    const meta = await sharp(src).metadata();

    const builder = sharp(src);
    if (!meta.width || meta.width > MAX_WIDTH) {
      builder.resize({ width: MAX_WIDTH, withoutEnlargement: true });
    }
    await builder.webp({ quality: 80 }).toFile(out);
    count += 1;
    console.log("生成缩略图: " + path.relative(ROOT, out));
  }

  console.log("完成，共生成 " + count + " 张缩略图。");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
