// Renders contract text for reading and printing. A blank line starts a paragraph, "# " centers a line,
// **text** is bold, and a line with only [PAGE BREAK] starts a new printed page. Everything else is shown as typed.

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={i}>{p.slice(2, -2)}</strong> : p))}</>;
}

export default function ContractText({ body }: { body: string }) {
  const pages = body.split(/\n[ \t]*\[PAGE BREAK\][ \t]*(?:\n|$)/);
  return (
    <article className="space-y-3 font-serif text-[15px] leading-relaxed text-slate-900">
      {pages.map((page, pi) => (
        <section key={pi} className={pi > 0 ? "break-before-page pt-8" : ""}>
          {page.split(/\n[ \t]*\n/).map((para, i) => {
            const lines = para.replace(/^\n+|\n+$/g, "");
            if (!lines.trim()) return <div key={i} className="h-4" />;
            const centered = lines.split("\n").every((l) => l.startsWith("# "));
            return (
              <p key={i} className={`mb-3 whitespace-pre-wrap break-words ${centered ? "text-center" : "text-justify"}`}>
                <Inline text={centered ? lines.split("\n").map((l) => l.slice(2)).join("\n") : lines} />
              </p>
            );
          })}
        </section>
      ))}
    </article>
  );
}
