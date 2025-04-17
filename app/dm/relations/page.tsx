'use client';

import { useState } from 'react';
import { Graphviz } from 'graphviz-react';
import { TbSmartHome } from 'react-icons/tb';
import Link from 'next/link';
import { FaRegArrowAltCircleRight } from 'react-icons/fa';

export default function RelationsPage() {
  const [mode, setMode] = useState<'Список связей' | 'Проверка формулы'>('Список связей');
  const [formula, setFormula] = useState('(x + y) % 2 === 0');
  const [relationInput, setRelationInput] = useState('1-2, 2-3, 1-3');
  const [relationAnalysis, setRelationAnalysis] = useState('');
  const [graphViz, setGraphViz] = useState('');
  const [adjacencyMatrix, setAdjacencyMatrix] = useState('');
  const [error, setError] = useState('');

  const buildGraphAndMatrix = (pairs: [string, string][], elements: string[]) => {
    const relationSet = new Set(pairs.map(([a, b]) => `${a},${b}`));

    // Рефлексивность
    const reflexiveSteps = elements.map((x) =>
      relationSet.has(`${x},${x}`)
        ? `✅ ${x} связано с собой`
        : `❌ ${x} не связано с собой`
    );

    // Симметричность
    const symmetricSteps = pairs.map(([a, b]) =>
      relationSet.has(`${b},${a}`)
        ? `✅ (${a}, ${b}) → (${b}, ${a})`
        : `❌ (${a}, ${b}) → (${b}, ${a})`
    );

    // Транзитивность
    const transitiveSteps: string[] = [];
    pairs.forEach(([a, b]) => {
      pairs
        .filter(([c]) => c === b)
        .forEach(([, d]) => {
          if (!relationSet.has(`${a},${d}`)) {
            transitiveSteps.push(`❌ (${a}, ${b}) и (${b}, ${d}) → (${a}, ${d})`);
          } else {
            transitiveSteps.push(`✅ (${a}, ${b}) и (${b}, ${d}) → (${a}, ${d})`);
          }
        });
    });

    // Матрица смежности
    const matrix = elements.map((row) =>
      elements.map((col) => (relationSet.has(`${row},${col}`) ? 1 : 0))
    );
    const matrixString = matrix.map((row) => row.join(' ')).join('\n');

    // DOT-граф
    const dot = `digraph G {
        layout=neato;
        node [shape=circle];
        ${pairs.map(([a, b]) => `"${a}" -> "${b}";`).join('\n  ')}
    }`;

    const report = [
        `Рефлексивность:\n${reflexiveSteps.join('\n')}`,
        `\nСимметричность:\n${symmetricSteps.join('\n')}`,
        `\nТранзитивность:\n${transitiveSteps.join('\n')}`,
    ].join('\n');

    setRelationAnalysis(report);
    setAdjacencyMatrix(matrixString);
    setGraphViz(dot);
    setError('');
  };

  const analyzeRelation = () => {
    try {
      const pairs: [string, string][] = relationInput
        .split(',')
        .map((p) => p.trim())
        .map((p) => {
          const [a, b] = p.split('-');
          if (!a || !b) throw new Error();
          return [a.trim(), b.trim()];
        });

      if (pairs.length === 0) throw new Error('Некорректный ввод пар');

      const elements = [...new Set(pairs.flat())].sort();
      buildGraphAndMatrix(pairs, elements);
    } catch {
      setRelationAnalysis('');
      setAdjacencyMatrix('');
      setGraphViz('');
      setError('Некорректный ввод пар. Используй формат: 1-1, 1-2, 2-1, ...');
    }
  };

  const analyzeFormulaRelation = (formula: string): string => {
    const clean = formula.replace(/\s+/g, '');
    const values = Array.from({ length: 101 }, (_, i) => i - 50); // [-50..50]
    const relationSet = new Set<string>();
  
    for (const x of values) {
      for (const y of values) {
        try {
          const result = Function(`"use strict"; const x=${x}, y=${y}; return (${clean});`)();
          if (result) relationSet.add(`${x},${y}`);
        } catch {}
      }
    }
  
    // Рефлексивность: (x, x) ∈ R ∀ x ∈ values
    const reflexiveMissing = values.filter(x => !relationSet.has(`${x},${x}`));
    const isReflexive = reflexiveMissing.length === 0;
  
    // Симметричность: (x, y) ∈ R ⇒ (y, x) ∈ R
    let isSymmetric = true;
    for (const pair of relationSet) {
      const [a, b] = pair.split(',').map(Number);
      if (!relationSet.has(`${b},${a}`)) {
        isSymmetric = false;
        break;
      }
    }
  
    // Транзитивность: (a, b), (b, c) ∈ R ⇒ (a, c) ∈ R
    const isTransitive = Array.from(relationSet).every(pair1 => {
      const [a, b] = pair1.split(',').map(Number);
      return Array.from(relationSet).every(pair2 => {
        const [c, d] = pair2.split(',').map(Number);
        return b !== c || relationSet.has(`${a},${d}`);
      });
    });
  
    return `  1️⃣ Рефлексивность: ${isReflexive ? '✅' : '❌'}
  2️⃣ Симметричность: ${isSymmetric ? '✅' : '❌'}
  3️⃣ Транзитивность: ${isTransitive ? '✅' : '❌'}
  `;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">Анализ отношений</h1>
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1">Режим:</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as 'Список связей' | 'Проверка формулы')}
          className="w-full border p-2 rounded"
        >
          <option>Список связей</option>
          <option>Проверка формулы</option>
        </select>
      </div>

    <div className="grid lg:grid-cols-2 gap-6">
        {/* Ввод и анализ */}
        <div>
            <div className="bg-white rounded-lg shadow p-4 space-y-4">
            {mode === 'Список связей' ? (
                <>
                <label className="block font-medium mb-1">Введите отношения:</label>
                <div className="relative flex items-center w-full">
                    <input
                    value={relationInput}
                    onChange={(e) => setRelationInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && analyzeRelation()}
                    className="flex-1 border rounded p-3 pr-12 font-medium text-sm md:text-base w-full"
                    placeholder="Формат: 1-2, 2-3, ..."
                    />
                    <button
                        onClick={analyzeRelation}
                        className="absolute right-2 rounded-full bg-blue-600 text-white p-2 hover:bg-blue-700 transition"
                        >
                        <FaRegArrowAltCircleRight className="text-lg" />
                    </button>
                </div>

                {/* Результат анализа для режима "Список связей" */}
                {relationAnalysis && (
                    <div className="bg-gray-50 border border-gray-200 rounded p-4 mt-4 whitespace-pre-wrap">
                    {relationAnalysis}
                    </div>
                )}

                {error && (
                    <div className="text-red-600 mt-4 text-center font-medium">{error}</div>
                )}
                </>
            ) : (
                <>
                <label className="block font-medium mb-1">Формула (проверяет числа от -50 до 50):</label>
                <div className="relative flex items-center w-full">
                <input
                    value={formula}
                    onChange={(e) => setFormula(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setRelationAnalysis(analyzeFormulaRelation(formula))}
                    className="flex-1 border rounded p-3 pr-12 font-medium text-sm md:text-base w-full"
                    placeholder="Пример: (x + y) % 2 === 0"
                />
                <button
                    onClick={() => setRelationAnalysis(analyzeFormulaRelation(formula))}
                    className="absolute right-2 rounded-full bg-blue-600 text-white p-2 hover:bg-blue-700 transition"
                    >
                    <FaRegArrowAltCircleRight className="text-lg" />
                </button>
                </div>
                </>
            )}
            </div>
        </div>

        {/* Правая часть */}
        {mode === 'Список связей' ? (
            <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center justify-start">
            {graphViz ? (
                <>
                <Graphviz
                    dot={graphViz}
                    options={{ height: '300px', width: '100%' }}
                    className="border p-3 rounded-lg"
                />
                {adjacencyMatrix && (
                    <div className="bg-gray-50 text-center border border-gray-200 rounded p-4 whitespace-pre font-mono mt-4 w-full">
                    <strong>Матрица смежности</strong>
                    <pre>{adjacencyMatrix}</pre>
                    </div>
                )}
                </>
            ) : (
                <div className="text-gray-400 text-sm text-center">
                </div>
            )}
            </div>
        ) : (
            <div>
            {/* Результат анализа для режима "Проверка формулы" */}
            {relationAnalysis && (
                <div className="bg-gray-50 border border-gray-200 rounded items-center text-center p-4 whitespace-pre-line">
                {relationAnalysis}
                </div>
            )}

            {error && (
                <div className="text-red-600 mt-4 text-center font-medium">{error}</div>
            )}
            </div>
        )}
        </div>
    </div>
  );
}
