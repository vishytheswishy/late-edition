"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Group, Vector3 } from "three";
import { easing } from "maath";
import type { AlbumPhoto } from "@/lib/albums";
import type { IntroPhase, PageData } from "./types";
import { CAMERA_READING, BOOK_READING_ROT_X } from "./constants";
import Book from "./Book";

const LOOK_AT_TARGET = new Vector3(0, -0.5, -0.6);
const BOOK_READING_Y = -0.5;
const BOOK_READING_Z = -0.6;

export default function BookScene({
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
  const lookAtRef = useRef(LOOK_AT_TARGET.clone());

  const { camera, viewport } = useThree();

  // Snap camera AND book to their final reading positions on mount.
  // The blink overlay is fully black at this point so the user sees no jump.
  // This eliminates any zoom shift — the only animation is the cover opening.
  const didMountSnap = useRef(false);
  useEffect(() => {
    if (!didMountSnap.current) {
      didMountSnap.current = true;
      camera.position.set(CAMERA_READING.x, CAMERA_READING.y, CAMERA_READING.z);
      lookAtRef.current.copy(LOOK_AT_TARGET);
      camera.lookAt(LOOK_AT_TARGET);
      if (bookGroupRef.current) {
        bookGroupRef.current.position.y = BOOK_READING_Y;
        bookGroupRef.current.position.z = BOOK_READING_Z;
        bookGroupRef.current.rotation.x = BOOK_READING_ROT_X;
      }
    }
  }, [camera]);

  // Reset when introPhase resets to "laying" (re-opening a different book)
  useEffect(() => {
    if (currentPhaseRef.current !== introPhase) {
      currentPhaseRef.current = introPhase;
      phaseStartTime.current = Date.now();
      if (introPhase === "laying") {
        // Snap everything to reading position — blink hides the jump
        camera.position.set(CAMERA_READING.x, CAMERA_READING.y, CAMERA_READING.z);
        lookAtRef.current.copy(LOOK_AT_TARGET);
        camera.lookAt(LOOK_AT_TARGET);
        if (bookGroupRef.current) {
          bookGroupRef.current.position.y = BOOK_READING_Y;
          bookGroupRef.current.position.z = BOOK_READING_Z;
          bookGroupRef.current.rotation.x = BOOK_READING_ROT_X;
        }
      }
    }
  }, [introPhase, camera]);

  useFrame((_, delta) => {
    if (!bookGroupRef.current) return;

    const phase = currentPhaseRef.current;
    const elapsed = (Date.now() - phaseStartTime.current) / 1000;

    // Hold camera and book at reading position (already snapped on mount)
    easing.damp(camera.position, "x", CAMERA_READING.x, 0.15, delta);
    easing.damp(camera.position, "y", CAMERA_READING.y, 0.15, delta);
    easing.damp(camera.position, "z", CAMERA_READING.z, 0.15, delta);
    camera.lookAt(lookAtRef.current);
    easing.damp(bookGroupRef.current.rotation, "x", BOOK_READING_ROT_X, 0.15, delta);
    easing.damp(bookGroupRef.current.position, "y", BOOK_READING_Y, 0.15, delta);
    easing.damp(bookGroupRef.current.position, "z", BOOK_READING_Z, 0.15, delta);

    if (phase === "laying") {
      // Book is already at reading position — brief pause then open the cover
      if (elapsed > 0.15) {
        currentPhaseRef.current = "opening";
        phaseStartTime.current = Date.now();
        onIntroPhaseChange("opening");
      }
    } else if (phase === "opening") {
      if (elapsed > 1.0) {
        currentPhaseRef.current = "done";
        onIntroPhaseChange("done");
      }
    }
  });

  const responsiveScale = useMemo(() => {
    const base = 2.2;
    const widthScale = viewport.width / 3.0;
    const heightScale = viewport.height / 2.2;
    const scale = Math.min(base, widthScale, heightScale);
    return Math.max(0.75, scale);
  }, [viewport.width, viewport.height]);

  return (
    <group
      ref={bookGroupRef}
      rotation-x={BOOK_READING_ROT_X}
      scale={responsiveScale}
      position-y={BOOK_READING_Y}
      position-z={BOOK_READING_Z}
    >
      <Book pageDataList={pageDataList} page={page} onPhotoClick={onPhotoClick} />
    </group>
  );
}
