type Props = {
  titulo: string;
  valor: string;
  cor?: string;
};

export default function MetricCard({
  titulo,
  valor,
  cor = "text-slate-900",
}: Props) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-lg shadow-slate-200/50 hover:shadow-xl transition-all duration-300">
      <p className="text-sm text-slate-500">
        {titulo}
      </p>

      <h2 className={`text-3xl font-bold mt-3 ${cor}`}>
        {valor}
      </h2>
    </div>
  );
}