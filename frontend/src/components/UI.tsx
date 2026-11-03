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
    <motion.div
      className="stat"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span>{label}</span>
      <strong>
        {value}
        <small>{unit}</small>
      </strong>
      <p>{note}</p>
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
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              width={42}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
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
              minTickGap={50}
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "var(--text-muted)", fontSize: 12 }}
              width={42}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
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
