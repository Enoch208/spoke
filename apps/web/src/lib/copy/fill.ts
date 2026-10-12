export type Placeholder<Template extends string> =
  Template extends `${string}{${infer Key}}${infer Rest}` ? Key | Placeholder<Rest> : never;

export type FillValues<Template extends string> = Record<Placeholder<Template>, string>;

const placeholderPattern = /\{([A-Za-z][A-Za-z0-9]*)\}/g;

export const fill = <Template extends string>(
  template: Template,
  values: FillValues<Template>,
): string => {
  const lookup: Record<string, string> = values;
  return template.replace(placeholderPattern, (match, key: string) => lookup[key] ?? match);
};
