export default function Card({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-900 p-6 rounded-2xl shadow-lg border border-slate-800">
      {children}
    </div>
  );
}
