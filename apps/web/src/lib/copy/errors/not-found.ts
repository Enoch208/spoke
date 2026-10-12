import { notFoundCopy } from "../not-found";

const asVariant = <Copy extends { title: string; body: string; actions: readonly string[] }>(
  copy: Copy,
): { title: Copy["title"]; body: Copy["body"]; recovery: Copy["actions"] } => ({
  title: copy.title,
  body: copy.body,
  recovery: copy.actions,
});

export const notFoundEntities = {
  route: asVariant(notFoundCopy.route),
  campaign: asVariant(notFoundCopy.campaign),
  referralCode: asVariant(notFoundCopy.referralCode),
  sale: asVariant(notFoundCopy.sale),
  distributorMissing: asVariant(notFoundCopy.distributorMissing),
  distributorPrivate: asVariant(notFoundCopy.distributorPrivate),
  merchant: asVariant(notFoundCopy.merchant),
  product: asVariant(notFoundCopy.product),
  link: asVariant(notFoundCopy.link),
  opsCase: asVariant(notFoundCopy.opsCase),
};
