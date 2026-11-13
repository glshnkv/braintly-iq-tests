import Link from "next/link";
import { BRAND } from "@/config/brand";

/** Solid ink mark with a spiral, like a fold of the brain: the Braintly mark. */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className={className}>
      <rect width="32" height="32" rx="10" fill="var(--ink)" />
      <path
        d="M16 8.5 C 11 8.5, 8.6 12.4, 8.9 16.4 C 9.2 20.6, 12.1 23.6, 16 23.4 M16 12.4 C 13.8 12.4, 12.6 14.2, 12.8 16.2 C 13 18.4, 14.4 19.6, 16.2 19.5 C 18.3 19.4, 19.4 17.7, 19.3 15.8 M23.2 18.6 C 23.9 13.3, 21.2 9.2, 16 8.5"
        fill="none"
        stroke="var(--orange)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ href }: { href: string }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5 rounded-xl">
      <LogoMark className="size-8 transition-transform duration-300 group-hover:-rotate-6" />
      <span className="text-[18px] font-extrabold tracking-[-0.04em]">{BRAND.name.toLowerCase()}</span>
    </Link>
  );
}
