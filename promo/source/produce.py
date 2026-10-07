"""Mux narration and the original score; add chapters and a local video player."""
import json
import os
import subprocess
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "source" / "assets"
T = json.loads((ROOT / "source" / "timeline.json").read_text())
FFMPEG = os.environ.get("FFMPEG", imageio_ffmpeg.get_ffmpeg_exe())

metadata = [";FFMETADATA1", "title=SolPact — Agree. Deliver. Get paid.",
            "artist=Oscar & zhaoyan", "comment=Solana hackathon builder story. English synthetic narration; burned-in English and Chinese captions. Illustrative workflows and an actual frontend preview."]
for scene in T["scenes"]:
    metadata += ["[CHAPTER]", "TIMEBASE=1/1000", f"START={round(scene['start']*1000)}",
                 f"END={round(scene['end']*1000)}", f"title={scene['chapter']}"]
chapters = ROOT / "source" / "chapters.ffmetadata"
chapters.write_text("\n".join(metadata) + "\n")
filters = (
    "[1:a]highpass=f=70,lowpass=f=11500,loudnorm=I=-16:TP=-2:LRA=7,"
    "aresample=48000,asplit=2[voice][side];"
    "[2:a]volume=0.22[music];"
    "[music][side]sidechaincompress=threshold=0.012:ratio=6:attack=12:release=330[duck];"
    "[voice][duck]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,"
    "alimiter=limit=0.95:level=0,aresample=48000[mix]"
)
subprocess.run([
    FFMPEG, "-y", "-hide_banner", "-loglevel", "warning",
    "-i", str(ASSETS / "silent-video.mp4"),
    "-i", str(ASSETS / "narration.wav"),
    "-i", str(ASSETS / "original-score.wav"),
    "-i", str(chapters), "-filter_complex", filters,
    "-map", "0:v:0", "-map", "[mix]", "-map_metadata", "3", "-map_chapters", "3",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
    "-t", str(T["duration"]), "-movflags", "+faststart",
    str(ROOT / "SolPact-Hackathon.mp4"),
], check=True)

zh = ["合作的信任难题", "为什么做这个项目", "认识 SolPact", "Oscar 与 zhaoyan",
      "约定里程碑与托管预算", "交付、确认、结算", "超时、退款与仲裁", "为什么选择 Solana",
      "USDC 与钱包生态", "从 Avalanche 到 Solana 原生", "当前 Devnet 进展", "下一步与项目愿景"]
chapter_data = [{"start": s["start"], "label": name} for s, name in zip(T["scenes"], zh)]
template = (ROOT / "source" / "player-template.html").read_text()
(ROOT / "preview.html").write_text(template.replace("__CHAPTERS__", json.dumps(chapter_data, ensure_ascii=False)))

notes = f"""SolPact — 黑客松宣传片

成片：SolPact-Hackathon.mp4
时长：{T['duration']:.2f} 秒
格式：1920 × 1080，30 fps，H.264 / AAC，16:9，适合投屏与活动提交。
语言：英文旁白，画面内嵌中英双语字幕。另附中英、英文、中文 SRT。
团队：Oscar — 产品与系统架构；zhaoyan — 智能合约。姓名拼写已经用户确认。
声音：合成英文旁白，未克隆成员声音。配乐由 prepare_audio.py 原创合成，无人声。
画面：程序绘制的动态图形；使用当前项目真实首页截图展示产品界面。
字体：Space Grotesk / Inter，随附 SIL Open Font License；中文使用系统 Noto Sans CJK。

叙事与事实
项目当前品牌是 SolPact，工作区目录和 GitHub 仓库保留 MilePay 名称。
动机来自项目定位：服务合作中交付、付款与信任的矛盾；没有虚构团队亲历、客户、收入或奖项。
500 USDC / 200 设计 / 300 开发是动画示例，已在画面标注。
合约支持付款、超时主动领取、逾期未交付退款和指定仲裁人分配；不宣称代码能评定工作质量。
响应期结束后的领取需要服务方提交交易；未宣称后台自动执行。
依据制作时仓库记录说明 Devnet 部署及测试范围，未宣称主网上线或全部测试完成。
浏览器与合约的接入在制作时仍进行中，画面与旁白已说明。
选择 Solana 的理由结合高频里程碑的成本、确认体验、原生 USDC、钱包与原生账户模型。
没有使用具体手续费、到账时间、平台抽成或对其他链的夸大比较。
完整证据对应见 source/facts.json。

文件
preview.html — 本地播放器，支持章节跳转。
SolPact-Hackathon-cover.png — 1920 × 1080 封面。
SolPact-Hackathon-storyboard.jpg — 分镜总览。
SolPact-Hackathon-script.txt — 带时间轴的双语脚本。
source/story.json — 可编辑旁白与分镜。
source/timeline.json — 配音对齐后的时间轴。
source/assets/narration.wav — 英文旁白轨道。
source/assets/original-score.wav — 原创音乐轨道。
source/assets/silent-video.mp4 — 无音轨动画，可用于二次剪辑。

复现
在 source 目录安装 requirements.txt 中的 Python 依赖与 package.json 中的 npm 依赖。
运行 python prepare_audio.py；已有配音素材会被复用。
运行 node render.mjs --stills，再运行 node render.mjs。
运行 python produce.py 生成最终成片与播放器。
运行 python validate.py 检查编码、字幕时间轴、音量和抽帧。
渲染环境需提供 NotoSansCJK-Regular.ttc 和 DejaVuSansMono.ttf；路径在 render.mjs 中。
"""
(ROOT / "production-notes.txt").write_text(notes)
print(f"Final MP4 and local player ready: {T['duration']:.2f}s", flush=True)
