import "server-only";
import { cookies } from "next/headers";

/**
 * Sign-up is finished only once the customer has entered a first and last name. Until then this cookie is set and the
 * proxy sends every shop page to /welcome (the name itself always comes from the database; the cookie only routes).
 * The proxy has its own copy of the name.
 */
export const PROFILE_GATE_COOKIE = "ay_complete_profile";

export const needsProfile = (u: { role: string; firstName: string | null; lastName: string | null }) =>
  u.role === "CUSTOMER" && !(u.firstName?.trim() && u.lastName?.trim());

export async function setProfileGate(on: boolean) {
  const jar = await cookies();
  if (!on) {
    jar.delete(PROFILE_GATE_COOKIE);
    return;
  }
  jar.set(PROFILE_GATE_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
