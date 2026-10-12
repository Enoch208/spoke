export const notificationCategories = [
  "Earnings",
  "Network",
  "Invitations",
  "Purchases",
  "Campaigns",
  "Business",
  "Account and security",
] as const satisfies readonly string[];

export type NotificationCategory = (typeof notificationCategories)[number];

type Variants = Readonly<Record<string, string>>;

type QualifiedCategory = {
  readonly category: NotificationCategory;
  readonly qualifier: string;
};

type CategoryField =
  | { readonly category: NotificationCategory }
  | { readonly categories: readonly QualifiedCategory[] };

type TitleField = { readonly title: string } | { readonly titles: Variants };

type BodyField = { readonly body: string } | { readonly bodies: Variants };

type OpensField = { readonly opens: string } | { readonly opensBy: Variants };

export type NotificationCopy = {
  readonly kind: `${string}.${string}`;
  readonly to: string;
} & CategoryField &
  TitleField &
  BodyField &
  OpensField;
