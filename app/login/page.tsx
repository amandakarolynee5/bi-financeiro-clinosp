"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function fazerLogin() {
    try {
      setLoading(true);
      setErro("");

      if (!email || !senha) {
        setErro("Informe seu e-mail e senha para acessar.");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });

      if (error) {
        setErro("E-mail ou senha inválidos.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
      setErro("Não foi possível acessar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020817] text-white">
      {/* Fundo premium */}
      <div className="absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#0f3b82]/50 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[480px] w-[480px] rounded-full bg-[#95c11f]/20 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-[#1d4ed8]/20 blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_34%),linear-gradient(135deg,rgba(15,59,130,0.35),transparent_45%,rgba(149,193,31,0.10))]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:52px_52px]" />
      </div>

      <section className="relative z-10 grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Lado institucional */}
        <div className="hidden flex-col justify-between p-10 lg:flex 2xl:p-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-[0.20em] text-[#d9ff74] shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl">
              <Sparkles size={14} />
              BI FINANCEIRO PREMIUM
            </div>

            <div className="mt-12 max-w-3xl">
              <div className="mb-8 flex items-center gap-5">
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-white/8 p-3 shadow-[0_0_60px_rgba(149,193,31,0.10)] backdrop-blur-xl">
                  <Image
                    src="/logo.png"
                    alt="Clinosp Prime"
                    width={190}
                    height={120}
                    priority
                    className="h-full w-full object-contain"
                  />
                </div>

                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.26em] text-[#95c11f]">
                    Clinosp Prime
                  </p>
                  <h1 className="mt-2 text-5xl font-black leading-tight tracking-tight 2xl:text-6xl">
                    Inteligência financeira para decisões estratégicas.
                  </h1>
                </div>
              </div>

              <p className="max-w-2xl text-lg leading-8 text-slate-300">
                Acompanhe contas pagas, valores recebidos, vendas e indicadores
                em um painel premium, seguro e integrado.
              </p>
            </div>
          </div>

          <div className="grid max-w-4xl grid-cols-3 gap-4">
            {[
              {
                titulo: "Financeiro",
                valor: "BI completo",
                Icon: WalletCards,
              },
              {
                titulo: "Indicadores",
                valor: "Tempo real",
                Icon: TrendingUp,
              },
              {
                titulo: "Gestão",
                valor: "Premium",
                Icon: BarChart3,
              },
            ].map((item) => {
              const Icon = item.Icon;

              return (
                <div
                  key={item.titulo}
                  className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-[0_20px_70px_rgba(0,0,0,0.20)] backdrop-blur-xl"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#95c11f]/15 text-[#d9ff74]">
                    <Icon size={23} />
                  </div>

                  <p className="text-xs font-semibold uppercase tracking-[0.20em] text-slate-400">
                    {item.titulo}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-white">
                    {item.valor}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card login */}
        <div className="flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-10 2xl:p-14">
          <div className="w-full max-w-[520px]">
            <div className="mb-8 flex justify-center lg:hidden">
              <div className="flex h-24 w-52 items-center justify-center rounded-[2rem] border border-white/10 bg-white/8 p-4 backdrop-blur-xl">
                <Image
                  src="/logo.png"
                  alt="Clinosp Prime"
                  width={220}
                  height={120}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2.25rem] border border-white/15 bg-white/[0.10] p-1 shadow-[0_40px_120px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/18 via-white/6 to-[#95c11f]/10" />
              <div className="relative rounded-[2rem] border border-white/10 bg-[#f8fbff]/95 p-6 text-[#020817] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] sm:p-8 2xl:p-10">
                <div className="mb-8 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-[#0f3b82] to-[#1d4ed8] text-white shadow-[0_20px_50px_rgba(29,78,216,0.35)]">
                    <ShieldCheck size={34} />
                  </div>

                  <p className="text-xs font-black uppercase tracking-[0.25em] text-[#0f3b82]">
                    Acesso seguro
                  </p>

                  <h2 className="mt-3 text-3xl font-black tracking-tight text-[#020817] sm:text-4xl">
                    Entrar no sistema
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    Use seu acesso autorizado para visualizar o painel
                    financeiro da Clinosp Prime.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      E-mail
                    </label>

                    <div className="relative">
                      <Mail
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />

                      <input
                        type="email"
                        placeholder="seuemail@clinosp.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-2xl border border-[#dbeafe] bg-white px-4 py-4 pl-12 text-sm font-medium outline-none transition focus:border-[#95c11f] focus:ring-4 focus:ring-[#95c11f]/15"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Senha
                    </label>

                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        size={18}
                      />

                      <input
                        type={mostrarSenha ? "text" : "password"}
                        placeholder="Digite sua senha"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") fazerLogin();
                        }}
                        className="w-full rounded-2xl border border-[#dbeafe] bg-white px-4 py-4 pl-12 pr-12 text-sm font-medium outline-none transition focus:border-[#95c11f] focus:ring-4 focus:ring-[#95c11f]/15"
                      />

                      <button
                        type="button"
                        onClick={() => setMostrarSenha(!mostrarSenha)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#0f3b82]"
                      >
                        {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {erro && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                      {erro}
                    </div>
                  )}

                  <button
                    onClick={fazerLogin}
                    disabled={loading}
                    className="group mt-2 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-[#0f3b82] via-[#1d4ed8] to-[#2563eb] px-5 py-4 font-black text-white shadow-[0_20px_50px_rgba(29,78,216,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_rgba(29,78,216,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Entrando..." : "Entrar no sistema"}
                    <ArrowRight
                      size={19}
                      className="transition group-hover:translate-x-1"
                    />
                  </button>
                </div>

                <div className="mt-8 rounded-3xl border border-[#dbeafe] bg-gradient-to-br from-white to-[#f3f8ea] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#95c11f]/20 text-[#6b7f16]">
                      <ShieldCheck size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-black text-[#020817]">
                        Ambiente protegido
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Acesso restrito a usuários autorizados da Clinosp Prime.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-7 text-center text-xs font-medium text-slate-400">
                  Clinosp Prime • Inteligência Financeira Premium
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

