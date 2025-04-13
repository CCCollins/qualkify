'use client';

import { useState } from 'react';

type Mode = 'Простой ввод' | 'Ввод уравнений';

const parsePlainSet = (input: string): Set<number> => {
  try {
    return new Set(
      input
        .replace(/[{}]/g, '')
        .split(',')
        .map((v) => parseFloat(v.trim()))
        .filter((v) => !isNaN(v))
    );
  } catch {
    return new Set();
  }
};

const parseSymbolicSet = (expr: string, min: string, max: string): Set<number> => {
  const result = new Set<number>();
  const range = Array.from({ length: 401 }, (_, i) => i - 200);
  const minVal = min === '' ? -Infinity : parseFloat(min);
  const maxVal = max === '' ? Infinity : parseFloat(max);

  const safeExpr = expr.replace(/\^/g, '**');

  for (const n of range) {
    try {
      const value = Function(`"use strict"; const n = ${n}; return ${safeExpr};`)();
      if (typeof value === 'number' && value >= minVal && value <= maxVal) {
        result.add(Math.round(value));
      }
    } catch {
      continue;
    }
  }

  return result;
};

const setOperations = {
  'Объединение': (a: Set<number>, b: Set<number>) => new Set([...a, ...b]),
  'Пересечение': (a: Set<number>, b: Set<number>) => new Set([...a].filter((x) => b.has(x))),
  'Разность A - B': (a: Set<number>, b: Set<number>) => new Set([...a].filter((x) => !b.has(x))),
  'Разность B - A': (a: Set<number>, b: Set<number>) => new Set([...b].filter((x) => !a.has(x))),
  'Симметрическая разность': (a: Set<number>, b: Set<number>) =>
    new Set([...a, ...b].filter((x) => !(a.has(x) && b.has(x)))),
};

export default function SetsPage() {
  const [mode, setMode] = useState<Mode>('Простой ввод');

  // plain input
  const [plainA, setPlainA] = useState('');
  const [plainB, setPlainB] = useState('');

  // symbolic input
  const [exprA, setExprA] = useState('');
  const [minA, setMinA] = useState('');
  const [maxA, setMaxA] = useState('');

  const [exprB, setExprB] = useState('');
  const [minB, setMinB] = useState('');
  const [maxB, setMaxB] = useState('');

  const [operation, setOperation] = useState('Объединение');
  const [result, setResult] = useState<number[] | null>(null);
  const [error, setError] = useState('');

  const calculate = () => {
    try {
      let setA: Set<number>, setB: Set<number>;

      if (mode === 'Простой ввод') {
        setA = parsePlainSet(plainA);
        setB = parsePlainSet(plainB);
      } else {
        if (!exprA && !exprB) throw new Error('Введите выражения для обоих множеств');
        setA = parseSymbolicSet(exprA, minA, maxA);
        setB = parseSymbolicSet(exprB, minB, maxB);
      }

      const resultSet = setOperations[operation as keyof typeof setOperations](setA, setB);
      setResult([...resultSet].sort((a, b) => a - b));
      setError('');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Ошибка при вычислении');
      } else {
        setError('Ошибка при вычислении');
      }
      setResult(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Операции над множествами</h1>

      {/* Mode toggle */}
      <div className="mb-4">
        <label className="font-medium">Режим ввода:</label>
        <select
          className="ml-2 border p-1 rounded"
          value={mode}
          onChange={(e) => setMode(e.target.value as Mode)}
        >
          <option>Простой ввод</option>
          <option>Ввод уравнений</option>
        </select>
      </div>

      {/* Input mode: plain sets */}
      {mode === 'Простой ввод' && (
        <>
          <div className="mb-4">
            <label className="block font-medium mb-1">Множество A:</label>
            <input
              value={plainA}
              onChange={(e) => setPlainA(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="1,2,3"
            />
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Множество B:</label>
            <input
              value={plainB}
              onChange={(e) => setPlainB(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="3,4,5"
            />
          </div>
        </>
      )}

      {/* Input mode: symbolic sets */}
      {mode === 'Ввод уравнений' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="font-medium">A: выражение</label>
              <input
                value={exprA}
                onChange={(e) => setExprA(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="2*n+1"
              />
              <div className="flex gap-2 mt-2">
                <input
                  value={minA}
                  onChange={(e) => setMinA(e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Мин"
                />
                <input
                  value={maxA}
                  onChange={(e) => setMaxA(e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Макс"
                />
              </div>
            </div>

            <div>
              <label className="font-medium">B: выражение</label>
              <input
                value={exprB}
                onChange={(e) => setExprB(e.target.value)}
                className="w-full border rounded p-2"
                placeholder="n^2"
              />
              <div className="flex gap-2 mt-2">
                <input
                  value={minB}
                  onChange={(e) => setMinB(e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Мин"
                />
                <input
                  value={maxB}
                  onChange={(e) => setMaxB(e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Макс"
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Operation selector */}
      <div className="mb-6">
        <label className="font-medium">Операция:</label>
        <select
          className="ml-2 border p-1 rounded"
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
        >
          <option>Объединение</option>
          <option>Пересечение</option>
          <option>Разность A - B</option>
          <option>Разность B - A</option>
          <option>Симметрическая разность</option>
        </select>
      </div>

      {/* Calculate button */}
      <button
        onClick={calculate}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Вычислить
      </button>

      {/* Output */}
      {error && <div className="text-red-600 mt-4">{error}</div>}
      {result && (
        <div className="mt-6 bg-white p-4 rounded">
          <div className="font-medium mb-2">Результат:</div>
          <pre className="whitespace-pre-wrap break-words">{`{ ${result.join(', ')} }`}</pre>
        </div>
      )}
    </div>
  );
}
