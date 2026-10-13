"use client";

import { Mail01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCopy } from "@/components/ui/use-copy";
import { fill, toasts } from "@/lib/copy";
import { shareChannels } from "@/components/landing/orbit-brands";
import { shareKitCopy } from "../copy/links";

const enc = encodeURIComponent;

const composeUrl = (name: string, caption: string, url: string, title: string) => {
  const text = caption.replace(url, "").trim();
  switch (name) {
    case "WhatsApp":
      return `https://wa.me/?text=${enc(caption)}`;
    case "Telegram":
      return `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`;
    case "X":
      return `https://x.com/intent/post?text=${enc(caption)}`;
    case "Farcaster":
      return `https://farcaster.xyz/~/compose?text=${enc(text)}&embeds[]=${enc(url)}`;
    case "Reddit":
      return `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`;
    default:
      return null;
  }
};

const tile =
  "border-hairline hover:bg-soft ease-spring flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs transition-colors duration-[423ms]";

export function ShareChannels({
  caption,
  url,
  title,
}: {
  caption: string;
  url: string;
  title: string;
}) {
  const copy = useCopy();
  const brands = shareChannels.filter((brand) => brand.name !== "Gmail");
  return (
    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {brands.map((brand) => {
        const href = composeUrl(brand.name, caption, url, title);
        const mark = (
          <span
            aria-hidden="true"
            className="size-6 [mask-size:contain] [mask-position:center] [mask-repeat:no-repeat]"
            style={{
              maskImage: `url(${brand.logo})`,
              backgroundColor: brand.color ?? "currentColor",
            }}
          />
        );
        return (
          <li key={brand.name}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={fill(shareKitCopy.shareOn, { app: brand.name })}
                className={tile}
              >
                {mark}
                <span className="text-body">{brand.name}</span>
              </a>
            ) : (
              <button
                type="button"
                aria-label={fill(shareKitCopy.copyFor, { app: brand.name })}
                className={`${tile} w-full`}
                onClick={() =>
                  void copy(caption, fill(toasts["T-01"].copy.captionForApp, { app: brand.name }))
                }
              >
                {mark}
                <span className="text-body">{brand.name}</span>
              </button>
            )}
          </li>
        );
      })}
      <li>
        <a
          href={`mailto:?subject=${enc(title)}&body=${enc(caption)}`}
          aria-label={fill(shareKitCopy.shareOn, { app: shareKitCopy.email })}
          className={tile}
        >
          <HugeiconsIcon icon={Mail01Icon} size={24} strokeWidth={1.8} aria-hidden="true" />
          <span className="text-body">{shareKitCopy.email}</span>
        </a>
      </li>
    </ul>
  );
}
