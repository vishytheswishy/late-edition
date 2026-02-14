import Image from "next/image";
import { getStaffMembers } from "@/lib/staff";
import StaffSection from "@/components/StaffSection";

export default async function AboutPage() {
  const members = await getStaffMembers();

  return (
    <div className="min-h-screen bg-white pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-normal tracking-tight mb-12">About</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-start">
            <div className="space-y-12">
              <section>
                <h2 className="text-2xl font-normal tracking-tight mb-4">Who we are</h2>
                <p className="text-sm md:text-base text-black/80 leading-relaxed">
                  Late Edition is an Orange County based publication that highlights local creatives and businesses across multiple disciplines. Founded in 2024, the publication aims to showcase the many talented people who call Orange County their home. Centered around Fashion, Food, Art, Music, and more, Late Edition serves as a beacon for people who enjoy meaningful physical media.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-normal tracking-tight mb-6">Stockists</h2>
                <ul className="space-y-3 text-sm md:text-base text-black/80">
                  <li>Collegium - Costa Mesa</li>
                  <li>Hidn Showroom - Costa Mesa</li>
                  <li>The Inconvenience Store - Costa Mesa</li>
                  <li>Open Air - Los Angeles</li>
                  <li>Swish Studios - Irvine</li>
                  <li>White Sparrow Coffee - Tustin</li>
                </ul>
              </section>
            </div>

            <div className="relative w-full aspect-[4/3]">
              <Image
                src="/about/cover.png"
                alt="Late Edition"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          <StaffSection members={members} />
        </div>
      </main>
    </div>
  );
}
