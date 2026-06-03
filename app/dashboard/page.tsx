"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Download,
  RefreshCcw,
  WalletCards,
  BadgeDollarSign,
  TrendingUp,
  Users,
  Tag,
  ShoppingCart,
  Info,
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
} from "recharts";

type ContaPaga = {
  id: string;
  data: string;
  plano_contas: string;
  descricao?: string;
  valor: number;
};

type Recebimento = {
  id: string;
  data: string;
  paciente: string;
  especie: string;
  valor: number;
  valor_tarifas?: number;
  valor_liquido?: number;
};

type Venda = {
  id: string;
  data: string;
  paciente: string;
  valor: number;
  qtd_titulos?: number;
  quantidade_titulos?: number;
  titulos?: number;
};

const coresDespesas = ["#0f3b82", "#1d4ed8", "#2563eb", "#38bdf8", "#95c11f", "#c7ea46", "#94a3b8"];
const coresRecebimentos = ["#95c11f", "#c7ea46", "#16a34a", "#38bdf8", "#0f3b82", "#94a3b8"];
const coresVendas = ["#0f3b82", "#1d4ed8", "#2563eb", "#38bdf8", "#95c11f"];

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

function cortarTexto(texto: string, limite = 24) {
  if (!texto) return "-";
  return texto.length > limite ? texto.slice(0, limite) + "..." : texto;
}

function qtdTitulos(item: Venda) {
  return Number(item.qtd_titulos ?? item.quantidade_titulos ?? item.titulos ?? 1);
}

function valorBrutoRecebimento(item: Recebimento) {
  return Number(item.valor || 0);
}

function valorTarifaRecebimento(item: Recebimento) {
  return Number(item.valor_tarifas || 0);
}

function valorLiquidoRecebimento(item: Recebimento) {
  if (item.valor_liquido !== null && item.valor_liquido !== undefined) {
    return Number(item.valor_liquido || 0);
  }
  return valorBrutoRecebimento(item) - valorTarifaRecebimento(item);
}

function nomeEspecie(nome: string) {
  const texto = String(nome || "").toLowerCase();
  if (texto.includes("boleto") || texto.includes("compensacao") || texto.includes("compensação")) {
    return "Boleto";
  }
  return nome || "Sem espécie";
}

function agruparPorDia(lista: { data: string; valor: number }[]) {
  return Object.values(
    lista.reduce((acc: Record<string, { data: string; total: number }>, item) => {
      if (!acc[item.data]) acc[item.data] = { data: item.data, total: 0 };
      acc[item.data].total += Number(item.valor || 0);
      return acc;
    }, {})
  ).sort((a, b) => criarDataLocal(a.data).getTime() - criarDataLocal(b.data).getTime());
}

function MiniMetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06]/90 p-2.5 shadow-[0_10px_28px_rgba(15,59,130,0.07)] backdrop-blur-xl 2xl:p-3">
      <p className="text-[10px] font-medium text-slate-400 2xl:text-[11px]">{label}</p>
      <h3 className="mt-1 text-xs font-bold text-white 2xl:text-sm">{value}</h3>
    </div>
  );
}

