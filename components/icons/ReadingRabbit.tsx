import { useId, type SVGProps } from "react";

export type ReadingRabbitProps = SVGProps<SVGSVGElement> & {
  /** Accessible name. Omit for a decorative illustration. */
  title?: string;
};

export function ReadingRabbit({ title, ...props }: ReadingRabbitProps) {
  const titleId = useId();
  const pageClipId = useId();

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={904}
      height={929}
      viewBox="0 0 904 929"
      fill="none"
      role={title ? "img" : undefined}
      aria-labelledby={title ? titleId : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title && <title id={titleId}>{title}</title>}

      <style>{`
        @keyframes reading-rabbit-scan {
          0%, 12.01%, 24.01%, 100% {
            transform: translateX(20px);
          }
          12%, 24%, 36% {
            transform: translateX(-20px);
          }
          40%, 96% {
            transform: translateX(0);
          }
        }

        @keyframes reading-rabbit-right-paw {
          0%, 42%, 74%, 100% {
            opacity: 1;
            transform: translate(0, 0);
          }
          49%, 67% {
            opacity: 0;
            transform: translate(-22px, -6px);
          }
        }

        @keyframes reading-rabbit-top-page {
          0%, 49.99% {
            opacity: 0;
          }
          50%, 64% {
            opacity: 1;
          }
          66%, 100% {
            opacity: 0;
          }
        }

        .reading-rabbit-eyes {
          animation: reading-rabbit-scan 8s linear infinite;
        }

        .reading-rabbit-right-paw {
          animation: reading-rabbit-right-paw 8s ease-in-out infinite;
        }

        .reading-rabbit-top-page {
          opacity: 0;
          animation: reading-rabbit-top-page 8s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .reading-rabbit-eyes,
          .reading-rabbit-right-paw,
          .reading-rabbit-top-page {
            animation: none;
          }

          .reading-rabbit-top-page {
            opacity: 0;
          }
        }
      `}</style>

      <defs>
        {/* Exclude the blue front cover from the turning page outline. */}
        <clipPath id={pageClipId} clipPathUnits="userSpaceOnUse">
          <path
            d="
              M130 480
              H560
              V612
              L542 612
              C485 628 429 648 376 676
              C358 693 337 690 320 677
              C264 651 210 630 147 611
              H130
              Z
            "
          />
        </clipPath>
      </defs>

      <g
        stroke="#42270d"
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Body and face */}
        <g>
          <path
            fill="#fceccb"
            d="M162 281 C134 226 105 162 104 109 C98 58 115 15 145 10 C184 0 210 49 228 111 C242 162 244 214 244 259 C266 252 290 253 315 259 C318 181 327 111 350 63 C369 22 389 7 411 13 C454 23 461 62 451 116 C443 170 425 229 393 285 C448 321 473 381 489 450 C505 516 502 570 510 601 C490 632 466 710 480 788 C462 843 438 872 407 880 C341 890 251 881 181 891 C114 901 72 882 45 838 C8 780 8 710 11 641 C14 557 38 460 75 389 C99 340 128 306 162 281 Z"
          />

          <g className="reading-rabbit-eyes">
            <circle cx={285.5} cy={454.5} r={14} fill="#42270d" stroke="none" />
            <circle cx={393} cy={439} r={14} fill="#42270d" stroke="none" />
          </g>

          <path
            fill="#fdefc6"
            strokeWidth={12}
            d="M405 514 C416 548 398 581 369 592 C335 606 299 590 284 561 C269 529 285 493 314 477 C348 459 387 470 405 514 Z"
          />
          <path
            fill="#ff202b"
            strokeWidth={12}
            d="M432 492 C436 515 422 532 401 534 C379 536 361 519 361 499 C360 479 375 464 393 463 C413 462 429 475 432 492 Z"
          />
        </g>

        {/* Book */}
        <g>
          <path
            fill="#fff8e8"
            strokeWidth={12}
            d="M148 622 C155 603 169 594 188 599 C190 590 195 586 204 590 C263 609 310 633 346 670 C388 631 450 602 501 590 C511 590 516 596 521 599 C529 598 540 605 543 611 L521 680 L353 765 L136 679 Z"
          />

          {/* Continuous cover edge behind the retracting right paw. */}
          <path
            fill="#207aee"
            d="M147 611 C210 630 264 651 320 677 C337 690 358 693 376 676 C429 648 485 628 542 612 L485 793 L351 850 C334 860 312 859 293 849 L117 789 L134 680 Z"
          />

          <path d="M320 679 L292 847 M376 677 L348 850" strokeWidth={12} />

          {/* Faster page edge turns right to left above the front cover. */}
          <g
            clipPath={`url(#${pageClipId})`}
            pointerEvents="none"
            aria-hidden="true"
          >
            <g className="reading-rabbit-top-page">
              <path
                fill="none"
                stroke="#42270d"
                strokeWidth={10}
                strokeLinecap="round"
                d="M346 670 Q442 612 536 606"
              >
                <animate
                  attributeName="d"
                  dur="8s"
                  repeatCount="indefinite"
                  calcMode="linear"
                  keyTimes="0;0.50;0.54;0.57;0.60;0.64;1"
                  values={[
                    "M346 670 Q442 612 536 606",
                    "M346 670 Q442 612 536 606",
                    "M346 670 Q423 582 463 551",
                    "M346 670 Q365 576 346 516",
                    "M346 670 Q274 581 225 551",
                    "M346 670 Q276 615 190 600",
                    "M346 670 Q276 615 190 600",
                  ].join(";")}
                />
              </path>
            </g>
          </g>
        </g>

        {/* Paws and feet */}
        <g fill="#fceccb" strokeWidth={13}>
          <path d="M99 633 C86 660 82 691 93 717 C101 737 121 746 142 741 C161 737 173 724 171 706 C169 690 156 682 134 678" />

          <g className="reading-rabbit-right-paw">
            <path d="M530 660 C540 673 546 693 541 710 C537 728 525 739 510 741 C494 744 481 735 480 722 C478 703 495 688 523 681 L530 660 Z" />
          </g>

          <path d="M168 779 C188 760 211 764 230 785 C254 812 265 847 260 879 C257 901 244 920 222 920 C196 919 173 893 158 859 C145 825 147 798 168 779 Z" />

          <path d="M422 831 C430 800 449 772 470 765 C494 757 516 773 522 796 C534 833 511 875 488 897 C470 914 449 920 431 913 C418 908 411 893 407 878" />
        </g>

        {/* Stack of books */}
        <g strokeWidth={12}>
          <g>
            <path
              fill="#49c047"
              d="M564 816 C549 824 538 840 539 863 C539 880 546 888 567 892 L754 922 L890 885 C899 883 898 876 889 870 L889 838 L894 827 L877 813 L728 793 Z"
            />
            <path
              fill="#fff7e9"
              d="M765 859 L890 829 C881 843 879 860 888 877 L755 918 C744 905 747 875 765 859 Z"
            />
            <path d="M559 817 L766 850 L892 824" />
          </g>

          <g>
            <path
              fill="#ffda32"
              d="M577 755 C562 760 553 771 554 790 C554 809 561 816 580 820 L762 849 L894 816 C882 804 880 785 890 770 C895 765 891 762 883 760 L760 732 Z"
            />
            <path
              fill="#fff7e9"
              d="M769 793 L890 769 C881 782 881 800 890 815 L765 845 C750 835 750 804 769 793 Z"
            />
            <path d="M577 755 L760 782 L885 762" />
          </g>

          <g>
            <path
              fill="#ff242d"
              d="M572 704 C562 709 556 722 557 737 C558 753 563 760 581 763 L759 784 L870 751 C857 738 855 718 868 696 C876 691 870 686 862 685 L680 674 C667 673 655 677 642 680 Z"
            />
            <path
              fill="#fff7e9"
              d="M758 718 L866 696 C853 713 855 735 867 748 L758 779 C744 765 742 739 758 718 Z"
            />
            <path d="M573 702 L757 718 L866 695" />
          </g>
        </g>
      </g>
    </svg>
  );
}

export default ReadingRabbit;
