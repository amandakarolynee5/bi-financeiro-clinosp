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
  Award,
  CalendarClock,
  Gauge,
  PercentCircle,
  WalletCards,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CalendarRange,
  MoreVertical,
} from "lucide-react";
import AppShell from "../components/AppShell";
import { supabase } from "../lib/supabase";
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

type ContaPaga = {
  id: string;
  data: string;
  plano_contas: string;
  descricao: string;
  valor: number;
};

type PlanoResumo = {
  nome: string;
  nomeCurto: string;
  total: number;
  percentual?: number;
};

const cores = [
  "#0f3b82",
  "#1d4ed8",
  "#2563eb",
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

  return {
    inicio: paraISO(primeiro),
    fim: paraISO(ultimo),
  };
}

export default function ContasPagasPage() {
  const periodoAtual = getPeriodoAtual();

  const [dados, setDados] = useState<ContaPaga[]>([]);
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

    let todosDados: ContaPaga[] = [];
    let inicio = 0;
    const limite = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("contas_pagas")
        .select("*")
        .gte("data", dataInicio)
        .lte("data", dataFim)
        .order("data", { ascending: false })
        .range(inicio, inicio + limite - 1);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        break;
      }

      todosDados = [...todosDados, ...data];

      if (data.length < limite) {
        break;
      }

      inicio += limite;
    }

    setDados(todosDados);
    setLoading(false);
  }

  async function carregarMesAnterior() {
    const inicio = criarDataLocal(dataInicio);

    const inicioAnterior = new Date(
      inicio.getFullYear(),
      inicio.getMonth() - 1,
      1
    );

    const fimAnterior = new Date(
      inicio.getFullYear(),
      inicio.getMonth(),
      0
    );

    let todosDados: { valor: number }[] = [];
    let pagina = 0;
    const limite = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("contas_pagas")
        .select("valor")
        .gte("data", paraISO(inicioAnterior))
        .lte("data", paraISO(fimAnterior))
        .range(pagina * limite, (pagina + 1) * limite - 1);

      if (error) {
        console.error(error);
        return;
      }

      if (!data || data.length === 0) {
        break;
      }

      todosDados = [...todosDados, ...data];

      if (data.length < limite) {
        break;
      }

      pagina++;
    }

    const total = todosDados.reduce(
      (acc, item) => acc + Number(item.valor || 0),
      0
    );

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

  function moedaCompacta(valor: number) {
    const numero = Number(valor || 0);

    if (numero >= 1000000) {
      return `R$ ${(numero / 1000000).toFixed(1).replace(".", ",")} mi`;
    }

    if (numero >= 1000) {
      return `R$ ${Math.round(numero / 1000)}k`;
    }

    return moeda(numero);
  }

  function cortarTexto(texto: string, limite = 16) {
    if (!texto) return "Sem plano";
    return texto.length > limite ? texto.slice(0, limite) + "..." : texto;
  }

  function formatarData(data: string) {
    if (!data) return "-";
    return criarDataLocal(data).toLocaleDateString("pt-BR");
  }

  function nomeMes(data: string) {
    return criarDataLocal(data).toLocaleDateString("pt-BR", {
      month: "short",
    });
  }

  function exportarCSV() {
    const cabecalho = ["Data", "Plano de Contas", "Descrição", "Valor"];

    const linhas = dadosFiltrados.map((item) => [
      formatarData(item.data),
      item.plano_contas || "",
      item.descricao || "",
      String(item.valor || 0).replace(".", ","),
    ]);

    const csv = [cabecalho, ...linhas]
      .map((linha) =>
        linha
          .map((campo) => `"${String(campo).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contas-pagas-${dataInicio}-a-${dataFim}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const totalPago = dados.reduce(
    (acc, item) => acc + Number(item.valor || 0),
    0
  );

  const quantidade = dados.length;
  const media = quantidade ? totalPago / quantidade : 0;

  const maiorPagamentoItem = [...dados].sort(
    (a, b) => Number(b.valor || 0) - Number(a.valor || 0)
  )[0];

  const maior = maiorPagamentoItem ? Number(maiorPagamentoItem.valor || 0) : 0;

  const menorPagamentoItem = [...dados].sort(
    (a, b) => Number(a.valor || 0) - Number(b.valor || 0)
  )[0];

  const menor = menorPagamentoItem ? Number(menorPagamentoItem.valor || 0) : 0;

  const porPlano = useMemo<PlanoResumo[]>(() => {
    const agrupado = Object.values(
      dados.reduce((acc: Record<string, PlanoResumo>, item) => {
        const nome = item.plano_contas || "Sem plano";

        if (!acc[nome]) {
          acc[nome] = {
            nome,
            nomeCurto: cortarTexto(nome, 22),
            total: 0,
            percentual: 0,
          };
        }

        acc[nome].total += Number(item.valor || 0);
        return acc;
      }, {})
    ).sort((a, b) => b.total - a.total);

    return agrupado.map((item) => ({
      ...item,
      percentual: totalPago > 0 ? (item.total / totalPago) * 100 : 0,
    }));
  }, [dados, totalPago]);

  const porDia = useMemo(() => {
    return Object.values(
      dados.reduce(
        (acc: Record<string, { data: string; total: number }>, item) => {
          const dia = item.data;

          if (!acc[dia]) {
            acc[dia] = {
              data: dia,
              total: 0,
            };
          }

          acc[dia].total += Number(item.valor || 0);
          return acc;
        },
        {}
      )
    ).sort(
      (a, b) =>
        criarDataLocal(a.data).getTime() - criarDataLocal(b.data).getTime()
    );
  }, [dados]);

  const porSemana = useMemo(() => {
    const base = criarDataLocal(dataInicio);
    const mes = String(base.getMonth() + 1).padStart(2, "0");
    const ultimoDia = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();

    const semanas = [
      { semana: "Semana 1", periodo: `01/${mes} - 07/${mes}`, total: 0 },
      { semana: "Semana 2", periodo: `08/${mes} - 14/${mes}`, total: 0 },
      { semana: "Semana 3", periodo: `15/${mes} - 21/${mes}`, total: 0 },
      { semana: "Semana 4", periodo: `22/${mes} - 28/${mes}`, total: 0 },
      { semana: "Semana 5", periodo: `29/${mes} - ${ultimoDia}/${mes}`, total: 0 },
    ];

    dados.forEach((item) => {
      const dia = criarDataLocal(item.data).getDate();
      const valor = Number(item.valor || 0);

      if (dia <= 7) semanas[0].total += valor;
      else if (dia <= 14) semanas[1].total += valor;
      else if (dia <= 21) semanas[2].total += valor;
      else if (dia <= 28) semanas[3].total += valor;
      else semanas[4].total += valor;
    });

    return semanas;
  }, [dados, dataInicio]);

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
        total: totalPago,
      },
    ];
  }, [dataInicio, totalMesAnterior, totalPago]);

  const topPagamentos = [...dados]
    .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))
    .slice(0, 5);

  const dadosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();

    if (!termo) return dados;

    return dados.filter((item) => {
      return (
        item.plano_contas?.toLowerCase().includes(termo) ||
        item.descricao?.toLowerCase().includes(termo) ||
        formatarData(item.data).includes(termo) ||
        String(item.valor).includes(termo)
      );
    });
  }, [dados, busca]);

  const totalPaginas = Math.max(
    1,
    Math.ceil(dadosFiltrados.length / itensPorPagina)
  );

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
      ? ((totalPago - totalMesAnterior) / totalMesAnterior) * 100
      : 0;

  const variacaoTexto = `${variacao >= 0 ? "+" : ""}${variacao
    .toFixed(1)
    .replace(".", ",")}%`;

  const percentualTop3 =
    totalPago > 0
      ? (porPlano.slice(0, 3).reduce((acc, item) => acc + item.total, 0) /
          totalPago) *
        100
      : 0;

  return (
    <AppShell>
      <div className="relative min-h-screen overflow-hidden rounded-[40px] border border-white/10 bg-[#020817] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.35)] lg:p-8">
        <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#0f3b82]/35 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[480px] w-[480px] rounded-full bg-[#95c11f]/15 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),linear-gradient(135deg,rgba(15,59,130,0.24),transparent_45%,rgba(149,193,31,0.08))]" />

        <div className="relative z-10 space-y-4 lg:space-y-5 2xl:space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-wide text-[#95c11f]">
              BI Financeiro
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white 2xl:text-4xl">
              Contas Pagas
            </h1>
            <p className="mt-1 text-sm text-slate-400 2xl:mt-2 2xl:text-base">
              Análise detalhada das despesas da clínica por período.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/importar"
              className="rounded-2xl border border-[#1d4ed8]/25 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(15,59,130,0.08)] transition hover:border-[#95c11f]/40 hover:shadow-[0_16px_36px_rgba(15,59,130,0.14)] 2xl:px-5 2xl:py-3"
            >
              Importar Planilhas
            </Link>

            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-slate-200 shadow-[0_10px_28px_rgba(15,59,130,0.07)] 2xl:gap-3 2xl:px-4 2xl:py-3">
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
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f3b82] to-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(29,78,216,0.30)] transition hover:shadow-[0_18px_42px_rgba(29,78,216,0.40)] 2xl:px-5 2xl:py-3"
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
            className="rounded-2xl border border-[#95c11f]/40 bg-[#0f1f3a] px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(15,59,130,0.22)] outline-none transition hover:border-[#95c11f] focus:border-[#95c11f] [color-scheme:dark] 2xl:py-3"
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
            className="rounded-2xl border border-[#95c11f]/40 bg-[#0f1f3a] px-5 py-2.5 text-sm font-bold text-white shadow-[0_12px_32px_rgba(15,59,130,0.22)] outline-none transition hover:border-[#95c11f] focus:border-[#95c11f] [color-scheme:dark] 2xl:py-3"
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
              titulo: "Total Pago",
              valor: moeda(totalPago),
              detalhe: variacaoTexto,
              cor: "text-[#3b82f6]",
              bg: "bg-red-50",
              iconBg: "bg-[#0f3b82]/10",
              iconColor: "text-[#3b82f6]",
              Icon: WalletCards,
            },
            {
              titulo: "Pagamentos",
              valor: quantidade,
              detalhe: "registros",
              cor: "text-white",
              bg: "bg-blue-50",
              iconBg: "bg-[#1d4ed8]/10",
              iconColor: "text-[#3b82f6]",
              Icon: FileText,
            },
            {
              titulo: "Média Diária",
              valor: moeda(media),
              detalhe: "por pagamento",
              cor: "text-[#3b82f6]",
              bg: "bg-indigo-50",
              iconBg: "bg-[#1d4ed8]/15",
              iconColor: "text-[#3b82f6]",
              Icon: Activity,
            },
            {
              titulo: "Maior Pagamento",
              valor: moeda(maior),
              detalhe: maiorPagamentoItem
                ? `em ${formatarData(maiorPagamentoItem.data)}`
                : "-",
              cor: "text-[#3b82f6]",
              bg: "bg-purple-50",
              iconBg: "bg-[#0f3b82]/10",
              iconColor: "text-[#3b82f6]",
              Icon: ArrowUpRight,
            },
            {
              titulo: "Menor Pagamento",
              valor: moeda(menor),
              detalhe: menorPagamentoItem
                ? `em ${formatarData(menorPagamentoItem.data)}`
                : "-",
              cor: "text-[#6b7f16]",
              bg: "bg-pink-50",
              iconBg: "bg-[#95c11f]/15",
              iconColor: "text-[#6b7f16]",
              Icon: ArrowDownRight,
            },
            {
              titulo: "Mês Anterior",
              valor: moeda(totalMesAnterior),
              detalhe: "comparativo",
              cor: "text-[#95c11f]",
              bg: "bg-orange-50",
              iconBg: "bg-[#95c11f]/20",
              iconColor: "text-[#6b7f16]",
              Icon: CalendarRange,
            },
          ].map((item) => {
            const Icon = item.Icon;

            return (
              <div
                key={item.titulo}
                className="
                  relative
                  min-h-[138px]
                  overflow-hidden
                  rounded-3xl
                  border
                  border-white/10
                  bg-white/[0.06]/90
                  p-4
                  pr-14
                  2xl:min-h-[152px]
                  2xl:p-5
                  2xl:pr-16
                  shadow-[0_18px_55px_rgba(0,0,0,0.28)]
                  backdrop-blur-xl
                  transition-all
                  duration-300
                  hover:-translate-y-1
                  hover:border-[#95c11f]/30
                  hover:shadow-[0_22px_55px_rgba(15,59,130,0.14)]
                "
              >
                <div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-medium">
                      {item.titulo}
                    </p>

                    <h2 className={`mt-3 whitespace-nowrap text-xl font-bold leading-tight ${item.cor} 2xl:mt-3 2xl:text-2xl`}>
                      {item.valor}
                    </h2>

                    <p className="mt-3 text-[11px] text-slate-400">
                      {item.detalhe}
                    </p>
                  </div>

                  <div
                    className={`
                      ${item.iconBg}
                      ${item.iconColor}
                      absolute
                      right-2
                      top-2
                      h-12
                      w-12
                      2xl:right-3
                      2xl:top-3
                      2xl:h-14
                      2xl:w-14
                      rounded-2xl
                      flex
                      items-center
                      justify-center
                      shrink-0
                    `}
                  >
                    <Icon size={20} strokeWidth={2.4} className="2xl:h-[23px] 2xl:w-[23px]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3 2xl:gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white 2xl:text-lg">Gastos por Plano de Contas</h2>
              <button className="text-xs font-bold text-[#3b82f6] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <div className="h-[330px] min-h-[330px] min-w-[320px] 2xl:h-[420px]"><ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={300}>
              <BarChart
                data={porPlano.slice(0, 9)}
                layout="vertical"
                margin={{ top: 8, right: 86, left: 0, bottom: 8 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(value) => `${Number(value) / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  dataKey="nomeCurto"
                  type="category"
                  width={150}
                  interval={0}
                  tick={{
                    fontSize: 11,
                    fill: "#cbd5e1",
                    fontWeight: 600,
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(v: any) => [moeda(Number(v)), "Total"]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.nome || ""
                  }
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid rgba(149,193,31,0.25)",
                    background: "#0b1220",
                    color: "#ffffff",
                    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
                  }}
                  labelStyle={{
                    color: "#95c11f",
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                  itemStyle={{
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                />

                <Bar
                  dataKey="total"
                  fill="#0f3b82"
                  radius={[0, 12, 12, 0]}
                  barSize={20}
                >
                  <LabelList
                    dataKey="total"
                    position="right"
                    formatter={(v: any) => moeda(Number(v))}
                    style={{
                      fontSize: 10,
                      fill: "#ffffff",
                      fontWeight: 700,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer></div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white 2xl:text-lg">Evolução dos Gastos (por dia)</h2>
              <button className="text-xs font-bold text-[#3b82f6] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <div className="h-[330px] min-h-[330px] min-w-[320px] 2xl:h-[420px]"><ResponsiveContainer width="100%" height="100%" minWidth={320} minHeight={300}>
              <LineChart data={porDia} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="linhaAreaPremium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f3b82" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="#0f3b82" stopOpacity={0.02} />
                  </linearGradient>
                </defs>

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
                    border: "1px solid rgba(149,193,31,0.25)",
                    background: "#0b1220",
                    color: "#ffffff",
                    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
                  }}
                  labelStyle={{
                    color: "#95c11f",
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                  itemStyle={{
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
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
            </ResponsiveContainer></div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6 min-h-[420px]">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white 2xl:text-lg">Participação das Despesas</h2>
              <button className="text-xs font-bold text-[#3b82f6] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[170px_1fr] 2xl:grid-cols-[190px_1fr] 2xl:gap-5">
              <div className="relative mx-auto flex h-[200px] min-h-[200px] w-[170px] min-w-[170px] items-center justify-center 2xl:h-[230px] 2xl:w-[190px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={170} minHeight={190}>
                  <PieChart>
                    <Pie
                      data={porPlano.slice(0, 6)}
                      dataKey="total"
                      nameKey="nome"
                      innerRadius={50}
                      outerRadius={78}
                      paddingAngle={1}
                      stroke="#020817"
                      strokeWidth={2}
                    >
                      {porPlano.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={cores[i % cores.length]} />
                      ))}

                      {porPlano.length > 6 && (
                        <Cell fill="#cbd5e1" />
                      )}
                    </Pie>

                    <Tooltip formatter={(v: any) => [moeda(Number(v)), "Total"]} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-[11px] text-slate-400 font-semibold">Total</p>
                    <p className="text-sm font-bold text-white leading-4">
                      {moeda(totalPago)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {porPlano.slice(0, 6).map((item, index) => (
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
                      {cortarTexto(item.nome, 24)}
                    </span>

                    <span className="font-bold text-white">
                      {(item.percentual || 0).toFixed(1).replace(".", ",")}%
                    </span>
                  </div>
                ))}

                {porPlano.length > 6 && (
                  <div className="grid grid-cols-[12px_1fr_auto] items-center gap-2 text-sm pt-1">
                    <span className="w-3 h-3 rounded-full bg-slate-300" />

                    <span className="text-slate-300 font-medium">
                      Outros
                    </span>

                    <span className="font-bold text-white">
                      {Math.max(
                        0,
                        100 -
                          porPlano
                            .slice(0, 6)
                            .reduce((acc, item) => acc + (item.percentual || 0), 0)
                      )
                        .toFixed(1)
                        .replace(".", ",")}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3 2xl:gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white 2xl:text-lg">Gastos por Semana</h2>
              <button className="text-xs font-bold text-[#3b82f6] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <div className="h-[260px] min-h-[260px] min-w-[300px] 2xl:h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={240}>
              <BarChart data={porSemana} margin={{ top: 25, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.18)" vertical={false} />

                <XAxis
                  dataKey="semana"
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

                <Tooltip
                  formatter={(v: any) => [moeda(Number(v)), "Total"]}
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.periodo || ""
                  }
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid rgba(149,193,31,0.25)",
                    background: "#0b1220",
                    color: "#ffffff",
                    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
                  }}
                  labelStyle={{
                    color: "#95c11f",
                    fontWeight: 800,
                    marginBottom: 6,
                  }}
                  itemStyle={{
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                />

                <Bar
                  dataKey="total"
                  fill="#1d4ed8"
                  radius={[10, 10, 0, 0]}
                  barSize={44}
                >
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
            </ResponsiveContainer></div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white 2xl:text-lg">Ranking dos Maiores Pagamentos</h2>
              <button className="text-xs font-bold text-[#3b82f6] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-slate-200">
                <thead>
                  <tr className="bg-white/[0.04] text-xs text-slate-400">
                    <th className="py-3 px-3 text-left rounded-l-xl">#</th>
                    <th className="py-3 px-3 text-left">Data</th>
                    <th className="py-3 px-3 text-left">Plano de Contas</th>
                    <th className="py-3 px-3 text-left">Descrição</th>
                    <th className="py-3 px-3 text-right rounded-r-xl">Valor</th>
                  </tr>
                </thead>

                <tbody>
                  {topPagamentos.map((item, index) => (
                    <tr key={item.id} className="border-b border-white/10 hover:bg-white/[0.05]">
                      <td className="py-3 px-3 text-sm font-bold text-slate-400">
                        {index + 1}
                      </td>
                      <td className="py-3 px-3 text-sm whitespace-nowrap">
                        {formatarData(item.data)}
                      </td>
                      <td className="py-3 px-3 text-sm font-semibold">
                        {cortarTexto(item.plano_contas, 24)}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-400">
                        {cortarTexto(item.descricao || "-", 22)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm font-bold whitespace-nowrap">
                        {moeda(Number(item.valor || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button className="w-full mt-3 text-xs font-semibold text-[#0f3b82] hover:text-purple-900">
              Ver todos
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white 2xl:text-lg">Comparativo Mensal (Total Pago)</h2>
              <button className="text-xs font-bold text-[#3b82f6] hover:text-[#95c11f]">
                Ver detalhes
              </button>
            </div>

            <div className="grid grid-cols-1 items-center gap-4 xl:grid-cols-[1fr_auto]">
              <div className="h-[260px] min-h-[260px] min-w-[300px] 2xl:h-[300px]"><ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={240}>
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

                  <Tooltip
                    formatter={(v: any) => moeda(Number(v))}
                    contentStyle={{
                      borderRadius: 16,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
                    }}
                  />

                  <Bar
                    dataKey="total"
                    fill="#0f3b82"
                    radius={[12, 12, 0, 0]}
                    barSize={58}
                  >
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
              </ResponsiveContainer></div>

              <div
                className={`rounded-2xl px-3 py-4 text-center border 2xl:px-4 2xl:py-5 ${
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

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[2fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white 2xl:text-xl">Todos os Pagamentos</h2>
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
                    placeholder="Buscar pagamento..."
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2 pl-9 pr-4 text-sm text-white outline-none placeholder:text-slate-500 sm:w-auto"
                  />
                </div>

                <div className="border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300 flex items-center gap-2 bg-white/[0.06]">
                  <CalendarDays size={15} className="text-slate-400" />
                  {formatarData(dataInicio)} - {formatarData(dataFim)}
                </div>

                <button
                  onClick={exportarCSV}
                  className="border border-[#95c11f]/30 text-[#95c11f] rounded-xl px-4 py-2 text-sm flex items-center gap-2 hover:bg-white/[0.08] transition"
                >
                  <Download size={16} />
                  Exportar
                </button>

                <button className="border border-white/10 rounded-xl w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-white/[0.04] transition">
                  <MoreVertical size={17} />
                </button>
              </div>
            </div>

            {loading ? (
              <p>Carregando...</p>
            ) : (
              <>
                <div className="overflow-auto rounded-2xl border border-white/10">
                  <table className="w-full min-w-[850px] text-slate-200">
                    <thead>
                      <tr className="bg-white/[0.04] text-sm text-slate-400">
                        <th className="text-left py-4 px-4">Data</th>
                        <th className="text-left py-4 px-4">Plano de Contas</th>
                        <th className="text-left py-4 px-4">Descrição</th>
                        <th className="text-right py-4 px-4">Valor Pago</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dadosPaginados.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-white/10 hover:bg-white/[0.05]"
                        >
                          <td className="py-4 px-4">{formatarData(item.data)}</td>

                          <td className="py-4 px-4">{item.plano_contas}</td>

                          <td className="py-4 px-4 text-slate-400">
                            {item.descricao || "-"}
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

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Ranking dos Planos de Contas
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Do maior para o menor gasto no período.
                  </p>
                </div>

                <div className="rounded-2xl border border-[#95c11f]/20 bg-[#95c11f]/10 px-3 py-2 text-xs font-bold text-[#95c11f]">
                  {porPlano.length} planos
                </div>
              </div>

              <div className="h-[2360px] overflow-auto rounded-2xl border border-white/10 2xl:h-[2575px]">
                <table className="w-full min-w-[520px] text-sm text-slate-200">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#0b1220] text-xs uppercase tracking-wide text-slate-400">
                      <th className="px-3 py-4 text-left">#</th>
                      <th className="px-3 py-4 text-left">Plano de Contas</th>
                      <th className="px-3 py-4 text-right">Total</th>
                      <th className="px-3 py-4 text-right">%</th>
                    </tr>
                  </thead>

                  <tbody>
                    {porPlano.map((item, index) => {
                      const destaque =
                        index === 0
                          ? "bg-[#1d4ed8]/15"
                          : index === 2
                          ? "bg-[#95c11f]/10"
                          : "bg-transparent";

                      return (
                        <tr
                          key={item.nome}
                          className={`border-t border-white/10 ${destaque} transition hover:bg-white/[0.08]`}
                        >
                          <td className="px-3 py-4 align-top">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-xs font-black text-slate-300">
                              {index + 1}
                            </span>
                          </td>

                          <td className="px-3 py-4 align-top">
                            <p className="font-semibold text-white" title={item.nome}>
                              {item.nome}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-right align-top font-bold text-white">
                            {moeda(item.total)}
                          </td>

                          <td className="whitespace-nowrap px-3 py-4 text-right align-top">
                            <span className="rounded-full border border-[#95c11f]/20 bg-[#95c11f]/10 px-2.5 py-1 text-xs font-black text-[#95c11f]">
                              {(item.percentual || 0).toFixed(1).replace(".", ",")}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        {modalAnalise && (
          <div className="fixed inset-0 z-50 bg-[#020817]/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#0b1220] rounded-3xl border border-white/10 max-w-2xl w-full p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Análise completa do período
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    {formatarData(dataInicio)} até {formatarData(dataFim)}
                  </p>
                </div>

                <button
                  onClick={() => setModalAnalise(false)}
                  className="rounded-full border border-white/10 p-2 hover:bg-white/[0.04]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-sm text-slate-400">Total pago</p>
                  <h3 className="text-xl font-bold text-[#0f3b82] mt-2">
                    {moeda(totalPago)}
                  </h3>
                </div>

                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-sm text-slate-400">Mês anterior</p>
                  <h3 className="text-xl font-bold text-[#95c11f] mt-2">
                    {moeda(totalMesAnterior)}
                  </h3>
                </div>

                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-sm text-slate-400">Variação</p>
                  <h3 className="text-xl font-bold text-purple-600 mt-2">
                    {variacaoTexto}
                  </h3>
                </div>

                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-sm text-slate-400">Categorias</p>
                  <h3 className="text-xl font-bold text-white mt-2">
                    {porPlano.length}
                  </h3>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-white/[0.04] p-4">
                <p className="text-sm text-slate-300">
                  Maior centro de custo:{" "}
                  <strong>{porPlano[0]?.nome || "-"}</strong>, representando{" "}
                  <strong>{moeda(porPlano[0]?.total || 0)}</strong> no período.
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

