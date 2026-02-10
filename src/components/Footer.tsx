import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-black/10 bg-white">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[10px] md:text-xs text-black/40 tracking-wide">
            &copy; {year} Late Edition. All rights reserved.
          </p>
          <Link
            href="/privacy"
            className="text-[10px] md:text-xs text-black/40 tracking-wide hover:text-black/60 transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
