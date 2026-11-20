export default function MedalButton({ onClick }) {
  return (
    <button
      type="button"
      className="medal-toggle"
      onClick={onClick}
      aria-label="Открыть медальный зачёт"
      aria-haspopup="dialog"
    >
      <span className="medal-toggle__icon" aria-hidden="true">★</span>
      <span className="medal-toggle__label">Медали</span>
    </button>
  )
}
