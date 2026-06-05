"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Download,
  RefreshCcw,
  Search,
  Eye,
  X,
  WalletCards,
  FileText,
  Activity,
  ArrowUpRight,
  Users,
  MoreVertical,
  ShoppingCart,
  Tag,
  CalendarClock,
  Gauge,
  PercentCircle,
  BadgeDollarSign,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from "recharts";

type Venda = {
  id: string;
  data: string;
  paciente: string;
  valor: number;
  qtd_titulos?: number;
  quantidade_titulos?: number;
  titulos?: number;
};

type FaixaResumo = {
  nome: string;
  nomeCurto: string;
  total: number;
  quantidade: number;
  percentual?: number;
};

const cores = [
  "#0f3b82",
  "#1d4ed8",
  "#38bdf8",
  "#95c11f",
  "#c7ea46",
  "#16a34a",
  "#94a3b8",
];

const itensPorPagina = 40;

function criarDataLocal(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia);
}

function paraISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function getPeriodoAtual() {
  const hoje = new Date();
  const primeiro = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const ultimo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return { inicio: paraISO(primeiro), fim: paraISO(ultimo) };
}

function qtdTitulos(item: Venda) {
  return Number(item.qtd_titulos ?? item.quantidade_titulos ?? item.titulos ?? 1);
}

