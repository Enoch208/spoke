export const linkFlow = {
  created: "Your link is ready.",
  ownCampaign:
    "Merchants don’t earn commission on their own campaigns. Share the campaign page instead.",
  notFound:
    "The code “{code}” doesn’t match any Spoke link. Ask whoever shared it to copy it again.",
  syncing: "This link was just created. We are syncing recent transactions.",
  ownLink: "This is your link. Share it; buying through your own path isn’t allowed.",
} as const satisfies Record<string, string>;
