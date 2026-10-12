import { getCookie } from "hono/cookie";
import { requireSession } from "../http/router.js";
import { ApiProblem } from "../http/problem.js";
import type { ApiContext, Services } from "../types.js";

export const viewerSession = async (c: ApiContext, services: Services) => {
  if (!getCookie(c, services.production ? "__Host-spoke_session" : "spoke_session")) return null;
  try {
    return await requireSession(c, services);
  } catch (error) {
    if (error instanceof ApiProblem && error.status === 401) return null;
    throw error;
  }
};
