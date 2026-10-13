"use client";

import { ArrowDown01Icon, Link01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Card } from "@/components/ui/card";
import { IconButton } from "@/components/ui/icon-button";
import { useCopy } from "@/components/ui/use-copy";
import { routes } from "@/lib/routes";
import type { Article, Topic } from "./articles";
import { supportCopy } from "./support-copy";

const subscribeHash = (notify: () => void) => {
  window.addEventListener("hashchange", notify);
  return () => {
    window.removeEventListener("hashchange", notify);
  };
};

const useHash = () =>
  useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.replace(/^#/, ""),
    () => "",
  );

function ArticleItem({ article, open }: { article: Article; open: boolean }) {
  const copy = useCopy();
  return (
    <details
      id={article.slug}
      open={open}
      className="group border-hairline scroll-mt-28 border-t first:border-t-0"
    >
      <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 font-medium [&::-webkit-details-marker]:hidden">
        {article.title}
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={18}
          strokeWidth={1.8}
          aria-hidden="true"
          className="text-subtle ease-spring shrink-0 transition-transform duration-[423ms] group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-3 pb-4">
        <p className="text-body">{article.body}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {article.link ? (
            <Link href={article.link.href} className="text-ink underline underline-offset-2">
              {article.link.label}
            </Link>
          ) : null}
          <IconButton
            icon={Link01Icon}
            label={supportCopy.copyLink}
            size="sm"
            onClick={() => {
              void copy(
                `${window.location.origin}${routes.support}#${article.slug}`,
                supportCopy.copied,
              );
            }}
          />
        </div>
      </div>
    </details>
  );
}

export function ArticleGroup({
  title,
  articles,
}: {
  title?: string;
  articles: readonly Article[];
}) {
  const hash = useHash();
  return (
    <Card className="flex flex-col">
      {title ? <h2 className="font-display text-h4 text-ink mb-1 font-medium">{title}</h2> : null}
      <div className="flex flex-col">
        {articles.map((article) => (
          <ArticleItem key={article.slug} article={article} open={hash === article.slug} />
        ))}
      </div>
    </Card>
  );
}

export function TopicGrid({ topics }: { topics: readonly Topic[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {topics.map((topic) => (
        <ArticleGroup key={topic.id} title={topic.title} articles={topic.articles} />
      ))}
    </div>
  );
}
