import { redirect } from "next/navigation";
import { getUser, safeNext } from "@/lib/auth/session";
import { needsProfile, setProfileGate } from "@/lib/auth/profile-gate";

export const dynamic = "force-dynamic";

/** /welcome sends a customer whose name is already complete here: drops the stale gate cookie and continues. */
export async function GET(req: Request) {
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (needsProfile(user)) redirect(`/welcome?next=${encodeURIComponent(next)}`);
  await setProfileGate(false);
  redirect(next);
}
