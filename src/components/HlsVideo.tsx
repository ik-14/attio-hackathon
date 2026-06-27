import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface HlsVideoProps {
  src: string;
  className?: string;
  poster?: string;
  saturateZero?: boolean;
}

export default function HlsVideo({
  src,
  className = "",
  poster = "",
  saturateZero = false,
}: HlsVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        maxMaxBufferLength: 8,
        enableWorker: true,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => {
          // Fallback if browser blocks autoplay
          console.warn("HLS autoplay failed/prevented:", err);
        });
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // For Safari and iOS devices that support native HLS streaming
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch((err) => {
          console.warn("Native HLS autoplay failed/prevented:", err);
        });
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={`${className} ${saturateZero ? "saturate-0" : ""}`}
      poster={poster}
      loop
      muted
      playsInline
      autoPlay
      style={{ objectFit: "cover" }}
    />
  );
}
