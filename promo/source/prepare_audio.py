"""Generate the English voice, aligned bilingual captions, and an original score.

Requirements: edge-tts, imageio-ffmpeg, numpy. No credentials are required.
Existing MP3s are reused. Narration is synthetic; it does not clone team voices.
"""
import asyncio
import difflib
import json
import math
import re
import subprocess
import wave
from pathlib import Path

import edge_tts
import imageio_ffmpeg
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "source" / "assets"
ASSETS.mkdir(parents=True, exist_ok=True)
STORY = json.loads((ROOT / "source" / "story.json").read_text())
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SR = 48000


def tokenize(text):
    return re.findall(r"[a-z0-9]+", text.lower())


async def narrate(scene):
    target = ASSETS / f"voice-{scene['id']}.mp3"
    meta = target.with_suffix(".json")
    if target.exists() and target.stat().st_size > 1000 and meta.exists():
        return
    spoken = " ".join(c.get("voice", c["en"]) for c in scene["captions"])
    for attempt in range(3):
        try:
            words = []
            communicate = edge_tts.Communicate(
                spoken, STORY["voice"], rate=STORY["voice_rate"],
                pitch="-1Hz", boundary="WordBoundary",
            )
            with target.open("wb") as stream:
                async for event in communicate.stream():
                    if event["type"] == "audio":
                        stream.write(event["data"])
                    elif event["type"] == "WordBoundary":
                        words.append({
                            "text": event["text"],
                            "start": event["offset"] / 10_000_000,
                            "duration": event["duration"] / 10_000_000,
                        })
            if target.stat().st_size < 1000 or not words:
                raise RuntimeError("Empty speech or alignment data")
            meta.write_text(json.dumps(words, indent=2))
            print(f"Voice ready: {scene['id']}", flush=True)
            return
        except Exception as error:
            print(f"Voice retry {attempt + 1}: {scene['id']}: {error}", flush=True)
            if attempt == 2:
                raise
            await asyncio.sleep(1 + attempt)


def decode(path):
    output = subprocess.check_output([
        FFMPEG, "-v", "error", "-i", str(path), "-af",
        f"atempo={STORY.get('audio_playback_rate', 1)}", "-f", "f32le",
        "-acodec", "pcm_f32le", "-ar", str(SR), "-ac", "1", "pipe:1",
    ])
    return np.frombuffer(output, dtype="<f4").copy()


