import json
import os
import re
import shutil
from pathlib import Path
from PIL import Image

SITE_ROOT = Path(__file__).resolve().parent
MEDIA_ROOT = Path(r"H:\作品集")
DIST_DIR = SITE_ROOT / "dist"
DIST_MEDIA = DIST_DIR / "media"
VIDEO_LINKS_FILE = SITE_ROOT / "video-links.json"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_WIDTH = 1600
WEBP_QUALITY = 80


def natural_key(s: str):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", s)]


def load_video_links():
    if VIDEO_LINKS_FILE.exists():
        data = json.loads(VIDEO_LINKS_FILE.read_text(encoding="utf-8"))
        return data.get("projects", {})
    return {}


def optimize_image(src: Path, dst_dir: Path, index_name: str) -> str:
    dst_dir.mkdir(parents=True, exist_ok=True)
    ext = src.suffix.lower()

    # Convert animated GIFs to lightweight Animated WebP
    if ext == ".gif":
        dst = dst_dir / f"{index_name}.webp"
        old_gif = dst_dir / f"{index_name}.gif"
        if old_gif.exists():
            old_gif.unlink()
        if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
            return dst.name
        try:
            with Image.open(src) as im:
                frames = []
                durations = []
                max_gif_w = 960
                n_frames = getattr(im, "n_frames", 1)
                for i in range(n_frames):
                    im.seek(i)
                    frame = im.convert("RGBA")
                    if frame.width > max_gif_w:
                        ratio = max_gif_w / float(frame.width)
                        frame = frame.resize((max_gif_w, max(1, int(frame.height * ratio))), Image.Resampling.LANCZOS)
                    frames.append(frame)
                    durations.append(im.info.get("duration", 80))
                frames[0].save(
                    dst,
                    "WEBP",
                    save_all=True,
                    append_images=frames[1:],
                    duration=durations,
                    loop=im.info.get("loop", 0),
                    quality=72,
                    method=4
                )
            return dst.name
        except Exception as e:
            print(f"  [WARN] Animated WebP failed on {src.name}: {e}, keeping GIF")
            dst = dst_dir / f"{index_name}.gif"
            shutil.copy2(src, dst)
            return dst.name

    dst = dst_dir / f"{index_name}.webp"
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return dst.name

    try:
        with Image.open(src) as im:
            if im.mode in ("RGBA", "LA", "P"):
                im = im.convert("RGBA")
            else:
                im = im.convert("RGB")
            if im.width > MAX_WIDTH:
                ratio = MAX_WIDTH / float(im.width)
                new_h = max(1, int(im.height * ratio))
                im = im.resize((MAX_WIDTH, new_h), Image.Resampling.LANCZOS)
            im.save(dst, "WEBP", quality=WEBP_QUALITY, method=4)
    except Exception as e:
        print(f"  [WARN] Failed WebP on {src.name}: {e}, copying original")
        dst = dst_dir / f"{index_name}{ext}"
        shutil.copy2(src, dst)
    return dst.name


def collect_project_media(project_id: str, dirs: list[str], prefer_cover: str | None, video_links: dict):
    out_dir = DIST_MEDIA / project_id
    images = []
    cover_url = None
    counter = 0

    for rel_dir in dirs:
        abs_dir = MEDIA_ROOT / rel_dir
        if not abs_dir.exists():
            continue
        files = [f for f in abs_dir.iterdir() if f.is_file() and f.suffix.lower() in IMAGE_EXTS]
        files.sort(key=lambda f: natural_key(f.name))
        for f in files:
            counter += 1
            out_name = optimize_image(f, out_dir, f"img_{counter:03d}")
            rel_url = f"./media/{project_id}/{out_name}"
            images.append({
                "name": f.name,
                "label": f.stem,
                "url": rel_url,
                "ext": Path(out_name).suffix.lower()
            })
            if prefer_cover and str(Path(rel_dir) / f.name).replace("/", "\\").lower() == prefer_cover.replace("/", "\\").lower():
                cover_url = rel_url

    if not cover_url and images:
        static_first = next((i for i in images if i["ext"] != ".gif"), images[0])
        cover_url = static_first["url"]

    videos = []
    for item in video_links.get(project_id, []):
        bvid = (item.get("bvid") or "").strip()
        videos.append({
            "label": item.get("label", "项目影片"),
            "bvid": bvid,
            "embedUrl": f"https://player.bilibili.com/player.html?bvid={bvid}&high_quality=1&danmaku=0" if bvid else "",
            "sizeMB": 0
        })

    return {
        "coverImage": cover_url,
        "coverVideo": None,
        "images": images,
        "videos": videos,
        "counts": {"images": len(images), "videos": len(videos)}
    }


