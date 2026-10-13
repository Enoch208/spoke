"use client";

import { Search01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useState } from "react";
import { ProductPage } from "@/components/product/page";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { fill } from "@/lib/copy";
import { useClientQuery } from "@/lib/query/use-client";
import { routes } from "@/lib/routes";
import { SearchField } from "../explore/toolbar";
import { Callout } from "../shared/callout";
import { ArticleGroup, TopicGrid } from "./article-list";
import { matchArticles, topics } from "./articles";
import { ContactForm } from "./contact-form";
import { supportCopy } from "./support-copy";

function IncidentNotice() {
  const status = useClientQuery("system.status", {}, { live: true });
  const incident = status.data?.incidents.find((item) => item.endsAt === null);
  if (!incident) return null;
  return (
    <Callout
      tone="caution"
      actions={
        <Button asChild size="sm" variant="secondary">
          <Link href={routes.status}>{supportCopy.viewStatus}</Link>
        </Button>
      }
    >
      {fill(supportCopy.incident, { title: incident.title })}
    </Callout>
  );
}

const scrollToForm = () => {
  document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
};

export function SupportPage() {
  const [query, setQuery] = useState("");
  const matches = matchArticles(query);
  const searching = query.trim().length > 0;
  return (
    <ProductPage title={supportCopy.title} description={supportCopy.description}>
      <div className="bg-page/85 sticky top-16 z-20 -mx-4 px-4 py-3 backdrop-blur-[30px] lg:static lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="max-w-xl">
          <SearchField value={query} label={supportCopy.search} onCommit={setQuery} />
        </div>
      </div>
      <IncidentNotice />
      {searching ? (
        matches.length > 0 ? (
          <ArticleGroup articles={matches} />
        ) : (
          <EmptyState
            icon={Search01Icon}
            title={fill(supportCopy.noMatch, { query: query.trim() })}
            actions={
              <Button variant="secondary" onClick={scrollToForm}>
                {supportCopy.sendUs}
              </Button>
            }
          />
        )
      ) : (
        <TopicGrid topics={topics} />
      )}
      <ContactForm />
    </ProductPage>
  );
}
