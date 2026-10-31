// imagetracerjs ships no types — just the part lib/svg-trace.ts uses.
declare module "imagetracerjs" {
  type ImageTracerOptions = {
    pal?: { r: number; g: number; b: number; a: number }[];
    [option: string]: number | boolean | string | { r: number; g: number; b: number; a: number }[] | undefined;
  };

  const ImageTracer: {
    imagedataToSVG(
      imageData: { width: number; height: number; data: Uint8Array | Uint8ClampedArray },
      options?: ImageTracerOptions | string,
    ): string;
  };

  export default ImageTracer;
}
