"use client";

export default function Events() {
  return (
    <section id="events" className="w-full min-h-screen bg-white py-16 md:py-24 px-4 md:px-6 lg:px-8 scroll-mt-20">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-4xl uppercase tracking-wider text-black mb-8 md:mb-12">
          Events
        </h2>
        <div className="space-y-8 md:space-y-12">
          {/* Placeholder for events - can be replaced with actual event data */}
          <div className="border-b border-black/10 pb-8">
            <p className="text-sm md:text-base uppercase tracking-wider text-black/60">
              Upcoming events will be listed here
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

