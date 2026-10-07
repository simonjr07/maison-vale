import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-[#20211d]/15 bg-[#f3efe8]">
      <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-6 sm:px-8 lg:px-10">
        <Link
          className="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-[0.22em] sm:text-sm sm:tracking-[0.3em]"
          href="/"
        >
          Maison Vale
        </Link>
        <nav aria-label="Primary navigation">
          <ul className="flex items-center sm:gap-4">
            <li>
              <Link
                className="inline-flex min-h-11 items-center px-2 text-[13px] transition-colors hover:text-[#9a5f42] sm:px-3 sm:text-sm"
                href="/shop"
              >
                Shop
              </Link>
            </li>
            <li>
              <Link
                className="inline-flex min-h-11 items-center px-2 text-[13px] transition-colors hover:text-[#9a5f42] sm:px-3 sm:text-sm"
                href="/#collections"
              >
                Collections
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
