"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const data = [
  { name: "Glucides", value: 45, color: "#39a96b" },
  { name: "Protéines", value: 25, color: "#3b82f6" },
  { name: "Lipides", value: 25, color: "#f59e0b" },
  { name: "Autres", value: 5, color: "#a78bfa" }
];

export function NutritionPanel() {
  return (
    <section className="panel nutrition">
      <h2>Apports nutritionnels</h2>
      <div className="nutrition-body">
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={36} outerRadius={54} paddingAngle={2}>
                {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <span><strong>1 850</strong> kcal</span>
        </div>
        <ul>
          {data.map((entry) => (
            <li key={entry.name}><i style={{ background: entry.color }} /> {entry.name} <strong>{entry.value}%</strong></li>
          ))}
        </ul>
      </div>
      <a className="outline-action" href="/profile">Voir le détail des nutriments</a>
    </section>
  );
}
