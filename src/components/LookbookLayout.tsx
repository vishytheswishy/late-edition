"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

// Dynamically import the 3D component to avoid SSR issues
const Magazine3D = dynamic(() => import("./Magazine3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider text-black/40">
          Loading 3D Render...
        </p>
      </div>
    </div>
  ),
});

type CellType = {
  type: "image" | "letter";
  letter?: string;
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
  imageSrc?: string;
};

// Dynamically build list of webp files from public/lookbook folder
const LOOKBOOK_IMAGES = [
  "DSC00086.webp",
  "DSC00279.webp",
  "DSC00303.webp",
  "DSC00330.webp",
  "DSC08894.webp",
  "DSC09047.webp",
  "DSC09228.webp",
  "DSC09306.webp",
  "DSC09675.webp",
  "DSC09702.webp",
  "DSC09754.webp",
  "DSC09797.webp",
  "DSC09968.webp",
  "LE+BEACH+TEST-3.webp",
];

// Generate WEBP_FILES with full paths
const WEBP_FILES = LOOKBOOK_IMAGES.map((image) => `/lookbook/${image}`);

// Shuffle array function
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function LookbookLayout() {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);
  const [shuffledImages, setShuffledImages] = useState<string[]>(WEBP_FILES);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Shuffle images only on client side after hydration
    setShuffledImages(shuffleArray(WEBP_FILES));
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
    // Trigger fade-in after a small delay
    const fadeInTimer = setTimeout(() => setIsLoaded(true), 100);
    
    return () => {
      window.removeEventListener("resize", checkMobile);
      clearTimeout(fadeInTimer);
    };
  }, []);
  
  // Generate random delay function for each image cell
  const getRandomImageDelay = (imageIndex: number): number => {
    // Use imageIndex as seed to generate consistent but random delays per cell
    // This ensures each image gets a unique random delay
    const seed = imageIndex * 73856093;
    const hash = Math.sin(seed) * 10000;
    return ((hash - Math.floor(hash)) * 2000 + 100);
  };

  const handleImageError = (src: string) => {
    setImageErrors((prev) => ({ ...prev, [src]: true }));
  };

  // Define the patchwork layout with fewer images and "DONT BE LATE" spelling
  // Letters positioned to read left to right: D-O-N-T (row 1), B-E (row 2), L-A-T-E (row 3)
  // Images alternate in size but don't overlap - carefully positioned to avoid conflicts
  // Randomly assign webp images to image cells
  const imageCells = [
    // Row 1: D O N T
    { colStart: 1, colEnd: 2, rowStart: 1, rowEnd: 2 }, // Small
    { colStart: 3, colEnd: 5, rowStart: 1, rowEnd: 2 }, // Medium wide (2x1) - avoid letter overlap
    { colStart: 7, colEnd: 9, rowStart: 1, rowEnd: 2 }, // Medium wide (2x1) - avoids 'T' at col 9
    { colStart: 10, colEnd: 11, rowStart: 1, rowEnd: 2 }, // Small
    
    // Row 2: B E
    { colStart: 1, colEnd: 2, rowStart: 2, rowEnd: 4 }, // Medium tall (1x2)
    { colStart: 5, colEnd: 6, rowStart: 2, rowEnd: 3 }, // Small
    { colStart: 8, colEnd: 10, rowStart: 2, rowEnd: 4 }, // Large (2x2 across rows 2-3 only)
    { colStart: 10, colEnd: 11, rowStart: 2, rowEnd: 3 }, // Small
    
    // Row 3: L A T E
    { colStart: 2, colEnd: 3, rowStart: 3, rowEnd: 4 }, // Small
    { colStart: 5, colEnd: 7, rowStart: 3, rowEnd: 4 }, // Medium wide (2x1)
    { colStart: 9, colEnd: 10, rowStart: 3, rowEnd: 4 }, // Small
    
    // Row 4: Filler images
    { colStart: 1, colEnd: 3, rowStart: 4, rowEnd: 5 }, // Medium wide (2x1)
    { colStart: 3, colEnd: 5, rowStart: 4, rowEnd: 5 }, // Medium wide (2x1)
    { colStart: 5, colEnd: 7, rowStart: 4, rowEnd: 5 }, // Medium wide (2x1)
    { colStart: 7, colEnd: 9, rowStart: 4, rowEnd: 5 }, // Medium wide (2x1)
    { colStart: 9, colEnd: 11, rowStart: 4, rowEnd: 5 }, // Medium wide (2x1)
  ];

  // Assign random images to cells
  const cellsWithImages = imageCells.map((cell, idx) => ({
    ...cell,
    imageSrc: shuffledImages[idx % shuffledImages.length],
  }));

  const cells: CellType[] = [
    // Row 1: D O N T
    { type: "image", imageSrc: cellsWithImages[0].imageSrc, colStart: 1, colEnd: 2, rowStart: 1, rowEnd: 2 },
    { type: "letter", letter: "D", colStart: 2, colEnd: 3, rowStart: 1, rowEnd: 2 },
    { type: "image", imageSrc: cellsWithImages[1].imageSrc, colStart: 3, colEnd: 5, rowStart: 1, rowEnd: 2 },
    { type: "letter", letter: "O", colStart: 5, colEnd: 6, rowStart: 1, rowEnd: 2 },
    { type: "letter", letter: "N", colStart: 6, colEnd: 7, rowStart: 1, rowEnd: 2 },
    { type: "image", imageSrc: cellsWithImages[2].imageSrc, colStart: 7, colEnd: 9, rowStart: 1, rowEnd: 2 },
    { type: "letter", letter: "T", colStart: 9, colEnd: 10, rowStart: 1, rowEnd: 2 },
    { type: "image", imageSrc: cellsWithImages[3].imageSrc, colStart: 10, colEnd: 11, rowStart: 1, rowEnd: 2 },
    
    // Row 2: B E + fill gaps
    { type: "image", imageSrc: cellsWithImages[4].imageSrc, colStart: 1, colEnd: 2, rowStart: 2, rowEnd: 4 },
    { type: "letter", letter: "B", colStart: 2, colEnd: 3, rowStart: 2, rowEnd: 3 },
    { type: "image", imageSrc: cellsWithImages[5].imageSrc, colStart: 3, colEnd: 4, rowStart: 2, rowEnd: 3 },
    { type: "image", imageSrc: cellsWithImages[6].imageSrc, colStart: 4, colEnd: 5, rowStart: 2, rowEnd: 3 },
    { type: "image", imageSrc: cellsWithImages[7].imageSrc, colStart: 5, colEnd: 6, rowStart: 2, rowEnd: 3 },
    { type: "letter", letter: "E", colStart: 6, colEnd: 7, rowStart: 2, rowEnd: 3 },
    { type: "image", imageSrc: cellsWithImages[8].imageSrc, colStart: 7, colEnd: 8, rowStart: 2, rowEnd: 3 },
    { type: "image", imageSrc: cellsWithImages[9].imageSrc, colStart: 8, colEnd: 10, rowStart: 2, rowEnd: 4 },
    { type: "image", imageSrc: cellsWithImages[10].imageSrc, colStart: 10, colEnd: 11, rowStart: 2, rowEnd: 3 },
    
    // Row 3: L A T E + fill gaps
    { type: "image", imageSrc: cellsWithImages[11].imageSrc, colStart: 2, colEnd: 3, rowStart: 3, rowEnd: 4 },
    { type: "letter", letter: "L", colStart: 3, colEnd: 4, rowStart: 3, rowEnd: 4 },
    { type: "letter", letter: "A", colStart: 4, colEnd: 5, rowStart: 3, rowEnd: 4 },
    { type: "image", imageSrc: cellsWithImages[12].imageSrc, colStart: 5, colEnd: 6, rowStart: 3, rowEnd: 4 },
    { type: "letter", letter: "T", colStart: 6, colEnd: 7, rowStart: 3, rowEnd: 4 },
    { type: "image", imageSrc: cellsWithImages[13].imageSrc, colStart: 7, colEnd: 8, rowStart: 3, rowEnd: 4 },
    { type: "image", imageSrc: cellsWithImages[0].imageSrc, colStart: 9, colEnd: 10, rowStart: 3, rowEnd: 4 },
    { type: "letter", letter: "E", colStart: 10, colEnd: 11, rowStart: 3, rowEnd: 4 },
    
    // Row 4: Filler images
    { type: "image", imageSrc: cellsWithImages[11].imageSrc, colStart: 1, colEnd: 3, rowStart: 4, rowEnd: 5 },
    { type: "image", imageSrc: cellsWithImages[12].imageSrc, colStart: 3, colEnd: 5, rowStart: 4, rowEnd: 5 },
    { type: "image", imageSrc: cellsWithImages[13].imageSrc, colStart: 5, colEnd: 7, rowStart: 4, rowEnd: 5 },
    { type: "image", imageSrc: cellsWithImages[14].imageSrc, colStart: 7, colEnd: 9, rowStart: 4, rowEnd: 5 },
    { type: "image", imageSrc: cellsWithImages[15].imageSrc, colStart: 9, colEnd: 11, rowStart: 4, rowEnd: 5 },
  ];


  return (
    <div className="flex h-full w-full bg-white flex-col md:flex-row">
      <div className="relative flex w-full h-full flex-col md:flex-row items-stretch">
        {/* 3D Render of Magazine - full height on mobile, 1/3 on desktop */}
        <div 
          className="relative w-full md:w-1/3 h-full md:h-full flex-shrink-0 border-b md:border-b-0 md:border-r border-black/10 transition-opacity duration-500"
          style={{ 
            opacity: isLoaded ? 1 : 0,
            transitionDelay: isLoaded ? '0ms' : '0ms'
          }}
        >
          <div className="relative h-full w-full overflow-hidden bg-gray-50 cursor-pointer">
            <Magazine3D frontCover="/cover/front.jpg" backCover="/cover/back.jpg" />
            {/* Issue number overlay */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10 pointer-events-none">
              <p className="text-xs md:text-sm uppercase tracking-wider text-black font-medium">
                ISSUE 002
              </p>
            </div>
          </div>
        </div>

        {/* DONT BE LATE with image patchwork - responsive grid */}
        <div 
          className="relative grid grid-cols-5 md:grid-cols-10 auto-rows-fr md:grid-rows-4 gap-0 flex-1 h-full p-0 overflow-y-auto"
        >
          {cells.map((cell, index) => {
            // Get the image index among all images to apply random delay
            const imageIndex = cells.slice(0, index).filter(c => c.type === "image").length;
            if (cell.type === "letter") {
              return (
                <div
                  key={`letter-${index}`}
                  className="flex items-center justify-center bg-white border border-black"
                  style={{
                    gridColumn: isMobile ? `span 1` : `${cell.colStart} / ${cell.colEnd}`,
                    gridRow: isMobile ? `span 1` : `${cell.rowStart} / ${cell.rowEnd}`,
                  }}
                >
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-normal tracking-tight text-black">
                    {cell.letter}
                  </span>
                </div>
              );
            }

            const imageSrc = cell.imageSrc || "";
            
            return (
              <div
                key={`image-${index}`}
                className="relative overflow-hidden border border-black bg-gray-50 transition-opacity duration-500"
                style={{
                  gridColumn: isMobile ? `span 1` : `${cell.colStart} / ${cell.colEnd}`,
                  gridRow: isMobile ? `span 1` : `${cell.rowStart} / ${cell.rowEnd}`,
                  opacity: isLoaded ? 1 : 0,
                  transitionDelay: isLoaded ? `${getRandomImageDelay(imageIndex)}ms` : '0ms',
                }}
              >
                {imageErrors[imageSrc] ? (
                  <div className="flex h-full w-full items-center justify-center">
                    <p className="text-[6px] md:text-[8px] uppercase tracking-wider text-black/30">
                      Image
                    </p>
                  </div>
                ) : (
                  <Image
                    src={imageSrc}
                    alt={`Lookbook image ${index + 1}`}
                    fill
                    className="object-cover w-full h-full"
                    onError={() => handleImageError(imageSrc)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
