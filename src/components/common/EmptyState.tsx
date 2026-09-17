export default function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="empty-state">
      <i className={`fa-solid ${icon}`} />
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  )
}
