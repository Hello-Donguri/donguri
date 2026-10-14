import JSZip from "jszip";

// Some tools (anything built on Microsoft's Open XML SDK, among others)
// write perfectly valid .xlsx files that ExcelJS can't read: every tag
// carries a namespace prefix (`<x:workbook>`, `<x:sheet>` — ExcelJS only
// knows the unprefixed names, so it finds no workbook at all), and the
// package's links point at absolute paths (`/xl/styles.xml`) where Excel
// writes relative ones. Excel opens these files without complaint, so to
// the admin they look fine.
//
// This rewrites such a file the way Excel would have written it: prefixes
// dropped from the spreadsheet namespace, and absolute link targets made
// relative. Cell comments are dropped too — ExcelJS only finds their
// drawings under Excel's own file names (vmlDrawing1.vml), and nothing
// reading the file for an import needs them. A file that needs none of
// this comes back unchanged (`changed: false`); it's only worth calling
// after a load has failed.

const SPREADSHEET_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// `<x:sheet …>` → `<sheet …>`, and the prefix's declaration made the
// default namespace, for whichever prefix the file bound to SpreadsheetML.
function unprefixSpreadsheetXml(xml: string): string {
  const declaration = new RegExp(`xmlns:([A-Za-z_][\\w.-]*)="${escapeRegExp(SPREADSHEET_NS)}"`);
  const prefix = xml.match(declaration)?.[1];
  if (!prefix) return xml;

  const tag = new RegExp(`<(/?)${escapeRegExp(prefix)}:`, "g");
  return xml
    .replace(tag, "<$1")
    .replace(new RegExp(`xmlns:${escapeRegExp(prefix)}="${escapeRegExp(SPREADSHEET_NS)}"`, "g"), `xmlns="${SPREADSHEET_NS}"`);
}

// A .rels file's absolute targets (`/xl/comments1.xml`) made relative to
// the part it belongs to (`../comments1.xml` from xl/worksheets/). The
// package root's own rels (_rels/.rels) are relative to the root.
function relativiseRels(xml: string, relsPath: string): string {
  // xl/worksheets/_rels/sheet1.xml.rels describes xl/worksheets/sheet1.xml.
  const baseDir = relsPath.replace(/_rels\/[^/]+$/, "").replace(/\/$/, "");
  const baseParts = baseDir ? baseDir.split("/") : [];

  return xml.replace(/Target="\/([^"]*)"/g, (_match, absolute: string) => {
    const targetParts = absolute.split("/");
    let shared = 0;
    while (shared < baseParts.length && shared < targetParts.length - 1 && baseParts[shared] === targetParts[shared]) {
      shared += 1;
    }
    const up = Array(baseParts.length - shared).fill("..");
    return `Target="${[...up, ...targetParts.slice(shared)].join("/")}"`;
  });
}

const COMMENT_REL_TYPES = ["/comments", "/vmlDrawing", "/threadedComment", "/person"];

// A worksheet's links to its comments and their drawings, taken out.
function dropCommentRels(xml: string): string {
  return xml.replace(/<Relationship\b[^>]*\/>/g, (relationship) => {
    const type = relationship.match(/Type="([^"]*)"/)?.[1] ?? "";
    return COMMENT_REL_TYPES.some((suffix) => type.endsWith(suffix)) ? "" : relationship;
  });
}

export async function normaliseXlsx(buffer: Buffer): Promise<{ buffer: Buffer; changed: boolean }> {
  const zip = await JSZip.loadAsync(buffer);
  let changed = false;

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const isRels = path.endsWith(".rels");
    if (!isRels && !path.endsWith(".xml")) continue;

    // A UTF-8 byte-order mark before the XML declaration trips parsers too.
    const original = await entry.async("string");
    let updated = original.replace(/^\uFEFF/, "");
    updated = isRels ? dropCommentRels(relativiseRels(updated, path)) : unprefixSpreadsheetXml(updated);
    // The sheet's pointer at the comment drawing just removed.
    if (path.startsWith("xl/worksheets/") && !isRels) {
      updated = updated.replace(/<legacyDrawing\b[^>]*\/>/g, "");
    }

    if (updated !== original) {
      zip.file(path, updated);
      changed = true;
    }
  }

  if (!changed) return { buffer, changed };
  return { buffer: await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }), changed };
}
