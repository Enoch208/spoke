import Image from "next/image";
import mark from "@/assets/brand/spoke-mark.webp";

export function BrandMark({ height, priority = false }: { height: number; priority?: boolean }) {
  return (
    <Image
      src={mark}
      alt=""
      height={height}
      width={Math.round((height * mark.width) / mark.height)}
      priority={priority}
      className="max-w-none"
    />
  );
}
