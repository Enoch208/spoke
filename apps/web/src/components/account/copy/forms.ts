export const sharedFormCopy = {
  avatar: {
    label: "Avatar",
    option: "Avatar option",
    shuffle: "Shuffle",
    helper: "Generated shapes only. No photo is ever uploaded or stored.",
  },
  displayName: {
    label: "Display name",
    placeholder: "Add your name",
    tooLong: "Use up to 40 characters.",
    noUrls: "Leave links out of your name.",
  },
  handle: {
    label: "Handle",
    placeholder: "yourname",
    rule: "3–20 lowercase letters, numbers or underscores, starting with a letter.",
    checking: "Checking @{handle}…",
    available: "@{handle} is available",
    taken: "@{handle} is taken. Try one of these:",
    takenNoSuggestions: "@{handle} is taken.",
    reserved: "That handle is reserved.",
    invalid: "Use 3–20 lowercase letters, numbers or underscores, starting with a letter.",
    race: "Someone just took @{handle}. Try one of these:",
    unavailable: "We couldn't check this handle right now. You can still save; Spoke checks again.",
    required: "You need a handle to share links.",
    yours: "This is your handle.",
  },
} as const;
