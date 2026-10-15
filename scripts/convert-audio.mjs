/* scripts/convert-audio.mjs
   构建期音频转换：把「体积大、且浏览器在服务器不支持分段请求时难以跳转」的音频
   转成同名 mp3，让站点「在线播放用 mp3，下载仍然给原始文件」。

   做什么：
     1) 读取音乐清单（music/MusicList.json、music/star.json）；
     2) 对 wav / flac / aiff 等未压缩或无损格式，用 ffmpeg 在同目录转出同名 .mp3
        （增量：mp3 已存在且比源文件新则跳过，--force 可强制重转）；
     3) 清单里 src 改写为 mp3（在线播放、进度条可正常拖动），
        原始文件写入 download 字段（下载按钮仍给原始文件，无损 / 原始音质）。

   用法：
     npm run build                        # 缩略图 + 音频转换（见 package.json）
     node scripts/convert-audio.mjs       # 只做音频转换（增量）
     node scripts/convert-audio.mjs --force

   依赖：ffmpeg（优先 PATH 上的 ffmpeg，也可用环境变量 FFMPEG_PATH 指定路径）。
         找不到 ffmpeg 时只告警、不中断构建；已转好的 mp3 仍会被写进清单。 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* 需要处理的清单（相对站点根目录，src/download 均相对 music/ 目录） */
const LISTS = ["music/MusicList.json", "music/star.json"];
/* 需要转 mp3 的输入格式：未压缩 / 无损，转完体积通常能降一个数量级 */
const CONVERTIBLE = new Set([".wav", ".wave", ".flac", ".aiff", ".aif", ".aifc", ".alac", ".ape"]);
const TARGET_EXT = ".mp3";
/* 编码参数：VBR -q:a 2 ≈ 190kbps，与站内既有 mp3 的密度接近；
   想要更接近无损可改成 "-q:a", "0"，或固定码率 "-b:a", "320k" */
const MP3_ARGS = ["-codec:a", "libmp3lame", "-q:a", "2", "-vn"];
/* 时长校验允许的相对误差（转换被截断时提前发现） */
const DURATION_TOLERANCE = 0.01;

/* ---------- 小工具 ---------- */

function safeReaddir(dir) {
  try { return readdirSync(dir); } catch (e) { return []; }
}

/* 清单里存的是 URL 风格的相对路径（正斜杠），这里统一按 posix 拼装 */
function reEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

export function isConvertible(rel) {
  return !!rel && CONVERTIBLE.has(path.posix.extname(String(rel)).toLowerCase());
}

/* songs/x.wav → songs/x.mp3 */
export function mp3Name(rel) {
  const parsed = path.posix.parse(String(rel));
  return path.posix.join(parsed.dir, parsed.name + TARGET_EXT);
}

/* 一条清单记录要做什么：source(原始文件) / play(播放用 mp3) / hasDownload(是否已有 download 字段) */
export function planEntry(item) {
  if (!item || typeof item !== "object") return null;
  const src = typeof item.src === "string" ? item.src : "";
  const download = typeof item.download === "string" ? item.download : "";
  /* download 优先：构建过一次后原始文件记在 download 上，src 已经是 mp3 */
  const source = [download, src].find(isConvertible) || "";
  if (!source) return null;
  return { source: source, play: mp3Name(source), hasDownload: !!download };
}

/* 清单里相对 music/ 的路径 → 磁盘绝对路径（兼容两种分隔符） */
function absMusic(rel) {
  return path.join(ROOT, "music", ...String(rel).split("/"));
}

/* ---------- ffmpeg 定位 ---------- */

function whichFfmpeg(cmd) {
  const exts = (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";");
  const dirs = (process.env.PATH || "").split(path.delimiter);
  for (const dir of dirs) {
    if (!dir) continue;
    for (const ext of exts) {
      const full = path.join(dir, cmd + ext);
      if (existsSync(full)) return full;
    }
  }
  return "";
}

