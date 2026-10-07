"""Validate the finished media, subtitle timing, loudness, and export QA frames."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parent.parent
T = json.loads((ROOT / "source" / "timeline.json").read_text())
VIDEO = ROOT / "SolPact-Hackathon.mp4"
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
for cap in T["captions"]:
    assert 0 <= cap["start"] < cap["end"] <= T["duration"], cap
    assert cap["end"] - cap["start"] >= 0.35, cap
for previous, following in zip(T["captions"], T["captions"][1:]):
    assert previous["end"] <= following["start"] + 0.01
assert T["frames"] == round(T["duration"] * T["format"]["fps"])
for kind in ["bilingual", "English", "Chinese"]:
    srt = (ROOT / f"SolPact-Hackathon-{kind}.srt").read_text()
    assert srt.count(" --> ") == len(T["captions"])

inspection = subprocess.run([FFMPEG,"-hide_banner","-i",str(VIDEO)],capture_output=True,text=True).stderr
assert "1920x1080" in inspection and "30 fps" in inspection
assert "Video: h264" in inspection and "Audio: aac" in inspection
decoded = subprocess.run([FFMPEG,"-v","error","-i",str(VIDEO),"-progress","pipe:1",
                          "-map","0:v:0","-map","0:a:0","-f","null","-"],
                         capture_output=True,text=True,check=True)
assert not decoded.stderr.strip(), decoded.stderr
frames = [int(v) for v in re.findall(r"frame=(\d+)", decoded.stdout)]
assert frames[-1] == T["frames"], (frames[-1], T["frames"])

level = subprocess.run([FFMPEG,"-hide_banner","-i",str(VIDEO),"-vn","-af",
                        "loudnorm=I=-16:TP=-1:LRA=11:print_format=json","-f","null","-"],
                       capture_output=True,text=True,check=True)
match = re.search(r'\{\s*"input_i".*?\}', level.stderr, re.S)
loudness = json.loads(match.group(0))
assert -21 <= float(loudness["input_i"]) <= -12, loudness
assert float(loudness["input_tp"]) <= 0, loudness
qa = ROOT / "source" / "assets" / "qa"
qa.mkdir(exist_ok=True)
for name, sec in [("hook",3), ("team",T["scenes"][3]["start"]+6),
                  ("funded",T["scenes"][4]["end"]-.8),
                  ("paid",T["scenes"][5]["end"]-.8),
                  ("solana",T["scenes"][7]["start"]+5),
                  ("progress",T["scenes"][10]["start"]+5),
                  ("close",T["scenes"][11]["start"]+6)]:
    subprocess.run([FFMPEG,"-y","-v","error","-ss",str(sec),"-i",str(VIDEO),
                    "-frames:v","1","-update","1",str(qa/f"{name}.png")],check=True)
report = {
    "video": VIDEO.name, "width":1920,"height":1080,"fps":30,
    "duration_seconds":T["duration"], "decoded_frames":frames[-1],
    "all_streams_decoded_without_error":True,"caption_pairs":len(T["captions"]),
    "subtitle_timing_valid":True,"loudness":loudness,
    "bytes":VIDEO.stat().st_size,"sha256":hashlib.sha256(VIDEO.read_bytes()).hexdigest(),
    "qa_frames":sorted(p.name for p in qa.glob("*.png")),
}
(ROOT / "validation.json").write_text(json.dumps(report,indent=2))
print(json.dumps(report,indent=2),flush=True)
