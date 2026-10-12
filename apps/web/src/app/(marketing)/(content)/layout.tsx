import type { ReactNode } from "react";
import { PageFrame } from "@/components/product/page";

export default function ContentLayout({ children }: { children: ReactNode }) {
  return <PageFrame>{children}</PageFrame>;
}
