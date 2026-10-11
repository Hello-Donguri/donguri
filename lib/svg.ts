// Whether an uploaded SVG is just a picture. SVG is XML that can carry
// scripts: harmless in an <img> (which is how word images are shown), but
// not if someone opens the file's URL directly. Uploads are admin-only, so
// rather than rewrite a file this turns away any that has scripting in it —
// <script>, an on…= event handler, a javascript: link, or embedded HTML
// (<foreignObject>) — and asks for a clean export.
const UNSAFE_SVG = [/<script[\s>]/i, /\son[a-z]+\s*=/i, /javascript:/i, /<foreignObject[\s>]/i];

export async function isSafeSvg(file: File): Promise<boolean> {
  const text = await file.text();
  return /<svg[\s>]/i.test(text) && !UNSAFE_SVG.some((pattern) => pattern.test(text));
}

export const UNSAFE_SVG_MESSAGE =
  "That SVG has scripting in it (a script, event handler or embedded HTML). Export it again as a plain SVG and try again.";
