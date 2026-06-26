"use client";

import { useCallback, useEffect, useState } from "react";

export function Gallery({
  images,
  title,
}: {
  images: { id: string; url: string }[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const cover = images[active]?.url ?? images[0]?.url;

  const prev = useCallback(
    () => setActive((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );
  const next = useCallback(
    () => setActive((i) => (i + 1) % images.length),
    [images.length],
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, prev, next]);

  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={title}
            onClick={() => setLightbox(true)}
            className="aspect-video w-full cursor-zoom-in object-cover"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center text-zinc-400">
            Sin fotos
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.url}
              alt={`${title} foto ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-20 w-28 cursor-pointer rounded-lg object-cover ${
                i === active ? "ring-2 ring-emerald-700" : ""
              }`}
            />
          ))}
        </div>
      )}

      {/* Visor a pantalla completa */}
      {lightbox && cover && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25"
            aria-label="Cerrar"
          >
            ✕
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                className="absolute left-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25"
                aria-label="Anterior"
              >
                ‹
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                className="absolute right-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-3xl text-white hover:bg-white/25"
                aria-label="Siguiente"
              >
                ›
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt={title}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] object-contain"
          />

          {images.length > 1 && (
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
              {active + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
