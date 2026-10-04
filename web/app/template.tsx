/** Every route enters the way the hero does: a short rise, once. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
