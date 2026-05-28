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
  CreditCard,
  CalendarClock,
  Gauge,
  PercentCircle,
  BadgeDollarSign,
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

type ValorRecebido = {
  id: string;
  data: string;
  paciente: string;
  especie: string;
  valor: number;
  valor_tarifas?: number;
  valor_liquido?: number;
};

type EspecieResumo = {
  nome: string;
  nomeCurto: string;
  total: number;
  percentual?: number;
};

const cores = ["#95c11f", "#c7ea46", "#16a34a", "#38bdf8", "#0f3b82", "#1d4ed8", "#94a3b8"];
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


  function renderTickEspecie(props: any) {
    const { x, y, payload } = props;

    const texto = String(payload.value || "");
    const palavras = texto.split(" ");

    let linha1 = "";
    let linha2 = "";

    palavras.forEach((palavra) => {
      if ((linha1 + " " + palavra).trim().length <= 10) {
        linha1 = (linha1 + " " + palavra).trim();
      } else {
        linha2 = (linha2 + " " + palavra).trim();
      }
    });

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={14}
          textAnchor="middle"
          fill="#36577d"
          fontSize={11}
          fontWeight={600}
        >
          {linha1}
        </text>

        {linha2 && (
          <text
            x={0}
            y={16}
            dy={14}
            textAnchor="middle"
            fill="#36577d"
            fontSize={11}
            fontWeight={600}
          >
            {linha2}
          </text>
        )}
      </g>
    );
  }


