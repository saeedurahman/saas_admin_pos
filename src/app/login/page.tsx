import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-3xl font-bold text-brand">PakPOS Admin</h1>
        <p className="mb-6 text-slate-600">Sign in to manage businesses and licenses.</p>
        <LoginForm expired={Boolean(expired)} />
      </div>
    </main>
  );
}
