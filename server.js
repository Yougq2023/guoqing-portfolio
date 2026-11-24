const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 4173;
const SITE_ROOT = __dirname;
const MEDIA_ROOT = "H:\\作品集";
const ANALYTICS_FILE = path.join(SITE_ROOT, "analytics.json");

function loadAnalytics() {
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf-8"));
    }
  } catch (e) {}
  return { totalPageViews: 0, dailyViews: {}, projectViews: {}, logs: [] };
}

function saveAnalytics(data) {
  try {
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {}
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function detectDevice(ua = "") {
  if (/mobile|android|iphone|ipad/i.test(ua)) return "移动端";
  return "桌面端";
}

function getAnalyticsSnapshot() {
  const data = loadAnalytics();
  const today = getTodayKey();
  return {
    totalPageViews: data.totalPageViews || 0,
    todayPageViews: (data.dailyViews && data.dailyViews[today]) || 0,
    projectViews: data.projectViews || {},
    logs: (data.logs || []).slice(0, 50)
  };
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation"
};

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm"]);

function naturalCompare(a, b) {
  return a.localeCompare(b, "zh-CN", { numeric: true, sensitivity: "base" });
}

function encodeMediaUrl(relPath) {
  return (
    "/media/" +
    relPath
      .split(/[\\/]/)
      .filter(Boolean)
      .map((seg) => encodeURIComponent(seg))
      .join("/")
  );
}

function scanRelativeFolder(relDir) {
  const absDir = path.join(MEDIA_ROOT, relDir);
  if (!fs.existsSync(absDir)) return { images: [], videos: [] };
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const images = [];
  const videos = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    const relFile = path.join(relDir, entry.name);
    const stat = fs.statSync(path.join(absDir, entry.name));
    const item = {
      name: entry.name,
      label: entry.name.replace(/\.[^/.]+$/, ""),
      url: encodeMediaUrl(relFile),
      sizeMB: +(stat.size / (1024 * 1024)).toFixed(1),
      ext
    };
    if (IMAGE_EXTS.has(ext)) images.push(item);
    else if (VIDEO_EXTS.has(ext)) videos.push(item);
  }

  images.sort((a, b) => naturalCompare(a.name, b.name));
  videos.sort((a, b) => naturalCompare(a.name, b.name));
  return { images, videos };
}

function singleVideoItem(relFile, customLabel) {
  const absFile = path.join(MEDIA_ROOT, relFile);
  if (!fs.existsSync(absFile)) return null;
  const stat = fs.statSync(absFile);
  const name = path.basename(relFile);
  return {
    name,
    label: customLabel || name.replace(/\.[^/.]+$/, ""),
    url: encodeMediaUrl(relFile),
    sizeMB: +(stat.size / (1024 * 1024)).toFixed(1),
    ext: path.extname(name).toLowerCase()
  };
}

function buildPortfolioPayload() {
  // Helper to merge multiple folders and standalone videos
  const collect = ({ dirs = [], videos = [], preferCover = null }) => {
    let allImages = [];
    let allVideos = [];

    for (const v of videos) {
      const item = singleVideoItem(v.path, v.label);
      if (item) allVideos.push(item);
    }

    for (const d of dirs) {
      const res = scanRelativeFolder(d);
      allImages = allImages.concat(res.images);
      allVideos = allVideos.concat(res.videos);
    }

    let coverImage = null;
    if (preferCover) {
      const absCover = path.join(MEDIA_ROOT, preferCover);
      if (fs.existsSync(absCover)) coverImage = encodeMediaUrl(preferCover);
    }
    if (!coverImage && allImages.length > 0) {
      const staticFirst = allImages.find((i) => i.ext !== ".gif") || allImages[0];
      coverImage = staticFirst.url;
    }

    return {
      coverImage,
      coverVideo: allVideos.length > 0 ? allVideos[0].url : null,
      images: allImages,
      videos: allVideos,
      counts: { images: allImages.length, videos: allVideos.length }
    };
  };

  const featured = [
    {
      id: "guangzhou-window",
      index: "01",
      title: "广州之窗 · 跨媒介全案与 AI 商业短片",
      subtitle: "Office VIS / Amenity Films / AI Narrative Film",
      categories: ["ai", "video", "brand"],
      categoryLabel: "全案 · AI影像 · VIS",
      year: "2026",
      span: "wide",
      client: "广州之窗",
      role: "品牌视觉 / 配套视频创作 / AI 短片导演",
      summary:
        "横跨写字楼 VIS 视觉识别系统、四大高端商务配套宣传短片（会所、停机坪、游艇码头、国际文化交流中心）以及 AI 商业剧情短片《总裁的一天》，完整呈现从平面体系到生成式影像的整合表达。",
      highlights: [
        "AI 商业剧情片《总裁的一天》以沉浸式第一视角串联项目顶级商务场景",
        "4 条高端配套短片统一冷峻克制的电影级视觉与剪辑节奏",
        "22 张写字楼 VIS 系统完整落地导视与空间物料"
      ],
      tools: ["AI Video Workflow", "Premiere Pro", "After Effects", "Illustrator"],
      media: collect({
        videos: [{ path: "AI视频创作\\广州之窗-总裁的一天.mp4", label: "AI 短片 · 总裁的一天" }],
        dirs: ["视频创作类\\广州之窗-配套视频", "平面类\\广州之窗-写字楼vis"],
        preferCover: "平面类\\广州之窗-写字楼vis\\写字楼 vis-01.jpg"
      })
    },
    {
      id: "xiangshan-bay",
      index: "02",
      title: "中山·香山湾壹号 · 品牌全案与 AI TVC",
      subtitle: "Full Brand VI System / AI Commercial TVC",
      categories: ["ai", "brand"],
      categoryLabel: "AI TVC · 品牌全案",
      year: "2026",
      span: "normal",
      client: "中山·香山湾壹号",
      role: "品牌全案视觉 / AI 商业 TVC 导演",
      summary:
        "以《香山心 无止境》为核心视觉主张，同步构建 50 页完整品牌 VI 系统与 AI 商业形象 TVC，将东方山海意境转化为极具当代张力的视觉符号。",
      highlights: [
        "AI 商业 TVC《香山心 无止境》实现大尺度山海建筑镜头与情绪叙事融合",
        "50 张完整品牌视觉规范与延展物料体系"
      ],
      tools: ["AI Cinema", "Photoshop", "Illustrator", "After Effects"],
      media: collect({
        videos: [{ path: "AI视频创作\\《香山心 无止境》TVC.mp4", label: "AI TVC · 《香山心 无止境》" }],
        dirs: ["平面类\\中山-香山湾壹号"],
        preferCover: "平面类\\中山-香山湾壹号\\VI-01.jpg"
      })
    },
    {
      id: "jinsha-metropolis",
      index: "03",
      title: "广州金沙大都会 · AI 品牌短剧与动态形象",
      subtitle: "AI Brand Mini-Drama / Motion Posters / IP",
      categories: ["ai", "video", "ip"],
      categoryLabel: "AI短剧 · 动态海报",
      year: "2026",
      span: "normal",
      client: "广州金沙大都会",
      role: "AI 短剧导演 / 动态海报设计 / IP 视觉",
      summary:
        "探索“品牌内容短剧化 + 动态形象海报 + 原创 IP”三位一体的新营销表达，产出连续两集 AI 品牌短剧及三组高质感新形象动态海报。",
      highlights: [
        "连续剧式 AI 商业短剧（第一集、第二集），兼顾角色一致性与剧情节奏",
        "3 组新形象动态海报 + 独立 IP 提案体系（完整 PPTX 已归档）"
      ],
      tools: ["AI Drama Pipeline", "After Effects", "Premiere Pro", "IP Design"],
      media: collect({
        videos: [
          { path: "AI视频创作\\金沙大都会短剧-第一集.mp4", label: "AI 品牌短剧 · 第一集" },
          { path: "AI视频创作\\金沙大都会短剧-第二集.mp4", label: "AI 品牌短剧 · 第二集" }
        ],
        dirs: ["视频创作类\\金沙大都会-形象系列视频"],
        preferCover: "视频创作类\\金沙大都会-形象系列视频\\ChatGPT_Image_2026年6月26日_00_38_19.png"
      })
    },
    {
      id: "new-world-xinghui",
      index: "04",
      title: "新世界·星辉 · 品牌 IP 视觉与动画短片",
      subtitle: "Character IP Design / 3D Extension / Motion",
      categories: ["ip"],
      categoryLabel: "IP 视觉设计",
      year: "2026",
      span: "wide",
      client: "新世界·星辉",
      role: "IP 形象主创 / 延展应用 / 动态呈现",
      summary:
        "为新世界·星辉打造极具记忆点的品牌专属 IP 形象，涵盖角色设定、多场景动作延展、线下美陈周边应用（34 张完整视觉）及专属动态亮相短片。",
      highlights: [
        "34 张体系化 IP 视觉设定与商业场景延展图集",
        "配套 IP 动态亮相短片，打通线上社媒与线下空间传播"
      ],
      tools: ["IP Character Design", "3D Rendering", "After Effects", "Photoshop"],
      media: collect({
        dirs: ["IP设计类\\新世界-星辉"],
        preferCover: "IP设计类\\新世界-星辉\\IP-01.jpg"
      })
    },
    {
      id: "lixun-pazhou-bay",
      index: "05",
      title: "力迅·琶洲湾 · 影院 30s 大片与价值影像矩阵",
      subtitle: "Cinema 30s TVC / Brand Films / Value Series",
      categories: ["video"],
      categoryLabel: "商业视频创作",
      year: "2026",
      span: "wide",
      client: "力迅·琶洲湾",
      role: "视频导演 / 剪辑指导 / 价值视觉设计",
      summary:
        "围绕珠江新城与琶洲核心区位价值，统筹影院 30 秒投放广告、品牌兑现力宣传片、系列动态海报及项目价值平面矩阵，共 10 条成片与 8 组视觉画面。",
      highlights: [
        "《影院投放 30 秒》《兑现力》《执掌珠江》多规格商业成片矩阵",
        "静动态结合的项目价值传播系列，强化顶级资产气场"
      ],
      tools: ["Premiere Pro", "After Effects", "Photoshop"],
      media: collect({
        dirs: ["视频创作类\\力迅琶洲湾"],
        preferCover: "视频创作类\\力迅琶洲湾\\0519-项目价值系列-6.jpg"
      })
    },
    {
      id: "greentown-chaowen",
      index: "06",
      title: "绿城·潮闻东方 · 品牌形象与价值系列影片",
      subtitle: "Brand Film / Value Video Trilogy",
      categories: ["video"],
      categoryLabel: "商业视频创作",
      year: "2025",
      span: "normal",
      client: "绿城·潮闻东方",
      role: "剪辑指导 / 节奏叙事",
      summary:
        "由 1 条主形象大片与 3 条项目价值系列短片组成的东方美学影像矩阵，以沉稳克制的声画叙事传递绿城产品力与东方气韵。",
      highlights: [
        "主形象片 + 三部曲价值系列，结构清晰、节奏递进",
        "电影级画面质感与沉浸式情绪铺陈"
      ],
      tools: ["Premiere Pro", "After Effects", "Sound Design"],
      media: collect({
        dirs: ["视频创作类\\绿城-潮闻东方"]
      })
    },
    {
      id: "pazhou-one",
      index: "07",
      title: "琶洲 ONE · 城市地标视觉与动态海报系统",
      subtitle: "Landmark VI / Animated Posters / Graphic",
      categories: ["brand"],
      categoryLabel: "品牌 / 平面",
      year: "2026",
      span: "normal",
      client: "琶洲 ONE",
      role: "主视觉设计 / 动态平面设计",
      summary:
        "针对琶洲核心地标打造的先锋现代品牌视觉体系，结合 19 张高辨识度平面延展与 4 组动态 GIF 海报，凸显国际商务地标的锐度与质感。",
      highlights: [
        "静动态双轨输出：19 张 VI 应用 + 4 组动态海报",
        "强对比排版与建筑几何语言贯穿全套物料"
      ],
      tools: ["Illustrator", "Photoshop", "After Effects"],
      media: collect({
        dirs: ["平面类\\琶洲ONE"],
        preferCover: "平面类\\琶洲ONE\\VI-02.jpg"
      })
    },
    {
      id: "crland-xijiang",
      index: "08",
      title: "华润·曦江润府 · 品牌视觉识别与动态延展",
      subtitle: "Luxury Residence VI / Motion Graphics",
      categories: ["brand"],
      categoryLabel: "品牌 / 平面",
      year: "2025",
      span: "wide",
      client: "华润置地",
      role: "品牌视觉设计师",
      summary:
        "为华润曦江润府构建兼具东方雅韵与现代锋芒的品牌视觉识别系统，包含 20 张核心 VI 延展画面与 3 组动态视觉演绎。",
      highlights: [
        "完整覆盖核心视觉符号、字体层级与延展物料",
        "3 组动态视觉 GIF 提升线上首屏冲击力"
      ],
      tools: ["Illustrator", "Photoshop", "After Effects"],
      media: collect({
        dirs: ["平面类\\华润曦江润府"],
        preferCover: "平面类\\华润曦江润府\\VI-03.jpg"
      })
    },
    {
      id: "binjiang-1983",
      index: "09",
      title: "广州滨江尚都 · 船台 1983（空屿洲）全案",
      subtitle: "Heritage Renewal Brand VI / Dual System",
      categories: ["brand"],
      categoryLabel: "品牌 / 平面",
      year: "2025",
      span: "wide",
      client: "广州滨江尚都",
      role: "品牌视觉主创",
      summary:
        "融合工业船台历史文脉与当代滨江艺文气息，统筹“船台 1983 / 空屿洲”与“滨江尚都”双线视觉体系，累计沉淀 57 张完整视觉设计作品。",
      highlights: [
        "船台 1983（空屿洲）23 张特色文脉视觉 + 滨江尚都 34 张全案 VI",
        "在历史厚重感与现代先锋审美间找到精准平衡"
      ],
      tools: ["Illustrator", "InDesign", "Photoshop"],
      media: collect({
        dirs: ["平面类\\广州滨江尚都 -船台1983", "平面类\\广州滨江尚都"],
        preferCover: "平面类\\广州滨江尚都 -船台1983\\空屿洲VI-02.jpg"
      })
    },
    {
      id: "ai-experimental-0809",
      index: "10",
      title: "AI 先锋影像实验短片（0809）",
      subtitle: "AI Generative Film / Visual Experiment",
      categories: ["ai"],
      categoryLabel: "AI 视频创作",
      year: "2026",
      span: "normal",
      client: "AI VISUAL EXPERIMENT",
      role: "AI 导演 / 视觉生成 / 后期剪辑",
      summary:
        "独立创作的 AI 生成式影像实验作品，探索高对比暗调光影、镜头语言控制与生成式影像节奏剪辑。（可随时替换为你指定的正式片名）",
      highlights: [
        "全流程 AI 视频生成与后期音画精剪",
        "支持网页高清流式播放与进度条自由拖拽"
      ],
      tools: ["AI Video Generation", "Premiere Pro", "After Effects"],
      media: collect({
        videos: [{ path: "AI视频创作\\8月9日(7).mp4", label: "AI 实验短片 · 0809" }]
      })
    }
  ];

  // Remaining projects in the Complete Archive
  const archiveConfigs = [
    { id: "zhongshan-greentown", title: "中山绿城", tag: "品牌 VI · 动态视频", year: "2025", dir: "平面类\\中山绿城" },
    { id: "shkp", title: "新鸿基", tag: "品牌 VI 全案", year: "2025", dir: "平面类\\新鸿基" },
    { id: "yuexiu-nansha", title: "越秀 · 南沙项目", tag: "品牌 VI · 动态视频", year: "2025", dir: "平面类\\越秀-南沙项目" },
    { id: "galaxy-luobian", title: "星河 · 罗边项目", tag: "品牌 VI · 6 条视频", year: "2025", dir: "平面类\\星河-罗边项目" },
    { id: "galaxy-hengli", title: "星河 · 横沥项目", tag: "品牌 VI 全案", year: "2025", dir: "平面类\\星河-横沥项目" },
    { id: "kaikong-yunjin", title: "开控云锦", tag: "品牌 VI · 动态视频", year: "2025", dir: "平面类\\开控云锦" },
    { id: "jinqiao-lingnanyuan", title: "金侨 · 岭南院", tag: "品牌 VI 全案（45 图）", year: "2025", dir: "平面类\\金侨 岭南院" },
    { id: "zhuhai-ruimeng", title: "珠海 · 瑞萌", tag: "品牌 VI 全案（36 图）", year: "2025", dir: "平面类\\珠海-瑞萌" },
    { id: "huiyue-dongfang", title: "汇悦东方项目", tag: "品牌 VI 全案", year: "2025", dir: "平面类\\汇悦东方项目" },
    { id: "jihuayuan", title: "际华园", tag: "品牌 VI 全案", year: "2025", dir: "平面类\\际华园" },
    { id: "yuechen-yihao", title: "知识城 · 悦辰壹号", tag: "品牌 VI 全案", year: "2025", dir: "平面类\\知识城-悦辰壹号" },
    { id: "gzct-lingnanfu", title: "广州城投 · 领南府", tag: "品牌 VI 全案", year: "2025", dir: "平面类\\广州城投-领南府" }
  ];

  const archive = archiveConfigs.map((cfg, idx) => {
    const media = collect({ dirs: [cfg.dir] });
    return {
      id: cfg.id,
      index: String(idx + 11).padStart(2, "0"),
      title: cfg.title,
      subtitle: "Brand Visual Identity / Archive",
      categories: ["brand"],
      categoryLabel: cfg.tag,
      year: cfg.year,
      client: cfg.title,
      role: "品牌视觉设计",
      summary: `${cfg.title}完整品牌视觉延展档案，共收录 ${media.counts.images} 张高清平面作品${media.counts.videos ? `及 ${media.counts.videos} 条配套动态视频` : ""}。`,
      highlights: [
        `收录 ${media.counts.images} 张全套视觉物料`,
        ...(media.counts.videos ? [`包含 ${media.counts.videos} 条项目配套视频，点击即可直接播放`] : ["完整呈现主视觉、排版系统与延展规范"])
      ],
      tools: ["Illustrator", "Photoshop", "Brand VI"],
      media
    };
  });

  // Compute real totals
  const allItems = [...featured, ...archive];
  const totalImages = allItems.reduce((sum, p) => sum + p.media.counts.images, 0);
  const totalVideos = allItems.reduce((sum, p) => sum + p.media.counts.videos, 0);

  return {
    meta: {
      totalProjects: allItems.length,
      totalImages,
      totalVideos
    },
    featured,
    archive
  };
}

function serveFileWithRange(req, res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("File not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || "application/octet-stream";
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      if (isNaN(start) || isNaN(end) || start > end || end >= stat.size) {
        res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
        res.end();
        return;
      }
      const chunkSize = end - start + 1;
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
    } else {
      const isCode = ext === ".html" || ext === ".css" || ext === ".js" || ext === ".json";
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Accept-Ranges": "bytes",
        "Content-Type": contentType,
        "Cache-Control": isCode ? "no-store, must-revalidate" : "public, max-age=3600"
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;

  if (pathname === "/api/portfolio") {
    const payload = buildPortfolioPayload();
    const body = JSON.stringify(payload);
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(body);
    return;
  }

  if (pathname === "/api/analytics" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(getAnalyticsSnapshot()));
    return;
  }

  if (pathname === "/api/track" && req.method === "POST") {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 8192) req.destroy();
    });
    req.on("end", () => {
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch (e) {}
      const data = loadAnalytics();
      const today = getTodayKey();
      const now = new Date();
      const timeStr = now.toLocaleString("zh-CN", { hour12: false });
      const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").toString().replace("::ffff:", "");
      const device = detectDevice(req.headers["user-agent"] || "");

      if (body.type === "project" && body.projectId) {
        data.projectViews[body.projectId] = (data.projectViews[body.projectId] || 0) + 1;
        data.logs.unshift({
          time: timeStr,
          action: `浏览作品 · ${body.projectTitle || body.projectId}`,
          device,
          ip
        });
      } else {
        data.totalPageViews = (data.totalPageViews || 0) + 1;
        data.dailyViews[today] = (data.dailyViews[today] || 0) + 1;
        data.logs.unshift({
          time: timeStr,
          action: "访问个人网站首页",
          device,
          ip
        });
      }

      data.logs = data.logs.slice(0, 80);
      saveAnalytics(data);
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(getAnalyticsSnapshot()));
    });
    return;
  }

  if (pathname.startsWith("/media/")) {
    const rel = pathname
      .slice("/media/".length)
      .split("/")
      .map((seg) => decodeURIComponent(seg))
      .join(path.sep);
    const resolved = path.resolve(MEDIA_ROOT, rel);
    if (!resolved.startsWith(path.resolve(MEDIA_ROOT))) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    serveFileWithRange(req, res, resolved);
    return;
  }

  const staticPath = pathname === "/" ? "/index.html" : pathname;
  const resolvedSite = path.resolve(SITE_ROOT, "." + staticPath);
  if (!resolvedSite.startsWith(path.resolve(SITE_ROOT))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  serveFileWithRange(req, res, resolvedSite);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Designer Portfolio server running at http://127.0.0.1:${PORT}`);
});
