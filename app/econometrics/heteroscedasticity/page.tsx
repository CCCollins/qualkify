'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbCopy, TbTrash, TbPlus, TbMinus } from 'react-icons/tb';

interface DataRow {
  y: number;
  x1: number;
  x2: number;
  x3: number;
}

interface TestResults {
  n: number;
  olsCoefficients: number[];
  olsStdErrors: number[];
  olsTStats: number[];
  wlsCoefficients: number[];
  wlsStdErrors: number[];
  wlsTStats: number[];
  residuals: number[];
  residualsSquared: number[];
  goldfelQuandt: {
    F: number;
    Fcrit: number;
    heteroscedasticity: boolean;
    SSE1: number;
    SSE2: number;
    df1: number;
    df2: number;
  };
  breuschPagan: {
    LM: number;
    chi2crit: number;
    heteroscedasticity: boolean;
    R2aux: number;
  };
  white: {
    LM: number;
    chi2crit: number;
    heteroscedasticity: boolean;
    R2aux: number;
  };
  weightType: string;
  olsR2: number;
  wlsR2: number;
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

const chi2Table: Record<number, number> = {
  1: 3.841, 2: 5.991, 3: 7.815, 4: 9.488, 5: 11.070,
  6: 12.592, 7: 14.067, 8: 15.507, 9: 16.919, 10: 18.307,
};

const fTable: Record<string, number> = {
  '5,5': 5.05, '6,6': 4.28, '7,7': 3.79, '8,8': 3.44, '9,9': 3.18,
  '10,10': 2.98, '11,11': 2.82, '12,12': 2.69,
};

export default function HeteroscedasticityPage() {
  const [data, setData] = useState<DataRow[]>([
    { y: 0.5, x1: 1, x2: 2, x3: 10 },
    { y: 0.8, x1: 2, x2: 3, x3: 15 },
    { y: 1.2, x1: 1, x2: 4, x3: 20 },
    { y: 2.5, x1: 3, x2: 5, x3: 40 },
    { y: 1.8, x1: 2, x2: 4, x3: 30 },
    { y: 4.5, x1: 5, x2: 6, x3: 80 },
    { y: 3.2, x1: 4, x2: 5, x3: 60 },
    { y: 6, x1: 6, x2: 7, x3: 100 },
    { y: 5.5, x1: 5, x2: 6, x3: 90 },
    { y: 8.5, x1: 8, x2: 8, x3: 150 },
    { y: 7.2, x1: 7, x2: 7, x3: 120 },
    { y: 10.5, x1: 9, x2: 9, x3: 180 },
    { y: 9.8, x1: 8, x2: 8, x3: 160 },
    { y: 12, x1: 10, x2: 10, x3: 200 },
    { y: 11.5, x1: 9, x2: 9, x3: 190 },
    { y: 15.5, x1: 12, x2: 11, x3: 250 },
    { y: 14, x1: 11, x2: 10, x3: 230 },
    { y: 18, x1: 14, x2: 12, x3: 300 },
    { y: 16.5, x1: 13, x2: 11, x3: 270 },
    { y: 20.5, x1: 15, x2: 13, x3: 350 },
    { y: 19, x1: 14, x2: 12, x3: 320 },
    { y: 24, x1: 17, x2: 14, x3: 400 },
    { y: 22.5, x1: 16, x2: 13, x3: 380 },
    { y: 28, x1: 19, x2: 15, x3: 480 },
    { y: 26, x1: 18, x2: 14, x3: 450 },
  ]);
  const [precision, setPrecision] = useState(4);
  const [weightVar, setWeightVar] = useState<'x3' | 'sqrt_x3'>('x3');
  const [results, setResults] = useState<TestResults | null>(null);

  const toFixed = (val: number) => val.toFixed(precision).replace('.', ',');

  const addRow = () => setData([...data, { y: 0, x1: 0, x2: 0, x3: 0 }]);

  const removeRow = (index: number) => {
    if (data.length > 10) setData(data.filter((_, i) => i !== index));
  };

  const updateData = (index: number, field: keyof DataRow, value: string) => {
    const newData = [...data];
    newData[index][field] = parseFloat(value.replace(',', '.')) || 0;
    setData(newData);
  };

  const clearData = () => {
    setData(Array(10).fill(0).map(() => ({ y: 0, x1: 0, x2: 0, x3: 0 })));
    setResults(null);
  };

  const runOLS = (Y: number[][], X: number[][], W?: number[]): { coefficients: number[], stdErrors: number[], tStats: number[], residuals: number[], R2: number, MSE: number } => {
    const n = Y.length;
    const k = X[0].length - 1;
    
    let Xw = X;
    let Yw = Y;
    
    if (W) {
      Xw = X.map((row, i) => row.map(val => val * W[i]));
      Yw = Y.map((row, i) => [row[0] * W[i]]);
    }
    
    const Xt = transpose(Xw);
    const XtX = multiply(Xt, Xw);
    const XtXinv = inverse(XtX);
    const XtY = multiply(Xt, Yw);
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
    const tStats = coefficients.map((b, i) => b / (stdErrors[i] || 1));
    
    return { coefficients, stdErrors, tStats, residuals, R2, MSE };
  };

  const calculate = () => {
    const n = data.length;
    const Y = data.map(d => [d.y]);
    const X = data.map(d => [1, d.x1, d.x2, d.x3]);
    
    // OLS estimation
    const ols = runOLS(Y, X);
    
    // Residuals squared
    const residualsSquared = ols.residuals.map(e => e ** 2);
    
    // Goldfeld-Quandt test
    const sortedData = [...data].sort((a, b) => a.x3 - b.x3);
    const c = Math.floor(n / 3);
    const n1 = Math.floor((n - c) / 2);
    const n2 = n - c - n1;
    
    const group1 = sortedData.slice(0, n1);
    const group2 = sortedData.slice(n - n2);
    
    const Y1 = group1.map(d => [d.y]);
    const X1 = group1.map(d => [1, d.x1, d.x2, d.x3]);
    const Y2 = group2.map(d => [d.y]);
    const X2 = group2.map(d => [1, d.x1, d.x2, d.x3]);
    
    const ols1 = runOLS(Y1, X1);
    const ols2 = runOLS(Y2, X2);
    
    const SSE1 = ols1.residuals.reduce((s, e) => s + e ** 2, 0);
    const SSE2 = ols2.residuals.reduce((s, e) => s + e ** 2, 0);
    const df1 = n1 - 4;
    const df2 = n2 - 4;
    
    const F_GQ = SSE2 / SSE1;
    const Fcrit_key = `${Math.min(df1, df2)},${Math.min(df1, df2)}`;
    const Fcrit = fTable[Fcrit_key] || 3.0;
    
    // Breusch-Pagan test
    const e2 = residualsSquared;
    const e2Mean = e2.reduce((s, v) => s + v, 0) / n;
    const Yaux_bp = e2.map(v => [v / e2Mean]);
    const bpOls = runOLS(Yaux_bp, X);
    const LM_BP = n * bpOls.R2;
    const chi2crit_bp = chi2Table[3] || 7.815;
    
    // White test (simplified - using squares and cross-products)
    const Xwhite = data.map(d => [
      1, d.x1, d.x2, d.x3,
      d.x1 ** 2, d.x2 ** 2, d.x3 ** 2,
      d.x1 * d.x2, d.x1 * d.x3, d.x2 * d.x3
    ]);
    const Yaux_white = e2.map(v => [v]);
    const whiteOls = runOLS(Yaux_white, Xwhite);
    const LM_White = n * whiteOls.R2;
    const chi2crit_white = chi2Table[9] || 16.919;
    
    // WLS estimation
    const weights = weightVar === 'x3' 
      ? data.map(d => 1 / Math.sqrt(d.x3 || 1))
      : data.map(d => 1 / Math.sqrt(Math.sqrt(d.x3 || 1)));
    
    const wls = runOLS(Y, X, weights);
    
    setResults({
      n,
      olsCoefficients: ols.coefficients,
      olsStdErrors: ols.stdErrors,
      olsTStats: ols.tStats,
      wlsCoefficients: wls.coefficients,
      wlsStdErrors: wls.stdErrors,
      wlsTStats: wls.tStats,
      residuals: ols.residuals,
      residualsSquared,
      goldfelQuandt: {
        F: F_GQ,
        Fcrit,
        heteroscedasticity: F_GQ > Fcrit,
        SSE1,
        SSE2,
        df1,
        df2
      },
      breuschPagan: {
        LM: LM_BP,
        chi2crit: chi2crit_bp,
        heteroscedasticity: LM_BP > chi2crit_bp,
        R2aux: bpOls.R2
      },
      white: {
        LM: LM_White,
        chi2crit: chi2crit_white,
        heteroscedasticity: LM_White > chi2crit_white,
        R2aux: whiteOls.R2
      },
      weightType: weightVar === 'x3' ? '1/sqrt(X3)' : '1/sqrt(sqrt(X3))',
      olsR2: ols.R2,
      wlsR2: wls.R2
    });
  };

  const copyResults = () => {
    if (!results) return;
    const text = `
Анализ гетероскедастичности (n=${results.n})

Тест Голдфелда-Квандта:
F = ${toFixed(results.goldfelQuandt.F)}, F_крит = ${toFixed(results.goldfelQuandt.Fcrit)}
Результат: ${results.goldfelQuandt.heteroscedasticity ? 'Гетероскедастичность обнаружена' : 'Гомоскедастичность'}

Тест Бройша-Пагана:
LM = ${toFixed(results.breuschPagan.LM)}, chi2_крит = ${toFixed(results.breuschPagan.chi2crit)}
Результат: ${results.breuschPagan.heteroscedasticity ? 'Гетероскедастичность обнаружена' : 'Гомоскедастичность'}

Тест Уайта:
LM = ${toFixed(results.white.LM)}, chi2_крит = ${toFixed(results.white.chi2crit)}
Результат: ${results.white.heteroscedasticity ? 'Гетероскедастичность обнаружена' : 'Гомоскедастичность'}

МНК: Y = ${toFixed(results.olsCoefficients[0])} + ${toFixed(results.olsCoefficients[1])}*X1 + ${toFixed(results.olsCoefficients[2])}*X2 + ${toFixed(results.olsCoefficients[3])}*X3
ОМНК: Y = ${toFixed(results.wlsCoefficients[0])} + ${toFixed(results.wlsCoefficients[1])}*X1 + ${toFixed(results.wlsCoefficients[2])}*X2 + ${toFixed(results.wlsCoefficients[3])}*X3
    `.trim();
    navigator.clipboard.writeText(text);
  };

  return (
    <main className="max-w-7xl mx-auto px-4 pb-10">
      <div className="flex justify-center items-center mb-6">
        <Link href="/econometrics" className="text-blue-600 hover:text-blue-800 transition" title="К разделу эконометрики">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">Гетероскедастичность и ОМНК</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">Точность:</label>
            <input type="number" min={0} max={10} className="border px-2 py-1 w-16 rounded text-sm" value={precision} onChange={(e) => setPrecision(parseInt(e.target.value) || 4)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-medium text-sm">Веса ОМНК:</label>
            <select className="border px-2 py-1 rounded text-sm" value={weightVar} onChange={(e) => setWeightVar(e.target.value as 'x3' | 'sqrt_x3')}>
              <option value="x3">W = 1/sqrt(X3)</option>
              <option value="sqrt_x3">W = 1/sqrt(sqrt(X3))</option>
            </select>
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
                <th className="border px-2 py-2">Y (Инвестиции)</th>
                <th className="border px-2 py-2">X1 (Патенты)</th>
                <th className="border px-2 py-2">X2 (Опыт)</th>
                <th className="border px-2 py-2">X3 (Грант)</th>
                <th className="border px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="border px-2 py-1 text-center bg-gray-50">{i + 1}</td>
                  <td className="border px-1 py-1"><input type="text" className="w-full px-1 py-1 text-center text-sm" value={row.y} onChange={(e) => updateData(i, 'y', e.target.value)} /></td>
                  <td className="border px-1 py-1"><input type="text" className="w-full px-1 py-1 text-center text-sm" value={row.x1} onChange={(e) => updateData(i, 'x1', e.target.value)} /></td>
                  <td className="border px-1 py-1"><input type="text" className="w-full px-1 py-1 text-center text-sm" value={row.x2} onChange={(e) => updateData(i, 'x2', e.target.value)} /></td>
                  <td className="border px-1 py-1"><input type="text" className="w-full px-1 py-1 text-center text-sm" value={row.x3} onChange={(e) => updateData(i, 'x3', e.target.value)} /></td>
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

          <h2 className="text-lg font-semibold mb-4">Результаты тестирования гетероскедастичности</h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className={`bg-white p-4 rounded border ${results.goldfelQuandt.heteroscedasticity ? 'border-red-300' : 'border-green-300'}`}>
              <h3 className="font-semibold mb-2">Тест Голдфелда-Квандта</h3>
              <p className="text-sm">SSE1 = {toFixed(results.goldfelQuandt.SSE1)}</p>
              <p className="text-sm">SSE2 = {toFixed(results.goldfelQuandt.SSE2)}</p>
              <p className="text-sm">F = SSE2/SSE1 = {toFixed(results.goldfelQuandt.F)}</p>
              <p className="text-sm">F-крит = {toFixed(results.goldfelQuandt.Fcrit)}</p>
              <p className={`mt-2 font-semibold ${results.goldfelQuandt.heteroscedasticity ? 'text-red-600' : 'text-green-600'}`}>
                {results.goldfelQuandt.heteroscedasticity ? 'Гетероскедастичность' : 'Гомоскедастичность'}
              </p>
            </div>

            <div className={`bg-white p-4 rounded border ${results.breuschPagan.heteroscedasticity ? 'border-red-300' : 'border-green-300'}`}>
              <h3 className="font-semibold mb-2">Тест Бройша-Пагана</h3>
              <p className="text-sm">R2 вспом. = {toFixed(results.breuschPagan.R2aux)}</p>
              <p className="text-sm">LM = n * R2 = {toFixed(results.breuschPagan.LM)}</p>
              <p className="text-sm">chi2-крит(3) = {toFixed(results.breuschPagan.chi2crit)}</p>
              <p className={`mt-2 font-semibold ${results.breuschPagan.heteroscedasticity ? 'text-red-600' : 'text-green-600'}`}>
                {results.breuschPagan.heteroscedasticity ? 'Гетероскедастичность' : 'Гомоскедастичность'}
              </p>
            </div>

            <div className={`bg-white p-4 rounded border ${results.white.heteroscedasticity ? 'border-red-300' : 'border-green-300'}`}>
              <h3 className="font-semibold mb-2">Тест Уайта</h3>
              <p className="text-sm">R2 вспом. = {toFixed(results.white.R2aux)}</p>
              <p className="text-sm">LM = n * R2 = {toFixed(results.white.LM)}</p>
              <p className="text-sm">chi2-крит(9) = {toFixed(results.white.chi2crit)}</p>
              <p className={`mt-2 font-semibold ${results.white.heteroscedasticity ? 'text-red-600' : 'text-green-600'}`}>
                {results.white.heteroscedasticity ? 'Гетероскедастичность' : 'Гомоскедастичность'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Обычный МНК (OLS)</h3>
              <p className="text-sm font-mono mb-2">
                Y = {toFixed(results.olsCoefficients[0])} + {toFixed(results.olsCoefficients[1])}*X1 + {toFixed(results.olsCoefficients[2])}*X2 + {toFixed(results.olsCoefficients[3])}*X3
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
                  {['Константа', 'X1', 'X2', 'X3'].map((name, i) => (
                    <tr key={i}>
                      <td className="py-1">{name}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.olsCoefficients[i])}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.olsStdErrors[i])}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.olsTStats[i])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm mt-2">R2 = {toFixed(results.olsR2)}</p>
            </div>

            <div className="bg-white p-4 rounded border">
              <h3 className="font-semibold mb-2">Взвешенный МНК (WLS), W = {results.weightType}</h3>
              <p className="text-sm font-mono mb-2">
                Y = {toFixed(results.wlsCoefficients[0])} + {toFixed(results.wlsCoefficients[1])}*X1 + {toFixed(results.wlsCoefficients[2])}*X2 + {toFixed(results.wlsCoefficients[3])}*X3
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
                  {['Константа', 'X1', 'X2', 'X3'].map((name, i) => (
                    <tr key={i}>
                      <td className="py-1">{name}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.wlsCoefficients[i])}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.wlsStdErrors[i])}</td>
                      <td className="py-1 font-mono text-right">{toFixed(results.wlsTStats[i])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm mt-2">R2 = {toFixed(results.wlsR2)}</p>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded border border-blue-200 text-sm">
            <h3 className="font-semibold mb-2">Рекомендации</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>При гетероскедастичности оценки МНК остаются несмещенными, но неэффективными</li>
              <li>Стандартные ошибки МНК занижены, t-статистики завышены</li>
              <li>ОМНК (WLS) дает эффективные оценки при известной структуре гетероскедастичности</li>
              <li>Выбор весов W зависит от характера зависимости дисперсии от факторов</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  );
}
