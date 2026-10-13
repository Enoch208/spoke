import { routes } from "@/lib/routes";

export const startPath = (workspace: "buy" | "earn" | "sell" | undefined) =>
  workspace === "sell" ? routes.sell.overview : routes.earn.home;
