"use client";

type TooltipItem = {
  color?: string;
  dataKey?: string;
  name?: string;
  value?: number | string;
  payload?: Record<string, any>;
};

type TooltipPremiumProps = {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
  claro?: boolean;
  valueFormatter?: (value: number | string | undefined) => string;
  nameFormatter?: (name: string, item: TooltipItem) => string;
  labelFormatter?: (
    label: string | number | undefined,
    payload: TooltipItem[]
  ) => string;
};

export default function TooltipPremium({
  active,
  payload = [],
  label,
  claro = false,
  valueFormatter = (value) => String(value ?? ""),
  nameFormatter = (name) => name,
  labelFormatter,
}: TooltipPremiumProps) {
  if (!active || payload.length === 0) return null;

  const tituloPadrao =
    label ??
    payload[0]?.payload?.nome ??
    payload[0]?.payload?.mes ??
    payload[0]?.payload?.data ??
    "";

  const titulo = labelFormatter
    ? labelFormatter(tituloPadrao, payload)
    : String(tituloPadrao || "");

  return (
    <div
      style={{
        minWidth: 210,
        borderRadius: 16,
        border: claro
          ? "1px solid #dbeafe"
          : "1px solid rgba(149,193,31,0.25)",
        background: claro ? "#ffffff" : "#0b1220",
        color: claro ? "#0f172a" : "#ffffff",
        boxShadow: claro
          ? "0 18px 45px rgba(15,59,130,0.12)"
          : "0 18px 50px rgba(0,0,0,0.45)",
        padding: "12px 14px",
      }}
    >
      {titulo && (
        <p
          style={{
            color: claro ? "#0f3b82" : "#95c11f",
            fontWeight: 800,
            marginBottom: 8,
            lineHeight: 1.3,
          }}
        >
          {titulo}
        </p>
      )}

      <div style={{ display: "grid", gap: 7 }}>
        {payload.map((item, index) => {
          const nomeOriginal = String(item.name ?? item.dataKey ?? "Valor");
          const nome = nameFormatter(nomeOriginal, item);

          return (
            <div
              key={`${item.dataKey ?? item.name ?? "item"}-${index}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 22,
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  color: claro ? "#475569" : "#cbd5e1",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: item.color || "#1d4ed8",
                    flexShrink: 0,
                  }}
                />
                {nome}
              </span>

              <strong
                style={{
                  color: claro ? "#0f172a" : "#ffffff",
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {valueFormatter(item.value)}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

