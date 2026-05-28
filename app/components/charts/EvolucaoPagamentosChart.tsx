"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Props = {
  dados: {
    data: string;
    total: number;
  }[];
};

export default function EvolucaoPagamentosChart({ dados }: Props) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={dados}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="data"
          tickFormatter={(value) =>
            new Date(value).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            })
          }
        />
        <YAxis />
        <Tooltip
          formatter={(value) =>
            Number(value).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          }
          labelFormatter={(label) =>
            new Date(label).toLocaleDateString("pt-BR")
          }
        />
        <Line
          type="monotone"
          dataKey="total"
          stroke="#7C3AED"
          strokeWidth={3}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}