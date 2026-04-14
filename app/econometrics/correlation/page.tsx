'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbCopy, TbTrash, TbPlus, TbMinus } from 'react-icons/tb';

interface DataPoint {
  x: number;
  y: number;
}

interface CorrelationResults {
  n: number;
  meanX: number;
  meanY: number;
  stdX: number;
  stdY: number;
  pearson: number;
  spearman: number;
  kendall: number;
  pearsonT: number;
  spearmanT: number;
  tCritical: number;
  pearsonSignificant: boolean;
  spearmanSignificant: boolean;
  pearsonInterpretation: string;
  spearmanInterpretation: string;
  kendallInterpretation: string;
  formulas: {
    pearson: string;
    spearman: string;
    kendall: string;
    pearsonT: string;
    spearmanT: string;
  };
}

const interpretCheddock = (r: number): string => {
  const abs = Math.abs(r);
  if (abs < 0.1) return 'отсутствует';
  if (abs < 0.3) return 'слабая';
  if (abs < 0.5) return 'умеренная';
  if (abs < 0.7) return 'заметная';
  if (abs < 0.9) return 'высокая';
  return 'весьма высокая';
};

const tCriticalTable: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  25: 2.060, 30: 2.042, 40: 2.021, 50: 2.009, 60: 2.000,
  80: 1.990, 100: 1.984, 120: 1.980,
};

const getTCritical = (df: number): number => {
  if (df <= 0) return 1.96;
  const keys = Object.keys(tCriticalTable).map(Number).sort((a, b) => a - b);
  for (const key of keys) {
    if (df <= key) return tCriticalTable[key];
  }
  return 1.96;
};