export function findFfmpeg() {
  const candidates = [];
  if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
  const onPath = whichFfmpeg("ffmpeg");
  if (onPath) candidates.push(onPath);

  /* winget（Gyan.FFmpeg）的包目录名带版本号，做一层通配 */
  const packages = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Packages");
  for (const dir of safeReaddir(packages)) {
    if (!/ffmpeg/i.test(dir)) continue;
    const pkg = path.join(packages, dir);
    for (const inner of safeReaddir(pkg)) {
      candidates.push(path.join(pkg, inner, "bin", "ffmpeg.exe"));
    }
  }
  candidates.push(
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", "ffmpeg.exe"),
    path.join(process.env.USERPROFILE || "", "scoop", "shims", "ffmpeg.exe"),
    "C:\\ffmpeg\\bin\\ffmpeg.exe",
    "C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe"
  );

  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return "";
}

/* ---------- 转换 ---------- */

function needsConvert(srcAbs, outAbs, force) {
  if (force || !existsSync(outAbs)) return true;
  try {
    return statSync(srcAbs).mtimeMs > statSync(outAbs).mtimeMs + 1000;
  } catch (e) {
    return true;
  }
}

function convert(ffmpeg, srcAbs, outAbs) {
  const args = ["-hide_banner", "-loglevel", "error", "-y", "-i", srcAbs].concat(MP3_ARGS, [outAbs]);
  /* stdio 用 inherit：错误信息直接显示在构建日志里，也不需要管道 */
  const res = spawnSync(ffmpeg, args, { stdio: "inherit" });
  if (res.error) throw res.error;
  if (res.status !== 0) throw new Error("ffmpeg 退出码 " + res.status);
  if (!existsSync(outAbs) || statSync(outAbs).size === 0) throw new Error("输出文件为空");
  return statSync(outAbs).size;
}

function probeDuration(ffprobe, file) {
  try {
    const res = spawnSync(ffprobe, [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", file
    ], { encoding: "utf8" });
    if (res.status !== 0) return NaN;
    return parseFloat(String(res.stdout || "").trim());
  } catch (e) {
    return NaN;
  }
}

/* ---------- 清单改写（逐行文本替换，保留作者手写格式与中文，diff 最小） ---------- */

export function rewriteListText(text, srcRel, playRel, downloadRel) {
  const eol = text.indexOf("\r\n") !== -1 ? "\r\n" : "\n";
  const pattern = "^([ \\t]*)\"src\"([ \\t]*:[ \\t]*)" + reEsc(JSON.stringify(srcRel)) +
    "([ \\t]*,?)[ \\t]*$";
  const re = new RegExp(pattern, "m");
  if (!re.test(text)) return null;
  return text.replace(re, function (match, indent, sep, comma) {
    let line = indent + "\"src\"" + sep + JSON.stringify(playRel) + "," + eol;
    if (downloadRel) {
      line += indent + "\"download\"" + sep + JSON.stringify(downloadRel) + comma;
    } else {
      /* 已经有 download 字段（作者自己写的）：只改 src，去掉多余逗号 */
      line = indent + "\"src\"" + sep + JSON.stringify(playRel) + comma;
    }
    return line;
  });
}

/* 读取清单 → 收集任务（同一源文件在多个清单里只转一次） */
function collectJobs() {
  const jobs = new Map(); /* outAbs -> { srcAbs, outAbs, source, play } */
  for (const listRel of LISTS) {
    const abs = path.join(ROOT, listRel);
    if (!existsSync(abs)) {
      console.log("跳过（清单不存在）: " + listRel);
      continue;
    }
    let data;
    try {
      data = JSON.parse(readFileSync(abs, "utf8"));
    } catch (err) {
      console.warn("跳过（JSON 解析失败）: " + listRel + " - " + err.message);
      continue;
    }
    if (!Array.isArray(data)) {
      console.warn("跳过（清单不是数组）: " + listRel);
      continue;
    }
    for (const item of data) {
      const plan = planEntry(item);
      if (!plan) continue;
      const srcAbs = absMusic(plan.source);
      const outAbs = absMusic(plan.play);
      if (!existsSync(srcAbs)) {
        console.warn("源文件不存在，跳过: music/" + plan.source);
        continue;
      }
      jobs.set(outAbs, { srcAbs: srcAbs, outAbs: outAbs, source: plan.source, play: plan.play });
    }
  }
  return jobs;
}