def main():
    print("=== Building Static Production Portfolio (dist/) ===")
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    DIST_MEDIA.mkdir(parents=True, exist_ok=True)
    video_links = load_video_links()

    featured_specs = [
        {
            "id": "guangzhou-window",
            "index": "01",
            "title": "广州之窗 · 跨媒介全案与 AI 商业短片",
            "subtitle": "Office VIS / Amenity Films / AI Narrative Film",
            "categories": ["ai", "video", "brand"],
            "categoryLabel": "全案 · AI影像 · VIS",
            "year": "2026",
            "span": "wide",
            "client": "广州之窗",
            "role": "品牌视觉 / 配套视频创作 / AI 短片导演",
            "summary": "横跨写字楼 VIS 视觉识别系统、四大高端商务配套宣传短片（会所、停机坪、游艇码头、国际文化交流中心）以及 AI 商业剧情短片《总裁的一天》，完整呈现从平面体系到生成式影像的整合表达。",
            "highlights": [
                "AI 商业剧情片《总裁的一天》以沉浸式第一视角串联项目顶级商务场景",
                "4 条高端配套短片统一冷峻克制的电影级视觉与剪辑节奏",
                "22 张写字楼 VIS 系统完整落地导视与空间物料"
            ],
            "tools": ["AI Video Workflow", "Premiere Pro", "After Effects", "Illustrator"],
            "dirs": [r"平面类\广州之窗-写字楼vis"],
            "preferCover": r"平面类\广州之窗-写字楼vis\写字楼 vis-01.jpg"
        },
        {
            "id": "xiangshan-bay",
            "index": "02",
            "title": "中山·香山湾壹号 · 品牌全案与 AI TVC",
            "subtitle": "Full Brand VI System / AI Commercial TVC",
            "categories": ["ai", "brand"],
            "categoryLabel": "AI TVC · 品牌全案",
            "year": "2026",
            "span": "normal",
            "client": "中山·香山湾壹号",
            "role": "品牌全案视觉 / AI 商业 TVC 导演",
            "summary": "以《香山心 无止境》为核心视觉主张，同步构建 50 页完整品牌 VI 系统与 AI 商业形象 TVC，将东方山海意境转化为极具当代张力的视觉符号。",
            "highlights": [
                "AI 商业 TVC《香山心 无止境》实现大尺度山海建筑镜头与情绪叙事融合",
                "50 张完整品牌视觉规范与延展物料体系"
            ],
            "tools": ["AI Cinema", "Photoshop", "Illustrator", "After Effects"],
            "dirs": [r"平面类\中山-香山湾壹号"],
            "preferCover": r"平面类\中山-香山湾壹号\VI-01.jpg"
        },
        {
            "id": "jinsha-metropolis",
            "index": "03",
            "title": "广州金沙大都会 · AI 品牌短剧与动态形象",
            "subtitle": "AI Brand Mini-Drama / Motion Posters / IP",
            "categories": ["ai", "video", "ip"],
            "categoryLabel": "AI短剧 · 动态海报",
            "year": "2026",
            "span": "normal",
            "client": "广州金沙大都会",
            "role": "AI 短剧导演 / 动态海报设计 / IP 视觉",
            "summary": "探索“品牌内容短剧化 + 动态形象海报 + 原创 IP”三位一体的新营销表达，产出连续两集 AI 品牌短剧及三组高质感新形象动态海报。",
            "highlights": [
                "连续剧式 AI 商业短剧（第一集、第二集），兼顾角色一致性与剧情节奏",
                "3 组新形象动态海报 + 独立 IP 提案体系"
            ],
            "tools": ["AI Drama Pipeline", "After Effects", "Premiere Pro", "IP Design"],
            "dirs": [r"视频创作类\金沙大都会-形象系列视频"],
            "preferCover": r"视频创作类\金沙大都会-形象系列视频\ChatGPT_Image_2026年6月26日_00_38_19.png"
        },
        {
            "id": "new-world-xinghui",
            "index": "04",
            "title": "新世界·星辉 · 品牌 IP 视觉与动画短片",
            "subtitle": "Character IP Design / 3D Extension / Motion",
            "categories": ["ip"],
            "categoryLabel": "IP 视觉设计",
            "year": "2026",
            "span": "wide",
            "client": "新世界·星辉",
            "role": "IP 形象主创 / 延展应用 / 动态呈现",
            "summary": "为新世界·星辉打造极具记忆点的品牌专属 IP 形象，涵盖角色设定、多场景动作延展、线下美陈周边应用（34 张完整视觉）及专属动态亮相短片。",
            "highlights": [
                "34 张体系化 IP 视觉设定与商业场景延展图集",
                "配套 IP 动态亮相短片，打通线上社媒与线下空间传播"
            ],
            "tools": ["IP Character Design", "3D Rendering", "After Effects", "Photoshop"],
            "dirs": [r"IP设计类\新世界-星辉"],
            "preferCover": r"IP设计类\新世界-星辉\IP-01.jpg"
        },
        {
            "id": "lixun-pazhou-bay",
            "index": "05",
            "title": "力迅·琶洲湾 · 影院 30s 大片与价值影像矩阵",
            "subtitle": "Cinema 30s TVC / Brand Films / Value Series",
            "categories": ["video"],
            "categoryLabel": "商业视频创作",
            "year": "2026",
            "span": "wide",
            "client": "力迅·琶洲湾",
            "role": "视频导演 / 剪辑指导 / 价值视觉设计",
            "summary": "围绕珠江新城与琶洲核心区位价值，统筹影院 30 秒投放广告、品牌兑现力宣传片、系列动态海报及项目价值平面矩阵，共 10 条成片与 8 组视觉画面。",
            "highlights": [
                "《影院投放 30 秒》《兑现力》《执掌珠江》多规格商业成片矩阵",
                "静动态结合的项目价值传播系列，强化顶级资产气场"
            ],
            "tools": ["Premiere Pro", "After Effects", "Photoshop"],
            "dirs": [r"视频创作类\力迅琶洲湾"],
            "preferCover": r"视频创作类\力迅琶洲湾\0519-项目价值系列-6.jpg"
        },
        {
            "id": "greentown-chaowen",
            "index": "06",
            "title": "绿城·潮闻东方 · 品牌形象与价值系列影片",
            "subtitle": "Brand Film / Value Video Trilogy",
            "categories": ["video"],
            "categoryLabel": "商业视频创作",
            "year": "2025",
            "span": "normal",
            "client": "绿城·潮闻东方",
            "role": "剪辑指导 / 节奏叙事",
            "summary": "由 1 条主形象大片与 3 条项目价值系列短片组成的东方美学影像矩阵，以沉稳克制的声画叙事传递绿城产品力与东方气韵。",
            "highlights": [
                "主形象片 + 三部曲价值系列，结构清晰、节奏递进",
                "电影级画面质感与沉浸式情绪铺陈"
            ],
            "tools": ["Premiere Pro", "After Effects", "Sound Design"],
            "dirs": [],
            "preferCover": None
        },
        {
            "id": "pazhou-one",
            "index": "07",
            "title": "琶洲 ONE · 城市地标视觉与动态海报系统",
            "subtitle": "Landmark VI / Animated Posters / Graphic",
            "categories": ["brand"],
            "categoryLabel": "品牌 / 平面",
            "year": "2026",
            "span": "normal",
            "client": "琶洲 ONE",
            "role": "主视觉设计 / 动态平面设计",
            "summary": "针对琶洲核心地标打造的先锋现代品牌视觉体系，结合 19 张高辨识度平面延展与 4 组动态 GIF 海报，凸显国际商务地标的锐度与质感。",
            "highlights": [
                "静动态双轨输出：19 张 VI 应用 + 4 组动态海报",
                "强对比排版与建筑几何语言贯穿全套物料"
            ],
            "tools": ["Illustrator", "Photoshop", "After Effects"],
            "dirs": [r"平面类\琶洲ONE"],
            "preferCover": r"平面类\琶洲ONE\VI-02.jpg"
        },
        {
            "id": "crland-xijiang",
            "index": "08",
            "title": "华润·曦江润府 · 品牌视觉识别与动态延展",
            "subtitle": "Luxury Residence VI / Motion Graphics",
            "categories": ["brand"],
            "categoryLabel": "品牌 / 平面",
            "year": "2025",
            "span": "wide",
            "client": "华润置地",
            "role": "品牌视觉设计师",
            "summary": "为华润曦江润府构建兼具东方雅韵与现代锋芒的品牌视觉识别系统，包含 20 张核心 VI 延展画面与 3 组动态视觉演绎。",
            "highlights": [
                "完整覆盖核心视觉符号、字体层级与延展物料",
                "3 组动态视觉 GIF 提升线上首屏冲击力"
            ],
            "tools": ["Illustrator", "Photoshop", "After Effects"],
            "dirs": [r"平面类\华润曦江润府"],
            "preferCover": r"平面类\华润曦江润府\VI-03.jpg"
        },
        {
            "id": "binjiang-1983",
            "index": "09",
            "title": "广州滨江尚都 · 船台 1983（空屿洲）全案",
            "subtitle": "Heritage Renewal Brand VI / Dual System",
            "categories": ["brand"],
            "categoryLabel": "品牌 / 平面",
            "year": "2025",
            "span": "wide",
            "client": "广州滨江尚都",
            "role": "品牌视觉主创",
            "summary": "融合工业船台历史文脉与当代滨江艺文气息，统筹“船台 1983 / 空屿洲”与“滨江尚都”双线视觉体系，累计沉淀 57 张完整视觉设计作品。",
            "highlights": [
                "船台 1983（空屿洲）23 张特色文脉视觉 + 滨江尚都 34 张全案 VI",
                "在历史厚重感与现代先锋审美间找到精准平衡"
            ],
            "tools": ["Illustrator", "InDesign", "Photoshop"],
            "dirs": [r"平面类\广州滨江尚都 -船台1983", r"平面类\广州滨江尚都"],
            "preferCover": r"平面类\广州滨江尚都 -船台1983\空屿洲VI-02.jpg"
        },
        {
            "id": "ai-experimental-0809",
            "index": "10",
            "title": "AI 先锋影像实验短片（0809）",
            "subtitle": "AI Generative Film / Visual Experiment",
            "categories": ["ai"],
            "categoryLabel": "AI 视频创作",
            "year": "2026",
            "span": "normal",
            "client": "AI VISUAL EXPERIMENT",
            "role": "AI 导演 / 视觉生成 / 后期剪辑",
            "summary": "独立创作的 AI 生成式影像实验作品，探索高对比暗调光影、镜头语言控制与生成式影像节奏剪辑。",
            "highlights": [
                "全流程 AI 视频生成与后期音画精剪",
                "支持公网高速在线播放"
            ],
            "tools": ["AI Video Generation", "Premiere Pro", "After Effects"],
            "dirs": [],
            "preferCover": None
        }
    ]

    archive_specs = [
        ("zhongshan-greentown", "中山绿城", "品牌 VI · 动态视频", "2025", r"平面类\中山绿城"),
        ("shkp", "新鸿基", "品牌 VI 全案", "2025", r"平面类\新鸿基"),
        ("yuexiu-nansha", "越秀 · 南沙项目", "品牌 VI · 动态视频", "2025", r"平面类\越秀-南沙项目"),
        ("galaxy-luobian", "星河 · 罗边项目", "品牌 VI · 6 条视频", "2025", r"平面类\星河-罗边项目"),
        ("galaxy-hengli", "星河 · 横沥项目", "品牌 VI 全案", "2025", r"平面类\星河-横沥项目"),
        ("kaikong-yunjin", "开控云锦", "品牌 VI · 动态视频", "2025", r"平面类\开控云锦"),
        ("jinqiao-lingnanyuan", "金侨 · 岭南院", "品牌 VI 全案（45 图）", "2025", r"平面类\金侨 岭南院"),
        ("zhuhai-ruimeng", "珠海 · 瑞萌", "品牌 VI 全案（36 图）", "2025", r"平面类\珠海-瑞萌"),
        ("huiyue-dongfang", "汇悦东方项目", "品牌 VI 全案", "2025", r"平面类\汇悦东方项目"),
        ("jihuayuan", "际华园", "品牌 VI 全案", "2025", r"平面类\际华园"),
        ("yuechen-yihao", "知识城 · 悦辰壹号", "品牌 VI 全案", "2025", r"平面类\知识城-悦辰壹号"),
        ("gzct-lingnanfu", "广州城投 · 领南府", "品牌 VI 全案", "2025", r"平面类\广州城投-领南府")
    ]

    featured = []
    for spec in featured_specs:
        print(f"Processing featured: {spec['index']} {spec['title']}")
        media = collect_project_media(spec["id"], spec["dirs"], spec["preferCover"], video_links)
        item = {k: v for k, v in spec.items() if k not in ("dirs", "preferCover")}
        item["media"] = media
        featured.append(item)

    archive = []
    for idx, (pid, title, tag, year, rel_dir) in enumerate(archive_specs, start=11):
        print(f"Processing archive: {idx:02d} {title}")
        media = collect_project_media(pid, [rel_dir], None, video_links)
        archive.append({
            "id": pid,
            "index": f"{idx:02d}",
            "title": title,
            "subtitle": "Brand Visual Identity / Archive",
            "categories": ["brand"],
            "categoryLabel": tag,
            "year": year,
            "client": title,
            "role": "品牌视觉设计",
            "summary": f"{title}完整品牌视觉延展档案，共收录 {media['counts']['images']} 张高清平面作品。",
            "highlights": [
                f"收录 {media['counts']['images']} 张全套视觉物料",
                "完整呈现主视觉、排版系统与延展规范"
            ],
            "tools": ["Illustrator", "Photoshop", "Brand VI"],
            "media": media
        })

    all_items = featured + archive
    total_images = sum(p["media"]["counts"]["images"] for p in all_items)
    total_videos = 42  # Real archive video total

    manifest = {
        "mode": "static",
        "meta": {
            "totalProjects": len(all_items),
            "totalImages": total_images,
            "totalVideos": total_videos
        },
        "featured": featured,
        "archive": archive
    }

    (DIST_DIR / "portfolio-data.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Copy core static files
    for fname in ("index.html", "styles.css", "data.js", "app.js"):
        shutil.copy2(SITE_ROOT / fname, DIST_DIR / fname)

    dist_assets = DIST_DIR / "assets"
    dist_assets.mkdir(parents=True, exist_ok=True)
    if (SITE_ROOT / "assets" / "wechat-qr.jpg").exists():
        shutil.copy2(SITE_ROOT / "assets" / "wechat-qr.jpg", dist_assets / "wechat-qr.jpg")

    total_bytes = sum(f.stat().st_size for f in DIST_DIR.rglob("*") if f.is_file())
    print(f"\nDONE! Built {len(all_items)} projects, {total_images} optimized images.")
    print(f"Total dist/ size: {total_bytes / (1024 * 1024):.1f} MB -> {DIST_DIR}")


if __name__ == "__main__":
    main()
