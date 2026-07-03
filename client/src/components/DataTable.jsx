/**
 * Reusable Data Table component with scroll wrapper for responsiveness.
 *
 * @param {Object} props
 * @param {string[]} props.headers
 * @param {React.ReactNode} props.children
 */
export default function DataTable({ headers, children }) {
  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
