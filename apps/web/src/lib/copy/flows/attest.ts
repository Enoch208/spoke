export const attestFlow = {
  expired: "This order’s signature expired before it reached Spoke.",
  overLimit: "This order is above the signer’s limit of {limit}.",
  refundUnresolved:
    "The store hasn’t confirmed whether this order was refunded. Its rewards stay on hold until it does.",
} as const satisfies Record<string, string>;
