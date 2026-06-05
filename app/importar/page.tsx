"use client";

import AppShell from "../components/AppShell";
import { Upload, FileSpreadsheet, CheckCircle } from "lucide-react";
import { useState } from "react";
import { lerPlanilha } from "../lib/excel";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme";

type ArquivoInfo = {
  nome: string;
  registros: number;
  dados: any[];
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

  function converterValor(valor: any) {
    if (!valor) return 0;

    if (typeof valor === "number") return valor;

    return Number(
      String(valor)
        .replace("R$", "")
        .replace(/\./g, "")
        .replace(",", ".")
        .trim()
    );
  }

  function converterData(data: any) {
    if (!data) return null;

    if (typeof data === "number") {
      const date = new Date((data - 25569) * 86400 * 1000);
      return date.toISOString().split("T")[0];
    }

    const partes = String(data).split("/");

    if (partes.length === 3) {
      return `${partes[2]}-${partes[1]}-${partes[0]}`;
    }

    return data;
  }

  async function handleArquivo(
    file: File | null,
    tipo: "contas" | "recebimentos" | "vendas"
  ) {
    if (!file) return;

    const dados = await lerPlanilha(file);

    const info = {
      nome: file.name,
      registros: dados.length,
      dados,
    };

    if (tipo === "contas") setContasPagas(info);
    if (tipo === "recebimentos") setRecebimentos(info);
    if (tipo === "vendas") setVendas(info);
  }

  async function importarDados() {
    setCarregando(true);
    setMensagem("");

    try {
      if (contasPagas) {
        const dados = contasPagas.dados.map((row) => ({
          data: converterData(valorCampo(row, ["data"])),

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
        }));

        const { error } = await supabase.from("contas_pagas").insert(dados);

        if (error) throw error;
      }

      if (recebimentos) {
        const dados = recebimentos.dados.map((row) => {
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
            data: converterData(valorCampo(row, ["data"])),

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
        });

        const { error } = await supabase.from("recebimentos").insert(dados);

        if (error) throw error;
      }

      if (vendas) {
        const dados = vendas.dados.map((row) => ({
          data: converterData(valorCampo(row, ["data"])),

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
            valorCampo(row, ["valor", "valor venda", "venda"])
          ),
        }));

        const { error } = await supabase.from("vendas").insert(dados);

        if (error) throw error;
      }

      setMensagem("✅ Dados importados com sucesso!");
    } catch (error) {
      console.error(error);
      setMensagem("❌ Erro ao importar dados. Verifique as colunas da planilha.");
    } finally {
      setCarregando(false);
    }
  }

  function CardImportacao({
    titulo,
    cor,
    tipo,
    arquivo,
  }: {
    titulo: string;
    cor: string;
    tipo: "contas" | "recebimentos" | "vendas";
    arquivo: ArquivoInfo | null;
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

            <div>
              <p className="font-semibold text-[#3b82f6]">{arquivo.nome}</p>
              <p className="text-sm text-[#95c11f]">
                {arquivo.registros} registros encontrados
              </p>
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
            Envie as planilhas de contas pagas, valores recebidos e vendas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3 2xl:gap-6">
          <CardImportacao
            titulo="Contas Pagas"
            cor="bg-[#1d4ed8]/15 text-[#3b82f6]"
            tipo="contas"
            arquivo={contasPagas}
          />

          <CardImportacao
            titulo="Valores Recebidos"
            cor="bg-[#95c11f]/20 text-[#16a34a]"
            tipo="recebimentos"
            arquivo={recebimentos}
          />

          <CardImportacao
            titulo="Vendas"
            cor="bg-[#1d4ed8]/15 text-[#3b82f6]"
            tipo="vendas"
            arquivo={vendas}
          />
        </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.06]/95 p-4 shadow-[0_24px_70px_rgba(15,59,130,0.10)] backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between 2xl:p-6">
          <div>
            <h2 className="text-xl font-bold text-white">Pronto para importar</h2>

            <p className="mt-1 text-sm text-slate-400">
              Após selecionar as planilhas, clique para processar os dados.
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
            {carregando ? "Importando..." : "Importar Dados"}
          </button>
        </div>
        </div>
      </div>
    </AppShell>
  );
}




