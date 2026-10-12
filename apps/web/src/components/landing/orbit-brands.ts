export interface OrbitBrand {
  name: string;
  logo: string;
  color?: string;
}

export const shareChannels: OrbitBrand[] = [
  { name: "WhatsApp", logo: "/brands/whatsapp.svg", color: "#25D366" },
  { name: "Telegram", logo: "/brands/telegram.svg", color: "#26A5E4" },
  { name: "X", logo: "/brands/x.svg", color: "#000000" },
  { name: "Discord", logo: "/brands/discord.svg", color: "#5865F2" },
  { name: "Instagram", logo: "/brands/instagram.svg", color: "#FF0069" },
  { name: "Farcaster", logo: "/brands/farcaster.svg", color: "#855DCD" },
  { name: "Reddit", logo: "/brands/reddit.svg", color: "#FF4500" },
  { name: "Gmail", logo: "/brands/gmail.svg" },
  { name: "Signal", logo: "/brands/signal.svg", color: "#3B45FD" },
  { name: "Messenger", logo: "/brands/messenger.svg", color: "#0866FF" },
];

export const openStack: OrbitBrand[] = [
  { name: "Monad", logo: "/stack/monad.png", color: "#6E54FF" },
  { name: "TypeScript", logo: "/stack/typescript.svg", color: "#3178C6" },
  { name: "Solidity", logo: "/stack/solidity.svg", color: "#363636" },
  { name: "OpenZeppelin", logo: "/stack/openzeppelin.svg", color: "#4E5EE4" },
  { name: "Next.js", logo: "/stack/nextjs.svg", color: "#000000" },
  { name: "wagmi", logo: "/stack/wagmi.svg", color: "#1C1B1B" },
  { name: "viem", logo: "/stack/viem.png", color: "#1C1B1B" },
  { name: "Foundry", logo: "/stack/foundry.png", color: "#1C1B1B" },
  { name: "Node.js", logo: "/brands/nodejs.svg", color: "#5FA04E" },
  { name: "Hono", logo: "/brands/hono.svg", color: "#E36002" },
];
