import type { ClientOutput } from "@spoke/protocol";
import type { TokenLike } from "@/lib/format";
import { termsFromPolicy } from "./policy";
import { startingPoints, type LibraryTemplate } from "./starting-points";

type WireTemplate = ClientOutput<"studio.templates">[number];

const byCreated = (a: WireTemplate, b: WireTemplate) => a.createdAt.localeCompare(b.createdAt);

export const myTemplates = (wire: readonly WireTemplate[], token: TokenLike): LibraryTemplate[] => {
  const families = new Map<string, WireTemplate[]>();
  for (const template of wire) {
    if (template.id.startsWith("spoke-")) continue;
    const family = families.get(template.name) ?? [];
    family.push(template);
    families.set(template.name, family);
  }
  return [...families.values()]
    .map((family) => [...family].sort(byCreated))
    .flatMap((history) => {
      const latest = history.at(-1);
      if (!latest) return [];
      return [
        {
          id: latest.id,
          name: latest.name,
          version: history.length,
          source: "mine" as const,
          categories: [],
          status: latest.status,
          createdAt: latest.createdAt,
          history,
          terms: termsFromPolicy(latest.policy, token, null),
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const findTemplate = (
  id: string,
  mine: readonly LibraryTemplate[],
): LibraryTemplate | null =>
  startingPoints.find((template) => template.id === id) ??
  mine.find(
    (template) => template.id === id || template.history.some((entry) => entry.id === id),
  ) ??
  null;

export const versionOf = (template: LibraryTemplate, id: string) => {
  const index = template.history.findIndex((entry) => entry.id === id);
  return index === -1 ? template.version : index + 1;
};
