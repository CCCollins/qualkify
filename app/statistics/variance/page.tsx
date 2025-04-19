'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbCopy } from 'react-icons/tb';

type TableRow = (number | string)[];

export default function DispersionTable() {
  const [table, setTable] = useState<TableRow[]>([
    [50, 20, 40],
    [100, 80, 160],
    [150, 150, 200],
    [350, 300, 400],
    [200, 150, 250],
    [150, 100, 50],
  ]);
  const [results, setResults] = useState<Results | null>(null);
  const [decimalPlaces, setDecimalPlaces] = useState(4);

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
  
  interface Results {
    overallMean: number;
    overallDisp: number;
    overallStd: number;
    Dvnutr: number;
    Dmezh: number;
    etaSquared: number;
    N_total: number;
    groupStats: GroupStats[];
    formulas: {
      overallMean: string;
      overallDisp: string;
      overallStd: string;
      Dvnutr: string;
      Dmezh: string;
      etaSquared: string;
    };
  }

  const handleInputChange = (row: number, col: number, value: string) => {
    const updated = [...table];
  
    // Разрешаем: числа, необязательный минус, точку/запятую, но только один раз
    const isValidInput = /^-?(?:\d+)?(?:[.,])?(?:\d*)?$/.test(value);
  
    if (isValidInput) {
      const normalized = value.replace(',', '.');
  
      // Временные допустимые состояния (в процессе ввода)
      const isTemporary = value === '-' || value === '' || value.endsWith('.') || value.endsWith(',');
  
      if (isTemporary) {
        updated[row][col] = value;
      } else {
        const parsed = parseFloat(normalized);
        updated[row][col] = isNaN(parsed) ? normalized : parsed;
      }
  
      setTable(updated);
    }
  };

  const parseNumeric = (val: number | string): number => {
    const parsed = parseFloat(String(val));
    return isNaN(parsed) ? 0 : parsed;
  };

  const addRow = () => setTable([...table, Array(table[0].length).fill(0)]);
  const removeRow = () => table.length > 1 && setTable(table.slice(0, -1));
  const addColumn = () => setTable(table.map((row) => [...row, 0]));
  const removeColumn = () =>
    table[0].length > 1 && setTable(table.map((row) => row.slice(0, -1)));

  const toFixed = (val: number) =>
    val.toFixed(decimalPlaces).replace(/\./g, ',');

  const calculate = () => {
    let N_total = 0;
    let totalSumXiFi = 0;
    let totalSumXi2Fi = 0;
  
    const groupStats = table[0].map((_, col) => {
      let fi = 0,
        sumXiFi = 0,
        sumXi2Fi = 0;
  
      table.forEach((row, i) => {
        const xi = i + 1;
        const f = parseNumeric(row[col]);
        fi += f;
        sumXiFi += xi * f;
        sumXi2Fi += xi ** 2 * f;
      });
  
      const mean = sumXiFi / fi;
      const disp = sumXi2Fi / fi - mean ** 2;
      const std = Math.sqrt(disp);
  
      N_total += fi;
      totalSumXiFi += sumXiFi;
      totalSumXi2Fi += sumXi2Fi;
  
      return {
        fi,
        sumXiFi,
        sumXi2Fi,
        mean,
        disp,
        std,
        formulas: {
          mean: `X̄ = ∑(x·f) / ∑f = ${sumXiFi} / ${fi} = ${toFixed(mean)}`,
          disp: `D = (∑(x²·f) / ∑f) - X̄² = (${sumXi2Fi} / ${fi}) - (${toFixed(mean)}²) = ${toFixed(disp)}`,
          std: `σ = √D = √${toFixed(disp)} = ${toFixed(std)}`,
        },
      };
    });
  
    const overallMean = totalSumXiFi / N_total;
    const overallDisp = totalSumXi2Fi / N_total - overallMean ** 2;
    const overallStd = Math.sqrt(overallDisp);
    const Dvnutr =
      groupStats.reduce((sum, g) => sum + g.disp * g.fi, 0) / N_total;
    const Dmezh =
      groupStats.reduce(
        (sum, g) => sum + g.fi * (g.mean - overallMean) ** 2,
        0
      ) / N_total;
  
    const etaSquared = Dmezh / overallDisp;
  
    setResults({
      overallMean,
      overallDisp,
      overallStd,
      Dvnutr,
      Dmezh,
      etaSquared,
      groupStats,
      N_total,
      formulas: {
        overallMean: `X̄ = ∑(x·f) / N = ${totalSumXiFi} / ${N_total} = ${toFixed(overallMean)}`,
        overallDisp: `σ² = (∑(x²·f) / N) - X̄² = (${totalSumXi2Fi} / ${N_total}) - (${toFixed(overallMean)}²) = ${toFixed(overallDisp)}`,
        overallStd: `σ = √σ² = √${toFixed(overallDisp)} = ${toFixed(overallStd)}`,
        Dvnutr: `D̄ = ∑(Dᵢ·∑fᵢ) / N = ${groupStats
          .map((g) => `(${toFixed(g.disp)}·${g.fi})`)
          .join(' + ')} / ${N_total} = ${toFixed(Dvnutr)}`,
        Dmezh: `δ² = ∑(∑fᵢ·(X̄ᵢ - X̄)²) / N = ${groupStats
          .map(
            (g) =>
              `(${g.fi}·(${toFixed(g.mean)} - ${toFixed(overallMean)})²)`
          )
          .join(' + ')} / ${N_total} = ${toFixed(Dmezh)}`,
        etaSquared: `η² = D̄ / σ² = ${toFixed(Dmezh)} / ${toFixed(
          overallDisp
        )} = ${toFixed(etaSquared)}`,
      },
    });
  };

  const clearTable = () => {
    setTable([[0]]);
    setResults(null);
  };

  const copyResults = () => {
    if (!results) return;

    const groupRows = results.groupStats
      .map(
        (g: GroupStats, idx: number) =>
          `${idx + 1}\t${g.fi}\t${g.sumXiFi}\t${g.sumXi2Fi}\t${toFixed(g.mean)}\t${toFixed(g.disp)}\t${toFixed(g.std)}`
      )
      .join('\n');

    const text = `
Общее среднее:\t${toFixed(results.overallMean)}
Общая дисперсия:\t${toFixed(results.overallDisp)}
СКО:\t${toFixed(results.overallStd)}
Средняя внутригрупповая дисперсия:\t${toFixed(results.Dvnutr)}
Межгрупповая дисперсия:\t${toFixed(results.Dmezh)}
Проверка (σ² ≈ D + δ²):\t${toFixed(results.Dmezh + results.Dvnutr)}
Коэффициент детерминации η²:\t${toFixed(results.etaSquared)}

Группа\t∑f\t∑x·f\t∑x²·f\tX̄\tDᵢ\tσᵢ
${groupRows}
    `.trim();

    navigator.clipboard.writeText(text);
  };

  return (
    <main className="max-w-6xl mx-auto px-4">
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">
          Анализ дисперсий
        </h1>
      </div>

      <div className="overflow-x-auto relative text-sm">
        <table className="w-full border text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-center">Признак</th>
              {table[0].map((_, i) => (
                <th key={i} className="border px-2 py-1 text-center">Группа #{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={i}>
                <td className="border px-2 py-1 text-center font-semibold">{i + 1}</td>
                {row.map((val, j) => (
                  <td key={j} className="border px-1 py-1">
                    <input
                      type="text"
                      value={val}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => handleInputChange(i, j, e.target.value)}
                      className="w-full p-1 text-center outline-none"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex flex-wrap gap-3 justify-center mt-3">
          <button onClick={addRow} className="bg-green-100 text-green-800 px-3 py-1 rounded">＋ Признак</button>
          <button onClick={removeRow} className="bg-red-100 text-red-800 px-3 py-1 rounded">－ Признак</button>
          <button onClick={addColumn} className="bg-green-100 text-green-800 px-3 py-1 rounded">＋ Группа</button>
          <button onClick={removeColumn} className="bg-red-100 text-red-800 px-3 py-1 rounded">－ Группа</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 mt-4 text-sm mb-3">
        <label className="flex items-center gap-2">
          <span>Знаков после запятой:</span>
          <input
            type="number"
            min={0}
            max={10}
            value={decimalPlaces}
            onChange={(e) => setDecimalPlaces(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 border rounded text-right"
          />
        </label>

        <button
          onClick={calculate}
          className="bg-blue-600 text-white font-semibold px-6 py-2 rounded hover:bg-blue-700"
        >
          Рассчитать дисперсии
        </button>
        <button
          onClick={clearTable}
          className="bg-red-600 text-white font-semibold px-4 py-2 rounded hover:bg-red-700"
        >
          Очистить таблицу
        </button>
      </div>

      {results && (
        <div className="relative bg-white rounded shadow p-4 space-y-4">
          <h4 className="font-semibold text-base mb-1 pr-8">📈 Результаты расчета</h4>

          <button
            onClick={copyResults}
            className="absolute top-4 right-4 text-gray-600 hover:text-black"
            title="Копировать в буфер обмена"
          >
            <TbCopy className="text-xl" />
          </button>

          <ul className="list-disc list-inside text-sm space-y-1">
            <li>
              Общее среднее: <strong>{toFixed(results.overallMean)}</strong>
              <br />
              <span className="text-gray-600 text-xs">{results.formulas.overallMean}</span>
            </li>
            <li>
              Общая дисперсия: <strong>{toFixed(results.overallDisp)}</strong>
              <br />
              <span className="text-gray-600 text-xs">{results.formulas.overallDisp}</span>
            </li>
            <li>
              СКО: <strong>{toFixed(results.overallStd)}</strong>
              <br />
              <span className="text-gray-600 text-xs">{results.formulas.overallStd}</span>
            </li>
            <li>
              Средняя внутригрупповая дисперсия: <strong>{toFixed(results.Dvnutr)}</strong>
              <br />
              <span className="text-gray-600 text-xs">{results.formulas.Dvnutr}</span>
            </li>
            <li>
              Межгрупповая дисперсия: <strong>{toFixed(results.Dmezh)}</strong>
              <br />
              <span className="text-gray-600 text-xs">{results.formulas.Dmezh}</span>
            </li>
            <li>
              Проверка: σ² ≈ D + δ² → <strong>{toFixed(results.Dmezh + results.Dvnutr)}</strong>
            </li>
            <li>
              Коэффициент детерминации η²: <strong>{toFixed(results.etaSquared)}</strong>
              <br />
              <span className="text-gray-600 text-xs">{results.formulas.etaSquared}</span>
            </li>
          </ul>

          <h4 className="font-medium mt-4">📊 Детализация по группам</h4>
          <div className="overflow-x-auto">
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
              {results.groupStats.map((g: GroupStats, idx: number) => (
                <tr key={idx}>
                  <td className="border px-2 py-1 text-center">{idx + 1}</td>
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
        </div>
      )}
    </main>
  );
}
