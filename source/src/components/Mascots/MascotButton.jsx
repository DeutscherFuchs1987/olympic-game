export default function MascotButton({ onClick, count }) {
  return (
    <button className="mascots-toggle" onClick={onClick} aria-label="Галерея талисманов">
      <span className="mascots-toggle__icon" aria-hidden="true">
        <i /><i /><i /><i /><i />
      </span>
      <span className="mascots-toggle__label">Талисманы{count ? ` · ${count}` : ''}</span>
    </button>
  )
}