export default function CorrelationPage() {
  const [data, setData] = useState<DataPoint[]>([
    { x: 45.2, y: 320.5 },
    { x: 52.8, y: 365.3 },
    { x: 58.4, y: 402.1 },
    { x: 63.7, y: 435.8 },
    { x: 67.9, y: 462.4 },
    { x: 72.3, y: 488.9 },
    { x: 76.8, y: 515.2 },
    { x: 81.5, y: 542.7 },
    { x: 85.9, y: 568.3 },
    { x: 90.4, y: 594.6 },
    { x: 94.8, y: 620.1 },
    { x: 99.2, y: 645.8 },
  ]);
  const [precision, setPrecision] = useState(4);
  const [results, setResults] = useState<CorrelationResults | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const toFixed = (val: number) => val.toFixed(precision).replace('.', ',');

  const addRow = () => setData([...data, { x: 0, y: 0 }]);
  
  const removeRow = (index: number) => {
    if (data.length > 2) {
      setData(data.filter((_, i) => i !== index));
    }
  };

  const updateData = (index: number, field: 'x' | 'y', value: string) => {
    const newData = [...data];
    const parsed = parseFloat(value.replace(',', '.'));
    newData[index][field] = isNaN(parsed) ? 0 : parsed;
    setData(newData);
  };

  const clearData = () => {
    setData([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
    setResults(null);
  };

  const calculate = () => {
    const n = data.length;
    const xVals = data.map(d => d.x);
    const yVals = data.map(d => d.y);

    // Mean
    const meanX = xVals.reduce((a, b) => a + b, 0) / n;
    const meanY = yVals.reduce((a, b) => a + b, 0) / n;

    // Standard deviation
    const stdX = Math.sqrt(xVals.reduce((sum, x) => sum + (x - meanX) ** 2, 0) / n);
    const stdY = Math.sqrt(yVals.reduce((sum, y) => sum + (y - meanY) ** 2, 0) / n);

    // Pearson correlation
    const sumXY = xVals.reduce((sum, x, i) => sum + (x - meanX) * (yVals[i] - meanY), 0);
    const pearson = sumXY / (n * stdX * stdY);

    // Spearman correlation (rank-based)
    const rankX = getRanks(xVals);
    const rankY = getRanks(yVals);
    const sumD2 = rankX.reduce((sum, rx, i) => sum + (rx - rankY[i]) ** 2, 0);
    const spearman = 1 - (6 * sumD2) / (n * (n ** 2 - 1));

    // Kendall correlation
    let P = 0, Q = 0;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const xDiff = xVals[j] - xVals[i];
        const yDiff = yVals[j] - yVals[i];
        if (xDiff * yDiff > 0) P++;
        else if (xDiff * yDiff < 0) Q++;
      }
    }
    const kendall = (P - Q) / (0.5 * n * (n - 1));

    // T-statistics
    const df = n - 2;
    const tCritical = getTCritical(df);
    const pearsonT = (pearson * Math.sqrt(n - 2)) / Math.sqrt(1 - pearson ** 2);
    const spearmanT = (spearman * Math.sqrt(n - 2)) / Math.sqrt(1 - spearman ** 2);

    setResults({
      n,
      meanX,
      meanY,
      stdX,
      stdY,
      pearson,
      spearman,
      kendall,
      pearsonT,
      spearmanT,
      tCritical,
      pearsonSignificant: Math.abs(pearsonT) > tCritical,
      spearmanSignificant: Math.abs(spearmanT) > tCritical,
      pearsonInterpretation: interpretCheddock(pearson),
      spearmanInterpretation: interpretCheddock(spearman),
      kendallInterpretation: interpretCheddock(kendall),
      formulas: {
        pearson: `r = sum((xi - X_bar)(yi - Y_bar)) / (n * Sx * Sy) = ${toFixed(sumXY)} / (${n} * ${toFixed(stdX)} * ${toFixed(stdY)}) = ${toFixed(pearson)}`,
        spearman: `rho = 1 - 6 * sum(d^2) / (n * (n^2 - 1)) = 1 - 6 * ${toFixed(sumD2)} / (${n} * (${n}^2 - 1)) = ${toFixed(spearman)}`,
        kendall: `tau = (P - Q) / (0.5 * n * (n - 1)) = (${P} - ${Q}) / (0.5 * ${n} * ${n - 1}) = ${toFixed(kendall)}`,
        pearsonT: `t_r = r * sqrt(n - 2) / sqrt(1 - r^2) = ${toFixed(pearson)} * sqrt(${n - 2}) / sqrt(1 - ${toFixed(pearson)}^2) = ${toFixed(pearsonT)}`,
        spearmanT: `t_rho = rho * sqrt(n - 2) / sqrt(1 - rho^2) = ${toFixed(spearman)} * sqrt(${n - 2}) / sqrt(1 - ${toFixed(spearman)}^2) = ${toFixed(spearmanT)}`,
      },
    });
  };

  const getRanks = (arr: number[]): number[] => {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
      const avgRank = (i + j + 1) / 2;
      for (let k = i; k < j; k++) {
        ranks[sorted[k].i] = avgRank;
      }
      i = j;
    }
    return ranks;
  };

  const copyResults = () => {
    if (!results) return;
    const text = `
Корреляционный анализ (n = ${results.n})

Описательная статистика:
X_bar = ${toFixed(results.meanX)}
Y_bar = ${toFixed(results.meanY)}
Sx = ${toFixed(results.stdX)}
Sy = ${toFixed(results.stdY)}

Коэффициенты корреляции:
Пирсон (r) = ${toFixed(results.pearson)} (${results.pearsonInterpretation})
Спирмен (rho) = ${toFixed(results.spearman)} (${results.spearmanInterpretation})
Кендалл (tau) = ${toFixed(results.kendall)} (${results.kendallInterpretation})

Проверка значимости (alpha = 0.05, df = ${results.n - 2}):
t_критич = ${toFixed(results.tCritical)}
t_r = ${toFixed(results.pearsonT)} - ${results.pearsonSignificant ? 'значим' : 'не значим'}
t_rho = ${toFixed(results.spearmanT)} - ${results.spearmanSignificant ? 'значим' : 'не значим'}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 pb-10">
      <div className="flex justify-center items-center mb-6">
        <Link href="/econometrics" className="text-blue-600 hover:text-blue-800 transition" title="К разделу эконометрики">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">Корреляционный анализ</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">Знаков после запятой:</label>
            <input
              type="number"
              min={0}
              max={10}
              className="border px-2 py-1 w-16 rounded text-sm"
              value={precision}
              onChange={(e) => setPrecision(parseInt(e.target.value) || 4)}
            />
          </div>
          <button
            onClick={addRow}
            className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            <TbPlus /> Добавить
          </button>
          <button
            onClick={clearData}
            className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            <TbTrash /> Очистить
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2 w-12">N</th>
                <th className="border px-3 py-2">X (фактор)</th>
                <th className="border px-3 py-2">Y (результат)</th>
                <th className="border px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="border px-3 py-2 text-center bg-gray-50">{i + 1}</td>
                  <td className="border px-1 py-1">
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-center"
                      value={row.x}
                      onChange={(e) => updateData(i, 'x', e.target.value)}
                    />
                  </td>
                  <td className="border px-1 py-1">
                    <input
                      type="text"
                      className="w-full px-2 py-1 text-center"
                      value={row.y}
                      onChange={(e) => updateData(i, 'y', e.target.value)}
                    />
                  </td>
                  <td className="border px-1 py-1 text-center">
                    <button
                      onClick={() => removeRow(i)}
                      className="text-red-500 hover:text-red-700"
                      disabled={data.length <= 2}
                    >
                      <TbMinus />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={calculate}
          className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700"
        >
          Рассчитать
        </button>
      </div>

      {results && (
        <div className="bg-gray-50 p-6 rounded-lg border relative" ref={resultsRef}>
          <button
            onClick={copyResults}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            title="Скопировать результаты"
          >
            <TbCopy className="text-xl" />
          </button>

          <h2 className="text-lg font-semibold mb-4">Результаты анализа (n = {results.n})</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Описательная статистика</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1">Среднее X:</td><td className="py-1 font-mono">{toFixed(results.meanX)}</td></tr>
                  <tr><td className="py-1">Среднее Y:</td><td className="py-1 font-mono">{toFixed(results.meanY)}</td></tr>
                  <tr><td className="py-1">СКО X:</td><td className="py-1 font-mono">{toFixed(results.stdX)}</td></tr>
                  <tr><td className="py-1">СКО Y:</td><td className="py-1 font-mono">{toFixed(results.stdY)}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Коэффициенты корреляции</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 text-left">Метод</th>
                    <th className="py-1 text-right">Значение</th>
                    <th className="py-1 text-left pl-2">Сила связи</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1">Пирсон (r)</td>
                    <td className="py-1 font-mono text-right">{toFixed(results.pearson)}</td>
                    <td className="py-1 pl-2">{results.pearsonInterpretation}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Спирмен (rho)</td>
                    <td className="py-1 font-mono text-right">{toFixed(results.spearman)}</td>
                    <td className="py-1 pl-2">{results.spearmanInterpretation}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Кендалл (tau)</td>
                    <td className="py-1 font-mono text-right">{toFixed(results.kendall)}</td>
                    <td className="py-1 pl-2">{results.kendallInterpretation}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 bg-white p-4 rounded border">
            <h3 className="font-semibold mb-2">Проверка значимости (alpha = 0,05)</h3>
            <p className="text-sm mb-2">Степени свободы: df = n - 2 = {results.n - 2}</p>
            <p className="text-sm mb-3">t-критическое = {toFixed(results.tCritical)}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className={`p-3 rounded ${results.pearsonSignificant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                <p><strong>Пирсон:</strong> t = {toFixed(results.pearsonT)}</p>
                <p className={results.pearsonSignificant ? 'text-green-700' : 'text-red-700'}>
                  |t| = {toFixed(Math.abs(results.pearsonT))} {results.pearsonSignificant ? '>' : '<='} {toFixed(results.tCritical)} - 
                  {results.pearsonSignificant ? ' связь значима' : ' связь не значима'}
                </p>
              </div>
              <div className={`p-3 rounded ${results.spearmanSignificant ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
                <p><strong>Спирмен:</strong> t = {toFixed(results.spearmanT)}</p>
                <p className={results.spearmanSignificant ? 'text-green-700' : 'text-red-700'}>
                  |t| = {toFixed(Math.abs(results.spearmanT))} {results.spearmanSignificant ? '>' : '<='} {toFixed(results.tCritical)} - 
                  {results.spearmanSignificant ? ' связь значима' : ' связь не значима'}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 bg-white p-4 rounded border">
            <h3 className="font-semibold mb-2">Формулы расчета</h3>
            <div className="text-xs font-mono space-y-1 overflow-x-auto">
              <p>{results.formulas.pearson}</p>
              <p>{results.formulas.spearman}</p>
              <p>{results.formulas.kendall}</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm">
            <h3 className="font-semibold mb-2">Шкала Чеддока</h3>
            <p>0.1-0.3: слабая | 0.3-0.5: умеренная | 0.5-0.7: заметная | 0.7-0.9: высокая | 0.9-1.0: весьма высокая</p>
          </div>
        </div>
      )}
    </main>
  );
}
