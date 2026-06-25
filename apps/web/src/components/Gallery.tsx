"use client";

import { useState } from "react";

export function Gallery({
  images,
  title,
}: {
  images: { id: string; url: string }[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const cover = images[active]?.url ?? images[0]?.url;

  return (
    <div>
      <div className="overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={title}
            className="aspect-video w-full object-cover"
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
    </div>
  );
}
