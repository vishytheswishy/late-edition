"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  Bone,
  Group,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
} from "three";
import { easing } from "maath";
import { degToRad } from "three/src/math/MathUtils.js";
import type { AlbumPhoto } from "@/lib/albums";
import type { GridCell, PageData } from "./types";
import {
  EASING_FACTOR,
  EASING_FACTOR_FOLD,
  INSIDE_CURVE_STRENGTH,
  OUTSIDE_CURVE_STRENGTH,
  TURNING_CURVE_STRENGTH,
  PAGE_SEGMENTS,
  PAGE_DEPTH,
  SEGMENT_WIDTH,
  CANVAS_W,
  CANVAS_H,
} from "./constants";
import { pageGeometry, pageMaterials, whiteColor } from "./geometry";
import { createRoughnessTexture } from "./textures";

export default function Page({
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
    (e: {
      stopPropagation: () => void;
      uv?: { x: number; y: number };
      face?: { materialIndex: number };
    }) => {
      e.stopPropagation();
      if (!onPhotoClick || !e.uv || !e.face) return;

      const { x: u, y: v } = e.uv;
      const materialIndex = e.face.materialIndex;

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

  // Suppress the unused-vars warning for the rest-spread props
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _rest = props;

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