/* 转换完成后改写清单：只写 src 指向已存在的 mp3 的记录 */
function rewriteLists() {
  for (const listRel of LISTS) {
    const abs = path.join(ROOT, listRel);
    if (!existsSync(abs)) continue;
    const original = readFileSync(abs, "utf8");

    let data;
    try {
      data = JSON.parse(original);
    } catch (err) {
      continue;
    }
    if (!Array.isArray(data)) continue;

    let text = original;
    let changed = 0;
    for (const item of data) {
      const plan = planEntry(item);
      if (!plan) continue;
      const src = typeof item.src === "string" ? item.src : "";
      const download = typeof item.download === "string" ? item.download : "";
      if (src === plan.play && download === plan.source) continue; /* 已经改好 */
      if (!existsSync(absMusic(plan.play))) continue;              /* 没转出来就别改，免得 404 */

      const next = rewriteListText(text, src, plan.play, plan.hasDownload ? "" : plan.source);
      if (!next) {
        console.warn("未能定位 src 行，跳过改写: " + listRel + " → " + src);
        continue;
      }
      text = next;
      changed += 1;
    }

    if (!changed) continue;
    try {
      JSON.parse(text); /* 安全网：改写结果必须仍是合法 JSON */
    } catch (err) {
      console.warn("改写结果不是合法 JSON，已放弃: " + listRel + " - " + err.message);
      continue;
    }
    writeFileSync(abs, text, "utf8");
    console.log("更新清单: " + listRel + "（" + changed + " 条 src → mp3，download → 原始文件）");
  }
}

/* ---------- 主流程 ---------- */

async function main() {
  const force = process.argv.includes("--force");
  const jobs = collectJobs();
  if (!jobs.size) {
    console.log("清单里没有需要转换的音频（wav / flac / aiff 等）。");
    return;
  }

  const ffmpeg = findFfmpeg();
  const ffprobe = ffmpeg ? path.join(path.dirname(ffmpeg), "ffprobe.exe") : "";
  if (!ffmpeg) {
    console.warn("未找到 ffmpeg，跳过音频转换（已转好的 mp3 仍会写进清单）。");
    console.warn("安装方式：winget install Gyan.FFmpeg（或设置环境变量 FFMPEG_PATH 指向 ffmpeg.exe）");
  }

  let converted = 0;
  let skipped = 0;
  let failed = 0;
  for (const job of jobs.values()) {
    if (!ffmpeg || !needsConvert(job.srcAbs, job.outAbs, force)) {
      skipped += 1;
      continue;
    }
    try {
      const bytes = convert(ffmpeg, job.srcAbs, job.outAbs);
      converted += 1;
      const srcDur = existsSync(ffprobe) ? probeDuration(ffprobe, job.srcAbs) : NaN;
      const outDur = existsSync(ffprobe) ? probeDuration(ffprobe, job.outAbs) : NaN;
      let note = "";
      if (isFinite(srcDur) && isFinite(outDur) && srcDur > 0) {
        const diff = Math.abs(srcDur - outDur) / srcDur;
        note = "，时长 " + outDur.toFixed(1) + "s / 源 " + srcDur.toFixed(1) + "s";
        if (diff > DURATION_TOLERANCE) note += "（⚠ 时长差异偏大，请试听）";
      }
      console.log("生成音频: music/" + job.play + "（" + (bytes / 1048576).toFixed(1) + " MB" + note + "）");
    } catch (err) {
      failed += 1;
      console.warn("转换失败: music/" + job.source + " - " + err.message);
    }
  }

  rewriteLists();

  const summary = ["完成：转换 " + converted + " 个，跳过 " + skipped + " 个"];
  if (failed) summary.push("失败 " + failed + " 个");
  console.log(summary.join("，") + "。");
}

/* 仅直接运行时执行（便于被测试 import） */
const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked === fileURLToPath(import.meta.url)) {
  main().catch(function (err) {
    console.error(err);
    process.exit(1);
  });
}
