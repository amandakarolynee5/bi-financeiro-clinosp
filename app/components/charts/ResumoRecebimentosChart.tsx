"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const data = [
  { name: "Pix", value: 109631 },
  { name: "Boleto", value: 80512 },
  { name: "Cartão Crédito", value: 51766 },
  { name: "Cartão Débito", value: 28735 },
];

const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"];

export default function ResumoRecebimentosChart() {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}