/** Sign-up steps after the login code (no back button: the shop is reachable once the step is done). */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">{children}</main>;
}
