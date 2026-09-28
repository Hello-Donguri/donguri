import { useId, type SVGProps } from "react";

type DonguriAcornProps = SVGProps<SVGSVGElement> & {
  /** Optional accessible name. Omit when the image is purely decorative. */
  title?: string;
};

/** Scalable, transparent-background trace of the supplied acorn character. */
export function DonguriAcorn({ title, ...props }: DonguriAcornProps) {
  const titleId = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 434 834"
      width={434}
      height={834}
      fill="none"
      role={title ? "img" : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title && <title id={titleId}>{title}</title>}
      <style>{`
        @keyframes donguri-nose-twitch {
          0%, 13%, 100% { transform: translateX(0); }
          2% { transform: translateX(4px) rotate(3deg); }
          4% { transform: translateX(-2px) rotate(-3deg); }
          6% { transform: translateX(5px) rotate(3deg); }
          9% { transform: translateX(-1px) rotate(-1deg); }
        }
        @keyframes donguri-blink {
          0%, 3%, 5.5%, 9%, 100% { transform: scaleY(1); }
          1.5%, 7% { transform: scaleY(0.08); }
        }
        .donguri-nose {
          animation: donguri-nose-twitch 4.2s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .donguri-eye {
          animation: donguri-blink 7s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @media (prefers-reduced-motion: reduce) {
          .donguri-nose, .donguri-eye { animation: none; }
        }
      `}</style>

      {/* Body and the little foot. The left edge follows the source crop. */}
      <path
        d="M40 221H315C345 270 354 324 354 376C360 421 341 465 321 498C321 604 294 670 244 716C217 741 183 757 148 765C157 791 161 817 137 826C100 840 80 817 74 779H40Z"
        fill="#FEEAC8"
      />
      <path
        d="M315 221C345 270 354 324 354 376C360 421 341 465 321 498C321 604 294 670 244 716C217 741 183 757 148 765C157 791 161 817 137 826C100 840 80 817 74 779M40 779H74M40 221"
        fill="none"
        stroke="#3B2415"
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M74 779L86 778"
        stroke="#3B2415"
        strokeWidth={10}
        strokeLinecap="round"
      />

      {/* Acorn cap and stem. */}
      <path
        d="M40 65C78 48 123 45 171 52L170 18C169 8 176 4 190 5L219 9C232 13 232 22 226 39L211 69C256 71 295 95 325 127C351 157 369 198 369 235C371 254 365 271 350 279C325 297 274 286 238 280C159 268 94 250 40 235Z"
        fill="#D69D5A"
        stroke="#3B2415"
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M173 64L171 50M212 70L217 59"
        stroke="#3B2415"
        strokeWidth={9}
        strokeLinecap="round"
      />
      <path
        d="M80 86C149 115 226 126 290 130"
        stroke="#3B2415"
        strokeWidth={9}
        strokeLinecap="round"
      />
      <path
        d="M40 125C129 159 236 183 323 183"
        stroke="#3B2415"
        strokeWidth={9}
        strokeLinecap="round"
      />
      <path
        d="M40 178C134 211 242 237 330 234"
        stroke="#3B2415"
        strokeWidth={9}
        strokeLinecap="round"
      />

      {/* Eyes, left arm, and pale snout. */}
      <circle className="donguri-eye" cx={147} cy={352} r={14} fill="#3B2415" />
      <circle
        className="donguri-eye"
        cx={228}
        cy={339}
        r={13.5}
        fill="#3B2415"
      />
      <path
        d="M40 457C19 457 5 478 5 502C5 532 31 553 71 559M40 457C63 458 84 476 101 497"
        fill="#FEEAC8"
        stroke="#3B2415"
        strokeWidth={10}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M324 359C302 351 279 353 260 364C234 379 217 404 217 433C217 471 243 499 278 503C323 509 355 483 367 444C375 418 369 387 350 372C343 366 334 361 324 359Z"
        fill="#FFF2D2"
        stroke="#3B2415"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Blue nose and shine. */}
      <g className="donguri-nose">
        <circle
          cx={349}
          cy={396}
          r={37}
          fill="#263B68"
          stroke="#2C2C39"
          strokeWidth={7}
        />
        <path
          d="M325 378C334 363 358 359 371 375C379 387 377 406 365 417C355 426 335 424 324 411C318 403 319 389 325 378Z"
          fill="#4562A4"
        />
        <circle cx={365} cy={385} r={7.5} fill="#9EB9E2" />
      </g>
    </svg>
  );
}

export default DonguriAcorn;
