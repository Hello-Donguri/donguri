"use client";

import { useEffect, useId, useRef, type CSSProperties } from "react";

export interface PeekabooAcornProps {
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** Seconds spent looking at you after waving. */
  pauseSeconds?: number;
  /** Repeat the sequence. Set false to finish completely hidden. */
  loop?: boolean;
  /** Overall playback speed: 2 is twice as fast. */
  speed?: number;
  /** Optional accessible name; unnamed instances are decorative. */
  label?: string;
}

// The first cubic of the original arm is split at its midpoint, so the
// resting and raised poses have identical commands and interpolate cleanly.
const REST = [
  999.3, 1091.6, 1000.25, 1126.25, 995.175, 1155.6, 983.825, 1176.8875, 972.475,
  1198.175, 954.85, 1211.4, 930.7, 1213.8, 887.2, 1217.6, 867.9, 1169.5, 874.6,
  1122.4,
];
const RAISED = [
  999.3, 1091.6, 1070, 1090, 1170, 1010, 1193, 910, 1216, 810, 1195, 757, 1158,
  764, 1106, 771, 1125, 846, 1080, 900,
];
const ease = (n: number) => {
  const x = Math.min(1, Math.max(0, n));
  return x * x * (3 - 2 * x);
};
const between = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const armPath = (amount: number) => {
  const v = REST.map((n, i) => n + (RAISED[i] - n) * amount);
  return `M${v[0]},${v[1]} C${v.slice(2, 8).join(" ")} C${v.slice(8, 14).join(" ")} C${v.slice(14).join(" ")}`;
};

