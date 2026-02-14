import type { CanvasTexture } from "three";
import type { AlbumPhoto } from "@/lib/albums";

export interface GridCell {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PageData {
  front: CanvasTexture | null;
  back: CanvasTexture | null;
  frontDataUrl: string;
  backDataUrl: string;
  frontPhotos: AlbumPhoto[];
  backPhotos: AlbumPhoto[];
  frontCells: GridCell[];
  backCells: GridCell[];
}

export interface FaceData {
  dataUrl: string;
  label: string;
  photos: AlbumPhoto[];
  cells: GridCell[];
}

export type IntroPhase = "laying" | "opening" | "done";
