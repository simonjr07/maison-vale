"use client";

import Image from "next/image";
import { useState } from "react";

type GalleryImage = { url: string; alt: string };

export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  if (!activeImage) return null;

  function move(direction: -1 | 1) {
    setActiveIndex((current) => (current + direction + images.length) % images.length);
  }

  return (
    <section aria-label={`${productName} image gallery`}>
      <div className="relative aspect-[4/5] overflow-hidden bg-[#ded7cb]">
        <Image
          alt={activeImage.alt}
          className="object-cover"
          fill
          preload
          sizes="(max-width: 1024px) 100vw, 58vw"
          src={activeImage.url}
        />
        {images.length > 1 ? (
          <div className="absolute inset-x-3 bottom-3 flex justify-between">
            <button className="min-h-11 min-w-11 rounded-full bg-[#f7f2e8]/90 text-xl shadow-sm backdrop-blur-sm hover:bg-white" onClick={() => move(-1)} type="button" aria-label="Show previous product image">←</button>
            <button className="min-h-11 min-w-11 rounded-full bg-[#f7f2e8]/90 text-xl shadow-sm backdrop-blur-sm hover:bg-white" onClick={() => move(1)} type="button" aria-label="Show next product image">→</button>
          </div>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-3" aria-label="Choose a product image">
          {images.map((image, index) => (
            <button
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-pressed={activeIndex === index}
              className="relative aspect-[4/5] overflow-hidden border-2 border-transparent bg-[#ded7cb] aria-pressed:border-[#20211d]"
              key={image.url}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <Image alt="" className="object-cover" fill sizes="120px" src={image.url} />
            </button>
          ))}
        </div>
      ) : null}
      <p className="sr-only" aria-live="polite">Image {activeIndex + 1} of {images.length}: {activeImage.alt}</p>
    </section>
  );
}
