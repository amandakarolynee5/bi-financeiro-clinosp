import Sidebar from "./Sidebar";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f8fbff]">
      <Sidebar />

      <main
        className="
          w-full
          overflow-x-hidden
          p-4
          transition-all
          duration-300

          lg:ml-64
          lg:p-6

          2xl:ml-72
          2xl:p-8
        "
      >
        {children}
      </main>
    </div>
  );
}