/** No animation library or external CSS required. */
export default function PeekabooAcorn({
  size = 240,
  className,
  style,
  pauseSeconds = 3,
  loop = true,
  speed = 1,
  label,
}: PeekabooAcornProps) {
  const id = `acorn-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const url = (name: string) => `url(#${id}-${name})`;
  const mascot = useRef<SVGGElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const arm = useRef<SVGPathElement>(null);
  const waving = useRef<SVGGElement>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let started: number | undefined;
    const pause = Number.isFinite(pauseSeconds) ? Math.max(0, pauseSeconds) : 3;
    const rate = Number.isFinite(speed) ? Math.max(0.01, speed) : 1;
    const retreat = 5.55 + pause;
    const duration = retreat + 1.65;

    const paint = (t: number) => {
      // At +1000, just 80 SVG units of the top of the hat are visible.
      let y = 1000 * (1 - between(t, 0.9, 1.65));
      if (t >= retreat) y = 1100 * between(t, retreat, retreat + 0.75);
      mascot.current?.setAttribute("transform", `translate(0 ${y})`);
      let x = 0;
      if (t >= 1.95 && t < 2.55) x = -24 * between(t, 1.95, 2.15);
      else if (t >= 2.55 && t < 3.2) x = -24 + 48 * between(t, 2.55, 2.8);
      else if (t >= 3.2 && t < 3.6) x = 24 * (1 - between(t, 3.2, 3.5));
      eyes.current?.setAttribute("transform", `translate(${x} 0)`);
      const lift = between(t, 3.8, 4.2) * (1 - between(t, 5.2, 5.55));
      arm.current?.setAttribute("d", armPath(lift));
      // Three quick waves; only the lifted arm rotates, never the face.
      const angle =
        t >= 4.2 && t <= 5.2
          ? 9 *
            Math.sin((t - 4.2) * Math.PI * 6) *
            Math.sin((t - 4.2) * Math.PI)
          : 0;
      waving.current?.setAttribute(
        "transform",
        `rotate(${angle} 999.3 1091.6)`,
      );
    };
    const tick = (now: number) => {
      started ??= now;
      const elapsed = ((now - started) / 1000) * rate;
      paint(loop ? elapsed % duration : Math.min(elapsed, duration));
      if (loop || elapsed < duration) frame = requestAnimationFrame(tick);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      started = undefined;
      if (motion.matches) {
        paint(0); // A still, fully visible character for reduced motion.
        mascot.current?.setAttribute("transform", "translate(0 0)");
      } else {
        paint(0);
        frame = requestAnimationFrame(tick);
      }
    };
    restart();
    motion.addEventListener("change", restart);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", restart);
    };
  }, [loop, pauseSeconds, speed]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1254 1254"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", overflow: "hidden", ...style }}
      role={label ? "img" : undefined}
      aria-hidden={label ? undefined : true}
      aria-labelledby={label ? `${id}-title` : undefined}
    >
      {label && <title id={`${id}-title`}>{label}</title>}
      <defs>
        <clipPath id={`${id}-viewport`}>
          <rect width="1254" height="1254" />
        </clipPath>
        <clipPath id={`${id}-half`}>
          <rect x="627" y="-1000" width="1627" height="3254" />
        </clipPath>
        <linearGradient
          id={`${id}-body`}
          x1="540.9"
          y1="579.6"
          x2="667.8"
          y2="-140.8"
          gradientTransform="translate(0 1202.8) scale(1 -1)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fef8ea" />
          <stop offset=".6" stopColor="#fcf3df" />
        </linearGradient>
        <linearGradient
          id={`${id}-cap`}
          x1="600.5"
          y1="722.7"
          x2="677"
          y2="288.9"
          gradientTransform="translate(0 1202.8) scale(1 -1)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#e2b47d" />
          <stop offset=".9" stopColor="#bf9667" />
        </linearGradient>
        <linearGradient
          id={`${id}-muzzle`}
          x1="480.8"
          y1="222.1"
          x2="773.2"
          y2="222.1"
          gradientTransform="translate(0 1202.8) scale(1 -1)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fcf3df" />
          <stop offset=".6" stopColor="#f3e9d2" />
        </linearGradient>
        <radialGradient
          id={`${id}-nose`}
          cx="627"
          cy="288.8"
          r="61"
          gradientTransform="translate(20.9 1229.7) scale(1 -1)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#4f5e90" />
          <stop offset=".9" stopColor="#4b5a8e" />
          <stop offset="1" stopColor="#4b5a8e" />
        </radialGradient>
      </defs>
      <g clipPath={url("viewport")}>
        <g ref={mascot} transform="translate(0 1000)">
          {[true, false].map((mirror) => (
            <g
              key={String(mirror)}
              transform={mirror ? "translate(1254 0) scale(-1 1)" : undefined}
            >
              <g clipPath={url("half")}>
                <path
                  fill={url("body")}
                  stroke="#4b2a17"
                  strokeWidth="28"
                  strokeLinejoin="round"
                  d="M1152.2,1258.2c32.9-110.7,33.9-380.1-119.2-578.7-213.6,42.3-598.3,42.3-811.9,0-156.7,198.6-157.8,468.7-119.9,579"
                />
                <path
                  fill={url("cap")}
                  stroke="#482a19"
                  strokeWidth="28"
                  strokeLinejoin="round"
                  d="M627,188.1h33.8c41.6,0,56.7,15,49.3,56.8l-10.7,46.1c-1.7,9.1,4.6,17.8,13.8,19,142.8,19,278.8,91.8,351.8,200.2,38.3,56.9,57.2,123.9,36,156.8-11,16.8-28.9,29.7-47.7,37.8-122.8,53.1-729.8,53.1-852.6,0-18.8-8.1-36.7-21-47.7-37.8-21.2-32.9-2.3-99.9,36-156.8,73-108.4,209-181.2,351.8-200.2,9.2-1.2,15.5-9.9,13.8-19l-10.7-46.1c-7.4-41.8,7.7-56.8,49.3-56.8h33.8Z"
                />
                <path
                  fill={url("muzzle")}
                  stroke="#4b2a17"
                  strokeWidth="29"
                  d="M627,844.1c77.4,0,146.2,65.5,146.2,142.6s-68.8,130.6-146.2,130.6-146.2-53.5-146.2-130.6,68.8-142.6,146.2-142.6Z"
                />
                <ellipse
                  fill="#20264f"
                  cx="627"
                  cy="906.6"
                  rx="79.7"
                  ry="79.4"
                />
                <path
                  fill={url("nose")}
                  d="M597.6,855c53.9-26.5,107.2,25.8,81.8,79.5-5,10.7-13.7,19.3-24.4,24.3-53.9,25.2-106.5-27.8-79.8-81.5,4.8-9.7,12.7-17.6,22.5-22.4h0Z"
                />
              </g>
            </g>
          ))}
          <g
            fill="none"
            stroke="#4b2813"
            strokeWidth="23"
            strokeLinecap="round"
          >
            <path d="M401.5,411.6c129.4,25.8,321.6,25.8,451,0" />
            <path d="M308.4,502.2c181.8,42.4,455.4,42.4,637.2,0" />
            <path d="M260.8,600.6c207.4,47.2,524.9,47.2,732.4,0" />
          </g>
          <g ref={eyes} fill="#381806">
            <ellipse cx="453" cy="834.4" rx="34.8" ry="34.6" />
            <ellipse cx="801" cy="834.4" rx="34.8" ry="34.6" />
          </g>
          <ellipse
            fill="#c8d7ff"
            cx="648.3"
            cy="876.8"
            rx="10.6"
            ry="12.9"
            transform="translate(-442.1 884) rotate(-53.9)"
          />
          <path
            fill="none"
            stroke="#4b2a17"
            strokeWidth="31"
            strokeLinecap="round"
            d="M254.7,1091.6c-1.9,69.3,20.3,117.4,68.6,122.2,43.5,3.8,62.8-44.3,56.1-91.4"
          />
          <g ref={waving}>
            <path
              ref={arm}
              d={armPath(0)}
              fill={url("body")}
              stroke="#4b2a17"
              strokeWidth="31"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
