"use client";

import { useEffect, useRef, useState } from "react";
import type { AlbumPhoto } from "@/lib/albums";
import type { PageData } from "./types";
import Page from "./Page";

export default function Book({
  pageDataList,
  page,
  onPhotoClick,
}: {
  pageDataList: PageData[];
  page: number;
  onPhotoClick?: (photo: AlbumPhoto) => void;
}) {
  const [delayedPage, setDelayedPage] = useState(page);
  const animRef = useRef({ target: page, current: page });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    animRef.current.target = page;
    clearTimeout(timeoutRef.current);

    const step = () => {
      const { target, current } = animRef.current;
      if (current === target) return;

      const next = target > current ? current + 1 : current - 1;
      animRef.current.current = next;
      setDelayedPage(next);

      const remaining = Math.abs(animRef.current.target - next);
      if (remaining > 0) {
        timeoutRef.current = setTimeout(step, remaining > 2 ? 50 : 150);
      }
    };

    step();
    return () => clearTimeout(timeoutRef.current);
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
