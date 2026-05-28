"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { dia: "01/05", valor: 10000 },
  { dia: "03/05", valor: 18000 },
  { dia: "05/05", valor: 26000 },
  { dia: "07/05", valor: 13000 },
  { dia: "09/05", valor: 22000 },
  { dia: "11/05", valor: 15000 },
  { dia: "13/05", valor: 20000 },
  { dia: "15/05", valor: 40000 },
  { dia: "17/05", valor: 28000 },
  { dia: "19/05", valor: 24000 },
  { dia: "21/05", valor: 36000 },
  { dia: "23/05", valor: 25000 },
  { dia: "25/05", valor: 16000 },
  { dia: "27/05", valor: 18000 },
  { dia: "29/05", valor: 43000 },
  { dia: "31/05", valor: 22000 },
];

export default function ResumoVendasChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="dia" />
        <YAxis />
        <Tooltip />

        <Line
          type="monotone"
          dataKey="valor"
          stroke="#2563eb"
          strokeWidth={3}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}