export default function DashboardPage() {
  const periodoAtual = getPeriodoAtual();
  const [contas, setContas] = useState<ContaPaga[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(periodoAtual.inicio);
  const [dataFim, setDataFim] = useState(periodoAtual.fim);
  const [mesAnteriorContas, setMesAnteriorContas] = useState(0);
  const [mesAnteriorRecebimentos, setMesAnteriorRecebimentos] = useState(0);
  const [mesAnteriorVendas, setMesAnteriorVendas] = useState(0);

  useEffect(() => {
    carregarDados();
  }, [dataInicio, dataFim]);

  useEffect(() => {
    carregarMesAnterior();
  }, [dataInicio]);

  function moeda(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatarData(data: string) {
    if (!data) return "-";
    return criarDataLocal(data).toLocaleDateString("pt-BR");
  }

  async function buscarTodos<T>(
    tabela: string,
    campos: string,
    inicioPeriodo: string,
    fimPeriodo: string,
    ordenar = true
  ): Promise<T[]> {
    let todosDados: T[] = [];
    let inicio = 0;
    const limite = 1000;

    while (true) {
      let consulta = supabase
        .from(tabela)
        .select(campos)
        .gte("data", inicioPeriodo)
        .lte("data", fimPeriodo)
        .range(inicio, inicio + limite - 1);

      if (ordenar) {
        consulta = consulta.order("data", { ascending: false });
      }

      const { data, error } = await consulta;

      if (error) {
        console.error(error);
        return todosDados;
      }

      if (!data || data.length === 0) {
        break;
      }

      todosDados = [...todosDados, ...(data as T[])];

      if (data.length < limite) {
        break;
      }

      inicio += limite;
    }

    return todosDados;
  }

  async function carregarDados() {
    setLoading(true);

    const [contasDados, recebimentosDados, vendasDados] = await Promise.all([
      buscarTodos<ContaPaga>("contas_pagas", "*", dataInicio, dataFim),
      buscarTodos<Recebimento>("recebimentos", "*", dataInicio, dataFim),
      buscarTodos<Venda>("vendas", "*", dataInicio, dataFim),
    ]);

    setContas(contasDados);
    setRecebimentos(recebimentosDados);
    setVendas(vendasDados);
    setLoading(false);
  }

  async function carregarMesAnterior() {
    const inicio = criarDataLocal(dataInicio);
    const inicioISO = paraISO(new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1));
    const fimISO = paraISO(new Date(inicio.getFullYear(), inicio.getMonth(), 0));

    const [contasDados, recebimentosDados, vendasDados] = await Promise.all([
      buscarTodos<Pick<ContaPaga, "valor">>("contas_pagas", "valor", inicioISO, fimISO, false),
      buscarTodos<Pick<Recebimento, "valor" | "valor_tarifas" | "valor_liquido">>("recebimentos", "valor, valor_tarifas, valor_liquido", inicioISO, fimISO, false),
      buscarTodos<Pick<Venda, "valor">>("vendas", "valor", inicioISO, fimISO, false),
    ]);

    setMesAnteriorContas(contasDados.reduce((acc, item) => acc + Number(item.valor || 0), 0));

    setMesAnteriorRecebimentos(
      recebimentosDados.reduce((acc: number, item: any) => {
        const liquido =
          item.valor_liquido !== null && item.valor_liquido !== undefined
            ? Number(item.valor_liquido || 0)
            : Number(item.valor || 0) - Number(item.valor_tarifas || 0);
        return acc + liquido;
      }, 0)
    );

    setMesAnteriorVendas(vendasDados.reduce((acc, item) => acc + Number(item.valor || 0), 0));
  }


  const totalContas = contas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const totalRecebidoBruto = recebimentos.reduce((acc, item) => acc + valorBrutoRecebimento(item), 0);
  const totalTaxasRecebimento = recebimentos.reduce((acc, item) => acc + valorTarifaRecebimento(item), 0);
  const totalRecebido = recebimentos.reduce((acc, item) => acc + valorLiquidoRecebimento(item), 0);
  const totalVendido = vendas.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  const resultadoLiquido = totalRecebido - totalContas;
  const ticketMedio = vendas.length ? totalVendido / vendas.length : 0;
  const quantidadeVendas = vendas.length;

  const variacaoContas = mesAnteriorContas > 0 ? ((totalContas - mesAnteriorContas) / mesAnteriorContas) * 100 : 0;
  const variacaoRecebimentos = mesAnteriorRecebimentos > 0 ? ((totalRecebido - mesAnteriorRecebimentos) / mesAnteriorRecebimentos) * 100 : 0;
  const variacaoVendas = mesAnteriorVendas > 0 ? ((totalVendido - mesAnteriorVendas) / mesAnteriorVendas) * 100 : 0;
  const liquidoAnterior = mesAnteriorRecebimentos - mesAnteriorContas;
  const variacaoLiquido = liquidoAnterior > 0 ? ((resultadoLiquido - liquidoAnterior) / liquidoAnterior) * 100 : 0;

  const porPlano = useMemo(() => {
    const mapa = contas.reduce((acc: Record<string, { nome: string; total: number }>, item) => {
      const nome = item.plano_contas || "Sem plano";
      if (!acc[nome]) acc[nome] = { nome, total: 0 };
      acc[nome].total += Number(item.valor || 0);
      return acc;
    }, {});
    const lista = Object.values(mapa).sort((a, b) => b.total - a.total);
    const top6 = lista.slice(0, 6);
    const outros = lista.slice(6).reduce((acc, item) => acc + item.total, 0);
    return outros > 0 ? [...top6, { nome: "Outros", total: outros }] : top6;
  }, [contas]);

  const porEspecie = useMemo(() => {
    const mapa = recebimentos.reduce((acc: Record<string, { nome: string; total: number }>, item) => {
      const nome = nomeEspecie(item.especie);
      if (!acc[nome]) acc[nome] = { nome, total: 0 };
      acc[nome].total += valorLiquidoRecebimento(item);
      return acc;
    }, {});
    return Object.values(mapa).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [recebimentos]);

  const vendasPorFaixa = useMemo(() => {
    const faixas = [
      { nome: "Até R$ 1.000", total: 0 },
      { nome: "R$ 1 mil a R$ 5 mil", total: 0 },
      { nome: "R$ 5 mil a R$ 15 mil", total: 0 },
      { nome: "R$ 15 mil a R$ 30 mil", total: 0 },
      { nome: "Acima de R$ 30 mil", total: 0 },
    ];

    vendas.forEach((item) => {
      const valor = Number(item.valor || 0);

      if (valor <= 1000) {
        faixas[0].total += valor;
      } else if (valor <= 5000) {
        faixas[1].total += valor;
      } else if (valor <= 15000) {
        faixas[2].total += valor;
      } else if (valor <= 30000) {
        faixas[3].total += valor;
      } else {
        faixas[4].total += valor;
      }
    });

    return faixas;
  }, [vendas]);

  const contasPorDia = useMemo(() => agruparPorDia(contas), [contas]);
  const recebimentosPorDia = useMemo(
    () => agruparPorDia(recebimentos.map((item) => ({
      data: item.data,
      valor: valorLiquidoRecebimento(item),
    }))),
    [recebimentos]
  );
  const vendasPorDia = useMemo(() => agruparPorDia(vendas), [vendas]);

  const cardsResumo = [
    { titulo: "Total Contas Pagas", valor: moeda(totalContas), variacao: variacaoContas, cor: "text-[#3b82f6]", iconBg: "bg-[#0f3b82]/10", iconColor: "text-[#0f3b82]", Icon: WalletCards },
    { titulo: "Recebido Bruto", valor: moeda(totalRecebidoBruto), variacao: 0, cor: "text-white", iconBg: "bg-[#1d4ed8]/15", iconColor: "text-[#3b82f6]", Icon: BadgeDollarSign },
    { titulo: "Taxas Recebimento", valor: moeda(totalTaxasRecebimento), variacao: 0, cor: "text-[#6b7f16]", iconBg: "bg-[#95c11f]/15", iconColor: "text-[#6b7f16]", Icon: Tag },
    { titulo: "Recebido Líquido", valor: moeda(totalRecebido), variacao: variacaoRecebimentos, cor: "text-[#16a34a]", iconBg: "bg-[#95c11f]/20", iconColor: "text-[#16a34a]", Icon: TrendingUp },
    { titulo: "Total Vendido", valor: moeda(totalVendido), variacao: variacaoVendas, cor: "text-[#3b82f6]", iconBg: "bg-[#1d4ed8]/10", iconColor: "text-[#1d4ed8]", Icon: ShoppingCart },
    { titulo: "Resultado Líquido", valor: moeda(resultadoLiquido), variacao: variacaoLiquido, cor: resultadoLiquido >= 0 ? "text-[#95c11f]" : "text-red-500", iconBg: "bg-[#95c11f]/20", iconColor: "text-[#6b7f16]", Icon: Users },
  ];

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
            <p className="text-sm font-bold tracking-wide text-[#95c11f]">BI Financeiro</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-white 2xl:text-4xl">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400 2xl:mt-2 2xl:text-base">Resumo geral do financeiro, recebimentos e vendas.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/importar" className="flex items-center gap-2 rounded-2xl border border-[#1d4ed8]/25 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-[#0f3b82] shadow-[0_10px_28px_rgba(15,59,130,0.08)] transition hover:border-[#95c11f]/40 hover:shadow-[0_16px_36px_rgba(15,59,130,0.14)] 2xl:px-5 2xl:py-3">
              <Download size={16} />
              Importar Planilhas
            </Link>
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm shadow-[0_10px_28px_rgba(15,59,130,0.07)] 2xl:gap-3 2xl:px-4 2xl:py-3">
              <CalendarDays size={18} className="text-[#0f3b82]" />
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="bg-transparent outline-none text-sm text-slate-200 [color-scheme:dark]" />
              <span className="text-slate-400">até</span>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="bg-transparent outline-none text-sm text-slate-200 [color-scheme:dark]" />
            </div>
            <button onClick={carregarDados} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f3b82] to-[#1d4ed8] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_35px_rgba(29,78,216,0.30)] transition hover:shadow-[0_18px_42px_rgba(29,78,216,0.40)] 2xl:px-5 2xl:py-3">
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
            value={String(criarDataLocal(dataInicio).getMonth())}
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
            value={String(criarDataLocal(dataInicio).getFullYear())}
          >
            <option className="bg-[#0f1f3a] text-white" value="2025">2025</option>
            <option className="bg-[#0f1f3a] text-white" value="2026">2026</option>
            <option className="bg-[#0f1f3a] text-white" value="2027">2027</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 2xl:gap-4">
          {cardsResumo.map((item) => {
            const Icon = item.Icon;
            const variacaoTexto = `${item.variacao >= 0 ? "+" : ""}${item.variacao.toFixed(1).replace(".", ",")}%`;
            return (
              <div key={item.titulo} className="relative min-h-[138px] overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]/90 p-4 pr-14 shadow-[0_18px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-[#95c11f]/30 hover:shadow-[0_22px_55px_rgba(15,59,130,0.14)] 2xl:min-h-[152px] 2xl:p-5 2xl:pr-16">
                <div className={`${item.iconBg} ${item.iconColor} absolute right-2 top-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl 2xl:right-3 2xl:top-3 2xl:h-14 2xl:w-14`}>
                  <Icon size={21} strokeWidth={2.4} className="2xl:h-[24px] 2xl:w-[24px]" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-400">{item.titulo}</p>
                  <h2 className={`mt-3 whitespace-nowrap text-xl font-bold leading-tight ${item.cor} 2xl:mt-4 2xl:text-2xl`}>
                    {item.valor}
                  </h2>
                  <p className={`mt-3 text-[11px] font-semibold ${item.variacao >= 0 ? "text-[#16a34a]" : "text-red-500"}`}>{variacaoTexto} vs mês anterior</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3 2xl:gap-6">
          <ResumoContas total={totalContas} media={contas.length ? totalContas / contas.length : 0} quantidade={contas.length} maior={Math.max(0, ...contas.map((i) => Number(i.valor || 0)))} porPlano={porPlano} porDia={contasPorDia} ultimos={contas.slice(0, 5)} moeda={moeda} formatarData={formatarData} />
          <ResumoRecebimentos total={totalRecebido} bruto={totalRecebidoBruto} taxas={totalTaxasRecebimento} media={recebimentos.length ? totalRecebido / recebimentos.length : 0} quantidade={recebimentos.length} maior={Math.max(0, ...recebimentos.map((i) => valorLiquidoRecebimento(i)))} porEspecie={porEspecie} porDia={recebimentosPorDia} ultimos={recebimentos.slice(0, 5)} moeda={moeda} formatarData={formatarData} />
          <ResumoVendas total={totalVendido} ticketMedio={ticketMedio} quantidade={quantidadeVendas} maior={Math.max(0, ...vendas.map((i) => Number(i.valor || 0)))} vendasPorDia={vendasPorDia} vendasPorFaixa={vendasPorFaixa} ultimas={vendas.slice(0, 5)} moeda={moeda} formatarData={formatarData} />
        </div>

        {loading && <p className="text-center text-sm text-slate-400">Atualizando dados do dashboard...</p>}

        <p className="flex items-center justify-center gap-2 pb-4 text-center text-xs font-medium text-slate-400">
          <Info size={14} />
          Os dados são atualizados automaticamente após a importação das planilhas.
        </p>
        </div>
      </div>
    </AppShell>
  );
}

function ResumoContas({ total, media, quantidade, maior, porPlano, porDia, ultimos, moeda, formatarData }: { total: number; media: number; quantidade: number; maior: number; porPlano: { nome: string; total: number }[]; porDia: { data: string; total: number }[]; ultimos: ContaPaga[]; moeda: (v: number) => string; formatarData: (d: string) => string; }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]/95 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:min-h-[760px]">
      <div className="border-b border-white/10 p-4 2xl:p-5">
        <h2 className="font-bold text-[#0f3b82]">Contas Pagas</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4 2xl:gap-3">
          <MiniMetricCard label="Total Pago" value={moeda(total)} />
          <MiniMetricCard label="Média Diária" value={moeda(media)} />
          <MiniMetricCard label="Pagamentos" value={quantidade} />
          <MiniMetricCard label="Maior Pagamento" value={moeda(maior)} />
        </div>
      </div>
      <PizzaResumo titulo="Gastos por Plano de Contas" total={total} dados={porPlano} cores={coresDespesas} moeda={moeda} />
      <LinhaResumo titulo="Evolução das Contas Pagas" dados={porDia} cor="#0f3b82" moeda={moeda} />
      <TabelaContas ultimos={ultimos} moeda={moeda} formatarData={formatarData} />
    </div>
  );
}

function ResumoRecebimentos({ total, bruto, taxas, media, quantidade, maior, porEspecie, porDia, ultimos, moeda, formatarData }: { total: number; bruto: number; taxas: number; media: number; quantidade: number; maior: number; porEspecie: { nome: string; total: number }[]; porDia: { data: string; total: number }[]; ultimos: Recebimento[]; moeda: (v: number) => string; formatarData: (d: string) => string; }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]/95 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:min-h-[760px]">
      <div className="border-b border-white/10 p-4 2xl:p-5">
        <h2 className="font-bold text-[#16a34a]">Valores Recebidos</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4 2xl:gap-3">
          <MiniMetricCard label="Valor Bruto" value={moeda(bruto)} />
          <MiniMetricCard label="Taxas" value={moeda(taxas)} />
          <MiniMetricCard label="Valor Líquido" value={moeda(total)} />
          <MiniMetricCard label="Maior Líquido" value={moeda(maior)} />
        </div>
      </div>
      <PizzaResumo titulo="Recebimentos por Espécie" total={total} dados={porEspecie} cores={coresRecebimentos} moeda={moeda} />
      <LinhaResumo titulo="Evolução dos Recebimentos" dados={porDia} cor="#95c11f" moeda={moeda} />
      <TabelaRecebimentos ultimos={ultimos} moeda={moeda} formatarData={formatarData} />
    </div>
  );
}

function ResumoVendas({ total, ticketMedio, quantidade, maior, vendasPorDia, vendasPorFaixa, ultimas, moeda, formatarData }: { total: number; ticketMedio: number; quantidade: number; maior: number; vendasPorDia: { data: string; total: number }[]; vendasPorFaixa: { nome: string; total: number }[]; ultimas: Venda[]; moeda: (v: number) => string; formatarData: (d: string) => string; }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06]/95 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:min-h-[760px]">
      <div className="border-b border-white/10 p-4 2xl:p-5">
        <h2 className="font-bold text-[#1d4ed8]">Vendas</h2>
        <div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4 2xl:gap-3">
          <MiniMetricCard label="Total Vendido" value={moeda(total)} />
          <MiniMetricCard label="Ticket Médio" value={moeda(ticketMedio)} />
          <MiniMetricCard label="Vendas" value={quantidade} />
          <MiniMetricCard label="Maior Venda" value={moeda(maior)} />
        </div>
      </div>
      <LinhaResumo titulo="Evolução das Vendas" dados={vendasPorDia} cor="#1d4ed8" moeda={moeda} altura={190} />
      <div className="border-b border-white/10 p-4 2xl:p-5">
        <h3 className="font-semibold text-sm mb-3">Distribuição por Faixa de Valor</h3>
        <div className="h-[220px] min-h-[220px] min-w-[280px] 2xl:h-[260px]"><ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
          <BarChart
            data={vendasPorFaixa}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
            barCategoryGap={18}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#dbeafe"
              horizontal={false}
            />

            <XAxis type="number" hide />

            <YAxis
              type="category"
              dataKey="nome"
              width={160}
              tick={{
                fontSize: 11,
                fill: "#36577d",
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              formatter={(v: any) => [moeda(Number(v)), "Total"]}
              labelFormatter={(label) =>
                criarDataLocal(String(label)).toLocaleDateString("pt-BR")
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
              radius={[0, 10, 10, 0]}
              barSize={20}
            />
          </BarChart>
        </ResponsiveContainer></div>
      </div>
      <TabelaVendas ultimas={ultimas} moeda={moeda} formatarData={formatarData} />
    </div>
  );
}

function PizzaResumo({ titulo, total, dados, cores, moeda }: { titulo: string; total: number; dados: { nome: string; total: number }[]; cores: string[]; moeda: (v: number) => string; }) {
  return (
    <div className="border-b border-white/10 p-4 2xl:p-5">
      <h3 className="font-semibold text-sm mb-3">{titulo}</h3>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[160px_1fr] 2xl:grid-cols-[170px_1fr] 2xl:gap-4 items-center">
        <div className="relative h-[190px] min-h-[190px] min-w-[160px] 2xl:h-[210px] 2xl:min-h-[210px]">
          <ResponsiveContainer width="100%" height="100%" minWidth={160} minHeight={180}>
            <PieChart>
              <Pie data={dados} dataKey="total" nameKey="nome" innerRadius={48} outerRadius={76} paddingAngle={1} stroke="#ffffff" strokeWidth={2}>
                {dados.map((_, index) => <Cell key={index} fill={cores[index % cores.length]} />)}
              </Pie>
              <Tooltip
              formatter={(v: any) => [moeda(Number(v)), "Total"]}
              labelFormatter={(label) =>
                criarDataLocal(String(label)).toLocaleDateString("pt-BR")
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
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-[11px] text-slate-400 font-semibold">Total</p>
              <p className="text-xs font-bold text-white">{moeda(total)}</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          {dados.slice(0, 7).map((item, index) => (
            <div key={item.nome} className="grid grid-cols-[10px_1fr_auto] gap-2 items-center text-xs">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cores[index % cores.length] }} />
              <span className="truncate text-slate-300">{cortarTexto(item.nome, 24)}</span>
              <span className="font-semibold">{moeda(item.total)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LinhaResumo({ titulo, dados, cor, moeda, altura = 170 }: { titulo: string; dados: { data: string; total: number }[]; cor: string; moeda: (v: number) => string; altura?: number; }) {
  return (
    <div className="border-b border-white/10 p-4 2xl:p-5">
      <h3 className="mb-3 text-sm font-semibold">{titulo}</h3>
      <div style={{ height: Number(altura) || 170 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={260} minHeight={150}>
          <LineChart data={dados}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
            <XAxis dataKey="data" tickFormatter={(v) => criarDataLocal(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Number(v) / 1000}k`} />
            <Tooltip
              formatter={(v: any) => [moeda(Number(v)), "Total"]}
              labelFormatter={(label) =>
                criarDataLocal(String(label)).toLocaleDateString("pt-BR")
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
            <Line type="monotone" dataKey="total" stroke={cor} strokeWidth={2} dot={{ r: 2, fill: cor }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TabelaContas({ ultimos, moeda, formatarData }: { ultimos: ContaPaga[]; moeda: (valor: number) => string; formatarData: (data: string) => string; }) {
  return (
    <div className="p-5">
      <h3 className="font-bold text-sm text-[#0f3b82] mb-3">Últimos Pagamentos</h3>
      <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-xs">
        <thead><tr className="bg-white/[0.04] text-slate-400"><th className="text-left py-3 px-2">Data</th><th className="text-left py-3 px-2">Plano</th><th className="text-left py-3 px-2">Descrição</th><th className="text-right py-3 px-2">Valor</th></tr></thead>
        <tbody>{ultimos.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="py-3 px-2">{formatarData(item.data)}</td><td className="py-3 px-2">{cortarTexto(item.plano_contas, 18)}</td><td className="py-3 px-2 text-slate-400">{cortarTexto(item.descricao || "-", 18)}</td><td className="py-3 px-2 text-right font-semibold">{moeda(Number(item.valor || 0))}</td></tr>)}</tbody>
      </table></div>
      <Link href="/contas-pagas" className="block text-center mt-4 text-xs font-bold text-[#0f3b82]">Ver todos os pagamentos</Link>
    </div>
  );
}

function TabelaRecebimentos({ ultimos, moeda, formatarData }: { ultimos: Recebimento[]; moeda: (valor: number) => string; formatarData: (data: string) => string; }) {
  return (
    <div className="p-5">
      <h3 className="font-bold text-sm text-[#16a34a] mb-3">Últimos Recebimentos</h3>
      <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-xs">
        <thead><tr className="bg-white/[0.04] text-slate-400"><th className="text-left py-3 px-2">Data</th><th className="text-left py-3 px-2">Paciente</th><th className="text-left py-3 px-2">Espécie</th><th className="text-right py-3 px-2">Líquido</th></tr></thead>
        <tbody>{ultimos.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="py-3 px-2">{formatarData(item.data)}</td><td className="py-3 px-2">{cortarTexto(item.paciente, 18)}</td><td className="py-3 px-2 text-slate-400">{cortarTexto(nomeEspecie(item.especie), 16)}</td><td className="py-3 px-2 text-right font-semibold text-[#16a34a]">{moeda(valorLiquidoRecebimento(item))}</td></tr>)}</tbody>
      </table></div>
      <Link href="/valores-recebidos" className="block text-center mt-4 text-xs font-bold text-[#16a34a]">Ver todos os recebimentos</Link>
    </div>
  );
}

function TabelaVendas({ ultimas, moeda, formatarData }: { ultimas: Venda[]; moeda: (valor: number) => string; formatarData: (data: string) => string; }) {
  return (
    <div className="p-5">
      <h3 className="font-bold text-sm text-[#1d4ed8] mb-3">Últimas Vendas</h3>
      <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-xs">
        <thead><tr className="bg-white/[0.04] text-slate-400"><th className="text-left py-3 px-2">Data</th><th className="text-left py-3 px-2">Paciente</th><th className="text-center py-3 px-2">Qtd.</th><th className="text-right py-3 px-2">Valor</th></tr></thead>
        <tbody>{ultimas.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="py-3 px-2">{formatarData(item.data)}</td><td className="py-3 px-2">{cortarTexto(item.paciente, 18)}</td><td className="py-3 px-2 text-center">{qtdTitulos(item)}</td><td className="py-3 px-2 text-right font-semibold">{moeda(Number(item.valor || 0))}</td></tr>)}</tbody>
      </table></div>
      <Link href="/vendas" className="block text-center mt-4 text-xs font-bold text-[#1d4ed8]">Ver todas as vendas</Link>
    </div>
  );
}









