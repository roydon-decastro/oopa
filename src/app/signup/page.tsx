import AuthForm from "@/components/AuthForm";
import { safeNext } from "@/lib/status";

export const metadata = { title: "Create an account · Oopa" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ role?: string; next?: string }> }) {
  const { role, next } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Create your account</h1>
      <AuthForm mode="signup" defaultRole={role === "owner" ? "owner" : "renter"} next={safeNext(next)} />
    </main>
  );
}
