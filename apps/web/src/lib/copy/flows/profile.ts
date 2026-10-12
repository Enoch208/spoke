export const profileFlow = {
  handleTaken: "That handle is taken.",
  handleInvalid: "Use 3 to 20 lowercase letters, numbers or underscores.",
} as const satisfies Record<string, string>;
