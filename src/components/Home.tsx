"use client";

import LookbookLayout from "./LookbookLayout";
import Events from "./Events";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <section className="h-screen bg-white flex flex-col overflow-hidden pt-24 md:pt-28">
        <div className="flex-1 overflow-hidden">
          <LookbookLayout />
        </div>
      </section>
      <Events />
    </div>
  );
}

