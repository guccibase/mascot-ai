import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";

export default function SignUpPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--brand-bg)] px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(800px_480px_at_50%_-10%,rgba(245,179,79,0.16),transparent_55%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex justify-center">
            <BrandLogo size="lg" className="justify-center" />
          </Link>
          <p className="mt-2 text-sm text-[var(--brand-muted)]">
            Create your account and build mascots in minutes
          </p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          forceRedirectUrl="/onboarding"
        />
      </div>
    </main>
  );
}
