import Sidebar from "./Sidebar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <main className="ml-[280px] w-full p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}