def write_wav(path, signal):
    channels = 1 if signal.ndim == 1 else signal.shape[1]
    samples = (np.clip(signal, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as stream:
        stream.setnchannels(channels)
        stream.setsampwidth(2)
        stream.setframerate(SR)
        stream.writeframes(samples.tobytes())


def stamp(seconds):
    millis = round(seconds * 1000)
    hours, millis = divmod(millis, 3_600_000)
    minutes, millis = divmod(millis, 60_000)
    seconds, millis = divmod(millis, 1000)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"


def assemble():
    timeline = {**STORY, "scenes": [], "captions": []}
    scene_clips = []
    cursor = 0.0
    for scene in STORY["scenes"]:
        clip = decode(ASSETS / f"voice-{scene['id']}.mp3")
        voice_seconds = len(clip) / SR
        words = json.loads((ASSETS / f"voice-{scene['id']}.json").read_text())
        expected = []
        caption_indices = []
        for cap in scene["captions"]:
            caption_indices.append(len(expected))
            expected.extend(tokenize(cap.get("voice", cap["en"])))
        actual, offsets = [], []
        for word in words:
            for token in tokenize(word["text"]):
                actual.append(token)
                offsets.append(word["start"] / STORY.get("audio_playback_rate", 1))
        mapping = {}
        for block in difflib.SequenceMatcher(None, expected, actual, autojunk=False).get_matching_blocks():
            for i in range(block.size):
                mapping[block.a + i] = block.b + i
        starts = []
        for index in caption_indices:
            if index in mapping:
                mapped = mapping[index]
            else:
                nearest = min(mapping, key=lambda other: abs(other - index))
                mapped = max(0, min(len(actual) - 1, mapping[nearest] + index - nearest))
            starts.append(offsets[mapped])
        duration = max(scene["minimum_seconds"], voice_seconds + 0.9)
        duration = math.ceil(duration * STORY["format"]["fps"]) / STORY["format"]["fps"]
        voice_start = cursor + 0.4
        normalized = dict(scene, start=cursor, end=cursor + duration,
                          duration=duration, voice_duration=voice_seconds)
        timeline["scenes"].append(normalized)
        for index, cap in enumerate(scene["captions"]):
            end = starts[index + 1] if index + 1 < len(starts) else voice_seconds
            caption = dict(cap, scene=scene["id"],
                           start=voice_start + max(0, starts[index] - 0.04),
                           end=min(cursor + duration - 0.1, voice_start + end))
            timeline["captions"].append(caption)
        padded = np.zeros(round(duration * SR), dtype=np.float32)
        first = round(0.4 * SR)
        padded[first:first + len(clip)] = clip
        scene_clips.append(padded)
        cursor += duration
    voice = np.concatenate(scene_clips)
    timeline["duration"] = len(voice) / SR
    timeline["frames"] = round(timeline["duration"] * STORY["format"]["fps"])
    (ROOT / "source" / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=2))
    write_wav(ASSETS / "narration.wav", voice)
    for kind, filename in [("bilingual", "SolPact-Hackathon-bilingual.srt"),
                           ("en", "SolPact-Hackathon-English.srt"),
                           ("zh", "SolPact-Hackathon-Chinese.srt")]:
        entries = []
        for index, cap in enumerate(timeline["captions"], 1):
            content = cap["en"] + "\n" + cap["zh"] if kind == "bilingual" else cap[kind]
            entries.append(f"{index}\n{stamp(cap['start'])} --> {stamp(cap['end'])}\n{content}\n")
        (ROOT / filename).write_text("\n".join(entries), encoding="utf-8")
    script = []
    for scene in timeline["scenes"]:
        script.append(f"{stamp(scene['start'])}  {scene['chapter']}")
        script.extend(c["en"] + "\n" + c["zh"] for c in scene["captions"])
        script.append("")
    (ROOT / "SolPact-Hackathon-script.txt").write_text("\n".join(script), encoding="utf-8")
    print(f"Aligned {len(timeline['captions'])} captions; runtime {timeline['duration']:.2f}s", flush=True)
    return timeline


def score(timeline):
    """Original electronic instrumental: E minor, 108 BPM, soft arps and drums."""
    count = round(timeline["duration"] * SR)
    mix = np.zeros((count, 2), dtype=np.float32)
    rng = np.random.default_rng(7307)
    beat = 60 / 108

    def place(signal, when, gain=1.0, pan=0):
        offset = round(when * SR)
        if offset >= count:
            return
        signal = signal[:count - offset] * gain
        mix[offset:offset + len(signal), 0] += signal * math.sqrt((1 - pan) / 2)
        mix[offset:offset + len(signal), 1] += signal * math.sqrt((1 + pan) / 2)

    def tone(midi, duration, kind="pad"):
        t = np.arange(round(duration * SR), dtype=np.float32) / SR
        hz = 440 * 2 ** ((midi - 69) / 12)
        if kind == "pad":
            signal = (np.sin(2 * np.pi * hz * t) + 0.25 * np.sin(2 * np.pi * hz * 2.002 * t)
                      + 0.12 * np.sin(2 * np.pi * hz * 0.998 * t))
            env = np.minimum(t / 0.5, 1) * np.minimum((duration - t) / 0.7, 1)
        elif kind == "pluck":
            signal = np.sin(2 * np.pi * hz * t) + 0.22 * np.sin(2 * np.pi * hz * 2 * t)
            env = np.minimum(t / 0.012, 1) * np.exp(-t * 5.6)
        else:
            signal = np.sin(2 * np.pi * hz * t)
            env = np.minimum(t / 0.01, 1) * np.minimum((duration - t) / 0.07, 1)
        return (signal * np.maximum(env, 0)).astype(np.float32)

    chords = [(52, 55, 59, 66), (48, 52, 55, 62), (55, 59, 62, 69), (50, 54, 57, 64)]
    for bar in range(math.ceil(timeline["duration"] / (beat * 4))):
        chord = chords[bar % len(chords)]
        start = bar * beat * 4
        for index, note in enumerate(chord):
            place(tone(note, beat * 4 + 0.55), start, 0.13, (index - 1.5) / 3)
        for step in range(8):
            note = chord[[0, 2, 1, 3, 2, 1, 3, 2][step]] + 12
            place(tone(note, 0.9, "pluck"), start + step * beat / 2, 0.095, math.sin(step * 1.6) * 0.55)
        if start < 7 or start > timeline["duration"] - 6:
            continue
        for step in range(4):
            when = start + beat * step
            kick_t = np.arange(round(0.27 * SR), dtype=np.float32) / SR
            kick = np.sin(2 * np.pi * (45 * kick_t + 12 * (1 - np.exp(-kick_t * 30)))) * np.exp(-kick_t * 18)
            place(kick, when, 0.27)
            place(tone(chord[0] - 12, beat * 0.7, "bass"), when, 0.15)
            if step % 2:
                snare_t = np.arange(round(0.14 * SR), dtype=np.float32) / SR
                noise = rng.normal(0, 0.25, len(snare_t)).astype(np.float32)
                snare = (noise - np.roll(noise, 1)) * np.exp(-snare_t * 30)
                place(snare, when, 0.065)
        for step in range(8):
            hat_t = np.arange(round(0.045 * SR), dtype=np.float32) / SR
            noise = rng.normal(0, 0.18, len(hat_t)).astype(np.float32)
            place((noise - np.roll(noise, 1)) * np.exp(-hat_t * 70), start + step * beat / 2, 0.06, 0.3)
    t = np.arange(count, dtype=np.float32) / SR
    fade = np.minimum(t / 2, 1) * np.minimum((timeline["duration"] - t) / 3.5, 1)
    mix *= np.maximum(fade, 0)[:, None]
    mix /= max(float(np.max(np.abs(mix))), 0.001) / 0.72
    write_wav(ASSETS / "original-score.wav", mix)
    print("Original electronic score ready", flush=True)


async def main():
    for scene in STORY["scenes"]:
        await narrate(scene)
    timeline = assemble()
    score(timeline)
    (ROOT / "source" / "ffmpeg-path.txt").write_text(FFMPEG)


if __name__ == "__main__":
    asyncio.run(main())
