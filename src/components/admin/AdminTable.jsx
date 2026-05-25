export default function AdminTable({ columns, children }) {
  return (
    <div className="glass-panel overflow-x-auto rounded-3xl">
      <table className="w-full min-w-[860px] border-collapse">
        <thead>
          <tr className="border-b border-white/10 text-left">
            {columns.map((column) => (
              <th key={column} className="px-5 py-4 text-xs font-bold uppercase tracking-[0.2em] text-dexa-muted">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
