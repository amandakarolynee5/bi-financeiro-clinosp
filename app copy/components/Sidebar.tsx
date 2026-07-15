"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import {
  LayoutDashboard,
  ReceiptText,
  Wallet,
  BarChart3,
  Upload,
  ChevronRight,
  LogOut,
} from "lucide-react";

const menu = [
  {
    nome: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    nome: "Contas Pagas",
    href: "/contas-pagas",
    icon: ReceiptText,
  },
  {
    nome: "Valores Recebidos",
    href: "/valores-recebidos",
    icon: Wallet,
  },
  {
    nome: "Vendas",
    href: "/vendas",
    icon: BarChart3,
  },
  {
    nome: "Importar Planilhas",
    href: "/importar",
    icon: Upload,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen overflow-hidden border-r border-[#16365f]/60 bg-[#020817] text-white shadow-[0_0_80px_rgba(15,59,130,0.22)] lg:block lg:w-64 2xl:w-72">
      {/* Background premium */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-8 h-72 w-72 rounded-full bg-[#0f3b82]/30 blur-3xl" />
        <div className="absolute bottom-20 right-0 h-80 w-80 rounded-full bg-[#95c11f]/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,59,130,0.18),transparent_35%,rgba(149,193,31,0.08)_100%)]" />
      </div>

      <div className="relative flex h-full flex-col px-4 py-5 2xl:px-5 2xl:py-6">
        {/* Logo */}
        <div className="mb-6 2xl:mb-8">
          <div className="relative overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl 2xl:rounded-[28px] 2xl:p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-[#0f3b82]/20 via-transparent to-[#95c11f]/10" />

            <div className="relative flex flex-col items-center justify-center">
              <Image
                src="/logo.png"
                alt="Clinosp Prime"
                width={200}
                height={95}
                priority
                className="mx-auto h-auto max-h-24 w-full object-contain 2xl:max-h-28"
              />

              <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <p className="mt-3 text-center text-[10px] font-medium tracking-[0.22em] text-slate-300 2xl:mt-4 2xl:text-[11px] 2xl:tracking-[0.26em]">
                BI FINANCEIRO PREMIUM
              </p>
            </div>
          </div>
        </div>

        {/* Navegação */}
        <nav className="space-y-2.5 2xl:space-y-3">
          {menu.map((item) => {
            const Icon = item.icon;
            const ativo = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center justify-between overflow-hidden rounded-2xl border px-3.5 py-3 transition-all duration-300 2xl:px-4 2xl:py-3.5 ${
                  ativo
                    ? "border-[#3b82f6]/40 bg-gradient-to-r from-[#0f3b82] via-[#1d4ed8] to-[#2563eb] text-white shadow-[0_14px_45px_rgba(37,99,235,0.42)]"
                    : "border-white/5 bg-white/[0.035] text-slate-300 hover:border-[#3b82f6]/25 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                {ativo && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/8 via-transparent to-[#95c11f]/10" />
                    <div className="absolute left-0 top-1/2 h-10 w-1 -translate-y-1/2 rounded-r-full bg-[#95c11f]" />
                  </>
                )}

                <div className="relative flex min-w-0 items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition 2xl:h-11 2xl:w-11 ${
                      ativo
                        ? "bg-white/15 text-white shadow-inner"
                        : "bg-white/[0.06] text-slate-300 group-hover:bg-[#0f3b82]/30 group-hover:text-white"
                    }`}
                  >
                    <Icon size={18} strokeWidth={2.2} />
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`truncate text-sm font-bold ${
                        ativo ? "text-white" : "text-slate-100"
                      }`}
                    >
                      {item.nome}
                    </p>

                    <p className="truncate text-[10px] font-medium text-slate-400">
                      Gestão financeira
                    </p>
                  </div>
                </div>

                <ChevronRight
                  size={18}
                  className={`relative shrink-0 transition ${
                    ativo
                      ? "translate-x-0 text-white"
                      : "-translate-x-1 text-slate-500 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                  }`}
                />
              </Link>
            );
          })}
        </nav>


        {/* Botão sair */}
        <div className="mt-auto pt-4">
          <button
            onClick={sair}
            className="group relative flex w-full items-center justify-between overflow-hidden rounded-2xl border border-[#3b82f6]/30 bg-gradient-to-r from-[#0f3b82] via-[#1d4ed8] to-[#2563eb] px-3.5 py-3 text-white shadow-[0_14px_45px_rgba(37,99,235,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#95c11f]/40 hover:shadow-[0_18px_55px_rgba(37,99,235,0.38)] 2xl:px-4 2xl:py-3.5"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/8 via-transparent to-[#95c11f]/10" />

            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner transition group-hover:bg-white/20 2xl:h-11 2xl:w-11">
                <LogOut size={18} strokeWidth={2.2} />
              </div>

              <div className="text-left">
                <p className="text-sm font-bold">Sair</p>
                <p className="text-[10px] font-medium text-blue-100/80">
                  Encerrar sessão
                </p>
              </div>
            </div>

            <ChevronRight
              size={18}
              className="relative text-white/80 transition group-hover:translate-x-1"
            />
          </button>
        </div>
      </div>
    </aside>
  );
}




