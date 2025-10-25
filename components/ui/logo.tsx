import Link from "next/link";
import Image from "next/image";

export default function Logo() {
  return (
    <Link href="/" className="inline-flex" aria-label="Creatooors">
      <Image
        src="/images/creatooors-logo.svg"
        alt="Creatooors Logo"
        width={120}
        height={40}
        className="h-10 w-30"
      />
    </Link>
  );
}
