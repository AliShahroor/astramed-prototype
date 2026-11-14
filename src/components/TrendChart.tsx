import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { metricFor } from "../data/catalog";
import type { Indicator, Measurement } from "../types";
export function TrendChart({
  rows,
  indicator,
  baseline,
}: {
  rows: Measurement[];
  indicator: Indicator;
  baseline: number;
}) {
  const m = metricFor(indicator);
  const [focused, setFocused] = useState<Measurement | null>(null);
  const values = rows
    .map((r) => r.value)
    .concat(baseline, indicator === "co2" ? [3] : []);
  const min = Math.min(...values),
    max = Math.max(...values);
  const pad = Math.max((max - min) * 0.2, m.decimals ? 0.2 : 4);
  return (
    <>
      <div className="chart-legend">
        <span>
          <i />
          {m.short} · {m.unit}
        </span>
        <span className="baseline-key">
          - - Personal baseline
          {indicator === "co2" ? " / preflight cabin context" : ""}
        </span>
        {indicator === "co2" && (
          <span className="amber">··· 3 mmHg habitat reference</span>
        )}
      </div>
      <div
        className="chart"
        role="img"
        aria-label={`${m.label} trend with personal baseline ${baseline} ${m.unit}; accessible observations below`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rows}
            margin={{ top: 16, right: 12, bottom: 5, left: 0 }}
            accessibilityLayer
          >
            <CartesianGrid
              vertical={false}
              stroke="#26343b"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="day"
              tickFormatter={(v) => `D${v}`}
              axisLine={false}
              tickLine={false}
              minTickGap={35}
              tick={{ fill: "#a7b4bc", fontSize: 12 }}
            />
            <YAxis
              domain={[
                Math.max(0, Math.floor(min - pad)),
                Math.ceil(max + pad),
              ]}
              width={44}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#a7b4bc", fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                background: "#182329",
                border: "1px solid #3d515c",
                borderRadius: 4,
                color: "#e7edf0",
              }}
              labelFormatter={(v) => `Mission day ${v}`}
              formatter={(v) => [`${v} ${m.unit}`, m.short]}
            />
            <ReferenceLine
              y={baseline}
              stroke="#8a9ca5"
              strokeDasharray="5 5"
            />
            {indicator === "co2" && (
              <ReferenceLine y={3} stroke="#d8aa58" strokeDasharray="2 4" />
            )}
            <Line
              type="linear"
              dataKey="value"
              stroke="#77bfb1"
              strokeWidth={2}
              dot={
                rows.length <= 30
                  ? { r: 3, fill: "#121b20", strokeWidth: 2 }
                  : false
              }
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-caption">
        <span>
          {rows.length} recorded days · Latest reading per mission day
        </span>
        <span>
          Baseline: {baseline} {m.unit}
        </span>
      </div>
      <details className="data-details">
        <summary>Inspect observations & data provenance</summary>
        <p className="muted">{m.note} No expected trajectory is assumed.</p>
        {focused && (
          <p aria-live="polite">
            Day {focused.day}: {focused.value} {focused.unit} · {focused.source}
          </p>
        )}
        <div
          className="table-scroll"
          tabIndex={0}
          aria-label="Scrollable observation data"
        >
          <table>
            <thead>
              <tr>
                <th>Mission day</th>
                <th>Reading</th>
                <th>Source</th>
                <th>Timestamp (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr
                  key={r.id}
                  tabIndex={0}
                  onFocus={() => setFocused(r)}
                  onMouseEnter={() => setFocused(r)}
                >
                  <td>{r.day}</td>
                  <td>
                    {r.value} {r.unit}
                  </td>
                  <td>{r.source}</td>
                  <td>{r.timestamp.replace("T", " ").slice(0, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
