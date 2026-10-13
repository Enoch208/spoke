export const recoveryCopy = {
  stepOf: "Step {n} of 3",
  why: {
    title: "Back up your recovery phrase",
    revealTitle: "View your recovery phrase",
    body: "Your passkey opens your Spoke account. Your recovery phrase is the backup: 24 words that rebuild the same account if you lose your passkey or Spoke ever moves to a new web address.",
    danger:
      "Anyone with these words controls your account and its funds. Spoke will never ask you for them.",
    checklist: ["Have paper and a pen ready", "Make sure no one can see your screen"],
    show: "Show my phrase",
    skip: "Skip for now",
    later: "Remind me later",
  },
  onboarding: {
    title: "Save a way back in",
    facts: [
      "Your passkey signs you in. It's saved in your password manager and syncs to your devices that use the same one.",
      "If you lose it, your recovery phrase is the only way back. Spoke can't reset it, because Spoke never has your keys.",
      "Back it up now, before the account holds anything.",
    ],
    show: "Show my recovery phrase",
    skipTitle: "Skip the backup?",
    skipBody:
      "Until you back it up, a reminder stays at the top of Spoke. You can do it anytime in Settings → Security.",
    backUpNow: "Back up now",
    skipAnyway: "Skip anyway",
  },
  write: {
    title: "Write these 24 words down in order",
    caution:
      "Write them on paper. Don't screenshot them, paste them into a chat or store them in email.",
    standard:
      "This is a standard 24-word phrase. It also opens this account in wallets like MetaMask or Rabby.",
    reveal: "Reveal words",
    hide: "Hide words",
    hidden: "Words hidden. Press Reveal words to show them.",
    written: "I've written them down",
    done: "Done",
    sample: "Sample phrase · demo",
    word: "Word {n}: {word}",
  },
  check: {
    title: "Check your backup",
    body: "Type the words at these positions from your paper copy.",
    label: "Word #{n}",
    empty: "Enter word #{n}.",
    mismatch: "That's not word #{n}. Check your paper copy.",
    stillWrong: "Still not matching. Show the words again and check the order.",
    stillWrongCheck: "Still not matching. Check your paper copy, or show the phrase from Security.",
    confirm: "Confirm backup",
    showAgain: "Show the words again",
    unlocking: "Waiting for your passkey…",
  },
  done: {
    chip: "Backed up",
    body: "Recovery phrase backed up. Keep the paper somewhere safe.",
    continue: "Continue",
  },
  failures: {
    cancelled: "Passkey request cancelled. Your phrase stays hidden.",
    differentAccount:
      "That passkey belongs to a different account ({address}). Use the passkey for {signedIn}.",
    vault: "We couldn't unlock your phrase with this passkey. Try your original passkey.",
    prf: "That passkey isn't the one this account was created with. Try again and choose the usespoke.xyz passkey you signed in with.",
    record: "Your backup is correct, but we couldn't save that you finished. Try again.",
    crypto: "This browser can't use passkeys on this page.",
    failed: "Your passkey didn't respond. Try again.",
  },
  wallet:
    "Your wallet manages its own recovery. Spoke never holds a recovery phrase for wallet accounts.",
  toast: "Recovery phrase backed up",
  tryAgain: "Try again",
  close: "Close",
} as const;
