"use client";

import { useId, type SVGProps } from "react";

export type SleepingDuckProps = SVGProps<SVGSVGElement> & {
  /** Accessible name. Omit for a decorative illustration. */
  title?: string;
  /** Disable the sleeping animation. */
  animated?: boolean;
};

export function SleepingDuck({
  title,
  animated = true,
  ...props
}: SleepingDuckProps) {
  const id = useId();
  const titleId = `${id}-title`;
  const headId = `${id}-head`;
  const billId = `${id}-bill`;
  const feetId = `${id}-feet`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={1100}
      height={1110}
      viewBox="100 70 1100 1110"
      fill="none"
      role={title ? "img" : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      data-sleeping-duck-v2=""
      data-animated={animated ? "true" : "false"}
      {...props}
    >
      {title && <title id={titleId}>{title}</title>}
      <style>{`
        @keyframes sleeping-duck-v2-breathe {
          0%, 100% { transform: scale(1, 1); }
          45% { transform: scale(1.025, 1.05); }
        }
        @keyframes sleeping-duck-v2-nod {
          0%, 100% { transform: rotate(0deg); }
          45% { transform: translateY(7px) rotate(3deg); }
        }
        @keyframes sleeping-duck-v2-zzz {
          0% { opacity: .25; transform: translate(0px, 12px) scale(.88); }
          25% { opacity: 1; }
          72% { opacity: .9; }
          100% { opacity: .25; transform: translate(22px, -65px) scale(1.08); }
        }
        [data-sleeping-duck-v2] .duck-breath {
          transform-box: view-box;
          transform-origin: 620px 1080px;
        }
        [data-sleeping-duck-v2] .duck-head {
          transform-box: view-box;
          transform-origin: 740px 650px;
        }
        [data-sleeping-duck-v2] .duck-z { opacity: 1; transform-box: fill-box; transform-origin: center; }
        [data-sleeping-duck-v2][data-animated="true"] .duck-breath { animation: sleeping-duck-v2-breathe 4.2s ease-in-out infinite; }
        [data-sleeping-duck-v2][data-animated="true"] .duck-head { animation: sleeping-duck-v2-nod 4.2s ease-in-out infinite; }
        [data-sleeping-duck-v2][data-animated="true"] .duck-z { animation: sleeping-duck-v2-zzz 4.2s linear infinite; }
        [data-sleeping-duck-v2][data-animated="true"] .duck-z:nth-child(2) { animation-delay: -1.4s; }
        [data-sleeping-duck-v2][data-animated="true"] .duck-z:nth-child(3) { animation-delay: -2.8s; }
        @media (prefers-reduced-motion: reduce) {
          [data-sleeping-duck-v2] .duck-breath,
          [data-sleeping-duck-v2] .duck-head,
          [data-sleeping-duck-v2] .duck-z { animation: none !important; }
        }
      `}</style>
      <defs>
        <linearGradient
          id={headId}
          x1="570"
          y1="200"
          x2="900"
          y2="610"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#299D7E" />
          <stop offset="1" stopColor="#299C77" />
        </linearGradient>
        <linearGradient
          id={billId}
          x1="890"
          y1="500"
          x2="900"
          y2="620"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFD055" />
          <stop offset="1" stopColor="#FFC348" />
        </linearGradient>
        <linearGradient
          id={feetId}
          x1="730"
          y1="1010"
          x2="730"
          y2="1110"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFA347" />
          <stop offset="1" stopColor="#FF9A3D" />
        </linearGradient>
      </defs>
      <g
        stroke="#4B210A"
        strokeWidth="25"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g className="duck-breath">
          <g>
            <path
              d="M585 606 C465 606 355 650 285 747 C242 754 200 752 165 739 C155 737 148 770 154 798 C157 820 170 833 187 842 C190 957 270 1046 392 1080 C506 1111 686 1109 816 1083 C932 1064 1000 976 1000 872 C1000 770 948 694 883 651 L680 607 Z"
              fill="#B57B68"
            />
          </g>
          <g className="duck-head">
            <path
              d="M588 586 C644 615 746 648 836 635 C862 632 884 618 894 610 L927 644 C910 664 878 681 835 683 C742 688 637 661 573 617 Z"
              fill="#FFF6E8"
              stroke="none"
            />
            <path
              d="M580 608 C585 586 579 578 564 566 C523 540 505 496 505 444 C505 360 542 291 604 260 C666 229 744 232 806 258 C884 291 925 354 938 427 C943 457 944 480 950 502 C953 522 940 538 920 548 L940 559 C923 601 885 629 836 636 C746 649 644 616 588 587"
              fill={`url(#${headId})`}
              stroke="none"
            />
            <path d="M580 608 C585 586 579 578 564 566 C523 540 505 496 505 444 C505 360 542 291 604 260 C666 229 744 232 806 258 C884 291 925 354 938 427 C943 457 944 480 950 502 C953 522 940 538 920 548" />
            <path d="M933 642 C921 652 911 658 900 668" />
            <path d="M677 482 C699 511 740 508 754 466" />
            <path d="M842 431 C864 451 889 442 897 413" />
            <path
              d="M797 538 C827 522 847 489 866 488 C888 485 905 504 923 524 C946 546 976 550 1014 566 C1035 574 1048 579 1046 590 C1043 610 1007 628 982 633 C937 647 886 635 850 612 C824 595 787 565 797 538 Z"
              fill={`url(#${billId})`}
            />
            <path d="M844 569 C883 604 938 620 992 608" strokeWidth="12" />
            <ellipse
              cx="892"
              cy="540"
              rx="16"
              ry="10"
              transform="rotate(43 892 540)"
              fill="#4B210A"
              stroke="none"
            />
          </g>
          <path
            d="M261 825 C291 899 424 927 539 892 C610 870 642 818 642 765"
            strokeWidth="24"
          />
          <path d="M265 834 C292 845 319 848 341 847" strokeWidth="17" />
        </g>
        <path
          d="M557 1062 C567 1046 587 1033 610 1031 C624 1011 641 1010 658 1018 C670 1023 680 1038 681 1048 C710 1045 740 1065 743 1088 C747 1110 721 1118 681 1120 C641 1125 581 1124 554 1112 C539 1105 541 1078 557 1062 Z"
          fill={`url(#${feetId})`}
        />
        <path
          d="M790 1049 C803 1036 818 1034 832 1035 C843 1011 864 1003 883 1011 C897 1016 909 1034 908 1046 C929 1045 953 1058 955 1075 C960 1096 936 1104 907 1106 C864 1111 817 1111 791 1101 C773 1095 769 1068 790 1049 Z"
          fill={`url(#${feetId})`}
        />
      </g>
      {/* Vector Z shapes keep their size even when the app styles SVG text. */}
      <g
        aria-hidden="true"
        fill="#000000"
        stroke="#000000"
        strokeWidth="6"
        strokeLinejoin="round"
      >
        <g className="duck-z">
          <g transform="translate(1020 430) scale(.72)">
            <path d="M0 0 H64 V14 L20 56 H64 V70 H0 V56 L44 14 H0 Z" />
          </g>
        </g>
        <g className="duck-z">
          <g transform="translate(1060 335) scale(.9)">
            <path d="M0 0 H64 V14 L20 56 H64 V70 H0 V56 L44 14 H0 Z" />
          </g>
        </g>
        <g className="duck-z">
          <g transform="translate(1090 230) scale(1.08)">
            <path d="M0 0 H64 V14 L20 56 H64 V70 H0 V56 L44 14 H0 Z" />
          </g>
        </g>
      </g>
    </svg>
  );
}
