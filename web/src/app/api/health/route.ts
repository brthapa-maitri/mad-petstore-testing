import { apiFetch } from "@/server/api";

export const dynamic = "force-dynamic";

/** Web health: 200 when the API's /health answers, 503 when it does not. */
export async function GET(): Promise<Response> {
  try {
    const res = await apiFetch("/health");
    if (res.ok) return Response.json({ status: "ok" });
  } catch {
    // API unreachable: fall through to 503
  }
  return Response.json({ detail: "API unavailable" }, { status: 503 });
}