export default function VendasPage() {
  const { theme } = useTheme();
  const claro = theme === "light";
  const periodoAtual = getPeriodoAtual();

  const [dados, setDados] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(periodoAtual.inicio);
  const [dataFim, setDataFim] = useState(periodoAtual.fim);
  const [busca, setBusca] = useState("");
  const [totalMesAnterior, setTotalMesAnterior] = useState(0);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [modalAnalise, setModalAnalise] = useState(false);

  useEffect(() => {
    carregarDados();
  }, [dataInicio, dataFim]);

  useEffect(() => {
    carregarMesAnterior();
  }, [dataInicio]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, dataInicio, dataFim]);

  async function carregarDados() {
    setLoading(true);

    const { data, error } = await supabase
      .from("vendas")
      .select("*")
      .gte("data", dataInicio)
      .lte("data", dataFim)
      .order("data", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setDados(data || []);
    setLoading(false);
  }

  async function carregarMesAnterior() {
    const inicio = criarDataLocal(dataInicio);
    const inicioAnterior = new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1);
    const fimAnterior = new Date(inicio.getFullYear(), inicio.getMonth(), 0);

    const { data, error } = await supabase
      .from("vendas")
      .select("valor")
      .gte("data", paraISO(inicioAnterior))
      .lte("data", paraISO(fimAnterior));

    if (error) {
      console.error(error);
      return;
    }

    const total = (data || []).reduce((acc, item) => acc + Number(item.valor || 0), 0);
    setTotalMesAnterior(total);
  }

  function moeda(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarValorGrafico(value: unknown) {
    return moeda(Number(value || 0));
  }

  function cortarTexto(texto: string, limite = 18) {
    if (!texto) return "-";
    return texto.length > limite ? texto.slice(0, limite) + "..." : texto;
  }

  function formatarData(data: string) {
    if (!data) return "-";
    return criarDataLocal(data).toLocaleDateString("pt-BR");
  }

  function renderTickFaixa(props: any) {
    const { x, y, payload } = props;
    const linhas = String(payload.value || "").split("\n");

    return (
      <g transform={`translate(${x},${y})`}>
        {linhas.map((linha, index) => (
          <text
            key={linha}
            x={0}
            y={index * 13}
            dy={14}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize={11}
            fontWeight={600}
          >
            {linha}
          </text>
        ))}
      </g>
    );
  }

  

  function exportarCSV() {
    const cabecalho = ["Data", "Paciente", "Qtd. Títulos", "Valor"];

    const linhas = dadosFiltrados.map((item) => [
      formatarData(item.data),
      item.paciente || "",
      qtdTitulos(item),
      String(item.valor || 0).replace(".", ","),
    ]);

    const csv = [cabecalho, ...linhas]
      .map((linha) =>
        linha
          .map((campo) => `"${String(campo).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `vendas-${dataInicio}-a-${dataFim}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const totalVendido = dados.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const quantidadeVendas = dados.length;
  const ticketMedio = quantidadeVendas ? totalVendido / quantidadeVendas : 0;
  const totalTitulos = dados.reduce((acc, item) => acc + qtdTitulos(item), 0);

  const maiorVendaItem = [...dados].sort(
    (a, b) => Number(b.valor || 0) - Number(a.valor || 0)
  )[0];

  const maiorVenda = maiorVendaItem ? Number(maiorVendaItem.valor || 0) : 0;

  const pacientes = new Set(
    dados
      .map((item) => item.paciente)
      .filter(Boolean)
      .map((nome) => nome.toLowerCase().trim())
  ).size;

  const porDia = useMemo(() => {
    return Object.values(
      dados.reduce((acc: Record<string, { data: string; total: number }>, item) => {
        const dia = item.data;
        if (!acc[dia]) acc[dia] = { data: dia, total: 0 };
        acc[dia].total += Number(item.valor || 0);
        return acc;
      }, {})
    ).sort((a, b) => criarDataLocal(a.data).getTime() - criarDataLocal(b.data).getTime());
  }, [dados]);

  const porDiaSemana = useMemo(() => {
    const dias = [
      { dia: "Segunda", total: 0 },
      { dia: "Terça", total: 0 },
      { dia: "Quarta", total: 0 },
      { dia: "Quinta", total: 0 },
      { dia: "Sexta", total: 0 },
      { dia: "Sábado", total: 0 },
      { dia: "Domingo", total: 0 },
    ];

    dados.forEach((item) => {
      const data = criarDataLocal(item.data);
      const diaSemana = data.getDay();
      const indice = diaSemana === 0 ? 6 : diaSemana - 1;
      dias[indice].total += Number(item.valor || 0);
    });

    return dias;
  }, [dados]);

  function faixaVenda(valor: number) {
    if (valor <= 1000) return "Até R$ 1.000";
    if (valor <= 5000) return "R$ 1.000 a R$ 5.000";
    if (valor <= 15000) return "R$ 5.000 a R$ 15.000";
    if (valor <= 30000) return "R$ 15.000 a R$ 30.000";
    return "Acima de R$ 30.000";
  }

  const porFaixa = useMemo<FaixaResumo[]>(() => {
    const ordem = [
      "Até R$ 1.000",
      "R$ 1.000 a R$ 5.000",
      "R$ 5.000 a R$ 15.000",
      "R$ 15.000 a R$ 30.000",
      "Acima de R$ 30.000",
    ];

    const agrupado = ordem.reduce((acc: Record<string, FaixaResumo>, nome) => {
      acc[nome] = {
        nome,
        nomeCurto:
          nome === "Até R$ 1.000"
            ? "Até\nR$ 1 mil"
            : nome === "R$ 1.000 a R$ 5.000"
            ? "R$ 1 mil\na R$ 5 mil"
            : nome === "R$ 5.000 a R$ 15.000"
            ? "R$ 5 mil\na R$ 15 mil"
            : nome === "R$ 15.000 a R$ 30.000"
            ? "R$ 15 mil\na R$ 30 mil"
            : "Acima\nde R$ 30 mil",
        total: 0,
        quantidade: 0,
        percentual: 0,
      };
      return acc;
    }, {});

    dados.forEach((item) => {
      const valor = Number(item.valor || 0);
      const nome = faixaVenda(valor);
      agrupado[nome].total += valor;
      agrupado[nome].quantidade += 1;
    });

    return ordem.map((nome) => ({
      ...agrupado[nome],
      percentual: totalVendido > 0 ? (agrupado[nome].total / totalVendido) * 100 : 0,
    }));
  }, [dados, totalVendido]);

  const comparativoMensalDetalhado = useMemo(() => {
    const atual = criarDataLocal(dataInicio);
    const anterior = new Date(atual.getFullYear(), atual.getMonth() - 1, 1);

    return [
      {
        mes: anterior.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        }),
        total: totalMesAnterior,
      },
      {
        mes: atual.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        }),
        total: totalVendido,
      },
    ];
  }, [dataInicio, totalMesAnterior, totalVendido]);

  const topVendas = [...dados]
    .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))
    .slice(0, 5);

  const dadosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    if (!termo) return dados;

    return dados.filter((item) => {
      return (
        item.paciente?.toLowerCase().includes(termo) ||
        formatarData(item.data).includes(termo) ||
        String(item.valor).includes(termo)
      );
    });
  }, [dados, busca]);

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / itensPorPagina));

  const dadosPaginados = dadosFiltrados.slice(
    (paginaAtual - 1) * itensPorPagina,
    paginaAtual * itensPorPagina
  );

  const paginasVisiveis = useMemo(() => {
    if (totalPaginas <= 10) {
      return Array.from({ length: totalPaginas }, (_, index) => index + 1);
    }

    const paginas = new Set<number>([1, totalPaginas]);

    for (let pagina = paginaAtual - 1; pagina <= paginaAtual + 1; pagina++) {
      if (pagina > 1 && pagina < totalPaginas) paginas.add(pagina);
    }

    return Array.from(paginas).sort((a, b) => a - b);
  }, [paginaAtual, totalPaginas]);

  const variacao =
    totalMesAnterior > 0
      ? ((totalVendido - totalMesAnterior) / totalMesAnterior) * 100
      : 0;

  const variacaoTexto = `${variacao >= 0 ? "+" : ""}${variacao
    .toFixed(1)
    .replace(".", ",")}%`;

  const maiorQtdTitulosItem = [...dados].sort((a, b) => qtdTitulos(b) - qtdTitulos(a))[0];
  const mediaPorPaciente = pacientes ? totalVendido / pacientes : 0;

  return (
    <AppShell>
      <div
        className={`vendas-theme relative min-h-screen overflow-hidden rounded-[40px] border p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] transition-colors duration-300 lg:p-8 ${
          claro
            ? "vendas-light border-slate-200 bg-[#f4f7fb] text-slate-950"
            : "vendas-dark border-white/10 bg-[#020817] text-white"
        }`}
      >
        <style>{`
          .vendas-light > .pointer-events-none {
            display: none !important;
          }

          .vendas-light [class*="bg-white"] {
            background-color: #ffffff !important;
          }

          .vendas-light [class*="border-white"] {
            border-color: #e2e8f0 !important;
          }

          .vendas-light [class*="text-white"] {
            color: #0f172a !important;
          }

          .vendas-light [class*="text-slate-400"] {
            color: #64748b !important;
          }

          .vendas-light [class*="text-slate-300"] {
            color: #475569 !important;
          }

          .vendas-light [class*="bg-[#0b1220]"] {
            background-color: #f1f5f9 !important;
          }

          .vendas-light input,
          .vendas-light select {
            background-color: #ffffff !important;
            color: #0f172a !important;
            border-color: #bfdbfe !important;
            color-scheme: light !important;
          }

          .vendas-light option {
            background-color: #ffffff !important;
            color: #0f172a !important;
          }

          .vendas-light table {
            color: #0f172a !important;
          }

          .vendas-light table thead tr {
            background-color: #f1f5f9 !important;
          }

          .vendas-light th {
            color: #475569 !important;
          }

          .vendas-light td {
            color: #0f172a !important;
          }

          .vendas-light table tbody tr {
            border-color: #e2e8f0 !important;
          }

          .vendas-light tbody tr:hover {
            background-color: #eff6ff !important;
          }

          .vendas-light tbody tr:hover td {
            color: #0f172a !important;
          }

          .vendas-light .recharts-cartesian-grid line {
            stroke: #dbeafe !important;
          }

          .vendas-light .recharts-text {
            fill: #475569 !important;
          }
        `}</style>
        <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#0f3b82]/35 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[480px] w-[480px] rounded-full bg-[#95c11f]/15 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),linear-gradient(135deg,rgba(15,59,130,0.24),transparent_45%,rgba(149,193,31,0.08))]" />

        <div className="relative z-10 space-y-4 lg:space-y-5 2xl:space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-wide text-[#95c11f]">BI Financeiro</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white 2xl:text-4xl">Vendas</h1>
            <p className="mt-2 text-slate-400">
              Análise detalhada das vendas realizadas por período.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/importar"
              className="rounded-2xl border border-[#1d4ed8]/25 bg-white/[0.06] px-5 py-3 font-semibold text-white shadow-[0_10px_28px_rgba(15,59,130,0.08)] transition hover:border-[#95c11f]/40 hover:shadow-[0_16px_36px_rgba(15,59,130,0.14)]"
            >
              Importar Planilhas
            </Link>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-slate-200 shadow-[0_10px_28px_rgba(15,59,130,0.07)]">
              <CalendarDays size={18} className="text-[#0f3b82]" />

              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="bg-transparent outline-none text-sm text-slate-200 [color-scheme:dark]"
              />

              <span className="text-slate-400">até</span>

              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="bg-transparent outline-none text-sm text-slate-200 [color-scheme:dark]"
              />
            </div>

            <button
              onClick={carregarDados}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f3b82] to-[#1d4ed8] px-5 py-3 font-semibold text-white shadow-[0_14px_35px_rgba(29,78,216,0.30)] transition hover:shadow-[0_18px_42px_rgba(29,78,216,0.40)]"
            >
              <RefreshCcw size={16} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            onChange={(e) => {
              const mes = Number(e.target.value);
              const anoAtual = criarDataLocal(dataInicio).getFullYear();

              const inicio = new Date(anoAtual, mes, 1);
              const fim = new Date(anoAtual, mes + 1, 0);

              setDataInicio(paraISO(inicio));
              setDataFim(paraISO(fim));
            }}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-slate-200 text-sm font-semibold text-[#0f2747] shadow-[0_10px_28px_rgba(15,59,130,0.07)] outline-none transition hover:border-[#0f3b82]/40 focus:border-[#95c11f]"
            defaultValue={String(criarDataLocal(dataInicio).getMonth())}
          >
            <option className="bg-[#0f1f3a] text-white" value="0">Janeiro</option>
            <option className="bg-[#0f1f3a] text-white" value="1">Fevereiro</option>
            <option className="bg-[#0f1f3a] text-white" value="2">Março</option>
            <option className="bg-[#0f1f3a] text-white" value="3">Abril</option>
            <option className="bg-[#0f1f3a] text-white" value="4">Maio</option>
            <option className="bg-[#0f1f3a] text-white" value="5">Junho</option>
            <option className="bg-[#0f1f3a] text-white" value="6">Julho</option>
            <option className="bg-[#0f1f3a] text-white" value="7">Agosto</option>
            <option className="bg-[#0f1f3a] text-white" value="8">Setembro</option>
            <option className="bg-[#0f1f3a] text-white" value="9">Outubro</option>
            <option className="bg-[#0f1f3a] text-white" value="10">Novembro</option>
            <option className="bg-[#0f1f3a] text-white" value="11">Dezembro</option>
          </select>

          <select
            onChange={(e) => {
              const ano = Number(e.target.value);
              const mesAtual = criarDataLocal(dataInicio).getMonth();

              const inicio = new Date(ano, mesAtual, 1);
              const fim = new Date(ano, mesAtual + 1, 0);

              setDataInicio(paraISO(inicio));
              setDataFim(paraISO(fim));
            }}
            className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-slate-200 text-sm font-semibold text-[#0f2747] shadow-[0_10px_28px_rgba(15,59,130,0.07)] outline-none transition hover:border-[#0f3b82]/40 focus:border-[#95c11f]"
            defaultValue={String(criarDataLocal(dataInicio).getFullYear())}
          >
            <option className="bg-[#0f1f3a] text-white" value="2025">2025</option>
            <option className="bg-[#0f1f3a] text-white" value="2026">2026</option>
            <option className="bg-[#0f1f3a] text-white" value="2027">2027</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 2xl:gap-4">
          {[
            {
              titulo: "Total Vendido",
              valor: moeda(totalVendido),
              detalhe: variacaoTexto,
              cor: "text-[#3b82f6]",
              iconBg: "bg-[#0f3b82]/10",
              iconColor: "text-[#3b82f6]",
              Icon: WalletCards,
            },
            {
              titulo: "Ticket Médio",
              valor: moeda(ticketMedio),
              detalhe: "por venda",
              cor: "text-[#3b82f6]",
              iconBg: "bg-[#1d4ed8]/10",
              iconColor: "text-[#3b82f6]",
              Icon: Tag,
            },
            {
              titulo: "Quantidade de Vendas",
              valor: quantidadeVendas,
              detalhe: "vendas realizadas",
              cor: "text-[#3b82f6]",
              iconBg: "bg-[#1d4ed8]/15",
              iconColor: "text-[#3b82f6]",
              Icon: ShoppingCart,
            },
            {
              titulo: "Maior Venda",
              valor: moeda(maiorVenda),
              detalhe: maiorVendaItem ? `em ${formatarData(maiorVendaItem.data)}` : "-",
              cor: "text-[#16a34a]",
              iconBg: "bg-[#95c11f]/20",
              iconColor: "text-[#16a34a]",
              Icon: BadgeDollarSign,
            },
            {
              titulo: "Pacientes",
              valor: pacientes,
              detalhe: "pacientes únicos",
              cor: "text-[#6b7f16]",
              iconBg: "bg-[#95c11f]/20",
              iconColor: "text-[#6b7f16]",
              Icon: Users,
            },
            {
              titulo: "Total de Títulos",
              valor: totalTitulos,
              detalhe: "no período",
              cor: "text-[#3b82f6]",
              iconBg: "bg-[#1d4ed8]/15",
              iconColor: "text-[#3b82f6]",
              Icon: FileText,
            },
          ].map((item) => {
            const Icon = item.Icon;

            return (
              <div
                key={item.titulo}
                className="relative min-h-[138px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]/90 p-4 pr-14 shadow-[0_18px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#95c11f]/30 hover:shadow-[0_22px_55px_rgba(15,59,130,0.14)] 2xl:min-h-[152px] 2xl:p-5 2xl:pr-16"
              >
                <div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-medium">
                      {item.titulo}
                    </p>

                    <h2 className={`mt-3 whitespace-nowrap text-xl font-bold leading-tight ${item.cor} 2xl:mt-4 2xl:text-2xl`}>
                      {item.valor}
                    </h2>

                    <p className="mt-3 text-[11px] text-slate-400">
                      {item.detalhe}
                    </p>
                  </div>

                  <div
                    className={`${item.iconBg} ${item.iconColor} absolute right-2 top-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl 2xl:right-3 2xl:top-3 2xl:h-14 2xl:w-14`}
                  >
                    <Icon size={23} strokeWidth={2.4} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3 2xl:gap-6">
          <div className="xl:col-span-1 rounded-3xl border border-white/10 bg-white/[0.06]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Evolução das Vendas</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={porDia} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" vertical={false} />

                <XAxis
                  dataKey="data"
                  tickFormatter={(v) =>
                    criarDataLocal(v).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                    })
                  }
                  tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(value) => `${Number(value) / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(v: any) => [moeda(Number(v)), "Total"]}
                  labelFormatter={(label) => formatarData(String(label))}
                  contentStyle={{
                    borderRadius: 16,
                    border: claro ? "1px solid #dbeafe" : "1px solid rgba(149,193,31,0.25)",
                    background: claro ? "#ffffff" : "#0b1220",
                    color: claro ? "#0f172a" : "#ffffff",
                    boxShadow: claro ? "0 18px 45px rgba(15,59,130,0.12)" : "0 18px 50px rgba(0,0,0,0.45)",
                  }}
                  labelStyle={{ color: claro ? "#0f3b82" : "#95c11f", fontWeight: 800, marginBottom: 6 }}
                  itemStyle={{ color: claro ? "#0f172a" : "#ffffff", fontWeight: 700 }}
                />

                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0f3b82"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#0f3b82", strokeWidth: 2, stroke: "#ffffff" }}
                  activeDot={{ r: 6, fill: "#0f3b82", stroke: "#ffffff", strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl min-h-[420px]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Vendas por Faixa de Valor</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr] gap-5 items-center">
              <div className="relative mx-auto w-[190px] h-[230px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={porFaixa}
                      dataKey="total"
                      nameKey="nome"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={1}
                      stroke={claro ? "#ffffff" : "#020817"}
                      strokeWidth={2}
                    >
                      {porFaixa.map((_, i) => (
                        <Cell key={i} fill={cores[i % cores.length]} />
                      ))}
                    </Pie>

                    <Tooltip formatter={(v: any) => [moeda(Number(v)), "Total"]} contentStyle={{
                    borderRadius: 16,
                    border: claro ? "1px solid #dbeafe" : "1px solid rgba(149,193,31,0.25)",
                    background: claro ? "#ffffff" : "#0b1220",
                    color: claro ? "#0f172a" : "#ffffff",
                    boxShadow: claro ? "0 18px 45px rgba(15,59,130,0.12)" : "0 18px 50px rgba(0,0,0,0.45)",
                  }}
                  labelStyle={{ color: claro ? "#0f3b82" : "#95c11f", fontWeight: 800, marginBottom: 6 }}
                  itemStyle={{ color: claro ? "#0f172a" : "#ffffff", fontWeight: 700 }} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-[11px] text-slate-400 font-semibold">Total</p>
                    <p className="text-sm font-bold text-white leading-4">
                      {moeda(totalVendido)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {porFaixa.map((item, index) => (
                  <div
                    key={item.nome}
                    className="grid grid-cols-[12px_1fr_auto] items-center gap-2 text-sm"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cores[index % cores.length] }}
                    />

                    <span
                      className="text-slate-300 font-medium truncate"
                      title={item.nome}
                    >
                      {item.nome}
                    </span>

                    <span className="font-bold text-white">
                      {(item.percentual || 0).toFixed(1).replace(".", ",")}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                Vendas por Faixa de Valor
              </h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <ResponsiveContainer width="100%" height={460}>
              <BarChart data={porFaixa} margin={{ top: 30, right: 16, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" vertical={false} />

                <XAxis
                  dataKey="nomeCurto"
                  interval={0}
                  height={54}
                  tick={renderTickFaixa}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(value) => `${Number(value) / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip formatter={(v: any) => [moeda(Number(v)), "Total"]} contentStyle={{
                    borderRadius: 16,
                    border: claro ? "1px solid #dbeafe" : "1px solid rgba(149,193,31,0.25)",
                    background: claro ? "#ffffff" : "#0b1220",
                    color: claro ? "#0f172a" : "#ffffff",
                    boxShadow: claro ? "0 18px 45px rgba(15,59,130,0.12)" : "0 18px 50px rgba(0,0,0,0.45)",
                  }}
                  labelStyle={{ color: claro ? "#0f3b82" : "#95c11f", fontWeight: 800, marginBottom: 6 }}
                  itemStyle={{ color: claro ? "#0f172a" : "#ffffff", fontWeight: 700 }} />

                <Bar dataKey="total" fill="#0f3b82" radius={[10, 10, 0, 0]} barSize={48}>
                  <LabelList
                    dataKey="total"
                    position="top"
                    offset={10}
                    formatter={(v: any) => moeda(Number(v))}
                    style={{
                      fontSize: 10,
                      fill: claro ? "#0f172a" : "#ffffff",
                      fontWeight: 700,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3 2xl:gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Vendas por Dia da Semana</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porDiaSemana} margin={{ top: 25, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" vertical={false} />

                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(value) => `${Number(value) / 1000}k`}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip formatter={(v: any) => [moeda(Number(v)), "Total"]} contentStyle={{
                    borderRadius: 16,
                    border: claro ? "1px solid #dbeafe" : "1px solid rgba(149,193,31,0.25)",
                    background: claro ? "#ffffff" : "#0b1220",
                    color: claro ? "#0f172a" : "#ffffff",
                    boxShadow: claro ? "0 18px 45px rgba(15,59,130,0.12)" : "0 18px 50px rgba(0,0,0,0.45)",
                  }}
                  labelStyle={{ color: claro ? "#0f3b82" : "#95c11f", fontWeight: 800, marginBottom: 6 }}
                  itemStyle={{ color: claro ? "#0f172a" : "#ffffff", fontWeight: 700 }} />

                <Bar dataKey="total" fill="#1d4ed8" radius={[10, 10, 0, 0]} barSize={44}>
                  <LabelList
                    dataKey="total"
                    position="top"
                    offset={10}
                    formatter={(v: any) => moeda(Number(v))}
                    style={{
                      fontSize: 10,
                      fill: claro ? "#0f172a" : "#ffffff",
                      fontWeight: 700,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Top 5 Maiores Vendas</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className={claro ? "w-full min-w-[720px] text-slate-900" : "w-full min-w-[720px] text-slate-200"}>
                <thead>
                  <tr className="bg-white/[0.04] text-xs text-slate-400">
                    <th className="py-3 px-3 text-left rounded-l-xl">#</th>
                    <th className="py-3 px-3 text-left">Data</th>
                    <th className="py-3 px-3 text-left">Paciente</th>
                    <th className="py-3 px-3 text-center">Qtd. Títulos</th>
                    <th className="py-3 px-3 text-right rounded-r-xl">Valor</th>
                  </tr>
                </thead>

                <tbody>
                  {topVendas.map((item, index) => (
                    <tr key={item.id} className="border-b border-white/10 hover:bg-white/[0.05]">
                      <td className="py-3 px-3 text-sm font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3 text-sm whitespace-nowrap">
                        {formatarData(item.data)}
                      </td>
                      <td className="py-3 px-3 text-sm font-semibold">
                        {cortarTexto(item.paciente, 22)}
                      </td>
                      <td className="py-3 px-3 text-sm text-center">
                        {qtdTitulos(item)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-bold whitespace-nowrap">
                        {moeda(Number(item.valor || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="w-full mt-3 text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">
              Ver todas
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Vendas por Mês</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 items-center xl:grid-cols-[1fr_auto]">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={comparativoMensalDetalhado}
                  margin={{ top: 28, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" vertical={false} />

                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />

                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(value) => `${Number(value) / 1000}k`}
                    tickLine={false}
                    axisLine={false}
                  />

                  <Tooltip formatter={(v: any) => [moeda(Number(v)), "Total"]} contentStyle={{
                    borderRadius: 16,
                    border: claro ? "1px solid #dbeafe" : "1px solid rgba(149,193,31,0.25)",
                    background: claro ? "#ffffff" : "#0b1220",
                    color: claro ? "#0f172a" : "#ffffff",
                    boxShadow: claro ? "0 18px 45px rgba(15,59,130,0.12)" : "0 18px 50px rgba(0,0,0,0.45)",
                  }}
                  labelStyle={{ color: claro ? "#0f3b82" : "#95c11f", fontWeight: 800, marginBottom: 6 }}
                  itemStyle={{ color: claro ? "#0f172a" : "#ffffff", fontWeight: 700 }} />

                  <Bar dataKey="total" fill="#0f3b82" radius={[12, 12, 0, 0]} barSize={58}>
                    <LabelList
                      dataKey="total"
                      position="top"
                      offset={10}
                      formatter={(v: any) => moeda(Number(v))}
                      style={{
                        fontSize: 10,
                        fill: "#ffffff",
                        fontWeight: 700,
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div
                className={`rounded-2xl px-4 py-5 text-center border ${
                  variacao >= 0
                    ? "bg-emerald-500/10 border-emerald-400/20 text-emerald-300"
                    : "bg-red-500/10 border-red-400/20 text-red-300"
                }`}
              >
                <p className="text-2xl font-bold">{variacaoTexto}</p>
                <p className="text-xs font-semibold mt-1">vs mês anterior</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3 2xl:gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:col-span-2 2xl:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Todas as Vendas</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Exibindo {dadosPaginados.length} de {dadosFiltrados.length} registros.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Buscar venda..."
                    className="border border-white/10 bg-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>

                <div className="border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300 flex items-center gap-2 bg-white/[0.06]">
                  <CalendarDays size={15} className="text-slate-400" />
                  {formatarData(dataInicio)} - {formatarData(dataFim)}
                </div>

                <button
                  onClick={exportarCSV}
                  className="border border-[#95c11f]/30 text-[#0f3b82] rounded-xl px-4 py-2 text-sm flex items-center gap-2 hover:bg-white/[0.08] transition"
                >
                  <Download size={16} />
                  Exportar
                </button>

                <button className="border border-white/10 rounded-xl w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white/[0.05] transition">
                  <MoreVertical size={17} />
                </button>
              </div>
            </div>

            {loading ? (
              <p>Carregando...</p>
            ) : (
              <>
                <div className="overflow-auto rounded-2xl border border-white/10">
                  <table className={claro ? "w-full min-w-[720px] text-slate-900" : "w-full min-w-[720px] text-slate-200"}>
                    <thead>
                      <tr className="bg-white/[0.04] text-sm text-slate-400">
                        <th className="text-left py-4 px-4">Data</th>
                        <th className="text-left py-4 px-4">Paciente</th>
                        <th className="text-center py-4 px-4">Qtd. Títulos</th>
                        <th className="text-right py-4 px-4">Valor</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dadosPaginados.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-white/10 hover:bg-white/[0.05]"
                        >
                          <td className="py-4 px-4">{formatarData(item.data)}</td>

                          <td className="py-4 px-4 font-medium">
                            {item.paciente || "-"}
                          </td>

                          <td className="py-4 px-4 text-center">
                            {qtdTitulos(item)}
                          </td>

                          <td className="py-4 px-4 text-right font-semibold">
                            {moeda(Number(item.valor || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mt-5">
                  <p className="text-sm text-slate-400">
                    Exibindo {(paginaAtual - 1) * itensPorPagina + 1} a{" "}
                    {Math.min(paginaAtual * itensPorPagina, dadosFiltrados.length)} de{" "}
                    {dadosFiltrados.length} resultados
                  </p>

                  <div className="flex items-center gap-2">
                    {paginasVisiveis.map((pagina, index) => {
                      const paginaAnterior = paginasVisiveis[index - 1];
                      const mostrarReticencias =
                        paginaAnterior && pagina - paginaAnterior > 1;

                      return (
                        <div key={pagina} className="flex items-center gap-2">
                          {mostrarReticencias && (
                            <span className="text-slate-400">...</span>
                          )}

                          <button
                            onClick={() => setPaginaAtual(pagina)}
                            className={`w-9 h-9 rounded-xl text-sm font-semibold border transition ${
                              paginaAtual === pagina
                                ? "bg-[#0f3b82] text-white border-[#0f3b82] shadow-lg shadow-blue-950/40"
                                : "bg-white/[0.06] text-slate-300 border-white/10 hover:border-[#95c11f] hover:text-[#0f3b82]"
                            }`}
                          >
                            {pagina}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
            <h2 className="font-semibold text-lg mb-4">Indicadores do Período</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  titulo: "Dia de maior venda",
                  valor: maiorVendaItem ? formatarData(maiorVendaItem.data) : "-",
                  detalhe: moeda(maiorVenda),
                  Icon: CalendarClock,
                  bg: "bg-emerald-100",
                  cor: "text-[#16a34a]",
                },
                {
                  titulo: "Média por venda",
                  valor: moeda(ticketMedio),
                  detalhe: "por transação",
                  Icon: Tag,
                  bg: "bg-[#95c11f]/20",
                  cor: "text-[#6b7f16]",
                },
                {
                  titulo: "Maior qtd. títulos",
                  valor: `${maiorQtdTitulosItem ? qtdTitulos(maiorQtdTitulosItem) : 0} títulos`,
                  detalhe: maiorQtdTitulosItem ? `em ${formatarData(maiorQtdTitulosItem.data)}` : "-",
                  Icon: Activity,
                  bg: "bg-[#0f3b82]/10",
                  cor: "text-[#3b82f6]",
                },
                {
                  titulo: "Conversão de vendas",
                  valor: `${quantidadeVendas} vendas`,
                  detalhe: "realizadas",
                  Icon: ShoppingCart,
                  bg: "bg-[#1d4ed8]/10",
                  cor: "text-[#3b82f6]",
                },
                {
                  titulo: "Total de títulos",
                  valor: `${totalTitulos} títulos`,
                  detalhe: "no período",
                  Icon: FileText,
                  bg: "bg-[#95c11f]/20",
                  cor: "text-[#6b7f16]",
                },
                {
                  titulo: "Média por paciente",
                  valor: moeda(mediaPorPaciente),
                  detalhe: "por paciente",
                  Icon: Users,
                  bg: "bg-[#95c11f]/15",
                  cor: "text-[#16a34a]",
                },
              ].map((item) => {
                const Icon = item.Icon;

                return (
                  <div
                    key={item.titulo}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 bg-white/[0.06] hover:border-[#95c11f]/40 hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl ${item.bg} ${item.cor} flex items-center justify-center`}>
                        <Icon size={20} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-slate-400">{item.titulo}</p>
                        <h3 className={`font-bold mt-1 break-words leading-5 ${claro ? "text-slate-900" : "text-white"}`}>
                          {item.valor}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">{item.detalhe}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setModalAnalise(true)}
              className="w-full mt-5 rounded-2xl border border-[#95c11f]/30 text-[#0f3b82] font-semibold py-4 hover:bg-white/[0.08] transition flex items-center justify-center gap-2"
            >
              <Eye size={18} />
              Ver análise completa
            </button>
          </div>
        </div>

        {modalAnalise && (
          <div className="fixed inset-0 z-50 bg-[#020817]/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0b1220] p-4 shadow-2xl 2xl:p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Análise completa de vendas
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {formatarData(dataInicio)} até {formatarData(dataFim)}
                  </p>
                </div>

                <button
                  onClick={() => setModalAnalise(false)}
                  className="rounded-full border border-white/10 p-2 hover:bg-white/[0.05]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-slate-400">Total vendido</p>
                  <h3 className="text-xl font-bold text-purple-600 mt-2">
                    {moeda(totalVendido)}
                  </h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-slate-400">Mês anterior</p>
                  <h3 className="text-xl font-bold text-[#6b7f16] mt-2">
                    {moeda(totalMesAnterior)}
                  </h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-slate-400">Variação</p>
                  <h3 className="text-xl font-bold text-purple-600 mt-2">
                    {variacaoTexto}
                  </h3>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm text-slate-400">Pacientes</p>
                  <h3 className="text-xl font-bold text-white mt-2">
                    {pacientes}
                  </h3>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white/[0.04] p-4">
                <p className="text-sm text-slate-300">
                  Maior venda do período:{" "}
                  <strong>{maiorVendaItem?.paciente || "-"}</strong>, no valor de{" "}
                  <strong>{moeda(maiorVenda)}</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </AppShell>
  );
}






