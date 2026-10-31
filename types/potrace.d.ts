// potrace (a JS port of Potrace) ships no types — just the part
// lib/svg-trace.ts uses.
declare module "potrace" {
  type PotraceOptions = {
    turdSize?: number;
    alphaMax?: number;
    optCurve?: boolean;
    optTolerance?: number;
    threshold?: number;
    blackOnWhite?: boolean;
  };

  export class Potrace {
    constructor(options?: PotraceOptions);
    loadImage(image: Buffer, callback: (error: Error | null) => void): void;
    getPathTag(fillColor: string, scale?: { x: number; y: number }): string;
  }
}
