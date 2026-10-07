"use client";

import { useRef, useState } from "react";
import { Download, Play } from "lucide-react";

const VIDEO_URL = "/videos/solpact-hackathon.mp4";

export function ProjectVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

  const playVideo = async () => {
    setPlaybackError(false);
    try {
      await videoRef.current?.play();
    } catch {
      setPlaybackError(true);
    }
  };

  return (
    <section
      id="project-video"
      aria-labelledby="project-video-title"
      className="relative scroll-mt-24 border-y border-white/5 bg-primary-900/20 py-16 md:py-24"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-12">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-accent-500/20 bg-accent-500/10 px-4 py-2 text-xs font-bold text-accent-400">
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
            Solana Hackathon · 项目介绍
          </div>
          <h2
            id="project-video-title"
            className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl"
          >
            2 分钟，认识
            <br />
            <span className="text-accent-400">SolPact。</span>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-primary-400">
            我们是 Oscar 和 zhaoyan。了解我们为什么做 SolPact，以及如何用
            Solana 和 USDC，让服务合作按清晰的里程碑结算。
          </p>
          <div className="mt-7 flex flex-wrap gap-x-8 gap-y-4 text-sm">
            <div>
              <p className="font-bold text-primary-100">Oscar</p>
              <p className="mt-1 text-primary-500">产品与系统架构</p>
            </div>
            <div>
              <p className="font-bold text-primary-100">zhaoyan</p>
              <p className="mt-1 text-primary-500">智能合约</p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl sm:rounded-3xl">
            <video
              ref={videoRef}
              controls
              playsInline
              preload="none"
              poster="/videos/solpact-hackathon-cover.png"
              aria-label="SolPact 项目介绍视频，英文旁白、中英双语字幕"
              className="block aspect-video w-full"
              onPlay={() => {
                setHasStarted(true);
                setPlaybackError(false);
              }}
              onError={() => setPlaybackError(true)}
            >
              <source src={VIDEO_URL} type="video/mp4" />
              <track
                kind="captions"
                src="/videos/solpact-hackathon-English.vtt"
                srcLang="en"
                label="English"
              />
              <track
                kind="captions"
                src="/videos/solpact-hackathon-Chinese.vtt"
                srcLang="zh"
                label="中文"
              />
              您的浏览器暂不支持视频播放，请下载视频后观看。
            </video>
            {!hasStarted && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => void playVideo()}
                  aria-label="播放 SolPact 项目介绍视频"
                  className="pointer-events-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-accent-500/95 text-primary-950 shadow-xl transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-400 sm:h-20 sm:w-20"
                >
                  <Play className="ml-1 h-7 w-7 fill-current sm:h-8 sm:w-8" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-primary-500 sm:text-sm">
            <p>2:10 · 英文旁白 · 中英双语字幕</p>
            <a
              href={VIDEO_URL}
              download="SolPact-Hackathon.mp4"
              className="inline-flex items-center gap-2 font-medium text-accent-400 transition-colors hover:text-accent-300"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              下载视频
            </a>
          </div>
          {playbackError && (
            <p role="alert" className="mt-3 text-sm text-amber-300">
              视频暂时无法播放，请重试或下载后观看。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
