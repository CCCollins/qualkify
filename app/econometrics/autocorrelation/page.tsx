'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbCopy, TbTrash, TbPlus, TbMinus } from 'react-icons/tb';

interface DataRow {
  t: number;
  y: number;
  x1: number;
  x2: number;
}

interface ForecastResults {
  pointForecast: number;
  intervalLow: number;
  intervalHigh: number;
  se: number;
  forecastX1: number;
  forecastX2: number;
}

interface Results {
  n: number;
  coefficients: number[];
  stdErrors: number[];
  tStats: number[];
  significant: boolean[];
  R2: number;
  R2adj: number;
  F: number;
  residuals: number[];
  yPredicted: number[];
  durbinWatson: number;
  dwLower: number;
  dwUpper: number;
  autocorrelation: 'positive' | 'negative' | 'none' | 'inconclusive';
  rho: number;
  glsCoefficients: number[];
  glsR2: number;
  glsDW: number;
  forecast?: ForecastResults;
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

// DW critical values (alpha = 0.05, k=2)
const dwTable: Record<number, { dL: number; dU: number }> = {
  15: { dL: 0.95, dU: 1.54 },
  20: { dL: 1.10, dU: 1.54 },
  25: { dL: 1.21, dU: 1.55 },
  30: { dL: 1.28, dU: 1.57 },
  35: { dL: 1.34, dU: 1.58 },
  40: { dL: 1.39, dU: 1.60 },
  45: { dL: 1.43, dU: 1.62 },
  50: { dL: 1.46, dU: 1.63 },
  60: { dL: 1.51, dU: 1.65 },
  70: { dL: 1.55, dU: 1.67 },
  80: { dL: 1.59, dU: 1.69 },
  100: { dL: 1.65, dU: 1.72 },
};

const getDWCritical = (n: number): { dL: number; dU: number } => {
  const keys = Object.keys(dwTable).map(Number).sort((a, b) => a - b);
  for (const key of keys) {
    if (n <= key) return dwTable[key];
  }
  return { dL: 1.65, dU: 1.72 };
};

const tCritical95 = 1.96;

export default function AutocorrelationPage() {
  const [data, setData] = useState<DataRow[]>([
    { t: 1, y: 102.4, x1: 61.2, x2: 1.25 },
    { t: 2, y: 104.8, x1: 62.5, x2: 1.32 },
    { t: 3, y: 106.1, x1: 63.1, x2: 1.28 },
    { t: 4, y: 105.9, x1: 62.8, x2: 1.41 },
    { t: 5, y: 109.2, x1: 65.4, x2: 1.53 },
    { t: 6, y: 111.5, x1: 66.9, x2: 1.48 },
    { t: 7, y: 113.8, x1: 68.2, x2: 1.55 },
    { t: 8, y: 115.2, x1: 69.1, x2: 1.62 },
    { t: 9, y: 117.9, x1: 70.8, x2: 1.59 },
    { t: 10, y: 119.4, x1: 71.5, x2: 1.68 },
    { t: 11, y: 121.8, x1: 73.2, x2: 1.74 },
    { t: 12, y: 123.5, x1: 74.1, x2: 1.71 },
    { t: 13, y: 125.1, x1: 75.0, x2: 1.79 },
    { t: 14, y: 127.8, x1: 76.9, x2: 1.85 },
    { t: 15, y: 129.4, x1: 77.8, x2: 1.82 },
    { t: 16, y: 131.2, x1: 79.1, x2: 1.91 },
    { t: 17, y: 133.9, x1: 81.0, x2: 1.96 },
    { t: 18, y: 135.5, x1: 82.2, x2: 1.93 },
    { t: 19, y: 137.1, x1: 83.1, x2: 2.02 },
    { t: 20, y: 139.8, x1: 85.3, x2: 2.08 },
    { t: 21, y: 141.2, x1: 86.1, x2: 2.05 },
    { t: 22, y: 143.5, x1: 87.8, x2: 2.14 },
    { t: 23, y: 145.9, x1: 89.5, x2: 2.19 },
    { t: 24, y: 147.2, x1: 90.2, x2: 2.16 },
    { t: 25, y: 149.8, x1: 92.1, x2: 2.25 },
    { t: 26, y: 151.4, x1: 93.0, x2: 2.22 },
    { t: 27, y: 153.9, x1: 94.9, x2: 2.31 },
    { t: 28, y: 155.2, x1: 95.6, x2: 2.28 },
    { t: 29, y: 157.8, x1: 97.5, x2: 2.37 },
    { t: 30, y: 159.5, x1: 98.8, x2: 2.42 },
    { t: 31, y: 161.1, x1: 99.7, x2: 2.39 },
    { t: 32, y: 163.4, x1: 101.5, x2: 2.48 },
    { t: 33, y: 165.9, x1: 103.4, x2: 2.54 },
    { t: 34, y: 167.2, x1: 104.1, x2: 2.51 },
    { t: 35, y: 169.8, x1: 106.0, x2: 2.60 },
    { t: 36, y: 171.5, x1: 107.3, x2: 2.65 },
    { t: 37, y: 173.1, x1: 108.2, x2: 2.62 },
    { t: 38, y: 175.8, x1: 110.5, x2: 2.73 },
    { t: 39, y: 177.4, x1: 111.8, x2: 2.78 },
    { t: 40, y: 179.2, x1: 113.2, x2: 2.85 },
  ]);
  const [precision, setPrecision] = useState(4);
  const [forecastGrowth, setForecastGrowth] = useState(2);
  const [results, setResults] = useState<Results | null>(null);

  const toFixed = (val: number) => val.toFixed(precision).replace('.', ',');

  const addRow = () => {
    const lastT = data.length > 0 ? data[data.length - 1].t : 0;
    setData([...data, { t: lastT + 1, y: 0, x1: 0, x2: 0 }]);
  };

  const removeRow = (index: number) => {
    if (data.length > 10) setData(data.filter((_, i) => i !== index));
  };

  const updateData = (index: number, field: keyof DataRow, value: string) => {
    const newData = [...data];
    newData[index][field] = parseFloat(value.replace(',', '.')) || 0;
    setData(newData);
  };

  const clearData = () => {
    setData(Array(15).fill(0).map((_, i) => ({ t: i + 1, y: 0, x1: 0, x2: 0 })));
    setResults(null);
  };

  const runOLS = (Y: number[][], X: number[][]): { coefficients: number[], residuals: number[], R2: number, MSE: number, stdErrors: number[], tStats: number[] } => {
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
    const R2 = 1 - SSE / SST;
    const MSE = SSE / (n - k - 1);
    
    const stdErrors = XtXinv.map((row, i) => Math.sqrt(Math.abs(MSE * row[i])));
    const tStats = coefficients.map((b, i) => b / (stdErrors[i] || 0.001));
    
    return { coefficients, residuals, R2, MSE, stdErrors, tStats };
  };

  const calculate = () => {
    const n = data.length;
    const Y = data.map(d => [d.y]);
    const X = data.map(d => [1, d.x1, d.x2]);
    
    // OLS estimation
    const ols = runOLS(Y, X);
    const yPredicted = data.map(d => ols.coefficients[0] + ols.coefficients[1] * d.x1 + ols.coefficients[2] * d.x2);
    
    // Durbin-Watson statistic
    let sumDiffSquared = 0;
    let sumResidSquared = 0;
    for (let i = 0; i < n; i++) {
      sumResidSquared += ols.residuals[i] ** 2;
      if (i > 0) {
        sumDiffSquared += (ols.residuals[i] - ols.residuals[i - 1]) ** 2;
      }
    }
    const dw = sumDiffSquared / sumResidSquared;
    
    const { dL, dU } = getDWCritical(n);
    
    let autocorrelation: 'positive' | 'negative' | 'none' | 'inconclusive';
    if (dw < dL) autocorrelation = 'positive';
    else if (dw > 4 - dL) autocorrelation = 'negative';
    else if (dw > dU && dw < 4 - dU) autocorrelation = 'none';
    else autocorrelation = 'inconclusive';
    
    // Estimate rho
    const rho = 1 - dw / 2;
    
    // GLS (Cochrane-Orcutt transformation)
    const Y_gls: number[][] = [];
    const X_gls: number[][] = [];
    
    for (let i = 1; i < n; i++) {
      Y_gls.push([data[i].y - rho * data[i - 1].y]);
      X_gls.push([
        1 - rho,
        data[i].x1 - rho * data[i - 1].x1,
        data[i].x2 - rho * data[i - 1].x2
      ]);
    }
    
    const gls = runOLS(Y_gls, X_gls);
    
    // GLS Durbin-Watson
    let glsSumDiffSquared = 0;
    let glsSumResidSquared = 0;
    for (let i = 0; i < gls.residuals.length; i++) {
      glsSumResidSquared += gls.residuals[i] ** 2;
      if (i > 0) {
        glsSumDiffSquared += (gls.residuals[i] - gls.residuals[i - 1]) ** 2;
      }
    }
    const glsDW = glsSumDiffSquared / glsSumResidSquared;
    
    // Forecast
    const lastX1 = data[n - 1].x1;
    const lastX2 = data[n - 1].x2;
    const forecastX1 = lastX1 * (1 + forecastGrowth / 100);
    const forecastX2 = lastX2;
    
    const pointForecast = ols.coefficients[0] + ols.coefficients[1] * forecastX1 + ols.coefficients[2] * forecastX2;
    const se = Math.sqrt(ols.MSE);
    const intervalLow = pointForecast - tCritical95 * se;
    const intervalHigh = pointForecast + tCritical95 * se;
    
    // R2adj and F
    const k = 2;
    const R2adj = 1 - (1 - ols.R2) * (n - 1) / (n - k - 1);
    const SSR = ols.R2 * Y.reduce((s, row) => s + (row[0] - Y.reduce((a, b) => a + b[0], 0) / n) ** 2, 0);
    const SSE = (1 - ols.R2) * Y.reduce((s, row) => s + (row[0] - Y.reduce((a, b) => a + b[0], 0) / n) ** 2, 0);
    const F = (SSR / k) / (SSE / (n - k - 1));
    
    const significant = ols.tStats.map(t => Math.abs(t) > tCritical95);
    
    setResults({
      n,
      coefficients: ols.coefficients,
      stdErrors: ols.stdErrors,
      tStats: ols.tStats,
      significant,
      R2: ols.R2,
      R2adj,
      F,
      residuals: ols.residuals,
      yPredicted,
      durbinWatson: dw,
      dwLower: dL,
      dwUpper: dU,
      autocorrelation,
      rho,
      glsCoefficients: gls.coefficients,
      glsR2: gls.R2,
      glsDW,
      forecast: {
        pointForecast,
        intervalLow,
        intervalHigh,
        se,
        forecastX1,
        forecastX2
      }
    });
  };

  const copyResults = () => {
    if (!results) return;
    const text = `
Анализ автокорреляции и прогнозирование (n=${results.n})

МНК: Y = ${toFixed(results.coefficients[0])} + ${toFixed(results.coefficients[1])}*X1 + ${toFixed(results.coefficients[2])}*X2
R2 = ${toFixed(results.R2)}, R2adj = ${toFixed(results.R2adj)}

Статистика Дарбина-Уотсона: DW = ${toFixed(results.durbinWatson)}
dL = ${toFixed(results.dwLower)}, dU = ${toFixed(results.dwUpper)}
Вывод: ${results.autocorrelation === 'positive' ? 'Положительная автокорреляция' : 
        results.autocorrelation === 'negative' ? 'Отрицательная автокорреляция' :
        results.autocorrelation === 'none' ? 'Автокорреляция отсутствует' : 'Зона неопределенности'}
rho = ${toFixed(results.rho)}

ОМНК (Кохрейна-Оркатта): Y = ${toFixed(results.glsCoefficients[0])} + ${toFixed(results.glsCoefficients[1])}*X1 + ${toFixed(results.glsCoefficients[2])}*X2
R2 = ${toFixed(results.glsR2)}, DW = ${toFixed(results.glsDW)}

Прогноз на следующий период:
X1 = ${toFixed(results.forecast?.forecastX1 || 0)}, X2 = ${toFixed(results.forecast?.forecastX2 || 0)}
Точечный: ${toFixed(results.forecast?.pointForecast || 0)}
Интервальный (95%): [${toFixed(results.forecast?.intervalLow || 0)}; ${toFixed(results.forecast?.intervalHigh || 0)}]
    `.trim();
    navigator.clipboard.writeText(text);
  };

  const getAutocorrelationColor = (ac: string) => {
    switch (ac) {
      case 'positive': return 'bg-red-100 border-red-400 text-red-700';
      case 'negative': return 'bg-orange-100 border-orange-400 text-orange-700';
      case 'none': return 'bg-green-100 border-green-400 text-green-700';
      default: return 'bg-yellow-100 border-yellow-400 text-yellow-700';
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 pb-10">
      <div className="flex justify-center items-center mb-6">
        <Link href="/econometrics" className="text-blue-600 hover:text-blue-800 transition" title="К разделу эконометрики">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">Автокорреляция и прогноз</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">Точность:</label>
            <input type="number" min={0} max={10} className="border px-2 py-1 w-16 rounded text-sm" value={precision} onChange={(e) => setPrecision(parseInt(e.target.value) || 4)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">Рост X1 (%):</label>
            <input type="number" className="border px-2 py-1 w-20 rounded text-sm" value={forecastGrowth} onChange={(e) => setForecastGrowth(parseFloat(e.target.value) || 0)} />
          </div>
          <button onClick={addRow} className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
            <TbPlus /> Добавить
          </button>
          <button onClick={clearData} className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
            <TbTrash /> Очистить
          </button>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-gray-100">
              <tr>
                <th className="border px-2 py-2 w-12">t</th>
                <th className="border px-2 py-2">Y (ВВП)</th>
                <th className="border px-2 py-2">X1 (Произв.)</th>
                <th className="border px-2 py-2">X2 (Жилье)</th>
                <th className="border px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1 text-center bg-gray-50">{row.t}</td>
                  <td className="border px-1 py-1"><input type="text" className="w-full px-1 py-1 text-center text-sm" value={row.y} onChange={(e) => updateData(i, 'y', e.target.value)} /></td>
                  <td className="border px-1 py-1"><input type="text" className="w-full px-1 py-1 text-center text-sm" value={row.x1} onChange={(e) => updateData(i, 'x1', e.target.value)} /></td>
                  <td className="border px-1 py-1"><input type="text" className="w-full px-1 py-1 text-center text-sm" value={row.x2} onChange={(e) => updateData(i, 'x2', e.target.value)} /></td>
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

          <h2 className="text-lg font-semibold mb-4">Результаты анализа</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Модель МНК</h3>
              <p className="text-sm font-mono mb-2">
                Y = {toFixed(results.coefficients[0])} + {toFixed(results.coefficients[1])}*X1 + {toFixed(results.coefficients[2])}*X2
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 text-left">Параметр</th>
                    <th className="py-1 text-right">b</th>
                    <th className="py-1 text-right">SE</th>
                    <th className="py-1 text-right">t</th>
                  </tr>
                </thead>
                <tbody>
                  {['Константа', 'X1', 'X2'].map((name, i) => (
                    <tr key={i} className={results.significant[i] ? 'bg-green-50' : ''}>
                      <td className="py-1">{name}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.coefficients[i])}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.stdErrors[i])}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.tStats[i])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 pt-2 border-t text-sm">
                <p>R2 = {toFixed(results.R2)}</p>
                <p>R2adj = {toFixed(results.R2adj)}</p>
                <p>F = {toFixed(results.F)}</p>
              </div>
            </div>

            <div className={`bg-white p-4 rounded border ${getAutocorrelationColor(results.autocorrelation)}`}>
              <h3 className="font-semibold mb-2">Тест Дарбина-Уотсона</h3>
              <div className="space-y-2 text-sm">
                <p><strong>DW = {toFixed(results.durbinWatson)}</strong></p>
                <p>Критические значения (n={results.n}, k=2, alpha=0.05):</p>
                <p>dL = {toFixed(results.dwLower)}, dU = {toFixed(results.dwUpper)}</p>
                <div className="mt-3 p-2 rounded bg-white border">
                  <p className="text-xs mb-1">Зоны принятия решения:</p>
                  <p className="text-xs">0 &lt; DW &lt; dL: положительная автокорреляция</p>
                  <p className="text-xs">dL &lt; DW &lt; dU: зона неопределенности</p>
                  <p className="text-xs">dU &lt; DW &lt; 4-dU: автокорреляция отсутствует</p>
                  <p className="text-xs">4-dU &lt; DW &lt; 4-dL: зона неопределенности</p>
                  <p className="text-xs">4-dL &lt; DW &lt; 4: отрицательная автокорреляция</p>
                </div>
                <p className="mt-2 font-semibold">
                  Вывод: {results.autocorrelation === 'positive' ? 'Положительная автокорреляция' : 
                          results.autocorrelation === 'negative' ? 'Отрицательная автокорреляция' :
                          results.autocorrelation === 'none' ? 'Автокорреляция отсутствует' : 'Зона неопределенности'}
                </p>
                <p>Оценка rho = 1 - DW/2 = {toFixed(results.rho)}</p>
              </div>
            </div>
          </div>

          {results.autocorrelation !== 'none' && (
            <div className="bg-white p-4 rounded border mb-4">
              <h3 className="font-semibold mb-2">Коррекция: ОМНК (метод Кохрейна-Оркатта)</h3>
              <p className="text-sm text-gray-600 mb-2">Преобразование: Yt - rho*Yt-1 = b0(1-rho) + b1(X1t - rho*X1t-1) + b2(X2t - rho*X2t-1)</p>
              <p className="text-sm font-mono mb-2">
                Y = {toFixed(results.glsCoefficients[0])} + {toFixed(results.glsCoefficients[1])}*X1 + {toFixed(results.glsCoefficients[2])}*X2
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p>R2 = {toFixed(results.glsR2)}</p>
                </div>
                <div>
                  <p>DW (после коррекции) = {toFixed(results.glsDW)}</p>
                  <p className={results.glsDW > results.dwUpper ? 'text-green-600' : 'text-orange-600'}>
                    {results.glsDW > results.dwUpper ? 'Автокорреляция устранена' : 'Требуется дополнительная итерация'}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded border border-blue-200">
            <h3 className="font-semibold mb-2">Прогноз на следующий период</h3>
            <p className="text-sm mb-2">Условия: X1 вырастет на {forecastGrowth}%, X2 останется на уровне последнего периода</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-medium">Факторы прогноза:</p>
                <p>X1 = {toFixed(results.forecast?.forecastX1 || 0)}</p>
                <p>X2 = {toFixed(results.forecast?.forecastX2 || 0)}</p>
              </div>
              <div>
                <p className="font-medium">Точечный прогноз:</p>
                <p className="text-xl font-bold text-blue-700">{toFixed(results.forecast?.pointForecast || 0)}</p>
              </div>
              <div>
                <p className="font-medium">Интервальный прогноз (95%):</p>
                <p>[{toFixed(results.forecast?.intervalLow || 0)}; {toFixed(results.forecast?.intervalHigh || 0)}]</p>
                <p className="text-xs text-gray-500">SE = {toFixed(results.forecast?.se || 0)}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <h3 className="font-semibold mb-2">Важно</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Автокорреляция занижает стандартные ошибки и завышает t-статистики</li>
              <li>При автокорреляции оценки МНК остаются несмещенными, но неэффективными</li>
              <li>Метод Кохрейна-Оркатта является итерационным - может потребоваться несколько итераций</li>
              <li>Альтернативы: метод Прайса-Уинстена, авторегрессионные модели AR(p)</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