export default function ValoresRecebidosPage() {
  const periodoAtual = getPeriodoAtual();
  const [dados, setDados] = useState<ValorRecebido[]>([]);
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
      .from("recebimentos")
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
      .from("recebimentos")
      .select("valor, valor_tarifas, valor_liquido")
      .gte("data", paraISO(inicioAnterior))
      .lte("data", paraISO(fimAnterior));

    if (error) {
      console.error(error);
      return;
    }

    const total = (data || []).reduce((acc: number, item: any) => {
      const liquido =
        item.valor_liquido !== null && item.valor_liquido !== undefined
          ? Number(item.valor_liquido || 0)
          : Number(item.valor || 0) - Number(item.valor_tarifas || 0);

      return acc + liquido;
    }, 0);

    setTotalMesAnterior(total);
  }

  function moeda(valor: number) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function valorBruto(item: ValorRecebido) {
    return Number(item.valor || 0);
  }

  function valorTarifa(item: ValorRecebido) {
    return Number(item.valor_tarifas || 0);
  }

  function valorLiquido(item: ValorRecebido) {
    if (item.valor_liquido !== null && item.valor_liquido !== undefined) {
      return Number(item.valor_liquido || 0);
    }

    return valorBruto(item) - valorTarifa(item);
  }

  function nomeEspecie(nome: string) {
    const texto = String(nome || "").toLowerCase();

    if (
      texto.includes("boleto") ||
      texto.includes("compensacao") ||
      texto.includes("compensação")
    ) {
      return "Boleto";
    }

    return nome || "Sem espécie";
  }

  function cortarTexto(texto: string, limite = 18) {
    if (!texto) return "-";
    return texto.length > limite ? texto.slice(0, limite) + "..." : texto;
  }

  function formatarData(data: string) {
    if (!data) return "-";
    return criarDataLocal(data).toLocaleDateString("pt-BR");
  }

  function aplicarPeriodoRapido(tipo: "mesAtual" | "janeiro" | "fevereiro" | "ano") {
    if (tipo === "janeiro") {
      setDataInicio("2026-01-01");
      setDataFim("2026-01-31");
    }
    if (tipo === "fevereiro") {
      setDataInicio("2026-02-01");
      setDataFim("2026-02-28");
    }
    if (tipo === "ano") {
      setDataInicio("2026-01-01");
      setDataFim("2026-12-31");
    }
    if (tipo === "mesAtual") {
      setDataInicio(periodoAtual.inicio);
      setDataFim(periodoAtual.fim);
    }
  }

  function exportarCSV() {
    const cabecalho = ["Data", "Paciente", "Espécie", "Valor Bruto", "Tarifas", "Valor Líquido"];
    const linhas = dadosFiltrados.map((item) => [
      formatarData(item.data),
      item.paciente || "",
      nomeEspecie(item.especie),
      String(valorBruto(item)).replace(".", ","),
      String(valorTarifa(item)).replace(".", ","),
      String(valorLiquido(item)).replace(".", ","),
    ]);

    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(";"))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `valores-recebidos-${dataInicio}-a-${dataFim}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const totalBruto = dados.reduce((acc, item) => acc + valorBruto(item), 0);
  const totalTaxas = dados.reduce((acc, item) => acc + valorTarifa(item), 0);
  const totalRecebido = dados.reduce((acc, item) => acc + valorLiquido(item), 0);

  const quantidade = dados.length;
  const media = quantidade ? totalRecebido / quantidade : 0;

  const maiorRecebimentoItem = [...dados].sort((a, b) => valorLiquido(b) - valorLiquido(a))[0];
  const maior = maiorRecebimentoItem ? valorLiquido(maiorRecebimentoItem) : 0;

  const pacientesPagantes = new Set(
    dados.map((item) => item.paciente).filter(Boolean).map((nome) => nome.toLowerCase().trim())
  ).size;

  const porEspecie = useMemo<EspecieResumo[]>(() => {
    const agrupado = Object.values(
      dados.reduce((acc: Record<string, EspecieResumo>, item) => {
        const nome = nomeEspecie(item.especie);
        if (!acc[nome]) {
          acc[nome] = { nome, nomeCurto: cortarTexto(nome, 18), total: 0, percentual: 0 };
        }
        acc[nome].total += valorLiquido(item);
        return acc;
      }, {})
    ).sort((a, b) => b.total - a.total);

    return agrupado.map((item) => ({ ...item, percentual: totalRecebido > 0 ? (item.total / totalRecebido) * 100 : 0 }));
  }, [dados, totalRecebido]);

  const porDia = useMemo(() => {
    return Object.values(
      dados.reduce((acc: Record<string, { data: string; total: number }>, item) => {
        const dia = item.data;
        if (!acc[dia]) acc[dia] = { data: dia, total: 0 };
        acc[dia].total += valorLiquido(item);
        return acc;
      }, {})
    ).sort((a, b) => criarDataLocal(a.data).getTime() - criarDataLocal(b.data).getTime());
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
      const valor = valorLiquido(item);
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
      { mes: anterior.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }), total: totalMesAnterior },
      { mes: atual.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }), total: totalRecebido },
    ];
  }, [dataInicio, totalMesAnterior, totalRecebido]);

  const topRecebimentos = [...dados].sort((a, b) => valorLiquido(b) - valorLiquido(a)).slice(0, 5);

  const dadosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    if (!termo) return dados;
    return dados.filter((item) => {
      return (
        item.paciente?.toLowerCase().includes(termo) ||
        nomeEspecie(item.especie).toLowerCase().includes(termo) ||
        formatarData(item.data).includes(termo) ||
        String(valorBruto(item)).includes(termo) ||
        String(valorTarifa(item)).includes(termo) ||
        String(valorLiquido(item)).includes(termo)
      );
    });
  }, [dados, busca]);

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / itensPorPagina));
  const dadosPaginados = dadosFiltrados.slice((paginaAtual - 1) * itensPorPagina, paginaAtual * itensPorPagina);

  const paginasVisiveis = useMemo(() => {
    if (totalPaginas <= 10) return Array.from({ length: totalPaginas }, (_, index) => index + 1);
    const paginas = new Set<number>([1, totalPaginas]);
    for (let pagina = paginaAtual - 1; pagina <= paginaAtual + 1; pagina++) {
      if (pagina > 1 && pagina < totalPaginas) paginas.add(pagina);
    }
    return Array.from(paginas).sort((a, b) => a - b);
  }, [paginaAtual, totalPaginas]);

  const variacao = totalMesAnterior > 0 ? ((totalRecebido - totalMesAnterior) / totalMesAnterior) * 100 : 0;
  const variacaoTexto = `${variacao >= 0 ? "+" : ""}${variacao.toFixed(1).replace(".", ",")}%`;

  const especieMaisUsada = porEspecie[0];
  const percentualPix = porEspecie.find((item) => item.nome.toLowerCase().includes("pix"))?.percentual || 0;

  return (
    <AppShell>
      <div className="min-h-screen space-y-6 bg-[radial-gradient(circle_at_top_left,rgba(15,59,130,0.13),transparent_34%),linear-gradient(135deg,#f8fbff_0%,#ffffff_42%,#f3f8ea_100%)] p-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-wide text-[#0f3b82]">BI Financeiro</p>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#020817]">Valores Recebidos</h1>
            <p className="mt-2 text-[#4b6380]">Análise detalhada dos recebimentos por período.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/importar" className="rounded-2xl border border-[#0f3b82]/20 bg-white px-5 py-3 font-semibold text-[#0f3b82] shadow-[0_10px_28px_rgba(15,59,130,0.08)] transition hover:border-[#95c11f]/40 hover:shadow-[0_16px_36px_rgba(15,59,130,0.14)]">
              Importar Planilhas
            </Link>

            <div className="flex items-center gap-3 rounded-2xl border border-[#dbeafe] bg-white px-4 py-3 shadow-[0_10px_28px_rgba(15,59,130,0.07)]">
              <CalendarDays size={18} className="text-[#0f3b82]" />
              <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="outline-none text-sm" />
              <span className="text-slate-400">até</span>
              <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="outline-none text-sm" />
            </div>

            <button onClick={carregarDados} className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0f3b82] to-[#1d4ed8] px-5 py-3 font-semibold text-white shadow-[0_14px_35px_rgba(29,78,216,0.30)] transition hover:shadow-[0_18px_42px_rgba(29,78,216,0.40)]">
              <RefreshCcw size={16} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            onChange={(e) => {
              const mes = Number(e.target.value);

              const inicio = new Date(2026, mes, 1);
              const fim = new Date(2026, mes + 1, 0);

              setDataInicio(paraISO(inicio));
              setDataFim(paraISO(fim));
            }}
            className="rounded-2xl border border-[#dbeafe] bg-white px-4 py-3 text-sm font-semibold text-[#0f2747] shadow-[0_10px_28px_rgba(15,59,130,0.07)] outline-none transition hover:border-[#0f3b82]/40 focus:border-[#95c11f]"
          >
            <option value="0">Janeiro</option>
            <option value="1">Fevereiro</option>
            <option value="2">Março</option>
            <option value="3">Abril</option>
            <option value="4">Maio</option>
            <option value="5">Junho</option>
            <option value="6">Julho</option>
            <option value="7">Agosto</option>
            <option value="8">Setembro</option>
            <option value="9">Outubro</option>
            <option value="10">Novembro</option>
            <option value="11">Dezembro</option>
          </select>

          <select
            className="rounded-2xl border border-[#dbeafe] bg-white px-4 py-3 text-sm font-semibold text-[#0f2747] shadow-[0_10px_28px_rgba(15,59,130,0.07)] outline-none transition hover:border-[#0f3b82]/40 focus:border-[#95c11f]"
          >
            <option>2026</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { titulo: "Valor Bruto", valor: moeda(totalBruto), detalhe: "antes das taxas", cor: "text-[#020817]", iconBg: "bg-[#dbeafe]", iconColor: "text-[#0f3b82]", Icon: WalletCards },
            { titulo: "Total de Taxas", valor: moeda(totalTaxas), detalhe: "tarifas descontadas", cor: "text-[#6b7f16]", iconBg: "bg-[#95c11f]/15", iconColor: "text-[#6b7f16]", Icon: FileText },
            { titulo: "Valor Líquido", valor: moeda(totalRecebido), detalhe: variacaoTexto, cor: "text-[#16a34a]", iconBg: "bg-[#95c11f]/20", iconColor: "text-[#16a34a]", Icon: BadgeDollarSign },
            { titulo: "Média Líquida", valor: moeda(media), detalhe: "por transação", cor: "text-[#1d4ed8]", iconBg: "bg-[#dbeafe]", iconColor: "text-[#0f3b82]", Icon: Activity },
            { titulo: "Maior Líquido", valor: moeda(maior), detalhe: maiorRecebimentoItem ? `em ${formatarData(maiorRecebimentoItem.data)}` : "-", cor: "text-[#16a34a]", iconBg: "bg-[#95c11f]/20", iconColor: "text-[#16a34a]", Icon: ArrowUpRight },
            { titulo: "Pacientes Pagantes", valor: pacientesPagantes, detalhe: "pacientes únicos", cor: "text-[#0f3b82]", iconBg: "bg-[#0f3b82]/10", iconColor: "text-[#0f3b82]", Icon: Users },
          ].map((item) => {
            const Icon = item.Icon;
            return (
              <div key={item.titulo} className="rounded-3xl border border-[#dbeafe] bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,59,130,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#95c11f]/30 hover:shadow-[0_22px_55px_rgba(15,59,130,0.14)]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-medium">{item.titulo}</p>
                    <h2 className={`text-2xl font-bold mt-3 ${item.cor}`}>{item.valor}</h2>
                    <p className="text-[11px] text-slate-400 mt-2">{item.detalhe}</p>
                  </div>
                  <div className={`${item.iconBg} ${item.iconColor} w-12 h-12 rounded-2xl flex items-center justify-center shrink-0`}>
                    <Icon size={23} strokeWidth={2.4} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          <div className="min-h-[420px] rounded-3xl border border-[#dbeafe] bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,59,130,0.10)] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-[#020817]">Recebimentos por Espécie</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">Ver detalhes</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[190px_1fr] gap-5 items-center">
              <div className="relative mx-auto w-[190px] h-[230px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={porEspecie.slice(0, 6)} dataKey="total" nameKey="nome" innerRadius={58} outerRadius={88} paddingAngle={1} stroke="#ffffff" strokeWidth={2}>
                      {porEspecie.slice(0, 6).map((_, i) => <Cell key={i} fill={cores[i % cores.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => moeda(Number(v))} contentStyle={{ borderRadius: 16, border: "1px solid #dbeafe", boxShadow: "0 12px 30px rgba(15,59,130,0.12)" }} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-[11px] text-slate-500 font-semibold">Líquido</p>
                    <p className="text-sm font-bold text-slate-950 leading-4">{moeda(totalRecebido)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {porEspecie.slice(0, 6).map((item, index) => (
                  <div key={item.nome} className="grid grid-cols-[12px_1fr_auto_auto] items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cores[index % cores.length] }} />
                    <span className="text-slate-700 font-medium truncate" title={item.nome}>{cortarTexto(item.nome, 22)}</span>
                    <span className="font-semibold text-slate-700">{moeda(item.total)}</span>
                    <span className="font-bold text-slate-950">{(item.percentual || 0).toFixed(1).replace(".", ",")}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[#dbeafe] bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,59,130,0.10)] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#020817]">Evolução dos Recebimentos</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">Ver detalhes</button>
            </div>

            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={porDia} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                <XAxis dataKey="data" tickFormatter={(v) => criarDataLocal(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} tick={{ fontSize: 11, fill: "#36577d", fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#36577d" }} tickFormatter={(value) => `${Number(value) / 1000}k`} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => moeda(Number(v))} labelFormatter={(label) => formatarData(String(label))} />
                <Line type="monotone" dataKey="total" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 3, fill: "#0f3b82", strokeWidth: 2, stroke: "#ffffff" }} activeDot={{ r: 6, fill: "#0f3b82", stroke: "#ffffff", strokeWidth: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-3xl border border-[#dbeafe] bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,59,130,0.10)] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#020817]">Comparativo por Espécie</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">Ver detalhes</button>
            </div>

            <ResponsiveContainer width="100%" height={420}>
              <BarChart data={porEspecie.slice(0, 6)} margin={{ top: 25, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                <XAxis
                  dataKey="nomeCurto"
                  interval={0}
                  height={95}
                  tick={renderTickEspecie}
                  tickMargin={18}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#36577d" }} tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any) => moeda(Number(v))} contentStyle={{ borderRadius: 16, border: "1px solid #dbeafe", boxShadow: "0 12px 30px rgba(15,59,130,0.12)" }} />
                <Bar dataKey="total" fill="#0f3b82" radius={[10, 10, 0, 0]} barSize={42}>
                  <LabelList dataKey="total" position="top" offset={10} formatter={(value: number) => moeda(Number(value))} style={{ fontSize: 10, fill: "#0f172a", fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          <div className="rounded-3xl border border-[#dbeafe] bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,59,130,0.10)] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#020817]">Recebimentos por Semana</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">Ver detalhes</button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={porSemana} margin={{ top: 25, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                <XAxis dataKey="semana" tick={{ fontSize: 11, fill: "#36577d", fontWeight: 600 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#36577d" }} tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: any) => moeda(Number(v))} labelFormatter={(_, payload) => payload?.[0]?.payload?.periodo || ""} />
                <Bar dataKey="total" fill="#95c11f" radius={[10, 10, 0, 0]} barSize={44}>
                  <LabelList dataKey="total" position="top" offset={10} formatter={(value: number) => moeda(Number(value))} style={{ fontSize: 10, fill: "#0f172a", fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-3xl border border-[#dbeafe] bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,59,130,0.10)] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#020817]">Top 5 Maiores Recebimentos</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">Ver detalhes</button>
            </div>
            <div className="overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#f1f7ff] text-xs text-[#36577d]">
                    <th className="py-3 px-3 text-left rounded-l-xl">#</th>
                    <th className="py-3 px-3 text-left">Data</th>
                    <th className="py-3 px-3 text-left">Paciente</th>
                    <th className="py-3 px-3 text-left">Espécie</th>
                    <th className="py-3 px-3 text-right rounded-r-xl">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {topRecebimentos.map((item, index) => (
                    <tr key={item.id} className="border-b border-[#e2ecfb] hover:bg-[#f8fbff]">
                      <td className="py-3 px-3 text-sm font-bold text-slate-500">{index + 1}</td>
                      <td className="py-3 px-3 text-sm whitespace-nowrap">{formatarData(item.data)}</td>
                      <td className="py-3 px-3 text-sm font-semibold">{cortarTexto(item.paciente, 22)}</td>
                      <td className="py-3 px-3 text-sm text-slate-500">{cortarTexto(nomeEspecie(item.especie), 18)}</td>
                      <td className="py-3 px-3 text-right text-sm font-bold whitespace-nowrap">{moeda(valorLiquido(item))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="w-full mt-3 text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">Ver todos</button>
          </div>

          <div className="rounded-3xl border border-[#dbeafe] bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,59,130,0.10)] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#020817]">Recebimentos por Mês</h2>
              <button className="text-xs font-semibold text-[#0f3b82] hover:text-[#95c11f]">Ver detalhes</button>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-4 items-center">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparativoMensalDetalhado} margin={{ top: 28, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#36577d", fontWeight: 600 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#36577d" }} tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v: any) => moeda(Number(v))} contentStyle={{ borderRadius: 16, border: "1px solid #dbeafe", boxShadow: "0 12px 30px rgba(15,59,130,0.12)" }} />
                  <Bar dataKey="total" fill="#95c11f" radius={[12, 12, 0, 0]} barSize={58}>
                    <LabelList dataKey="total" position="top" offset={10} formatter={(value: number) => moeda(Number(value))} style={{ fontSize: 10, fill: "#0f172a", fontWeight: 700 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className={`rounded-2xl px-4 py-5 text-center border ${variacao >= 0 ? "bg-emerald-50 border-emerald-100 text-[#16a34a]" : "bg-red-50 border-red-100 text-red-600"}`}>
                <p className="text-2xl font-bold">{variacaoTexto}</p>
                <p className="text-xs font-semibold mt-1">vs mês anterior</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-3xl border border-[#dbeafe] bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,59,130,0.10)] backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold text-[#020817]">Todos os Recebimentos</h2>
                <p className="text-sm text-slate-500 mt-1">Exibindo {dadosPaginados.length} de {dadosFiltrados.length} registros.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar recebimento..." className="border border-[#dbeafe] rounded-xl pl-9 pr-4 py-2 text-sm outline-none" />
                </div>
                <div className="border border-[#dbeafe] rounded-xl px-4 py-2 text-sm text-slate-700 flex items-center gap-2 bg-white">
                  <CalendarDays size={15} className="text-slate-400" />
                  {formatarData(dataInicio)} - {formatarData(dataFim)}
                </div>
                <button onClick={exportarCSV} className="border border-[#95c11f]/40 text-[#0f3b82] rounded-xl px-4 py-2 text-sm flex items-center gap-2 hover:bg-[#f3f8ea] transition">
                  <Download size={16} />
                  Exportar
                </button>
                <button className="border border-[#dbeafe] rounded-xl w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-[#f8fbff] transition">
                  <MoreVertical size={17} />
                </button>
              </div>
            </div>

            {loading ? (
              <p>Carregando...</p>
            ) : (
              <>
                <div className="overflow-auto rounded-2xl border border-[#dbeafe]">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#f1f7ff] text-sm text-[#36577d]">
                        <th className="text-left py-4 px-4">Data</th>
                        <th className="text-left py-4 px-4">Paciente</th>
                        <th className="text-left py-4 px-4">Espécie</th>
                        <th className="text-right py-4 px-4">Bruto</th>
                        <th className="text-right py-4 px-4">Taxas</th>
                        <th className="text-right py-4 px-4">Líquido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosPaginados.map((item) => (
                        <tr key={item.id} className="border-t border-[#e2ecfb] hover:bg-[#f8fbff]">
                          <td className="py-4 px-4">{formatarData(item.data)}</td>
                          <td className="py-4 px-4 font-medium">{item.paciente || "-"}</td>
                          <td className="py-4 px-4 text-slate-500">{nomeEspecie(item.especie)}</td>
                          <td className="py-4 px-4 text-right font-medium">{moeda(valorBruto(item))}</td>
                          <td className="py-4 px-4 text-right font-medium text-[#6b7f16]">{moeda(valorTarifa(item))}</td>
                          <td className="py-4 px-4 text-right font-semibold text-[#16a34a]">{moeda(valorLiquido(item))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 mt-5">
                  <p className="text-sm text-slate-500">Exibindo {(paginaAtual - 1) * itensPorPagina + 1} a {Math.min(paginaAtual * itensPorPagina, dadosFiltrados.length)} de {dadosFiltrados.length} resultados</p>
                  <div className="flex items-center gap-2">
                    {paginasVisiveis.map((pagina, index) => {
                      const paginaAnterior = paginasVisiveis[index - 1];
                      const mostrarReticencias = paginaAnterior && pagina - paginaAnterior > 1;
                      return (
                        <div key={pagina} className="flex items-center gap-2">
                          {mostrarReticencias && <span className="text-slate-400">...</span>}
                          <button onClick={() => setPaginaAtual(pagina)} className={`w-9 h-9 rounded-xl text-sm font-semibold border transition ${paginaAtual === pagina ? "bg-[#0f3b82] text-white border-[#0f3b82] shadow-lg shadow-blue-200" : "bg-white text-slate-600 border-slate-200 hover:border-[#95c11f] hover:text-[#0f3b82]"}`}>
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

          <div className="rounded-3xl border border-[#dbeafe] bg-white/95 p-6 shadow-[0_24px_70px_rgba(15,59,130,0.10)] backdrop-blur-sm">
            <h2 className="font-semibold text-lg mb-4">Indicadores do Período</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { titulo: "Forma mais utilizada", valor: especieMaisUsada?.nome || "-", detalhe: `${(especieMaisUsada?.percentual || 0).toFixed(1).replace(".", ",")}% do total líquido recebido`, Icon: CreditCard, bg: "bg-[#95c11f]/20", cor: "text-[#16a34a]" },
                { titulo: "Dia de maior recebimento", valor: maiorRecebimentoItem ? formatarData(maiorRecebimentoItem.data) : "-", detalhe: moeda(maior), Icon: CalendarClock, bg: "bg-[#95c11f]/15", cor: "text-[#6b7f16]" },
                { titulo: "Maior recebimento", valor: moeda(maior), detalhe: maiorRecebimentoItem ? `em ${formatarData(maiorRecebimentoItem.data)}` : "-", Icon: BadgeDollarSign, bg: "bg-[#0f3b82]/10", cor: "text-[#0f3b82]" },
                { titulo: "Percentual via Pix", valor: `${percentualPix.toFixed(1).replace(".", ",")}%`, detalhe: "do total líquido recebido", Icon: PercentCircle, bg: "bg-[#95c11f]/20", cor: "text-[#6b7f16]" },
                { titulo: "Média por paciente", valor: moeda(pacientesPagantes ? totalRecebido / pacientesPagantes : 0), detalhe: "paciente pagante", Icon: Users, bg: "bg-[#1d4ed8]/10", cor: "text-[#1d4ed8]" },
                { titulo: "Recebimentos no período", valor: quantidade, detalhe: "transações realizadas", Icon: Gauge, bg: "bg-[#c7ea46]/30", cor: "text-[#6b7f16]" },
              ].map((item) => {
                const Icon = item.Icon;
                return (
                  <div key={item.titulo} className="rounded-2xl border border-slate-200 p-4 bg-white hover:border-[#95c11f]/40 hover:shadow-md transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl ${item.bg} ${item.cor} flex items-center justify-center`}>
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">{item.titulo}</p>
                        <h3 className="font-bold mt-1 break-words leading-5 text-slate-950">{item.valor}</h3>
                        <p className="text-sm text-slate-500 mt-1">{item.detalhe}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setModalAnalise(true)} className="w-full mt-5 rounded-2xl border border-emerald-300 text-[#16a34a] font-semibold py-4 hover:bg-[#f3f8ea] transition flex items-center justify-center gap-2">
              <Eye size={18} />
              Ver análise completa
            </button>
          </div>
        </div>

        {modalAnalise && (
          <div className="fixed inset-0 z-50 bg-[#020817]/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-[#dbeafe] max-w-2xl w-full p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Análise completa dos recebimentos</h2>
                  <p className="text-sm text-slate-500 mt-1">{formatarData(dataInicio)} até {formatarData(dataFim)}</p>
                </div>
                <button onClick={() => setModalAnalise(false)} className="rounded-full border border-slate-200 p-2 hover:bg-[#f8fbff]">
                  <X size={18} />
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Valor líquido recebido</p><h3 className="text-xl font-bold text-[#16a34a] mt-2">{moeda(totalRecebido)}</h3></div>
                <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Valor bruto</p><h3 className="text-xl font-bold text-slate-900 mt-2">{moeda(totalBruto)}</h3></div>
                <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Total de taxas</p><h3 className="text-xl font-bold text-[#6b7f16] mt-2">{moeda(totalTaxas)}</h3></div>
                <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Variação</p><h3 className="text-xl font-bold text-[#16a34a] mt-2">{variacaoTexto}</h3></div>
                <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Pacientes pagantes</p><h3 className="text-xl font-bold text-slate-900 mt-2">{pacientesPagantes}</h3></div>
              </div>
              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-600">Forma mais utilizada: <strong>{especieMaisUsada?.nome || "-"}</strong>, representando <strong>{moeda(especieMaisUsada?.total || 0)}</strong> no período.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}






