import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[65svh] max-w-3xl flex-col items-center justify-center px-5 py-20 text-center sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9a5f42]">
        Not found
      </p>
      <h1 className="mt-4 text-4xl font-medium tracking-[-0.04em] sm:text-6xl">
        This piece is no longer here.
      </h1>
      <p className="mt-5 max-w-lg text-base leading-7 text-[#20211d]/60">
        The product or collection may have moved, or it may not be available
        for public browsing.
      </p>
      <Link
        className="mt-8 inline-flex min-h-12 items-center bg-[#20211d] px-6 text-sm font-medium text-white hover:bg-[#34463b]"
        href="/shop"
      >
        Return to the shop
      </Link>
    </main>
  );
}
