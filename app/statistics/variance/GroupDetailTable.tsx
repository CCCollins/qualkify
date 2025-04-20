'use client';

import React from 'react';

interface GroupStats {
  fi: number;
  sumXiFi: number;
  sumXi2Fi: number;
  mean: number;
  disp: number;
  std: number;
  formulas: {
    mean: string;
    disp: string;
    std: string;
  };
}

interface Props {
  results: {
    groupStats: GroupStats[];
  };
  colLabels: string[];
  toFixed: (val: number) => string;
}

export default function GroupDetailTable({ results, colLabels, toFixed }: Props) {
  return (
    <div className="mt-6 overflow-x-auto">
      <h4 className="font-medium mb-2">📊 Детализация по группам</h4>

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Группа</th>
            <th className="border px-2 py-1">∑f</th>
            <th className="border px-2 py-1">∑x·f</th>
            <th className="border px-2 py-1">∑x²·f</th>
            <th className="border px-2 py-1">X̄</th>
            <th className="border px-2 py-1">Dᵢ</th>
            <th className="border px-2 py-1">σᵢ</th>
          </tr>
        </thead>
        <tbody>
          {results.groupStats.map((g, idx) => (
            <tr key={idx}>
              <td className="border px-2 py-1 text-center">{colLabels[idx] || `#${idx + 1}`}</td>
              <td className="border px-2 py-1 text-center">{g.fi}</td>
              <td className="border px-2 py-1 text-center">{g.sumXiFi}</td>
              <td className="border px-2 py-1 text-center">{g.sumXi2Fi}</td>
              <td className="border px-2 py-1 text-center">
                {toFixed(g.mean)}
                <br />
                <span className="text-gray-600 text-xs">{g.formulas.mean}</span>
              </td>
              <td className="border px-2 py-1 text-center">
                {toFixed(g.disp)}
                <br />
                <span className="text-gray-600 text-xs">{g.formulas.disp}</span>
              </td>
              <td className="border px-2 py-1 text-center">
                {toFixed(g.std)}
                <br />
                <span className="text-gray-600 text-xs">{g.formulas.std}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
