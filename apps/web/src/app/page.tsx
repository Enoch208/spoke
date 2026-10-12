import { Benefits } from "@/components/landing/benefits";
import { BuiltWith } from "@/components/landing/built-with";
import { Hero } from "@/components/landing/hero";
import { Layers } from "@/components/landing/layers";
import { Proof } from "@/components/landing/proof";
import { Questions } from "@/components/landing/questions";
import { Rails } from "@/components/landing/rails";
import { Showcase } from "@/components/landing/showcase";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Showcase />
        <Benefits />
        <BuiltWith />
        <Layers />
        <Questions />
        <Rails />
        <Proof />
      </main>
      <SiteFooter />
    </>
  );
}
