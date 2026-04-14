'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbCopy, TbTrash, TbPlus, TbMinus } from 'react-icons/tb';

interface DataRow {
  y: number;
  x1: number;
  x2: number;
  d: number;
}

interface ModelResults {
  n: number;
  coefficients: number[];
  stdErrors: number[];
  tStats: number[];
  significant: boolean[];
  R2: number;
  R2adj: number;
  F: number;
  fSignificant: boolean;
}

interface ChowTestResults {
  F: number;
  Fcrit: number;
  structuralBreak: boolean;
  SSE_pooled: number;
  SSE_1: number;
  SSE_2: number;
  df1: number;
  df2: number;
}

interface Results {
  baseModel: ModelResults;
  dummyModel: ModelResults;
  interactionModel: ModelResults;
  chowTest: ChowTestResults;
  bestModel: string;
  breakPoint: number;
}

// Matrix operations
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
        for (let j = 0; j < 2 * n; j++) augmented[k][j] -= factor * augmented[i][j];
      }
    }
  }
  
  return augmented.map(row => row.slice(n));
};

const getTCritical = (df: number): number => {
  const table: Record<number, number> = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365,
    8: 2.306, 9: 2.262, 10: 2.228, 15: 2.131, 20: 2.086, 25: 2.060, 30: 2.042,
  };
  for (const key of Object.keys(table).map(Number).sort((a, b) => a - b)) {
    if (df <= key) return table[key];
  }
  return 1.96;
};

const getFCritical = (k: number, df2: number): number => {
  const table: Record<string, number> = {
    '2,25': 3.39, '3,24': 3.01, '4,23': 2.78, '3,26': 2.98, '4,25': 2.76,
    '2,20': 3.49, '3,20': 3.10, '4,20': 2.87,
  };
  const key = `${k},${df2}`;
  return table[key] || 3.0;
};

