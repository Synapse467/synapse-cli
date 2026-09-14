import Image from "next/image";
import Link from "next/link";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      className={`brand ${light ? "brand-light" : ""}`}
      href="/"
      aria-label="Synapse home"
    >
      <span className="brand-icon">
        <Image src="/logo.png" width={40} height={40} alt="" priority />
      </span>
      synapse<span className="brand-period">®</span>
    </Link>
  );
}
