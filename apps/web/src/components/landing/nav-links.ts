import { anchor, sections } from "@/lib/routes";

export const navLinks = [
  { label: "Product", href: anchor(sections.product) },
  { label: "How it works", href: anchor(sections.howItWorks) },
  { label: "Network", href: anchor(sections.network) },
  { label: "Developers", href: anchor(sections.developers) },
  { label: "FAQ", href: anchor(sections.faq) },
] as const;
