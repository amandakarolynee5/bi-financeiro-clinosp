"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

type Props = {
  dados: {
    plano_contas: string;
    valor: number;
  }[];
};

export default function GastosPlanoContasChart({
  dados,
}: Props) {

  const top10 = [...dados]
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10)
    .map((item) => ({
      ...item,
      nome:
        item.plano_contas.length > 22
          ? item.plano_contas.slice(0, 22) + "..."
          : item.plano_contas,
    }));

  return (
    <div className="w-full h-[420px]">

      <ResponsiveContainer width="100%" height="100%">

        <BarChart
          data={top10}
          layout="vertical"
          margin={{
            top: 10,
            right: 20,
            left: 10,
            bottom: 10,
          }}
        >

          <XAxis type="number" hide />

          <YAxis
            dataKey="nome"
            type="category"
            width={170}
            tick={{
              fontSize: 13,
              fill: "#475569",
              fontWeight: 500,
            }}
          />

          <Tooltip
            cursor={{ fill: "transparent" }}
            contentStyle={{
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
            }}
            formatter={(value: any) =>
              Number(value).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })
            }
          />

          <Bar
            dataKey="valor"
            radius={[0, 12, 12, 0]}
            barSize={26}
          >
            {top10.map((_, index) => (
              <Cell
                key={index}
                fill={
                  index === 0
                    ? "#6d28d9"
                    : index === 1
                    ? "#7c3aed"
                    : index === 2
                    ? "#8b5cf6"
                    : "#a855f7"
                }
              />
            ))}
          </Bar>

        </BarChart>

      </ResponsiveContainer>

    </div>
  );
}