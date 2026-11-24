"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Friendly 500 inside the site (header/footer stay). Language follows the URL. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const en = usePathname()?.startsWith("/en");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main id="main" className="container-x grid min-h-[70vh] place-items-center py-20 text-center">
      <div>
        <p className="display text-[clamp(5rem,18vw,12rem)] text-red-600">500</p>
        <h1 className="display mt-2 text-3xl md:text-5xl">{en ? "Something went wrong." : "Bir şeyler ters gitti."}</h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-muted">{en ? "Please try again in a moment." : "Lütfen birazdan tekrar deneyin."}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="inline-flex h-14 items-center rounded-full bg-red-600 px-7 font-extrabold text-white hover:bg-red-700">
            {en ? "Try again" : "Tekrar dene"}
          </button>
          <a href={en ? "/en" : "/tr"} className="inline-flex h-14 items-center rounded-full border-2 border-current px-7 font-extrabold">
            {en ? "Home page" : "Ana sayfa"}
          </a>
        </div>
      </div>
    </main>
  );
}
