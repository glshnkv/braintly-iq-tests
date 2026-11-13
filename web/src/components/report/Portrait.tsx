"use client";

import Image from "next/image";
import { useState } from "react";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
}

/**
 * Round black-and-white photo of a famous person (public/portraits/<id>.webp, public-domain
 * sources, see docs/05-photo-credits.md), or a monogram if the file is missing.
 */
export function Portrait({ id, name, className = "size-11" }: { id: string; name: string; className?: string }) {
  const [missing, setMissing] = useState(false);
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-gray-soft ${className}`}>
      {missing ? (
        <span className="text-[13px] font-extrabold tracking-[-0.02em] text-ink/70">{initials(name)}</span>
      ) : (
        <Image src={`/portraits/${id}.webp`} alt="" fill sizes="56px" onError={() => setMissing(true)} className="object-cover grayscale" />
      )}
    </span>
  );
}
