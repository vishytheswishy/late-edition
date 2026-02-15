import { CanvasTexture, SRGBColorSpace } from "three";
import { createCoverCanvas } from "@/lib/coverTexture";
import { CANVAS_W, CANVAS_H } from "./constants";
import type { GridCell, PageData } from "./types";
import type { AlbumPhoto } from "@/lib/albums";

/* ------------------------------------------------------------------ */
/*  Grid layout for photos on pages                                    */
/* ------------------------------------------------------------------ */

export function getGridLayouts(count: number): GridCell[] {
  const pad = 100;
  const gap = 48;
  const areaW = CANVAS_W - pad * 2;
  const areaH = CANVAS_H - pad * 2;
  const cells: GridCell[] = [];

  if (count === 1) {
    const inset = 80;
    cells.push({
      x: pad + inset,
      y: pad + inset,
      w: areaW - inset * 2,
      h: areaH - inset * 2,
    });
  } else if (count === 2) {
    const cellH = (areaH - gap) / 2;
    cells.push({ x: pad, y: pad, w: areaW, h: cellH });
    cells.push({ x: pad, y: pad + cellH + gap, w: areaW, h: cellH });
  } else if (count === 3) {
    const topH = areaH * 0.55;
    const botH = areaH - topH - gap;
    const halfW = (areaW - gap) / 2;
    cells.push({ x: pad, y: pad, w: areaW, h: topH });
    cells.push({ x: pad, y: pad + topH + gap, w: halfW, h: botH });
    cells.push({
      x: pad + halfW + gap,
      y: pad + topH + gap,
      w: halfW,
      h: botH,
    });
  } else {
    const cellW = (areaW - gap) / 2;
    const cellH = (areaH - gap) / 2;
    cells.push({ x: pad, y: pad, w: cellW, h: cellH });
    cells.push({ x: pad + cellW + gap, y: pad, w: cellW, h: cellH });
    cells.push({ x: pad, y: pad + cellH + gap, w: cellW, h: cellH });
    cells.push({
      x: pad + cellW + gap,
      y: pad + cellH + gap,
      w: cellW,
      h: cellH,
    });
  }

  return cells;
}

/* ------------------------------------------------------------------ */
/*  Image loading                                                      */
/* ------------------------------------------------------------------ */

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/* ------------------------------------------------------------------ */
/*  Texture generators                                                 */
/* ------------------------------------------------------------------ */

export async function createGridTexture(
  photos: AlbumPhoto[]
): Promise<{ tex: CanvasTexture; dataUrl: string }> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const cells = getGridLayouts(photos.length);
  const borderW = 12;

  for (let i = 0; i < photos.length && i < cells.length; i++) {
    const cell = cells[i];
    try {
      const img = await loadImage(photos[i].url);
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;

      const captionSpace = photos[i].caption ? 64 : 0;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        cell.x - borderW,
        cell.y - borderW,
        cell.w + borderW * 2,
        cell.h + borderW * 2 + captionSpace
      );
      ctx.shadowColor = "transparent";

      const imgAspect = img.width / img.height;
      const slotAspect = cell.w / cell.h;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (imgAspect > slotAspect) {
        sw = img.height * slotAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / slotAspect;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, cell.x, cell.y, cell.w, cell.h);

      if (photos[i].caption) {
        ctx.fillStyle = "#555";
        ctx.font = "italic 32px Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText(
          photos[i].caption.slice(0, 50),
          cell.x + cell.w / 2,
          cell.y + cell.h + borderW + 40,
          cell.w
        );
      }
      ctx.restore();
    } catch {
      ctx.save();
      ctx.fillStyle = "#e0ddd8";
      ctx.fillRect(cell.x, cell.y, cell.w, cell.h);
      ctx.restore();
    }
  }

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return { tex, dataUrl };
}

export async function createCoverTexture(
  title: string,
  coverUrl: string | null,
  date?: string | null
): Promise<{ tex: CanvasTexture; dataUrl: string }> {
  const canvas = await createCoverCanvas(title, coverUrl, CANVAS_W, CANVAS_H, date);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return { tex, dataUrl };
}

export function createBackCoverTexture(title: string): {
  tex: CanvasTexture;
  dataUrl: string;
} {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#f5f0e860";
  ctx.font = "200 56px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return { tex, dataUrl };
}

export function createRoughnessTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const v = 120 + Math.random() * 40;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return new CanvasTexture(canvas);
}

/* ------------------------------------------------------------------ */
/*  Group photos into PageData                                         */
/* ------------------------------------------------------------------ */

/**
 * Deterministic PRNG (mulberry32) seeded from the album title so layouts
 * are random-looking but stable across renders / reloads.
 */
function seededRng(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h |= 0; h = h + 0x6d2b79f5 | 0;
    let t = Math.imul(h ^ h >>> 15, 1 | h);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function groupPhotosIntoPages(
  photos: AlbumPhoto[],
  title: string,
  coverUrl: string | null,
  date?: string | null
): { pageDataPromises: Promise<PageData>[]; pageCount: number } {
  const rand = seededRng(title);

  // Build variable-size chunks: 1, 2, or 3 photos per page
  const chunks: AlbumPhoto[][] = [];
  let i = 0;
  while (i < photos.length) {
    const remaining = photos.length - i;
    // Pick a random page size of 1-3, capped by what's left
    const size = Math.min(remaining, Math.floor(rand() * 3) + 1);
    chunks.push(photos.slice(i, i + size));
    i += size;
  }

  interface FaceInfo {
    texPromise: Promise<{ tex: CanvasTexture; dataUrl: string }>;
    photos: AlbumPhoto[];
    cells: GridCell[];
  }

  const faces: FaceInfo[] = [];

  // Cover
  faces.push({
    texPromise: createCoverTexture(title, coverUrl, date),
    photos: [],
    cells: [],
  });

  // Interior pages
  for (const chunk of chunks) {
    faces.push({
      texPromise: createGridTexture(chunk),
      photos: chunk,
      cells: getGridLayouts(chunk.length),
    });
  }

  // Back cover
  const backResult = createBackCoverTexture(title);
  faces.push({
    texPromise: Promise.resolve(backResult),
    photos: [],
    cells: [],
  });

  // Pad to even count
  if (faces.length % 2 !== 0) {
    const blankCanvas = document.createElement("canvas");
    blankCanvas.width = CANVAS_W;
    blankCanvas.height = CANVAS_H;
    const ctx = blankCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const blankTex = new CanvasTexture(blankCanvas);
    blankTex.colorSpace = SRGBColorSpace;
    faces.splice(faces.length - 1, 0, {
      texPromise: Promise.resolve({
        tex: blankTex,
        dataUrl: blankCanvas.toDataURL("image/jpeg", 0.92),
      }),
      photos: [],
      cells: [],
    });
  }

  const pageCount = faces.length / 2;
  const pageDataPromises: Promise<PageData>[] = [];

  for (let i = 0; i < pageCount; i++) {
    const frontFace = faces[i * 2];
    const backFace = faces[i * 2 + 1];
    pageDataPromises.push(
      Promise.all([frontFace.texPromise, backFace.texPromise]).then(
        ([fr, bk]) => ({
          front: fr.tex,
          back: bk.tex,
          frontDataUrl: fr.dataUrl,
          backDataUrl: bk.dataUrl,
          frontPhotos: frontFace.photos,
          backPhotos: backFace.photos,
          frontCells: frontFace.cells,
          backCells: backFace.cells,
        })
      )
    );
  }

  return { pageDataPromises, pageCount };
}
