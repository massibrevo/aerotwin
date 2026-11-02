import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export const num = (v: number | null | undefined, d = 0) =>
  v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: d });
export function Badge({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <i />
      {children}
    </span>
  );
}
export function State({
  error,
  loading,
}: {
  error?: string;
  loading?: boolean;
}) {
  return error ? (
    <div role="alert" className="notice error">
      {error}
    </div>
  ) : loading ? (
    <div className="loading" role="status">
      <span /> Loading local data…
    </div>
  ) : null;
}
export function Stat({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      <p>{note}</p>
    </div>
  );
}
export function Panel({
  title,
  children,
  aside,
  className = "",
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
export function Chart({
  data,
  keys = ["delay"],
  type = "area",
  x = "date",
}: {
  data: object[];
  keys?: string[];
  type?: string;
  x?: string;
}) {
  const colors = ["#48c7dd", "#e9af64", "#8d91e8"];
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid stroke="#233240" vertical={false} />
            <XAxis
              dataKey={x}
              tick={{ fill: "#8195a6", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8195a6", fontSize: 10 }}
              width={35}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#101c2a",
                border: "1px solid #334353",
                borderRadius: 8,
              }}
            />
            {keys.map((k, i) => (
              <Bar key={k} dataKey={k} fill={colors[i]} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#48c7dd" stopOpacity={0.22} />
                <stop offset="1" stopColor="#48c7dd" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#233240" vertical={false} />
            <XAxis
              dataKey={x}
              minTickGap={50}
              tick={{ fill: "#8195a6", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8195a6", fontSize: 10 }}
              width={35}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#101c2a",
                border: "1px solid #334353",
                borderRadius: 8,
              }}
            />
            {keys.map((k, i) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                stroke={colors[i]}
                fill={i === 0 ? "url(#chartFill)" : "transparent"}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
