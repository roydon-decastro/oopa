// Wraps a printable document. When printed, the page margins are set to zero so the browser leaves out its own
// header and footer (date, page title, web address, page number); the margins are put back as padding instead.
// The empty table header and footer repeat on every printed page, giving each page a top and bottom margin.

const MARGIN = "16mm";

export default function PrintSheet({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`@media print {
  @page { margin: 0; }
  body { padding: 0 18mm; }
}`}</style>
      <table className="w-full border-collapse">
        <thead className="hidden print:table-header-group"><tr><td style={{ height: MARGIN }} /></tr></thead>
        <tfoot className="hidden print:table-footer-group"><tr><td style={{ height: MARGIN }} /></tr></tfoot>
        <tbody><tr><td className="p-0 align-top">{children}</td></tr></tbody>
      </table>
    </>
  );
}
