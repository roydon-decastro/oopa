import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Log in · Oopa" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-6 text-2xl font-bold">Log in</h1>
      <AuthForm mode="login" next={next?.startsWith("/") ? next : undefined} />
    </main>
  );
}
