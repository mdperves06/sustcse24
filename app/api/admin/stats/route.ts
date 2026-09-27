import { apiRoute } from "@/lib/api";
import { getAdminAnalytics, getAdminStats } from "@/services/admin-stats";

/** GET /api/admin/stats — headline numbers + aggregate analytics (admins only). */
export const GET = apiRoute(async ({ actor }) => {
  const [stats, analytics] = await Promise.all([getAdminStats(actor), getAdminAnalytics(actor)]);
  return { stats, analytics };
});
