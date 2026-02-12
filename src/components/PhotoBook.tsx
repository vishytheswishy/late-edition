"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useBookTransition } from "@/context/BookTransitionContext";
import {
  Bone,
  BoxGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { easing } from "maath";
import { degToRad } from "three/src/math/MathUtils.js";
import { createCoverCanvas } from "@/lib/coverTexture";
import type { AlbumPhoto } from "@/lib/albums";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EASING_FACTOR = 0.5;
const EASING_FACTOR_FOLD = 0.3;
const INSIDE_CURVE_STRENGTH = 0.18;
const OUTSIDE_CURVE_STRENGTH = 0.05;
const TURNING_CURVE_STRENGTH = 0.09;

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.71;
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

const PHOTOS_PER_PAGE = 4;
const CANVAS_W = 1024;
const CANVAS_H = 1365;

/* ------------------------------------------------------------------ */
/*  Shared page geometry (created once)                                */
/* ------------------------------------------------------------------ */

const pageGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  2
);
pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes: number[] = [];
const skinWeights: number[] = [];

for (let i = 0; i < position.count; i++) {
  vertex.fromBufferAttribute(position, i);
  const x = vertex.x;
  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH));
  const skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;
  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0);
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0);
}

pageGeometry.setAttribute(
  "skinIndex",
  new Uint16BufferAttribute(skinIndexes, 4)
);
pageGeometry.setAttribute(
  "skinWeight",
  new Float32BufferAttribute(skinWeights, 4)
);

const whiteColor = new Color("white");

// [Plan 1] Matte page edge materials (roughness 0.9)
const pageMaterials = [
  new MeshStandardMaterial({ color: whiteColor, roughness: 0.9 }),
  new MeshStandardMaterial({ color: "#222", roughness: 0.9 }),
  new MeshStandardMaterial({ color: whiteColor, roughness: 0.9 }),
  new MeshStandardMaterial({ color: whiteColor, roughness: 0.9 }),
];

/* ------------------------------------------------------------------ */
/*  Grid layout for photos on pages                                    */
/* ------------------------------------------------------------------ */

interface GridCell {
  x: number;
  y: number;
  w: number;
  h: number;
}

