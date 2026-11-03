import { tx, useLocale, numberLocale } from "../i18n";
import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

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
  v == null
    ? "—"
    : v.toLocaleString(numberLocale(), { maximumFractionDigits: d });
export function Badge({
  children,
  tone = "cyan",
}: {
  children: ReactNode;
  tone?: string;
}) {
  useLocale();
  return (
    <span className={`badge ${tone}`}>
      <i />
      {tx(children)}
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
  useLocale();
  return error ? (
    <div role="alert" className="notice error">
      {tx(error)}
    </div>
  ) : loading ? (
    <div className="loading" role="status">
      <span /> {tx(" Loading local data…")}
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
  useLocale();
  return (
    <motion.div
      className="stat"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span>{tx(label)}</span>
      <strong>
        {tx(value)}
        <small>{tx(unit)}</small>
      </strong>
      <p>{tx(note)}</p>
      <span className="stat-decoration" aria-hidden="true" />
    </motion.div>
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
  useLocale();
  return (
    <section className={`panel ${className}`}>
      <div className="panel-heading">
        <h2>{tx(title)}</h2>
        {tx(aside)}
      </div>
      {tx(children)}
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
  useLocale();
  const reduced = useReducedMotion();
  const gradient = useId().replaceAll(":", "");
  const colors = ["#4788f4", "#f0a052", "#9a78f0"];
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart data={data}>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey={x}
              tickFormatter={(value) =>
                typeof value === "number" ? num(value) : tx(String(value))
              }
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => num(value)}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              width={42}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) =>
                typeof value === "number" ? num(value, 2) : value
              }
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--text)",
              }}
            />
            {keys.map((k, i) => (
              <Bar
                key={k}
                dataKey={k}
                name={tx(k)}
                fill={colors[i]}
                isAnimationActive={!reduced}
                animationDuration={500}
                radius={[5, 5, 0, 0]}
              />
            ))}
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <defs>
              <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#4788f4" stopOpacity={0.22} />
                <stop offset="1" stopColor="#4788f4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey={x}
              tickFormatter={(value) =>
                typeof value === "number" ? num(value) : tx(String(value))
              }
              minTickGap={50}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => num(value)}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              width={42}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) =>
                typeof value === "number" ? num(value, 2) : value
              }
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--text)",
              }}
            />
            {keys.map((k, i) => (
              <Area
                key={k}
                type="monotone"
                dataKey={k}
                name={tx(k)}
                isAnimationActive={!reduced}
                animationDuration={500}
                stroke={colors[i]}
                fill={i === 0 ? `url(#${gradient})` : "transparent"}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
