export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-[#f4f1ec] px-6 py-8 text-[#24231f] sm:px-10 sm:py-10">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[#24231f]/15 pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em]">Maison Vale</p>
          <p className="text-xs uppercase tracking-[0.22em] text-[#24231f]/60">Portfolio project 04</p>
        </header>
        <section className="flex flex-1 flex-col justify-center py-24 sm:py-32">
          <p className="mb-6 text-xs font-medium uppercase tracking-[0.24em] text-[#8a5a3b]">Foundation stage</p>
          <h1 className="max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.06em] sm:text-7xl lg:text-8xl">Thoughtful essentials, being built with care.</h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-[#24231f]/70 sm:text-xl">Maison Vale is a premium lifestyle e-commerce portfolio application. The engineering foundation is in place; commerce functionality is under development.</p>
        </section>
        <footer className="flex flex-col gap-3 border-t border-[#24231f]/15 pt-5 text-xs uppercase tracking-[0.18em] text-[#24231f]/60 sm:flex-row sm:items-center sm:justify-between">
          <p>Next.js · React · TypeScript</p>
          <p>Catalogue coming in a later phase</p>
        </footer>
      </div>
    </main>
  );
}
