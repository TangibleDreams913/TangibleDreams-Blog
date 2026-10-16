背景图与角色立绘（本仓库里是空白占位图）
========================================

本目录在**开源镜像仓库**里放的是占位素材，不是站点上真正使用的那三张图：

    bg-light.jpg      24 KB   1920x1080   纯色 #fff5f9（浅色主题底色）
    bg-dark.jpg       24 KB   1920x1080   纯色 #110d0f（深色主题底色）
    char.png         2.4 KB    507x1201   全透明（alpha 全为 0）
    合计约 52 KB

为什么要放占位图：assets/css/common.css 引用了这三个路径
（--bg-image 与 --char-image），文件不存在的话浏览器会报 404；
占位图让"克隆下来直接跑"不出现坏图，同时又不必把作者的真实背景与立绘
（属于内容与媒体）分发出去 —— 真实素材只留在私有部署副本里，见 AGENTS.md。

一、换成自己的图
----------------
把同名文件替换掉即可（背景推荐 1920x1080 的 JPEG，立绘用带 alpha 的 PNG）。
相关变量都在 assets/css/common.css 顶部：

    :root {
      --bg-image: url("/assets/bg/bg-light.jpg");   ← 改成 none 就退回纯色背景
      --bg-scrim: transparent;                      ← 想整体压暗就填 rgba(0, 0, 0, 0.25)
      --char-image: url("/assets/bg/char.png");     ← 改成 none 就只留背景、不显示立绘
      --char-aspect: 507 / 1201;                    ← 立绘净宽高比，换图后按新图改
      --char-edge: 16px;                            ← 立绘离屏幕右/下边缘的距离
    }
    [data-theme="dark"] { --bg-image: url("/assets/bg/bg-dark.jpg"); }

--bg-image / --char-image 为 none 时不会发出任何图片请求。
两种主题共用同一张立绘：切主题时不需要重新下载，也不会换姿势。

二、主题切换的过渡（淡出 → 换图 → 淡入）
----------------------------------------
点右上角主题按钮（或跟随系统深浅色变化）时：
    1. 给 <html> 加 .bg-fade：底色变成目标主题的 --bg-transition 纯色，
       同时背景图层 opacity 1 → 0；
    2. --theme-fade 之后才真正写 data-theme（此时背景图不可见，换图不会闪），
       再移除 .bg-fade，新背景图淡入。
时长只有一个来源，common.js 直接读这个变量（支持 40ms / 0.04s，填 0 即瞬切）：

    --theme-fade: 40ms;

连点主题按钮只更新目标、复用同一次淡出，不会来回抖动；
系统开启"减少动态效果"(prefers-reduced-motion: reduce) 时跳过动画直接切。

三、立绘的显示档位
------------------
    ≥ 1500px     完整立绘站在右侧留白里，宽度随留白自适应（最大 380px），全站显示
    901–1499px   只在首页：头部探出"精选文章"卡片上沿（规则写在 assets/css/home.css）
    ≤ 900px      手机端隐藏（屏幕太窄，立绘只会挡住内容）

立绘用 transform: scaleX(-1) 做了左右镜像；换图后如果朝向反了，
删掉 common.css 里 body::after 的 transform 那一行即可。

四、毛玻璃质感
--------------
面板与卡片共用同一组参数（默认 14px / 180%），手机端自动降到 8px 省性能：

    --glass-blur: 14px;
    --glass-saturate: 180%;

不支持 backdrop-filter 的浏览器在 common.css 末尾有兜底规则，
会把 --surface-glass 的不透明度提到 94%，避免背景透出导致文字发灰。

五、请保持占位状态
------------------
按 AGENTS.md 的约定，这三个文件属于"占位示例数据"：
不要用真实站点的背景与立绘覆盖它们；也不要把本目录加进 .gitignore ——
它们需要被跟踪，克隆下来才能直接跑起来。
