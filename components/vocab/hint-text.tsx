import { hintSegments } from "@/lib/grammar-marks";

// Text with its "$$" hints (see lib/grammar-marks.ts) drawn as a dotted
// underline — the secondary highlight, quieter than the main one.
export const HintText = ({ text }: { text: string }) =>
  hintSegments(text).map((segment, index) =>
    segment.hint ? (
      <span
        key={index}
        className="underline decoration-current/60 decoration-dotted decoration-2 underline-offset-[5px]"
      >
        {segment.text}
      </span>
    ) : (
      segment.text
    ),
  );