export default function DummyVariablesPage() {
  const [data, setData] = useState<DataRow[]>([
    { y: 8.52, x1: 5.00, x2: 60.1, d: 0 },
    { y: 8.41, x1: 5.05, x2: 60.8, d: 0 },
    { y: 8.29, x1: 5.12, x2: 61.5, d: 0 },
    { y: 8.18, x1: 5.18, x2: 62.3, d: 0 },
    { y: 8.05, x1: 5.25, x2: 63.1, d: 0 },
    { y: 7.94, x1: 5.31, x2: 63.9, d: 0 },
    { y: 7.82, x1: 5.38, x2: 64.6, d: 0 },
    { y: 7.71, x1: 5.44, x2: 65.4, d: 0 },
    { y: 7.59, x1: 5.51, x2: 66.2, d: 0 },
    { y: 7.48, x1: 5.57, x2: 66.9, d: 0 },
    { y: 7.36, x1: 5.64, x2: 67.7, d: 0 },
    { y: 7.25, x1: 5.70, x2: 68.5, d: 0 },
    { y: 7.13, x1: 5.77, x2: 69.2, d: 0 },
    { y: 7.02, x1: 5.83, x2: 70.0, d: 0 },
    { y: 6.90, x1: 5.90, x2: 70.8, d: 0 },
    { y: 6.02, x1: 5.96, x2: 71.5, d: 1 },
    { y: 5.81, x1: 6.03, x2: 72.3, d: 1 },
    { y: 5.59, x1: 6.09, x2: 73.1, d: 1 },
    { y: 5.38, x1: 6.16, x2: 73.8, d: 1 },
    { y: 5.16, x1: 6.22, x2: 74.6, d: 1 },
    { y: 4.95, x1: 6.29, x2: 75.4, d: 1 },
    { y: 4.73, x1: 6.35, x2: 76.1, d: 1 },
    { y: 4.52, x1: 6.42, x2: 76.9, d: 1 },
    { y: 4.30, x1: 6.48, x2: 77.7, d: 1 },
    { y: 4.09, x1: 6.55, x2: 78.4, d: 1 },
    { y: 3.87, x1: 6.61, x2: 79.2, d: 1 },
    { y: 3.66, x1: 6.68, x2: 80.0, d: 1 },
    { y: 3.44, x1: 6.74, x2: 80.7, d: 1 },
    { y: 3.23, x1: 6.81, x2: 81.5, d: 1 },
    { y: 3.01, x1: 6.87, x2: 82.3, d: 1 },
  ]);
  const [breakPoint, setBreakPoint] = useState(15);
  const [precision, setPrecision] = useState(4);
  const [results, setResults] = useState<Results | null>(null);

  const toFixed = (val: number) => val.toFixed(precision).replace('.', ',');

  const addRow = () => setData([...data, { y: 0, x1: 0, x2: 0, d: 0 }]);

  const removeRow = (index: number) => {
    if (data.length > 6) setData(data.filter((_, i) => i !== index));
  };

  const updateData = (index: number, field: keyof DataRow, value: string) => {
    const newData = [...data];
    if (field === 'd') {
      newData[index][field] = parseInt(value) === 1 ? 1 : 0;
    } else {
      newData[index][field] = parseFloat(value.replace(',', '.')) || 0;
    }
    setData(newData);
  };

  const autoSetDummy = () => {
    const newData = data.map((row, i) => ({
      ...row,
      d: i >= breakPoint ? 1 : 0
    }));
    setData(newData);
  };

  const clearData = () => {
    setData(Array(10).fill(0).map(() => ({ y: 0, x1: 0, x2: 0, d: 0 })));
    setResults(null);
  };

  const runRegression = (Y: number[][], X: number[][]): ModelResults => {
    const n = Y.length;
    const k = X[0].length - 1;
    
    const Xt = transpose(X);
    const XtX = multiply(Xt, X);
    const XtXinv = inverse(XtX);
    const XtY = multiply(Xt, Y);
    const B = multiply(XtXinv, XtY);
    const coefficients = B.map(b => b[0]);
    
    const Ypred = multiply(X, B);
    const residuals = Y.map((row, i) => row[0] - Ypred[i][0]);
    
    const yMean = Y.reduce((s, row) => s + row[0], 0) / n;
    const SST = Y.reduce((s, row) => s + (row[0] - yMean) ** 2, 0);
    const SSE = residuals.reduce((s, e) => s + e ** 2, 0);
    const SSR = SST - SSE;
    const R2 = SSR / SST;
    const R2adj = 1 - (1 - R2) * (n - 1) / (n - k - 1);
    
    const MSE = SSE / (n - k - 1);
    const MSR = SSR / k;
    const F = MSR / MSE;
    const Fcrit = getFCritical(k, n - k - 1);
    
    const stdErrors = XtXinv.map((row, i) => Math.sqrt(Math.abs(MSE * row[i])));
    const tCrit = getTCritical(n - k - 1);
    const tStats = coefficients.map((b, i) => b / (stdErrors[i] || 0.001));
    const significant = tStats.map(t => Math.abs(t) > tCrit);
    
    return {
      n, coefficients, stdErrors, tStats, significant,
      R2, R2adj, F, fSignificant: F > Fcrit
    };
  };

  const calculate = () => {
    const n = data.length;
    const Y = data.map(d => [d.y]);
    
    // Base model: Y = b0 + b1*X1 + b2*X2
    const X_base = data.map(d => [1, d.x1, d.x2]);
    const baseModel = runRegression(Y, X_base);
    
    // Dummy model: Y = b0 + b1*X1 + b2*X2 + b3*D
    const X_dummy = data.map(d => [1, d.x1, d.x2, d.d]);
    const dummyModel = runRegression(Y, X_dummy);
    
    // Interaction model: Y = b0 + b1*X1 + b2*X2 + b3*D + b4*X2*D
    const X_interaction = data.map(d => [1, d.x1, d.x2, d.d, d.x2 * d.d]);
    const interactionModel = runRegression(Y, X_interaction);
    
    // Chow test
    const data0 = data.filter(d => d.d === 0);
    const data1 = data.filter(d => d.d === 1);
    
    const Y0 = data0.map(d => [d.y]);
    const X0 = data0.map(d => [1, d.x1, d.x2]);
    const Y1 = data1.map(d => [d.y]);
    const X1 = data1.map(d => [1, d.x1, d.x2]);
    
    const pooledResiduals = runRegression(Y, X_base);
    const pred_pooled = data.map(d => pooledResiduals.coefficients[0] + pooledResiduals.coefficients[1] * d.x1 + pooledResiduals.coefficients[2] * d.x2);
    const SSE_pooled = data.reduce((s, d, j) => s + (d.y - pred_pooled[j]) ** 2, 0);
    
    const model0 = runRegression(Y0, X0);
    const model1 = runRegression(Y1, X1);
    
    const pred0 = data0.map(d => model0.coefficients[0] + model0.coefficients[1] * d.x1 + model0.coefficients[2] * d.x2);
    const pred1 = data1.map(d => model1.coefficients[0] + model1.coefficients[1] * d.x1 + model1.coefficients[2] * d.x2);
    
    const SSE_1 = data0.reduce((s, d, i) => s + (d.y - pred0[i]) ** 2, 0);
    const SSE_2 = data1.reduce((s, d, i) => s + (d.y - pred1[i]) ** 2, 0);
    
    const k = 3; // number of parameters
    const df1 = k;
    const df2 = n - 2 * k;
    
    const F_chow = ((SSE_pooled - SSE_1 - SSE_2) / k) / ((SSE_1 + SSE_2) / (n - 2 * k));
    const Fcrit_chow = getFCritical(k, df2);
    
    // Best model selection based on adjusted R2
    const models = [
      { name: 'Базовая (без фиктивных)', R2adj: baseModel.R2adj },
      { name: 'С фиктивной D', R2adj: dummyModel.R2adj },
      { name: 'С взаимодействием X2*D', R2adj: interactionModel.R2adj }
    ];
    const bestModel = models.reduce((best, m) => m.R2adj > best.R2adj ? m : best).name;
    
    setResults({
      baseModel,
      dummyModel,
      interactionModel,
      chowTest: {
        F: F_chow,
        Fcrit: Fcrit_chow,
        structuralBreak: F_chow > Fcrit_chow,
        SSE_pooled,
        SSE_1,
        SSE_2,
        df1,
        df2
      },
      bestModel,
      breakPoint
    });
  };

  const copyResults = () => {
    if (!results) return;
    const text = `
Анализ фиктивных переменных (n=${data.length})

Базовая модель: Y = ${toFixed(results.baseModel.coefficients[0])} + ${toFixed(results.baseModel.coefficients[1])}*X1 + ${toFixed(results.baseModel.coefficients[2])}*X2
R2adj = ${toFixed(results.baseModel.R2adj)}

Модель с D: Y = ${toFixed(results.dummyModel.coefficients[0])} + ${toFixed(results.dummyModel.coefficients[1])}*X1 + ${toFixed(results.dummyModel.coefficients[2])}*X2 + ${toFixed(results.dummyModel.coefficients[3])}*D
R2adj = ${toFixed(results.dummyModel.R2adj)}
Коэффициент D ${results.dummyModel.significant[3] ? 'значим' : 'не значим'}

Модель с взаимодействием: Y = ${toFixed(results.interactionModel.coefficients[0])} + ${toFixed(results.interactionModel.coefficients[1])}*X1 + ${toFixed(results.interactionModel.coefficients[2])}*X2 + ${toFixed(results.interactionModel.coefficients[3])}*D + ${toFixed(results.interactionModel.coefficients[4])}*X2*D
R2adj = ${toFixed(results.interactionModel.R2adj)}

Тест Чоу: F = ${toFixed(results.chowTest.F)}, F_крит = ${toFixed(results.chowTest.Fcrit)}
${results.chowTest.structuralBreak ? 'Структурный сдвиг обнаружен' : 'Структурный сдвиг не обнаружен'}

Лучшая модель: ${results.bestModel}
    `.trim();
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 pb-10">
      <div className="flex justify-center items-center mb-6">
        <Link href="/econometrics" className="text-blue-600 hover:text-blue-800 transition" title="К разделу эконометрики">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">Фиктивные переменные</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">Точность:</label>
            <input type="number" min={0} max={10} className="border px-2 py-1 w-16 rounded text-sm" value={precision} onChange={(e) => setPrecision(parseInt(e.target.value) || 4)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">Точка сдвига:</label>
            <input type="number" min={1} max={data.length - 1} className="border px-2 py-1 w-16 rounded text-sm" value={breakPoint} onChange={(e) => setBreakPoint(parseInt(e.target.value) || 1)} />
            <button onClick={autoSetDummy} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
              Авто D
            </button>
          </div>
          <button onClick={addRow} className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            <TbPlus /> Добавить
          </button>
          <button onClick={clearData} className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
            <TbTrash /> Очистить
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-2 py-2 w-10">N</th>
                <th className="border px-2 py-2">Y (Экспорт)</th>
                <th className="border px-2 py-2">X1 (Ставка %)</th>
                <th className="border px-2 py-2">X2 (Курс)</th>
                <th className="border px-2 py-2 w-16">D (Санкции)</th>
                <th className="border px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i} className={row.d === 1 ? 'bg-yellow-50' : ''}>
                  <td className="border px-2 py-1 text-center bg-gray-50">{i + 1}</td>
                  <td className="border px-1 py-1"><input type="text" className="w-full px-1 py-1 text-center text-sm" value={row.y} onChange={(e) => updateData(i, 'y', e.target.value)} /></td>
                  <td className="border px-1 py-1"><input type="text" className="w-full px-1 py-1 text-center text-sm" value={row.x1} onChange={(e) => updateData(i, 'x1', e.target.value)} /></td>
                  <td className="border px-1 py-1"><input type="text" className="w-full px-1 py-1 text-center text-sm" value={row.x2} onChange={(e) => updateData(i, 'x2', e.target.value)} /></td>
                  <td className="border px-1 py-1">
                    <select className="w-full px-1 py-1 text-center text-sm" value={row.d} onChange={(e) => updateData(i, 'd', e.target.value)}>
                      <option value={0}>0</option>
                      <option value={1}>1</option>
                    </select>
                  </td>
                  <td className="border px-1 py-1 text-center"><button onClick={() => removeRow(i)} className="text-red-500 hover:text-red-700"><TbMinus /></button></td>
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

          <h2 className="text-lg font-semibold mb-4">Сравнение спецификаций модели</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Базовая модель</h3>
              <p className="text-xs font-mono mb-2">Y = b0 + b1*X1 + b2*X2</p>
              <table className="w-full text-xs">
                <tbody>
                  <tr><td>b0:</td><td className="font-mono text-right">{toFixed(results.baseModel.coefficients[0])}</td></tr>
                  <tr><td>b1 (X1):</td><td className="font-mono text-right">{toFixed(results.baseModel.coefficients[1])}</td></tr>
                  <tr><td>b2 (X2):</td><td className="font-mono text-right">{toFixed(results.baseModel.coefficients[2])}</td></tr>
                </tbody>
              </table>
              <div className="mt-2 pt-2 border-t text-xs">
                <p>R2 = {toFixed(results.baseModel.R2)}</p>
                <p>R2adj = {toFixed(results.baseModel.R2adj)}</p>
                <p>F = {toFixed(results.baseModel.F)} {results.baseModel.fSignificant ? '(знач.)' : ''}</p>
              </div>
            </div>

            <div className={`bg-white p-4 rounded border ${results.dummyModel.significant[3] ? 'border-green-400' : ''}`}>
              <h3 className="font-semibold mb-2">Модель с фиктивной D</h3>
              <p className="text-xs font-mono mb-2">Y = b0 + b1*X1 + b2*X2 + b3*D</p>
              <table className="w-full text-xs">
                <tbody>
                  <tr><td>b0:</td><td className="font-mono text-right">{toFixed(results.dummyModel.coefficients[0])}</td></tr>
                  <tr><td>b1 (X1):</td><td className="font-mono text-right">{toFixed(results.dummyModel.coefficients[1])}</td></tr>
                  <tr><td>b2 (X2):</td><td className="font-mono text-right">{toFixed(results.dummyModel.coefficients[2])}</td></tr>
                  <tr className={results.dummyModel.significant[3] ? 'bg-green-100' : 'bg-red-100'}>
                    <td>b3 (D):</td>
                    <td className="font-mono text-right">{toFixed(results.dummyModel.coefficients[3])} {results.dummyModel.significant[3] ? '*' : ''}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2 pt-2 border-t text-xs">
                <p>R2 = {toFixed(results.dummyModel.R2)}</p>
                <p>R2adj = {toFixed(results.dummyModel.R2adj)}</p>
                <p>t(D) = {toFixed(results.dummyModel.tStats[3])} - {results.dummyModel.significant[3] ? 'значим' : 'не значим'}</p>
              </div>
            </div>

            <div className={`bg-white p-4 rounded border ${results.bestModel.includes('взаимодействием') ? 'border-blue-400' : ''}`}>
              <h3 className="font-semibold mb-2">Модель с взаимодействием</h3>
              <p className="text-xs font-mono mb-2">Y = b0 + b1*X1 + b2*X2 + b3*D + b4*X2*D</p>
              <table className="w-full text-xs">
                <tbody>
                  <tr><td>b0:</td><td className="font-mono text-right">{toFixed(results.interactionModel.coefficients[0])}</td></tr>
                  <tr><td>b1 (X1):</td><td className="font-mono text-right">{toFixed(results.interactionModel.coefficients[1])}</td></tr>
                  <tr><td>b2 (X2):</td><td className="font-mono text-right">{toFixed(results.interactionModel.coefficients[2])}</td></tr>
                  <tr className={results.interactionModel.significant[3] ? 'bg-green-100' : ''}>
                    <td>b3 (D):</td>
                    <td className="font-mono text-right">{toFixed(results.interactionModel.coefficients[3])}</td>
                  </tr>
                  <tr className={results.interactionModel.significant[4] ? 'bg-green-100' : 'bg-red-100'}>
                    <td>b4 (X2*D):</td>
                    <td className="font-mono text-right">{toFixed(results.interactionModel.coefficients[4])} {results.interactionModel.significant[4] ? '*' : ''}</td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-2 pt-2 border-t text-xs">
                <p>R2 = {toFixed(results.interactionModel.R2)}</p>
                <p>R2adj = {toFixed(results.interactionModel.R2adj)}</p>
                <p>t(X2*D) = {toFixed(results.interactionModel.tStats[4])} - {results.interactionModel.significant[4] ? 'значим' : 'не значим'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className={`bg-white p-4 rounded border ${results.chowTest.structuralBreak ? 'border-red-400' : 'border-green-400'}`}>
              <h3 className="font-semibold mb-2">Тест Чоу на структурный сдвиг</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr><td>SSE (общая):</td><td className="font-mono text-right">{toFixed(results.chowTest.SSE_pooled)}</td></tr>
                  <tr><td>SSE (до санкций):</td><td className="font-mono text-right">{toFixed(results.chowTest.SSE_1)}</td></tr>
                  <tr><td>SSE (после санкций):</td><td className="font-mono text-right">{toFixed(results.chowTest.SSE_2)}</td></tr>
                  <tr className="border-t"><td>F-статистика:</td><td className="font-mono text-right">{toFixed(results.chowTest.F)}</td></tr>
                  <tr><td>F-критическое:</td><td className="font-mono text-right">{toFixed(results.chowTest.Fcrit)}</td></tr>
                </tbody>
              </table>
              <p className={`mt-2 font-semibold ${results.chowTest.structuralBreak ? 'text-red-600' : 'text-green-600'}`}>
                {results.chowTest.structuralBreak ? 'Структурный сдвиг обнаружен!' : 'Структурный сдвиг не обнаружен'}
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h3 className="font-semibold mb-2">Выбор лучшей спецификации</h3>
              <p className="text-sm mb-3">По критерию скорректированного R2:</p>
              <table className="w-full text-sm">
                <tbody>
                  <tr className={results.bestModel === 'Базовая (без фиктивных)' ? 'bg-blue-200' : ''}>
                    <td>Базовая:</td><td className="font-mono text-right">{toFixed(results.baseModel.R2adj)}</td>
                  </tr>
                  <tr className={results.bestModel === 'С фиктивной D' ? 'bg-blue-200' : ''}>
                    <td>С фиктивной D:</td><td className="font-mono text-right">{toFixed(results.dummyModel.R2adj)}</td>
                  </tr>
                  <tr className={results.bestModel === 'С взаимодействием X2*D' ? 'bg-blue-200' : ''}>
                    <td>С взаимодействием:</td><td className="font-mono text-right">{toFixed(results.interactionModel.R2adj)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 font-semibold text-blue-700">Лучшая модель: {results.bestModel}</p>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-sm">
            <h3 className="font-semibold mb-2">Интерпретация</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>D</strong> (фиктивная) - сдвигает константу модели при D=1</li>
              <li><strong>X2*D</strong> (взаимодействие) - меняет наклон по X2 при D=1</li>
              <li>Если b3 значим - есть сдвиг уровня после события</li>
              <li>Если b4 значим - изменилась чувствительность Y к X2 после события</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
