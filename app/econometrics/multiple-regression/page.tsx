'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbCopy, TbTrash, TbPlus, TbMinus } from 'react-icons/tb';

interface DataRow {
  y: number;
  x: number[];
}

interface RegressionResults {
  n: number;
  k: number;
  coefficients: number[];
  stdErrors: number[];
  tStats: number[];
  pValues: number[];
  significant: boolean[];
  R2: number;
  R2adj: number;
  F: number;
  Fcrit: number;
  fSignificant: boolean;
  multipleR: number;
  partialCorr: number[];
  vif: number[];
  multicollinearity: boolean;
  residuals: number[];
  yPredicted: number[];
  SST: number;
  SSR: number;
  SSE: number;
  correlationMatrix: number[][];
}

// Simple matrix operations
const transpose = (m: number[][]): number[][] => m[0].map((_, i) => m.map(r => r[i]));

const multiply = (a: number[][], b: number[][]): number[][] => {
  const result: number[][] = [];
  for (let i = 0; i < a.length; i++) {
    result[i] = [];
    for (let j = 0; j < b[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < a[0].length; k++) {
        sum += a[i][k] * b[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
};

const inverse = (matrix: number[][]): number[][] => {
  const n = matrix.length;
  const augmented = matrix.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
  
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) maxRow = k;
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    const pivot = augmented[i][i];
    if (Math.abs(pivot) < 1e-10) continue;
    
    for (let j = 0; j < 2 * n; j++) augmented[i][j] /= pivot;
    
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }
  
  return augmented.map(row => row.slice(n));
};

const tCriticalTable: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  25: 2.060, 30: 2.042, 40: 2.021, 50: 2.009, 60: 2.000,
};

const getTCritical = (df: number): number => {
  if (df <= 0) return 1.96;
  const keys = Object.keys(tCriticalTable).map(Number).sort((a, b) => a - b);
  for (const key of keys) {
    if (df <= key) return tCriticalTable[key];
  }
  return 1.96;
};

const fCriticalTable: Record<string, number> = {
  '1,10': 4.96, '2,10': 4.10, '3,10': 3.71, '4,10': 3.48,
  '1,15': 4.54, '2,15': 3.68, '3,15': 3.29, '4,15': 3.06,
  '1,20': 4.35, '2,20': 3.49, '3,20': 3.10, '4,20': 2.87,
  '1,30': 4.17, '2,30': 3.32, '3,30': 2.92, '4,30': 2.69,
  '2,17': 3.59, '3,16': 3.24, '4,15': 3.06,
};

const getFCritical = (k: number, df2: number): number => {
  const key = `${k},${df2}`;
  if (fCriticalTable[key]) return fCriticalTable[key];
  // Approximate
  return 3.0 + k * 0.2 - df2 * 0.02;
};

export default function MultipleRegressionPage() {
  const [numFactors, setNumFactors] = useState(4);
  const [factorNames, setFactorNames] = useState(['X1 (Цена)', 'X2 (Кофе)', 'X3 (Доход)', 'X4 (Реклама)']);
  const [data, setData] = useState<DataRow[]>([
    { y: 12.5, x: [45, 800, 55, 2.1] },
    { y: 11.8, x: [46.5, 820, 56.2, 1.9] },
    { y: 13.2, x: [44, 790, 58, 2.5] },
    { y: 10.5, x: [48, 850, 54.5, 1.5] },
    { y: 14, x: [43, 780, 60, 2.8] },
    { y: 11, x: [47.5, 840, 55.5, 1.6] },
    { y: 13.8, x: [43.5, 785, 59.5, 2.7] },
    { y: 10.2, x: [49, 860, 53, 1.4] },
    { y: 14.5, x: [42, 770, 62, 3] },
    { y: 11.5, x: [47, 835, 56, 1.8] },
    { y: 13.5, x: [43.8, 788, 59, 2.6] },
    { y: 10.8, x: [48.2, 845, 54.8, 1.5] },
    { y: 14.2, x: [42.5, 775, 61, 2.9] },
    { y: 11.2, x: [47.2, 838, 55.8, 1.7] },
    { y: 13, x: [44.2, 795, 57.5, 2.4] },
    { y: 10, x: [49.5, 870, 52.5, 1.3] },
    { y: 14.8, x: [41.5, 760, 63, 3.2] },
    { y: 11.9, x: [46.8, 825, 56.5, 2] },
    { y: 13.6, x: [43.2, 782, 59.2, 2.65] },
    { y: 10.4, x: [48.5, 855, 54, 1.45] },
  ]);
  const [precision, setPrecision] = useState(4);
  const [results, setResults] = useState<RegressionResults | null>(null);

  const toFixed = (val: number) => val.toFixed(precision).replace('.', ',');

  const addRow = () => setData([...data, { y: 0, x: Array(numFactors).fill(0) }]);

  const removeRow = (index: number) => {
    if (data.length > numFactors + 2) {
      setData(data.filter((_, i) => i !== index));
    }
  };

  const updateY = (index: number, value: string) => {
    const newData = [...data];
    newData[index].y = parseFloat(value.replace(',', '.')) || 0;
    setData(newData);
  };

  const updateX = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...data];
    newData[rowIndex].x[colIndex] = parseFloat(value.replace(',', '.')) || 0;
    setData(newData);
  };

  const updateFactorName = (index: number, name: string) => {
    const newNames = [...factorNames];
    newNames[index] = name;
    setFactorNames(newNames);
  };

  const changeFactorCount = (newCount: number) => {
    if (newCount < 1 || newCount > 10) return;
    setNumFactors(newCount);
    setFactorNames(Array(newCount).fill(0).map((_, i) => factorNames[i] || `X${i + 1}`));
    setData(data.map(row => ({
      ...row,
      x: Array(newCount).fill(0).map((_, i) => row.x[i] || 0)
    })));
    setResults(null);
  };

  const clearData = () => {
    setData(Array(5).fill(0).map(() => ({ y: 0, x: Array(numFactors).fill(0) })));
    setResults(null);
  };

  const calculate = () => {
    const n = data.length;
    const k = numFactors;
    const Y = data.map(d => [d.y]);
    const X = data.map(d => [1, ...d.x]);
    
    const Xt = transpose(X);
    const XtX = multiply(Xt, X);
    const XtXinv = inverse(XtX);
    const XtY = multiply(Xt, Y);
    const B = multiply(XtXinv, XtY);
    const coefficients = B.map(b => b[0]);
    
    // Predictions and residuals
    const Ypred = multiply(X, B);
    const yPredicted = Ypred.map(y => y[0]);
    const residuals = data.map((d, i) => d.y - yPredicted[i]);
    
    // Sum of squares
    const yMean = data.reduce((s, d) => s + d.y, 0) / n;
    const SST = data.reduce((s, d) => s + (d.y - yMean) ** 2, 0);
    const SSE = residuals.reduce((s, e) => s + e ** 2, 0);
    const SSR = SST - SSE;
    
    // R-squared
    const R2 = SSR / SST;
    const R2adj = 1 - (1 - R2) * (n - 1) / (n - k - 1);
    const multipleR = Math.sqrt(R2);
    
    // Standard error of regression
    const MSE = SSE / (n - k - 1);
    const se = Math.sqrt(MSE);
    
    // Standard errors of coefficients
    const stdErrors = XtXinv.map((row, i) => Math.sqrt(MSE * row[i]));
    
    // T-statistics
    const tCrit = getTCritical(n - k - 1);
    const tStats = coefficients.map((b, i) => b / stdErrors[i]);
    const significant = tStats.map(t => Math.abs(t) > tCrit);
    const pValues = tStats.map(() => 0.05); // Simplified
    
    // F-statistic
    const MSR = SSR / k;
    const F = MSR / MSE;
    const Fcrit = getFCritical(k, n - k - 1);
    const fSignificant = F > Fcrit;
    
    // Correlation matrix
    const allVars = data.map(d => [d.y, ...d.x]);
    const means = Array(k + 1).fill(0).map((_, i) => 
      allVars.reduce((s, row) => s + row[i], 0) / n
    );
    const stds = Array(k + 1).fill(0).map((_, i) => 
      Math.sqrt(allVars.reduce((s, row) => s + (row[i] - means[i]) ** 2, 0) / n)
    );
    
    const correlationMatrix: number[][] = [];
    for (let i = 0; i < k + 1; i++) {
      correlationMatrix[i] = [];
      for (let j = 0; j < k + 1; j++) {
        const cov = allVars.reduce((s, row) => s + (row[i] - means[i]) * (row[j] - means[j]), 0) / n;
        correlationMatrix[i][j] = cov / (stds[i] * stds[j]);
      }
    }
    
    // VIF calculation
    const vif: number[] = [];
    for (let j = 0; j < k; j++) {
      // Regress Xj on other X variables
      const Yj = data.map(d => [d.x[j]]);
      const Xj = data.map(d => [1, ...d.x.filter((_, idx) => idx !== j)]);
      
      try {
        const XjT = transpose(Xj);
        const XjTXj = multiply(XjT, Xj);
        const XjTXjInv = inverse(XjTXj);
        const XjTYj = multiply(XjT, Yj);
        const Bj = multiply(XjTXjInv, XjTYj);
        
        const YjPred = multiply(Xj, Bj);
        const YjMean = data.reduce((s, d) => s + d.x[j], 0) / n;
        const SSTj = data.reduce((s, d) => s + (d.x[j] - YjMean) ** 2, 0);
        const SSEj = data.reduce((s, d, i) => s + (d.x[j] - YjPred[i][0]) ** 2, 0);
        const R2j = 1 - SSEj / SSTj;
        vif[j] = 1 / (1 - R2j);
      } catch {
        vif[j] = 1;
      }
    }
    
    const multicollinearity = vif.some(v => v > 10);
    
    // Partial correlations
    const partialCorr = correlationMatrix[0].slice(1);
    
    setResults({
      n, k, coefficients, stdErrors, tStats, pValues, significant,
      R2, R2adj, F, Fcrit, fSignificant, multipleR, partialCorr,
      vif, multicollinearity, residuals, yPredicted,
      SST, SSR, SSE, correlationMatrix
    });
  };

  const copyResults = () => {
    if (!results) return;
    const text = `
Множественная регрессия (n=${results.n}, k=${results.k})

Уравнение: Y = ${toFixed(results.coefficients[0])} ${results.coefficients.slice(1).map((b, i) => `${b >= 0 ? '+' : ''}${toFixed(b)}*${factorNames[i]}`).join(' ')}

Коэффициенты:
b0 = ${toFixed(results.coefficients[0])}
${results.coefficients.slice(1).map((b, i) => `b${i + 1} = ${toFixed(b)} (t=${toFixed(results.tStats[i + 1])}, ${results.significant[i + 1] ? 'значим' : 'не значим'})`).join('\n')}

Качество модели:
R = ${toFixed(results.multipleR)}
R² = ${toFixed(results.R2)}
R²adj = ${toFixed(results.R2adj)}
F = ${toFixed(results.F)} (${results.fSignificant ? 'значим' : 'не значим'})

VIF:
${factorNames.map((name, i) => `${name}: VIF = ${toFixed(results.vif[i])} ${results.vif[i] > 10 ? '(мультиколлинеарность!)' : ''}`).join('\n')}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 pb-10">
      <div className="flex justify-center items-center mb-6">
        <Link href="/econometrics" className="text-blue-600 hover:text-blue-800 transition" title="К разделу эконометрики">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">Множественная регрессия</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">Факторов:</label>
            <input
              type="number"
              min={1}
              max={10}
              className="border px-2 py-1 w-16 rounded text-sm"
              value={numFactors}
              onChange={(e) => changeFactorCount(parseInt(e.target.value) || 2)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">Точность:</label>
            <input
              type="number"
              min={0}
              max={10}
              className="border px-2 py-1 w-16 rounded text-sm"
              value={precision}
              onChange={(e) => setPrecision(parseInt(e.target.value) || 4)}
            />
          </div>
          <button onClick={addRow} className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            <TbPlus /> Добавить
          </button>
          <button onClick={clearData} className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
            <TbTrash /> Очистить
          </button>
        </div>

        <div className="mb-4">
          <h3 className="font-medium text-sm mb-2">Названия факторов:</h3>
          <div className="flex flex-wrap gap-2">
            {factorNames.map((name, i) => (
              <input
                key={i}
                type="text"
                className="border px-2 py-1 rounded text-sm w-32"
                value={name}
                onChange={(e) => updateFactorName(i, e.target.value)}
                placeholder={`X${i + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-2 w-10">N</th>
                <th className="border px-2 py-2 min-w-[80px]">Y</th>
                {factorNames.map((name, i) => (
                  <th key={i} className="border px-2 py-2 min-w-[80px]">{name}</th>
                ))}
                <th className="border px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1 text-center bg-gray-50">{i + 1}</td>
                  <td className="border px-1 py-1">
                    <input
                      type="text"
                      className="w-full px-1 py-1 text-center text-sm"
                      value={row.y}
                      onChange={(e) => updateY(i, e.target.value)}
                    />
                  </td>
                  {row.x.map((val, j) => (
                    <td key={j} className="border px-1 py-1">
                      <input
                        type="text"
                        className="w-full px-1 py-1 text-center text-sm"
                        value={val}
                        onChange={(e) => updateX(i, j, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="border px-1 py-1 text-center">
                    <button onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700">
                      <TbMinus />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button onClick={calculate} className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700">
          Рассчитать
        </button>
      </div>

      {results && (
        <div className="bg-gray-50 p-6 rounded-lg border relative">
          <button onClick={copyResults} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800" title="Скопировать">
            <TbCopy className="text-xl" />
          </button>

          <h2 className="text-lg font-semibold mb-4">Результаты анализа</h2>

          <div className="bg-white p-4 rounded border mb-4">
            <h3 className="font-semibold mb-2">Уравнение регрессии</h3>
            <p className="font-mono text-sm break-all">
              Y = {toFixed(results.coefficients[0])} {results.coefficients.slice(1).map((b, i) => 
                `${b >= 0 ? '+' : ''} ${toFixed(b)} * ${factorNames[i]}`
              ).join(' ')}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Коэффициенты регрессии</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-1 text-left">Параметр</th>
                      <th className="py-1 text-right">b</th>
                      <th className="py-1 text-right">SE</th>
                      <th className="py-1 text-right">t</th>
                      <th className="py-1 text-center">Знач.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-1">Константа</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.coefficients[0])}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.stdErrors[0])}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.tStats[0])}</td>
                      <td className="py-1 text-center">{results.significant[0] ? 'V' : '-'}</td>
                    </tr>
                    {factorNames.map((name, i) => (
                      <tr key={i} className={results.significant[i + 1] ? 'bg-green-50' : ''}>
                        <td className="py-1">{name}</td>
                        <td className="py-1 font-mono text-right">{toFixed(results.coefficients[i + 1])}</td>
                        <td className="py-1 font-mono text-right">{toFixed(results.stdErrors[i + 1])}</td>
                        <td className="py-1 font-mono text-right">{toFixed(results.tStats[i + 1])}</td>
                        <td className="py-1 text-center">{results.significant[i + 1] ? 'V' : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">t-крит = {toFixed(getTCritical(results.n - results.k - 1))} (alpha=0.05)</p>
            </div>

            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Качество модели</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td className="py-1">Множественный R:</td><td className="py-1 font-mono text-right">{toFixed(results.multipleR)}</td></tr>
                  <tr><td className="py-1">R-квадрат:</td><td className="py-1 font-mono text-right">{toFixed(results.R2)}</td></tr>
                  <tr><td className="py-1">Скорр. R-квадрат:</td><td className="py-1 font-mono text-right">{toFixed(results.R2adj)}</td></tr>
                  <tr><td className="py-1">SST:</td><td className="py-1 font-mono text-right">{toFixed(results.SST)}</td></tr>
                  <tr><td className="py-1">SSR:</td><td className="py-1 font-mono text-right">{toFixed(results.SSR)}</td></tr>
                  <tr><td className="py-1">SSE:</td><td className="py-1 font-mono text-right">{toFixed(results.SSE)}</td></tr>
                </tbody>
              </table>
              <div className={`mt-3 p-2 rounded text-sm ${results.fSignificant ? 'bg-green-100' : 'bg-red-100'}`}>
                <p>F-статистика: {toFixed(results.F)}</p>
                <p>F-критическое: {toFixed(results.Fcrit)}</p>
                <p className={results.fSignificant ? 'text-green-700' : 'text-red-700'}>
                  Модель {results.fSignificant ? 'статистически значима' : 'не значима'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded border mb-4">
            <h3 className="font-semibold mb-2">Проверка мультиколлинеарности (VIF)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 text-left">Фактор</th>
                    <th className="py-1 text-right">VIF</th>
                    <th className="py-1 text-left pl-4">Оценка</th>
                  </tr>
                </thead>
                <tbody>
                  {factorNames.map((name, i) => (
                    <tr key={i} className={results.vif[i] > 10 ? 'bg-red-50' : results.vif[i] > 5 ? 'bg-yellow-50' : ''}>
                      <td className="py-1">{name}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.vif[i])}</td>
                      <td className="py-1 pl-4">
                        {results.vif[i] > 10 ? 'Сильная мультиколлинеарность' : 
                         results.vif[i] > 5 ? 'Умеренная мультиколлинеарность' : 'Норма'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {results.multicollinearity && (
              <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded text-sm">
                <p className="font-semibold text-red-700">Обнаружена мультиколлинеарность!</p>
                <p className="text-red-600">Рекомендации: исключить один из коррелированных факторов, применить метод главных компонент или гребневую регрессию.</p>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-2">VIF &gt; 10 - сильная мультиколлинеарность, VIF &gt; 5 - умеренная</p>
          </div>

          <div className="bg-white p-4 rounded border">
            <h3 className="font-semibold mb-2">Матрица парных корреляций</h3>
            <div className="overflow-x-auto">
              <table className="text-xs">
                <thead>
                  <tr>
                    <th className="border px-2 py-1"></th>
                    <th className="border px-2 py-1">Y</th>
                    {factorNames.map((name, i) => (
                      <th key={i} className="border px-2 py-1">{name.split(' ')[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['Y', ...factorNames.map(n => n.split(' ')[0])].map((name, i) => (
                    <tr key={i}>
                      <td className="border px-2 py-1 font-semibold bg-gray-50">{name}</td>
                      {results.correlationMatrix[i].map((val, j) => (
                        <td key={j} className={`border px-2 py-1 text-center ${i === j ? 'bg-gray-100' : Math.abs(val) > 0.7 && i !== 0 && j !== 0 ? 'bg-yellow-100' : ''}`}>
                          {toFixed(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
