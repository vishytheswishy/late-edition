import {
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  MeshStandardMaterial,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH, PAGE_SEGMENTS, SEGMENT_WIDTH } from "./constants";

export const pageGeometry = new BoxGeometry(
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

export const whiteColor = new Color("white");

export const pageMaterials = [
  new MeshStandardMaterial({ color: whiteColor, roughness: 0.5 }),
  new MeshStandardMaterial({ color: "#222", roughness: 0.9 }),
  new MeshStandardMaterial({ color: whiteColor, roughness: 0.5 }),
  new MeshStandardMaterial({ color: whiteColor, roughness: 0.5 }),
];
