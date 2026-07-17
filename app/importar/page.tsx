"use client";

import AppShell from "../components/AppShell";
import { Upload, FileSpreadsheet, CheckCircle, X } from "lucide-react";
import { useState } from "react";
import { lerPlanilha } from "../lib/excel";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme";

type ArquivoInfo = {
  nome: string;
  registros: number;
  dados: any[];
  periodoInicio: string;
  periodoFim: string;
  periodoTexto: string;
};

export default function ImportarPage() {
  const { theme } = useTheme();
  const claro = theme === "light";

  const [contasPagas, setContasPagas] = useState<ArquivoInfo | null>(null);
  const [recebimentos, setRecebimentos] = useState<ArquivoInfo | null>(null);
  const [vendas, setVendas] = useState<ArquivoInfo | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState("");

  function removerAcentos(texto: string) {
    return texto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function valorCampo(row: any, nomes: string[]) {
    const chaves = Object.keys(row);

    const chave = chaves.find((key) =>
      nomes.some((nome) => removerAcentos(key).includes(removerAcentos(nome)))
    );

    return chave ? row[chave] : null;
  }

  function valorCampoData(row: any) {
    const chaves = Object.keys(row);

    const chaveExata = chaves.find((key) => {
      const normalizada = removerAcentos(String(key)).trim();
      return normalizada === "data";
    });

    if (chaveExata) return row[chaveExata];

    const chavePreferida = chaves.find((key) => {
      const normalizada = removerAcentos(String(key)).trim();

      return (
        normalizada.includes("data") &&
        !normalizada.includes("vencimento") &&
        !normalizada.includes("validade")
      );
    });

    return chavePreferida ? row[chavePreferida] : null;
  }

  function valorEntradaVenda(row: any) {
    const chaves = Object.keys(row);

    const nomesExatos = [
      "entrada",
      "valor entrada",
      "valor da entrada",
      "entrada paga",
      "entrada recebida",
      "pago na venda",
      "entrada cliente",
    ].map((nome) => removerAcentos(nome).trim());

    const chaveExata = chaves.find((key) =>
      nomesExatos.includes(removerAcentos(String(key)).trim())
    );

    if (chaveExata) {
      return converterValor(row[chaveExata]);
    }

    const chaveAproximada = chaves.find((key) => {
      const normalizada = removerAcentos(String(key)).trim();

      return (
        normalizada.includes("entrada") &&
        !normalizada.includes("sem entrada")
      );
    });

    return chaveAproximada ? converterValor(row[chaveAproximada]) : 0;
  }

  function converterValor(valor: any) {
    if (valor === null || valor === undefined || valor === "") return 0;

    if (typeof valor === "number") return Number.isFinite(valor) ? valor : 0;

    const convertido = Number(
      String(valor)
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim()
    );

    return Number.isFinite(convertido) ? convertido : 0;
  }

  function valorValido(valor: any) {
    return Number.isFinite(Number(valor));
  }

  function textoLimpo(valor: any) {
    if (valor === null || valor === undefined) return null;

    const texto = String(valor).trim();
    return texto ? texto : null;
  }

  function normalizarGrupoContas(valor: any) {
    const texto = textoLimpo(valor);
    if (!texto) return null;

    const normalizado = removerAcentos(texto);

    if (normalizado.includes("custo operacional")) {
      return "Custos Operacionais";
    }

    if (normalizado.includes("despesa operacional")) {
      return "Despesas Operacionais";
    }

    if (
      normalizado.includes("prolabore") ||
      normalizado.includes("pro-labore") ||
      normalizado.includes("pro labore")
    ) {
      return "Pró-labore";
    }

    if (
      normalizado.includes("emprestimo") ||
      normalizado.includes("financiamento")
    ) {
      return "Empréstimos";
    }

    return texto;
  }

  function normalizarTipoConta(valor: any) {
    const texto = textoLimpo(valor);
    if (!texto) return null;

    const normalizado = removerAcentos(texto);

    if (normalizado.includes("variavel")) {
      return "Variável";
    }

    if (normalizado.includes("fixo") || normalizado.includes("fixa")) {
      return "Fixa";
    }

    return texto;
  }

  function converterData(data: any) {
    if (!data) return null;

    if (data instanceof Date && !Number.isNaN(data.getTime())) {
      const ano = data.getUTCFullYear();
      const mes = String(data.getUTCMonth() + 1).padStart(2, "0");
      const dia = String(data.getUTCDate()).padStart(2, "0");

      return `${ano}-${mes}-${dia}`;
    }

    if (typeof data === "number" && Number.isFinite(data)) {
      const diasExcel = Math.floor(data);
      const novaData = new Date(
        Date.UTC(1899, 11, 30) + diasExcel * 24 * 60 * 60 * 1000
      );

      const ano = novaData.getUTCFullYear();
      const mes = String(novaData.getUTCMonth() + 1).padStart(2, "0");
      const dia = String(novaData.getUTCDate()).padStart(2, "0");

      return `${ano}-${mes}-${dia}`;
    }

    const texto = String(data).trim();

    if (texto.includes("/")) {
      const partes = texto.split("/");

      if (partes.length === 3) {
        const dia = partes[0].padStart(2, "0");
        const mes = partes[1].padStart(2, "0");
        const ano = partes[2].length === 2 ? `20${partes[2]}` : partes[2];

        return `${ano}-${mes}-${dia}`;
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }

    return null;
  }

  function formatarDataBR(data: string) {
    if (!data) return "-";

    const [ano, mes, dia] = data.split("-");
    return `${dia}/${mes}/${ano}`;
  }

  function obterPeriodoPlanilha(dados: any[]) {
    const datas = dados
      .map((row) => converterData(valorCampoData(row)))
      .filter(Boolean) as string[];

    if (datas.length === 0) {
      throw new Error("A planilha não possui coluna de data válida.");
    }

    const ordenadas = [...datas].sort();
    const periodoInicio = ordenadas[0];
    const periodoFim = ordenadas[ordenadas.length - 1];

    return {
      periodoInicio,
      periodoFim,
      periodoTexto: `${formatarDataBR(periodoInicio)} até ${formatarDataBR(periodoFim)}`,
    };
  }

  async function substituirPeriodoAntesDeImportar(
    tabela: "contas_pagas" | "recebimentos" | "vendas",
    periodoInicio: string,
    periodoFim: string
  ) {
    const { error } = await supabase
      .from(tabela)
      .delete()
      .gte("data", periodoInicio)
      .lte("data", periodoFim);

    if (error) throw error;
  }

  async function handleArquivo(
    file: File | null,
    tipo: "contas" | "recebimentos" | "vendas"
  ) {
    if (!file) return;

    try {
      const dados = await lerPlanilha(file);
      const periodo = obterPeriodoPlanilha(dados);

      const info = {
        nome: file.name,
        registros: dados.length,
        dados,
        ...periodo,
      };

      if (tipo === "contas") setContasPagas(info);
      if (tipo === "recebimentos") setRecebimentos(info);
      if (tipo === "vendas") setVendas(info);

      setMensagem("");
    } catch (error: any) {
      console.error(error);
      setMensagem(`❌ ${error.message || "Erro ao ler a planilha."}`);
    }
  }

  async function importarDados() {
    setCarregando(true);
    setMensagem("");

    try {
      const importados: string[] = [];

      if (!contasPagas && !recebimentos && !vendas) {
        setMensagem("⚠️ Selecione pelo menos uma planilha para importar.");
        return;
      }

      if (contasPagas) {
        const dados = contasPagas.dados
          .map((row) => ({
            data: converterData(valorCampoData(row)),

            plano_contas: valorCampo(row, [
              "plano",
              "plano de contas",
              "conta",
            ]),

            descricao: valorCampo(row, [
              "descricao",
              "descrição",
              "historico",
              "histórico",
              "observacao",
              "observação",
            ]),

            valor: converterValor(
              valorCampo(row, ["valor", "valor pago", "pagamento"])
            ),

            grupo_contas: normalizarGrupoContas(
              valorCampo(row, [
                "grupo de contas",
                "grupo contas",
                "grupo da conta",
                "grupo",
              ])
            ),

            tipo_conta: normalizarTipoConta(
              valorCampo(row, [
                "tipo de conta",
                "tipo conta",
                "classificacao",
                "classificação",
                "fixa variavel",
                "fixa variável",
              ])
            ),
          }))
          .filter(
            (item) =>
              item.data &&
              valorValido(item.valor) &&
              (item.plano_contas || item.descricao)
          );

        if (dados.length > 0) {
          await substituirPeriodoAntesDeImportar(
            "contas_pagas",
            contasPagas.periodoInicio,
            contasPagas.periodoFim
          );

          const { error } = await supabase.from("contas_pagas").insert(dados);
          if (error) throw error;

          importados.push(`Contas Pagas (${dados.length} registros)`);
        }
      }

      if (recebimentos) {
        const dados = recebimentos.dados
          .map((row) => {
            const valorRecebido = converterValor(
              valorCampo(row, [
                "valor recebido",
                "recebido",
                "valor",
              ])
            );

            const valorTarifas = converterValor(
              valorCampo(row, [
                "valor tarifas",
                "valor tarifa",
                "tarifas",
                "tarifa",
                "taxas",
                "taxa",
              ])
            );

            const valorLiquido = valorRecebido - valorTarifas;

            return {
              data: converterData(valorCampoData(row)),

              paciente: valorCampo(row, ["paciente", "nome"]),

              especie: valorCampo(row, [
                "especie",
                "espécie",
                "forma",
                "forma de pagamento",
              ]),

              valor: valorRecebido,
              valor_tarifas: valorTarifas,
              valor_liquido: valorLiquido,
            };
          })
          .filter(
            (item) =>
              item.data &&
              valorValido(item.valor) &&
              (item.paciente || item.especie)
          );

        if (dados.length > 0) {
          await substituirPeriodoAntesDeImportar(
            "recebimentos",
            recebimentos.periodoInicio,
            recebimentos.periodoFim
          );

          const { error } = await supabase.from("recebimentos").insert(dados);
          if (error) throw error;

          importados.push(`Valores Recebidos (${dados.length} registros)`);
        }
      }

      if (vendas) {
        const dados = vendas.dados
          .map((row) => ({
            data: converterData(valorCampoData(row)),

            paciente: valorCampo(row, ["paciente", "nome"]),

            qtd_titulos:
              Number(
                valorCampo(row, [
                  "quantidade",
                  "titulo",
                  "títulos",
                  "titulos",
                ])
              ) || 0,

            valor: converterValor(
              valorCampo(row, [
                "valor total",
                "total",
                "valor venda",
                "valor",
                "venda",
              ])
            ),

            entrada: valorEntradaVenda(row),
          }))
          .filter(
            (item) =>
              item.data &&
              valorValido(item.valor) &&
              item.paciente
          );

        if (dados.length > 0) {
          await substituirPeriodoAntesDeImportar(
            "vendas",
            vendas.periodoInicio,
            vendas.periodoFim
          );

          const { error } = await supabase.from("vendas").insert(dados);
          if (error) throw error;

          importados.push(`Vendas (${dados.length} registros)`);
        }
      }

      if (importados.length === 0) {
        setMensagem("⚠️ Nenhuma planilha selecionada possui dados válidos para importar.");
        return;
      }

      setMensagem(`✅ Importação concluída sem duplicar: ${importados.join(", ")}.`);

      setContasPagas(null);
      setRecebimentos(null);
      setVendas(null);
    } catch (error: any) {
      console.error(error);
      setMensagem(`❌ ${error.message || "Erro ao importar dados. Verifique as colunas da planilha."}`);
    } finally {
      setCarregando(false);
    }
  }

  function CardImportacao({
    titulo,
    cor,
    tipo,
    arquivo,
    limparArquivo,
  }: {
    titulo: string;
    cor: string;
    tipo: "contas" | "recebimentos" | "vendas";
    arquivo: ArquivoInfo | null;
    limparArquivo: () => void;
  }) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl 2xl:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`w-10 h-10 2xl:w-12 2xl:h-12 rounded-2xl flex items-center justify-center ${cor}`}
          >
            <FileSpreadsheet size={24} />
          </div>

          <div>
            <h2 className="text-lg font-bold text-white">{titulo}</h2>
            <p className="text-sm text-slate-400">Arquivo Excel</p>
          </div>
        </div>

        <label className="block cursor-pointer rounded-3xl border-2 border-dashed border-white/10 bg-white/[0.04] p-5 text-center transition hover:border-[#95c11f]/60 hover:bg-white/[0.08] 2xl:p-8">
          <Upload className="mx-auto mb-3 text-[#3b82f6]" size={32} />

          <p className="font-semibold text-white">Selecionar planilha</p>
          <p className="mt-1 text-sm text-slate-400">.xlsx ou .csv</p>

          <input
            type="file"
            className="hidden"
            accept=".xlsx,.csv"
            onChange={(e) => handleArquivo(e.target.files?.[0] || null, tipo)}
          />
        </label>

        {arquivo && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-[#95c11f]/30 bg-[#95c11f]/10 p-4">
            <CheckCircle className="text-[#16a34a]" size={22} />

            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[#3b82f6]">{arquivo.nome}</p>
              <p className="text-sm text-[#95c11f]">
                {arquivo.registros} registros encontrados
              </p>
              <p className="mt-1 text-xs font-medium text-slate-400">
                Período detectado: {arquivo.periodoTexto}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Ao importar novamente, esse período será substituído sem duplicar.
              </p>

              <button
                type="button"
                onClick={limparArquivo}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-red-400/40 hover:text-red-300"
              >
                <X size={14} />
                Remover seleção
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <AppShell>
      <div
        className={`importar-theme relative min-h-screen overflow-hidden rounded-[40px] border p-6 shadow-[0_30px_100px_rgba(0,0,0,0.35)] transition-colors duration-300 lg:p-8 ${
          claro
            ? "importar-light border-slate-200 bg-[#f4f7fb] text-slate-950"
            : "importar-dark border-white/10 bg-[#020817] text-white"
        }`}
      >
        <style>{`
          .importar-light > .pointer-events-none {
            display: none !important;
          }

          .importar-light [class*="bg-white"] {
            background-color: #ffffff !important;
          }

          .importar-light [class*="border-white"] {
            border-color: #e2e8f0 !important;
          }

          .importar-light [class*="text-white"] {
            color: #0f172a !important;
          }

          .importar-light [class*="text-slate-400"] {
            color: #64748b !important;
          }

          .importar-light [class*="text-slate-300"] {
            color: #475569 !important;
          }

          .importar-light label {
            background-color: #ffffff !important;
            border-color: #cbd5e1 !important;
          }

          .importar-light label:hover {
            background-color: #eff6ff !important;
            border-color: #95c11f !important;
          }
        `}</style>
        <div className="pointer-events-none absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#0f3b82]/35 blur-[110px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-[480px] w-[480px] rounded-full bg-[#95c11f]/15 blur-[120px]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:52px_52px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_35%),linear-gradient(135deg,rgba(15,59,130,0.24),transparent_45%,rgba(149,193,31,0.08))]" />

        <div className="relative z-10 space-y-4 lg:space-y-5 2xl:space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white 2xl:text-4xl">
            Importar Planilhas
          </h1>

          <p className="mt-1 text-sm text-slate-400 2xl:mt-2 2xl:text-base">
            Envie as planilhas de contas pagas, valores recebidos e vendas. As contas pagas também aceitam Grupo de Contas e Tipo de Conta.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3 2xl:gap-6">
          <CardImportacao
            titulo="Contas Pagas"
            cor="bg-[#1d4ed8]/15 text-[#3b82f6]"
            tipo="contas"
            arquivo={contasPagas}
            limparArquivo={() => setContasPagas(null)}
          />

          <CardImportacao
            titulo="Valores Recebidos"
            cor="bg-[#95c11f]/20 text-[#16a34a]"
            tipo="recebimentos"
            arquivo={recebimentos}
            limparArquivo={() => setRecebimentos(null)}
          />

          <CardImportacao
            titulo="Vendas"
            cor="bg-[#1d4ed8]/15 text-[#3b82f6]"
            tipo="vendas"
            arquivo={vendas}
            limparArquivo={() => setVendas(null)}
          />
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_70px_rgba(15,59,130,0.10)] backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between 2xl:p-6">
          <div>
            <h2 className="text-xl font-bold text-white">Pronto para importar</h2>

            <p className="mt-1 text-sm text-slate-400">
              Os dados do período detectado serão substituídos antes da nova importação.
            </p>

            {mensagem && (
              <p className="mt-3 font-semibold text-[#3b82f6]">{mensagem}</p>
            )}
          </div>

          <button
            onClick={importarDados}
            disabled={carregando}
            className="rounded-2xl bg-gradient-to-r from-[#0f3b82] to-[#1d4ed8] px-6 py-3 2xl:px-8 2xl:py-4 font-semibold text-white shadow-[0_14px_35px_rgba(29,78,216,0.30)] transition hover:shadow-[0_18px_42px_rgba(29,78,216,0.40)] disabled:opacity-60"
          >
            {carregando ? "Importando..." : "Substituir e Importar"}
          </button>
        </div>
        </div>
      </div>
    </AppShell>
  );
}









