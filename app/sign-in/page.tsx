import { SiteNav } from "@/components/layout/SiteNav";
import { SignInCard } from "@/components/auth/SignInCard";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-background">
      <SiteNav variant="sign-in" />
      <div className="flex min-h-[calc(100vh-69px)] items-center justify-center px-6 py-12">
        <SignInCard authError={params.error === "auth"} />
      </div>
    </div>
  );
}
