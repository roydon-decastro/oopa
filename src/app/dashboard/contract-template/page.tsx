import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { CONTRACT_BLANKS } from "@/lib/contract";
import { DEFAULT_CONTRACT_TEMPLATE } from "@/lib/contract-template";
import ContractTemplateForm from "@/components/ContractTemplateForm";

export const metadata = { title: "My contract template · Oopa" };
export const dynamic = "force-dynamic";

export default async function ContractTemplatePage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  const { user } = await requireOwner("/dashboard/contract-template");
  const { reset } = await searchParams;
  const me = await db.query.user.findFirst({ where: eq(userTable.id, user.id), columns: { contractTemplate: true } });
  const template = me?.contractTemplate ?? DEFAULT_CONTRACT_TEMPLATE;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-slate-500 hover:text-emerald-700">← My listings</Link>
      <h1 className="mt-2 text-3xl font-bold">My contract template</h1>
      <p className="mt-2 text-slate-600">
        This is the Contract of Lease every new contract starts from. Edit it once with your own details and terms,
        such as your name, civil status and address, the rent due day, penalties and house rules, then save.
        When you prepare a contract for a renter, Oopa copies this template and fills in the blanks for that renter.
        Contracts you already prepared don&apos;t change when you edit the template.
      </p>
      {reset && <p className="mt-4 rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Your template is back to Oopa&apos;s default.</p>}
      <p className="mt-4 text-sm text-slate-600">
        {me?.contractTemplate ? "You're using your own saved template." : "You're using Oopa's default template. Save it to make it your own."}
        {" "}Please have a lawyer check your template before you rely on it.
      </p>

      <details className="mt-6 rounded-xl border border-slate-200 p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Blanks Oopa fills in, and how to format</summary>
        <table className="mt-3 w-full">
          <tbody>
            {CONTRACT_BLANKS.map(([b, what]) => (
              <tr key={b} className="border-t border-slate-100"><td className="py-1 pr-4 font-mono text-xs">{b}</td><td className="py-1 text-slate-600">{what}</td></tr>
            ))}
          </tbody>
        </table>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-600">
          <li>Leave an empty line between paragraphs.</li>
          <li>Put <code>**</code> around words to make them bold, like <code>**NO PETS POLICY**</code>.</li>
          <li>Start a line with <code># </code> to center it, like a title.</li>
          <li>A line with only <code>[PAGE BREAK]</code> starts a new page when printed.</li>
        </ul>
      </details>

      <div className="mt-6">
        <ContractTemplateForm key={reset ? "reset" : "edit"} initial={template} isDefault={!me?.contractTemplate} />
      </div>
    </main>
  );
}
