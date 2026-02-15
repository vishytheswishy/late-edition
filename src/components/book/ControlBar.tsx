"use client";

export function ControlBar({
  title,
  page,
  totalPages,
  onSetPage,
  toggleLabel,
  onToggle,
  showNav,
  backLabel,
  onBack,
}: {
  title: string;
  page: number;
  totalPages: number;
  onSetPage: (p: number) => void;
  toggleLabel?: string;
  onToggle?: () => void;
  showNav: boolean;
  backLabel?: string;
  onBack?: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg w-[calc(100%-2rem)] rounded-2xl bg-white/40 backdrop-blur-2xl border border-white/50 shadow-[0_2px_20px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] px-4 py-3 md:py-4 flex flex-col shrink-0">
      {/* Row 1: Back, title, toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack ?? onToggle}
          className="text-xs md:text-[10px] uppercase tracking-wider text-black/40 hover:text-black/70 transition-colors"
        >
          &larr; {backLabel ?? "Back"}
        </button>
        <h1 className="text-xs font-light tracking-tight text-black/60 truncate mx-3">
          {title}
        </h1>
        {toggleLabel && onToggle ? (
          <button
            onClick={onToggle}
            className="text-xs md:text-[10px] uppercase tracking-wider text-black/40 hover:text-black/70 transition-colors whitespace-nowrap"
          >
            {toggleLabel}
          </button>
        ) : (
          <div className="w-12" />
        )}
      </div>

      {/* Row 2: navigation — animated expand */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          showNav ? "max-h-24 opacity-100 mt-2.5" : "max-h-0 opacity-0 mt-0"
        }`}
      >
        {/* Mobile: compact prev / label / next */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => onSetPage(page - 1)}
            disabled={page <= 0}
            className="shrink-0 w-10 h-10 rounded-full border border-white/30 bg-white/20 flex items-center justify-center hover:bg-white/40 active:bg-white/50 transition-all disabled:opacity-20 disabled:cursor-default"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <p className="flex-1 text-center text-xs uppercase tracking-wider text-black/50">
            {page === 0
              ? "Cover"
              : page === totalPages
                ? "Back"
                : `Page ${page} of ${totalPages - 1}`}
          </p>

          <button
            onClick={() => onSetPage(page + 1)}
            disabled={page >= totalPages}
            className="shrink-0 w-10 h-10 rounded-full border border-white/30 bg-white/20 flex items-center justify-center hover:bg-white/40 active:bg-white/50 transition-all disabled:opacity-20 disabled:cursor-default"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Desktop: prev arrow, page pills, next arrow */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => onSetPage(page - 1)}
            disabled={page <= 0}
            className="shrink-0 w-8 h-8 rounded-full border border-white/30 bg-white/20 flex items-center justify-center hover:bg-white/40 active:bg-white/50 transition-all disabled:opacity-20 disabled:cursor-default"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className="flex-1 overflow-auto flex justify-center">
            <div className="flex items-center gap-1.5 max-w-full overflow-auto">
              {Array.from({ length: totalPages + 1 }).map((_, index) => (
                <button
                  key={index}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider border transition-all duration-300 ${
                    index === page
                      ? "bg-black text-white border-black"
                      : "bg-white/30 text-black/50 border-white/40 hover:border-black/30"
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

          <button
            onClick={() => onSetPage(page + 1)}
            disabled={page >= totalPages}
            className="shrink-0 w-8 h-8 rounded-full border border-white/30 bg-white/20 flex items-center justify-center hover:bg-white/40 active:bg-white/50 transition-all disabled:opacity-20 disabled:cursor-default"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-black/50">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function BookUI({
  title,
  page,
  totalPages,
  onSetPage,
  onMinimize,
  onBack,
  showControls,
}: {
  title: string;
  page: number;
  totalPages: number;
  onSetPage: (p: number) => void;
  onMinimize: () => void;
  onBack: () => void;
  showControls: boolean;
}) {
  return (
    <div className="pointer-events-none select-none absolute inset-0 flex flex-col justify-end pb-4 md:pb-6">
      <div className="pointer-events-auto">
        <ControlBar
          title={title}
          page={page}
          totalPages={totalPages}
          onSetPage={onSetPage}
          toggleLabel="Minimize"
          onToggle={onMinimize}
          showNav={showControls}
          backLabel="Albums"
          onBack={onBack}
        />
      </div>
    </div>
  );
}
