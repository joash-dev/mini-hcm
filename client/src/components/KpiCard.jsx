/**
 * Reusable KPI Card component.
 * Renders a metric value with a label, unit, and accent coloring.
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string|number} props.value
 * @param {string} [props.unit]
 * @param {"regular"|"overtime"|"nd"|"late"|"undertime"} [props.type]
 */
export default function KpiCard({ label, value, unit = "", type = "regular" }) {
  return (
    <div className={`kpi-card kpi-card--${type}`}>
      <span className="kpi-label">{label}</span>
      <div className="kpi-value-container">
        <span className="kpi-value">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
    </div>
  );
}
