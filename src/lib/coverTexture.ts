/**
 * Shared cover texture generator used by book components
 * so that both display the exact same cover visual.
 */

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Draw a styled book cover onto an offscreen canvas:
 * dark (#1a1a1a) background, centered cover image at 70% width, title text at the bottom.
 *
 * Returns the canvas element so callers can create a CanvasTexture or extract a dataUrl.
 */
export async function createCoverCanvas(
  title: string,
  coverUrl: string | null,
  width: number,
  height: number,
  date?: string | null
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  // Dark background
  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, width, height);

  // Date text at the top
  if (date) {
    const d = new Date(date);
    const formatted = d.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const dateFontSize = Math.round(24 * (width / 1024));
    ctx.fillStyle = "#f5f0e860";
    ctx.font = `300 ${dateFontSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.letterSpacing = `${Math.round(3 * (width / 1024))}px`;
    ctx.fillText(formatted.toUpperCase(), width / 2, height * 0.06);
    ctx.letterSpacing = "0px";
  }

  // Cover image
  if (coverUrl) {
    try {
      const img = await loadImage(coverUrl);
      const imgAspect = img.width / img.height;
      const slotW = width * 0.7;
      const slotH = slotW / imgAspect;
      const x = (width - slotW) / 2;
      const y = height * 0.15;
      ctx.drawImage(img, x, y, slotW, Math.min(slotH, height * 0.55));
    } catch {
      /* skip if image fails to load */
    }
  }

  // Title text
  ctx.fillStyle = "#f5f0e8";
  const fontSize = Math.round(52 * (width / 1024));
  ctx.font = `300 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";

  const words = title.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > width * 0.8) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  const lineHeight = Math.round(64 * (height / 1365));
  const startY = height - Math.round(80 * (height / 1365)) - (lines.length - 1) * lineHeight;
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, startY + i * lineHeight);
  });

  return canvas;
}