function getGridLayouts(count: number): GridCell[] {
  const pad = 50;
  const gap = 24;
  const areaW = CANVAS_W - pad * 2;
  const areaH = CANVAS_H - pad * 2;
  const cells: GridCell[] = [];

  if (count === 1) {
    // Single centered photo
    const inset = 40;
    cells.push({
      x: pad + inset,
      y: pad + inset,
      w: areaW - inset * 2,
      h: areaH - inset * 2,
    });
  } else if (count === 2) {
    // Vertical stack: two rows
    const cellH = (areaH - gap) / 2;
    cells.push({ x: pad, y: pad, w: areaW, h: cellH });
    cells.push({ x: pad, y: pad + cellH + gap, w: areaW, h: cellH });
  } else if (count === 3) {
    // One large on top, two side-by-side below
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
    // 2x2 grid
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

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Returns { texture, dataUrl } for a page face */
async function createGridTexture(
  photos: AlbumPhoto[]
): Promise<{ tex: CanvasTexture; dataUrl: string }> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;

  // Cream background
  ctx.fillStyle = "#f8f5f0";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const cells = getGridLayouts(photos.length);
  const borderW = 6;

  for (let i = 0; i < photos.length && i < cells.length; i++) {
    const cell = cells[i];

    try {
      const img = await loadImage(photos[i].url);

      ctx.save();

      // Drop shadow
      ctx.shadowColor = "rgba(0,0,0,0.12)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // White border
      const captionSpace = photos[i].caption ? 32 : 0;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        cell.x - borderW,
        cell.y - borderW,
        cell.w + borderW * 2,
        cell.h + borderW * 2 + captionSpace
      );

      ctx.shadowColor = "transparent";

      // Draw image cover-fit
      const imgAspect = img.width / img.height;
      const slotAspect = cell.w / cell.h;
      let sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;
      if (imgAspect > slotAspect) {
        sw = img.height * slotAspect;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / slotAspect;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        cell.x,
        cell.y,
        cell.w,
        cell.h
      );

      // Caption
      if (photos[i].caption) {
        ctx.fillStyle = "#555";
        ctx.font = "italic 16px Georgia, serif";
        ctx.textAlign = "center";
        ctx.fillText(
          photos[i].caption.slice(0, 50),
          cell.x + cell.w / 2,
          cell.y + cell.h + borderW + 20,
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

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return { tex, dataUrl };
}

async function createCoverTexture(
  title: string,
  coverUrl: string | null
): Promise<{ tex: CanvasTexture; dataUrl: string }> {
  const canvas = await createCoverCanvas(title, coverUrl, CANVAS_W, CANVAS_H);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return { tex, dataUrl };
}

function createBackCoverTexture(title: string): {
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
  ctx.font = "200 28px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, CANVAS_W / 2, CANVAS_H / 2);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return { tex, dataUrl };
}

/* ------------------------------------------------------------------ */
/*  Page data structure (includes dataUrls + photo metadata)           */
/* ------------------------------------------------------------------ */

interface PageData {
  front: CanvasTexture | null;
  back: CanvasTexture | null;
  frontDataUrl: string;
  backDataUrl: string;
  frontPhotos: AlbumPhoto[];
  backPhotos: AlbumPhoto[];
  frontCells: GridCell[];
  backCells: GridCell[];
}

function groupPhotosIntoPages(
  photos: AlbumPhoto[],
  title: string,
  coverUrl: string | null
): { pageDataPromises: Promise<PageData>[]; pageCount: number } {
  const chunks: AlbumPhoto[][] = [];
  for (let i = 0; i < photos.length; i += PHOTOS_PER_PAGE) {
    chunks.push(photos.slice(i, i + PHOTOS_PER_PAGE));
  }

  // Build face list: each face = { texturePromise, photos, cells }
  interface FaceInfo {
    texPromise: Promise<{ tex: CanvasTexture; dataUrl: string }>;
    photos: AlbumPhoto[];
    cells: GridCell[];
  }

  const faces: FaceInfo[] = [];

  // Cover
  faces.push({
    texPromise: createCoverTexture(title, coverUrl),
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
    ctx.fillStyle = "#f8f5f0";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const blankTex = new CanvasTexture(blankCanvas);
    blankTex.colorSpace = SRGBColorSpace;
    faces.splice(faces.length - 1, 0, {
      texPromise: Promise.resolve({
        tex: blankTex,
        dataUrl: blankCanvas.toDataURL("image/jpeg", 0.85),
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

/* ------------------------------------------------------------------ */
/*  Book cover roughness texture                                       */
/* ------------------------------------------------------------------ */

function createRoughnessTexture(): CanvasTexture {
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
/*  Single page component                                              */
/* ------------------------------------------------------------------ */

function Page({
  number,
  pageData,
  page,
  opened,
  bookClosed,
  totalPages,
  onPhotoClick,
  ...props
}: {
  number: number;
  pageData: PageData;
  page: number;
  opened: boolean;
  bookClosed: boolean;
  totalPages: number;
  onPhotoClick?: (photo: AlbumPhoto) => void;
  position?: [number, number, number];
}) {
  const group = useRef<Group>(null!);
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);
  const skinnedMeshRef = useRef<SkinnedMesh>(null!);
  const roughnessTex = useMemo(() => {
    if (number === 0 || number === totalPages - 1) {
      return createRoughnessTexture();
    }
    return null;
  }, [number, totalPages]);

  const manualSkinnedMesh = useMemo(() => {
    const bones: Bone[] = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      const bone = new Bone();
      if (i === 0) {
        bone.position.x = 0;
      } else {
        bone.position.x = SEGMENT_WIDTH;
      }
      if (i > 0) {
        bones[i - 1].add(bone);
      }
      bones.push(bone);
    }
    const skeleton = new Skeleton(bones);

    // [Plan 1] Matte paper: roughness 1.0, no emissive
    const frontMat = new MeshStandardMaterial({
      color: whiteColor,
      map: pageData.front,
      ...(number === 0
        ? { roughnessMap: roughnessTex, roughness: 0.8 }
        : { roughness: 1.0 }),
    });
    const backMat = new MeshStandardMaterial({
      color: whiteColor,
      map: pageData.back,
      ...(number === totalPages - 1
        ? { roughnessMap: roughnessTex, roughness: 0.8 }
        : { roughness: 1.0 }),
    });

    const materials = [...pageMaterials, frontMat, backMat];
    const mesh = new SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageData, number, totalPages]);

  // [Plan 1] No emissive lerp — just page turn animation
  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) return;

    if (lastOpened.current !== opened) {
      turnedAt.current = +new Date();
      lastOpened.current = opened;
    }
    let turningTime =
      Math.min(400, new Date().getTime() - turnedAt.current) / 400;
    turningTime = Math.sin(turningTime * Math.PI);

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!bookClosed) {
      targetRotation += degToRad(number * 0.8);
    }

    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];

      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity =
        Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;

      let rotationAngle =
        INSIDE_CURVE_STRENGTH * insideCurveIntensity * targetRotation -
        OUTSIDE_CURVE_STRENGTH * outsideCurveIntensity * targetRotation +
        TURNING_CURVE_STRENGTH * turningIntensity * targetRotation;

      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);

      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
          foldRotationAngle = 0;
        } else {
          rotationAngle = 0;
          foldRotationAngle = 0;
        }
      }

      easing.dampAngle(
        target.rotation,
        "y",
        rotationAngle,
        EASING_FACTOR,
        delta
      );

      const foldIntensity =
        i > 8
          ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
          : 0;
      easing.dampAngle(
        target.rotation,
        "x",
        foldRotationAngle * foldIntensity,
        EASING_FACTOR_FOLD,
        delta
      );
    }
  });

  const handlePageClick = useCallback(
    (e: { stopPropagation: () => void; uv?: { x: number; y: number }; face?: { materialIndex: number } }) => {
      e.stopPropagation();
      if (!onPhotoClick || !e.uv || !e.face) return;

      const { x: u, y: v } = e.uv;
      const materialIndex = e.face.materialIndex;

      // Material indices: 4 = front (top face in BoxGeometry), 5 = back (bottom face)
      let photos: AlbumPhoto[];
      let cells: GridCell[];
      if (materialIndex === 4) {
        photos = pageData.frontPhotos;
        cells = pageData.frontCells;
      } else if (materialIndex === 5) {
        photos = pageData.backPhotos;
        cells = pageData.backCells;
      } else {
        return;
      }

      // UV to canvas coordinates
      const canvasX = u * CANVAS_W;
      const canvasY = (1 - v) * CANVAS_H;

      for (let i = 0; i < cells.length && i < photos.length; i++) {
        const c = cells[i];
        if (
          canvasX >= c.x &&
          canvasX <= c.x + c.w &&
          canvasY >= c.y &&
          canvasY <= c.y + c.h
        ) {
          onPhotoClick(photos[i]);
          return;
        }
      }
    },
    [onPhotoClick, pageData]
  );

  return (
    <group {...props} ref={group}>
      <primitive
        object={manualSkinnedMesh}
        ref={skinnedMeshRef}
        position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
        onClick={handlePageClick}
      />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Book component                                                     */
/* ------------------------------------------------------------------ */

function Book({
  pageDataList,
  page,
  onPhotoClick,
}: {
  pageDataList: PageData[];
  page: number;
  onPhotoClick?: (photo: AlbumPhoto) => void;
}) {
  const [delayedPage, setDelayedPage] = useState(page);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const goToPage = () => {
      setDelayedPage((prev) => {
        if (page === prev) return prev;
        timeout = setTimeout(
          () => goToPage(),
          Math.abs(page - prev) > 2 ? 50 : 150
        );
        return page > prev ? prev + 1 : prev - 1;
      });
    };
    goToPage();
    return () => clearTimeout(timeout);
  }, [page]);

  return (
    <group rotation-y={-Math.PI / 2}>
      {pageDataList.map((pd, index) => (
        <Page
          key={index}
          page={delayedPage}
          number={index}
          pageData={pd}
          opened={delayedPage > index}
          bookClosed={
            delayedPage === 0 || delayedPage === pageDataList.length
          }
          totalPages={pageDataList.length}
          onPhotoClick={onPhotoClick}
        />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Scene with desk                                                    */
/* ------------------------------------------------------------------ */

// Camera + book reading position
const CAMERA_READING = { x: 0, y: 3.5, z: 2.5 };
const BOOK_READING_ROT_X = -Math.PI / 3.5;

type IntroPhase = "laying" | "opening" | "done";

function BookScene({
  pageDataList,
  page,
  introPhase,
  onIntroPhaseChange,
  onPhotoClick,
}: {
  pageDataList: PageData[];
  page: number;
  introPhase: IntroPhase;
  onIntroPhaseChange: (phase: IntroPhase) => void;
  onPhotoClick?: (photo: AlbumPhoto) => void;
}) {
  const bookGroupRef = useRef<Group>(null!);
  const phaseStartTime = useRef(Date.now());
  const currentPhaseRef = useRef<IntroPhase>(introPhase);

  // Sync ref with prop (only update timer on actual change)
  useEffect(() => {
    if (currentPhaseRef.current !== introPhase) {
      currentPhaseRef.current = introPhase;
      phaseStartTime.current = Date.now();
    }
  }, [introPhase]);

  useFrame(({ camera }, delta) => {
    if (!bookGroupRef.current) return;

    const phase = currentPhaseRef.current;
    const elapsed = (Date.now() - phaseStartTime.current) / 1000;

    if (phase === "laying") {
      // Animate book tilt and camera to reading position
      easing.damp(bookGroupRef.current.rotation, "x", BOOK_READING_ROT_X, 0.25, delta);
      easing.damp(camera.position, "x", CAMERA_READING.x, 0.25, delta);
      easing.damp(camera.position, "y", CAMERA_READING.y, 0.25, delta);
      easing.damp(camera.position, "z", CAMERA_READING.z, 0.25, delta);
      camera.lookAt(0, 0, 0);

      // Check if rotation is close enough to target
      const rotDiff = Math.abs(bookGroupRef.current.rotation.x - BOOK_READING_ROT_X);
      if (rotDiff < 0.05 && elapsed > 0.6) {
        currentPhaseRef.current = "opening";
        phaseStartTime.current = Date.now();
        onIntroPhaseChange("opening");
      }
    } else if (phase === "opening") {
      // Hold reading position while page opens
      easing.damp(bookGroupRef.current.rotation, "x", BOOK_READING_ROT_X, 0.15, delta);
      easing.damp(camera.position, "x", CAMERA_READING.x, 0.15, delta);
      easing.damp(camera.position, "y", CAMERA_READING.y, 0.15, delta);
      easing.damp(camera.position, "z", CAMERA_READING.z, 0.15, delta);
      camera.lookAt(0, 0, 0);

      if (elapsed > 1.0) {
        currentPhaseRef.current = "done";
        onIntroPhaseChange("done");
      }
    } else {
      // "done" -- keep at reading position
      easing.damp(bookGroupRef.current.rotation, "x", BOOK_READING_ROT_X, 0.15, delta);
      camera.lookAt(0, 0, 0);
    }
  });

  // Responsive scale: shrink the book on smaller viewports
  const { viewport } = useThree();
  const responsiveScale = useMemo(() => {
    const base = 1.5;
    const scale = Math.min(base, viewport.width / 3.5);
    return Math.max(0.7, scale);
  }, [viewport.width]);

  return (
    <>
      <group
        ref={bookGroupRef}
        rotation-x={BOOK_READING_ROT_X}
        scale={responsiveScale}
        position-y={-0.3}
      >
        <Book pageDataList={pageDataList} page={page} onPhotoClick={onPhotoClick} />
      </group>

      <Environment preset="apartment" />

      <directionalLight
        position={[2, 5, 2]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
      />
      <ambientLight intensity={0.3} />

      {/* Desk surface */}
      <mesh
        position={[0, -1.8, -0.2]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[8, 0.08, 6]} />
        <meshStandardMaterial
          color="#b08960"
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      {/* Shadow catcher below desk */}
      <mesh
        position={[0, -1.85, 0]}
        rotation-x={-Math.PI / 2}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <shadowMaterial transparent opacity={0.1} />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  UI Overlay                                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Download modal                                                     */
/* ------------------------------------------------------------------ */

function DownloadModal({
  photo,
  onClose,
}: {
  photo: AlbumPhoto;
  onClose: () => void;
}) {
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = photo.url;
    a.download = photo.caption || "photo";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl max-h-[85vh] mx-4 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={photo.caption || "Photo"}
          className="max-h-[70vh] w-auto object-contain rounded-lg"
        />
        {photo.caption && (
          <p className="text-sm text-white/70 font-light mt-3 text-center">
            {photo.caption}
          </p>
        )}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleDownload}
            className="px-5 py-2.5 rounded-full bg-white text-black text-xs uppercase tracking-wider hover:bg-white/90 transition-colors"
          >
            Download
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full border border-white/30 text-white text-xs uppercase tracking-wider hover:border-white/60 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Photo click detection from page coordinates                        */
/* ------------------------------------------------------------------ */

function detectPhotoAtClick(
  clickX: number,
  clickY: number,
  imgRect: DOMRect,
  photos: AlbumPhoto[],
  cells: GridCell[]
): AlbumPhoto | null {
  if (photos.length === 0 || cells.length === 0) return null;

  // Map click position to canvas coordinates
  const nx = (clickX - imgRect.left) / imgRect.width;
  const ny = (clickY - imgRect.top) / imgRect.height;
  if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;

  const canvasX = nx * CANVAS_W;
  const canvasY = ny * CANVAS_H;

  for (let i = 0; i < cells.length && i < photos.length; i++) {
    const c = cells[i];
    if (
      canvasX >= c.x &&
      canvasX <= c.x + c.w &&
      canvasY >= c.y &&
      canvasY <= c.y + c.h
    ) {
      return photos[i];
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Shared bottom control bar (used by 3D + flat views)                */
/* ------------------------------------------------------------------ */

function ControlBar({
  title,
  page,
  totalPages,
  onSetPage,
  toggleLabel,
  onToggle,
  showNav,
}: {
  title: string;
  page: number;
  totalPages: number;
  onSetPage: (p: number) => void;
  toggleLabel: string;
  onToggle: () => void;
  showNav: boolean;
}) {
  return (
    <div className="w-full bg-white/90 backdrop-blur-sm border-t border-black/5 px-4 py-3 md:py-4 flex flex-col gap-2.5 shrink-0">
      {/* Row 1: Back link, title, toggle */}
      <div className="flex items-center justify-between">
        <Link
          href="/photos"
          className="text-xs md:text-[10px] uppercase tracking-wider text-black/40 hover:text-black/70 transition-colors"
        >
          &larr; Back
        </Link>
        <h1 className="text-xs font-light tracking-tight text-black/60 truncate mx-3">
          {title}
        </h1>
        <button
          onClick={onToggle}
          className="text-xs md:text-[10px] uppercase tracking-wider text-black/40 hover:text-black/70 transition-colors whitespace-nowrap"
        >
          {toggleLabel}
        </button>
      </div>

      {/* Row 2: prev arrow, page pills, next arrow */}
      {showNav && (
        <div className="flex items-center gap-2">
          {/* Prev arrow */}
          <button
            onClick={() => onSetPage(page - 1)}
            disabled={page <= 0}
            className="shrink-0 w-10 h-10 md:w-8 md:h-8 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-all disabled:opacity-20 disabled:cursor-default"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50 md:w-[14px] md:h-[14px]">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Page pills */}
          <div className="flex-1 overflow-auto flex justify-center">
            <div className="flex items-center gap-1.5 max-w-full overflow-auto">
              {Array.from({ length: totalPages + 1 }).map((_, index) => (
                <button
                  key={index}
                  className={`shrink-0 rounded-full px-3 py-1.5 md:px-2.5 md:py-1 text-xs md:text-[10px] uppercase tracking-wider border transition-all duration-300 ${
                    index === page
                      ? "bg-black text-white border-black"
                      : "bg-white/80 text-black/50 border-black/10 hover:border-black/30"
                  }`}
                  onClick={() => onSetPage(index)}
                >
                  {index === 0
                    ? "Cover"
                    : index === totalPages
                      ? "Back"
                      : `${index}`}
                </button>
              ))}
            </div>
          </div>

          {/* Next arrow */}
          <button
            onClick={() => onSetPage(page + 1)}
            disabled={page >= totalPages}
            className="shrink-0 w-10 h-10 md:w-8 md:h-8 rounded-full border border-black/10 flex items-center justify-center hover:bg-black/5 active:bg-black/10 transition-all disabled:opacity-20 disabled:cursor-default"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50 md:w-[14px] md:h-[14px]">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function BookUI({
  title,
  page,
  totalPages,
  onSetPage,
  onMinimize,
  showControls,
}: {
  title: string;
  page: number;
  totalPages: number;
  onSetPage: (p: number) => void;
  onMinimize: () => void;
  showControls: boolean;
}) {
  return (
    <div className="pointer-events-none select-none absolute inset-0 flex flex-col justify-end">
      <div className="pointer-events-auto">
        <ControlBar
          title={title}
          page={page}
          totalPages={totalPages}
          onSetPage={onSetPage}
          toggleLabel="Minimize"
          onToggle={onMinimize}
          showNav={showControls}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Flat page-by-page viewer (mobile / minimized)                      */
/* ------------------------------------------------------------------ */

interface FaceData {
  dataUrl: string;
  label: string;
  photos: AlbumPhoto[];
  cells: GridCell[];
}

function FlatPageViewer({
  title,
  pageDataList,
  onExpand,
}: {
  title: string;
  pageDataList: PageData[];
  onExpand: () => void;
}) {
  const [faceIndex, setFaceIndex] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<AlbumPhoto | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Build ordered list of face dataUrls + photo/cell metadata
  const faces = useMemo(() => {
    const list: FaceData[] = [];
    for (let i = 0; i < pageDataList.length; i++) {
      if (pageDataList[i].front) {
        list.push({
          dataUrl: pageDataList[i].frontDataUrl,
          label: i === 0 ? "Cover" : `Page ${i * 2 - 1}`,
          photos: pageDataList[i].frontPhotos,
          cells: pageDataList[i].frontCells,
        });
      }
      if (pageDataList[i].back) {
        list.push({
          dataUrl: pageDataList[i].backDataUrl,
          label: i === pageDataList.length - 1 ? "Back Cover" : `Page ${i * 2}`,
          photos: pageDataList[i].backPhotos,
          cells: pageDataList[i].backCells,
        });
      }
    }
    return list;
  }, [pageDataList]);

  const totalFaces = faces.length;
  const lastFace = totalFaces - 1;

  // Handle click on the page image to detect which photo was clicked
  const handleImgClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      const face = faces[faceIndex];
      if (!face || !imgRef.current) return;
      const rect = imgRef.current.getBoundingClientRect();
      const photo = detectPhotoAtClick(
        e.clientX,
        e.clientY,
        rect,
        face.photos,
        face.cells
      );
      if (photo) setSelectedPhoto(photo);
    },
    [faces, faceIndex]
  );

  // Swipe support — track start position to distinguish swipe from tap
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(dx) > 50) {
        if (dx < 0 && faceIndex < lastFace) setFaceIndex((i) => i + 1);
        if (dx > 0 && faceIndex > 0) setFaceIndex((i) => i - 1);
      }
    },
    [faceIndex, lastFace]
  );

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setFaceIndex((i) => Math.min(i + 1, lastFace));
      if (e.key === "ArrowLeft") setFaceIndex((i) => Math.max(i - 1, 0));
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lastFace]);

  // Navigate directly by face index — each face is one screen in flat view
  const handleSetFace = useCallback(
    (f: number) => {
      setFaceIndex(Math.max(0, Math.min(f, lastFace)));
    },
    [lastFace]
  );

  return (
    <div className="h-screen bg-[#fafafa] flex flex-col overflow-hidden">
      {/* Page image area — fills space above control bar */}
      <div
        className="flex-1 flex items-center justify-center px-4 pt-14 md:pt-[4.5rem]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {faces[faceIndex] && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            ref={imgRef}
            src={faces[faceIndex].dataUrl}
            alt={faces[faceIndex].label}
            className="max-h-[60vh] md:max-h-[70vh] w-auto object-contain rounded-sm shadow-lg cursor-pointer"
            draggable={false}
            onClick={handleImgClick}
          />
        )}
      </div>

      {/* Shared control bar at bottom */}
      <ControlBar
        title={title}
        page={faceIndex}
        totalPages={lastFace}
        onSetPage={handleSetFace}
        toggleLabel="View 3D"
        onToggle={onExpand}
        showNav
      />

      {/* Download modal */}
      {selectedPhoto && (
        <DownloadModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile detection hook                                              */
/* ------------------------------------------------------------------ */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

/* ------------------------------------------------------------------ */
/*  Exported component                                                 */
/* ------------------------------------------------------------------ */

export default function PhotoBook({
  title,
  coverImage,
  photos,
}: {
  title: string;
  coverImage: string | null;
  photos: AlbumPhoto[];
}) {
  const [page, setPage] = useState(0);
  const [pageDataList, setPageDataList] = useState<PageData[] | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<AlbumPhoto | null>(null);

  // Book transition from shelf
  const { phase: transitionPhase, enterTransition, clearTransition } =
    useBookTransition();
  const hasTransition =
    transitionPhase === "holding" ||
    transitionPhase === "exiting" ||
    transitionPhase === "entering";

  // Canvas fade-in: start transparent when coming from transition
  const [canvasOpacity, setCanvasOpacity] = useState(hasTransition ? 0 : 1);

  // Intro animation — hold at "laying" initially, only start when transition finishes
  const [introPhase, setIntroPhase] = useState<IntroPhase>("laying");

  // View mode: flat (mobile default) or 3d (desktop default)
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<"flat" | "3d" | null>(null);

  // Set default view mode once on mount
  useEffect(() => {
    setViewMode(isMobile ? "flat" : "3d");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetPage = useCallback(
    (p: number) => setPage(Math.max(0, Math.min(p, totalPages))),
    [totalPages]
  );

  // Generate grid textures on mount
  useEffect(() => {
    const { pageDataPromises, pageCount } = groupPhotosIntoPages(
      photos,
      title,
      coverImage
    );
    setTotalPages(pageCount);
    Promise.all(pageDataPromises).then(setPageDataList);
  }, [photos, title, coverImage]);

  // When textures are ready AND we have an active transition, trigger the entry animation
  const entryTriggeredRef = useRef(false);
  useEffect(() => {
    if (!pageDataList || entryTriggeredRef.current) return;
    if (
      transitionPhase === "holding" ||
      transitionPhase === "exiting"
    ) {
      entryTriggeredRef.current = true;

      // Small delay to let the 3D canvas render a first frame
      const timer = setTimeout(() => {
        // Fade in the canvas
        setCanvasOpacity(1);
        // Signal the overlay to shrink and fade out
        enterTransition();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pageDataList, transitionPhase, enterTransition]);

  // Clean up transition when done
  useEffect(() => {
    if (transitionPhase === "done") {
      clearTransition();
    }
  }, [transitionPhase, clearTransition]);

  // Keyboard navigation (only in 3D mode when intro is done)
  useEffect(() => {
    if (viewMode !== "3d" || introPhase !== "done") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setPage((p) => Math.min(p + 1, totalPages));
      if (e.key === "ArrowLeft") setPage((p) => Math.max(p - 1, 0));
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalPages, viewMode, introPhase]);

  // Auto-open book when intro reaches "opening" phase
  useEffect(() => {
    if (introPhase === "opening" && page === 0) {
      setPage(1);
    }
  }, [introPhase, page]);

  // Handle switching to 3D
  const handleExpand = useCallback(() => {
    setIntroPhase("laying");
    setPage(0);
    setViewMode("3d");
  }, []);

  // Handle switching to flat
  const handleMinimize = useCallback(() => {
    setViewMode("flat");
  }, []);

  // Loading state — suppress when transition overlay is providing visual continuity
  if (!pageDataList) {
    if (hasTransition) {
      // Transition overlay is visible; render nothing (no flash of loading text)
      return <div className="min-h-screen bg-[#fafafa]" />;
    }
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-16">
        <p className="text-xs uppercase tracking-wider text-black/40">
          Preparing album...
        </p>
      </div>
    );
  }

  // Flat viewer mode
  if (viewMode === "flat") {
    return (
      <FlatPageViewer
        title={title}
        pageDataList={pageDataList}
        onExpand={handleExpand}
      />
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white relative">
      {/* 3D Canvas — base layer, fades in when coming from transition */}
      <div
        className="absolute inset-0 z-0"
        style={{
          opacity: canvasOpacity,
          transition: "opacity 500ms ease-out",
        }}
      >
        <Canvas
          shadows
          camera={{
            position: [CAMERA_READING.x, CAMERA_READING.y, CAMERA_READING.z],
            fov: 40,
          }}
          style={{ background: "#fafafa" }}
        >
          <Suspense fallback={null}>
            <BookScene
              pageDataList={pageDataList}
              page={page}
              introPhase={introPhase}
              onIntroPhaseChange={setIntroPhase}
              onPhotoClick={setSelectedPhoto}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* UI overlay layer — above canvas, below navbar */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        <BookUI
          title={title}
          page={page}
          totalPages={totalPages}
          onSetPage={handleSetPage}
          onMinimize={handleMinimize}
          showControls={introPhase === "done"}
        />
      </div>

      {/* Download modal */}
      {selectedPhoto && (
        <DownloadModal
          photo={selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </div>
  );
}
