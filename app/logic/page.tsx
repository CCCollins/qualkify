'use client';

import { JSX, useRef, useState } from 'react';

const operatorPrecedence: Record<string, number> = {
  '¬': 5,
  '‾': 5,
  '∧': 4,
  '∨': 3,
  '⊕': 3,
  '→': 2,
  '↔': 1,
};

const isOperator = (char: string) => operatorPrecedence[char] !== undefined;
const isVariable = (char: string) => /^[A-Za-z]$/.test(char);

const extractVariables = (expression: string): string[] => {
  return Array.from(new Set(expression.match(/[A-Za-z]/g))).sort();
};

const generateTruthTable = (variables: string[]) => {
  const combinations: number[][] = [];
  const total = 1 << variables.length;

  for (let i = 0; i < total; i++) {
    const row = variables.map((_, j) => (i >> (variables.length - j - 1)) & 1);
    combinations.push(row);
  }

  return combinations;
};

const infixToPostfix = (expression: string): string[] => {
  const output: string[] = [];
  const stack: string[] = [];
  let i = 0;

  while (i < expression.length) {
    const char = expression[i];

    if (isVariable(char)) {
      if (expression[i + 1] === '‾') {
        // Если переменная с альтернативным отрицанием
        output.push(char + '‾');
        i += 2;
      } else {
        output.push(char);
        i += 1;
      }
    } else if (char === '(') {
      stack.push(char);
      i++;
    } else if (char === ')') {
      while (stack.length && stack[stack.length - 1] !== '(') {
        output.push(stack.pop()!);
      }
      stack.pop();
      i++;
    } else if (isOperator(char)) {
      while (
        stack.length &&
        stack[stack.length - 1] !== '(' &&
        operatorPrecedence[stack[stack.length - 1]] >= operatorPrecedence[char]
      ) {
        output.push(stack.pop()!);
      }
      stack.push(char);
      i++;
    } else {
      i++;
    }
  }

  while (stack.length) {
    output.push(stack.pop()!);
  }

  return output;
};

const evaluatePostfix = (postfix: string[], values: Record<string, boolean>) => {
  const stack: (boolean | number)[] = [];

  for (const token of postfix) {
    if (isVariable(token)) {
      // Если это переменная, берем ее значение из values
      stack.push(values[token]);
    } else if (!isNaN(Number(token))) {
      // Если это число, преобразуем его в число и добавляем в стек
      stack.push(Number(token));
    } else if (token.endsWith('‾')) {
      // Если это альтернативное отрицание переменной
      const varName = token[0];
      stack.push(!values[varName]);
    } else if (token === '¬') {
      // Логическое отрицание
      const a = stack.pop()!;
      stack.push(!a);
    } else if (token === '∧') {
      // Логическое И
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(Boolean(a && b));
    } else if (token === '∨') {
      // Логическое ИЛИ
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(Boolean(a || b));
    } else if (token === '⊕') {
      // Исключающее ИЛИ (XOR)
      const b = stack.pop()!;
      const a = stack.pop()!;
      if (typeof a === 'number' && typeof b === 'number') {
        // Побитовый XOR для чисел
        stack.push(a ^ b);
      } else {
        // Логический XOR для булевых значений
        stack.push(Boolean(a !== b));
      }
    } else if (token === '→') {
      // Импликация
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(Boolean(!a || b));
    } else if (token === '↔') {
      // Эквивалентность
      const b = stack.pop()!;
      const a = stack.pop()!;
      stack.push(Boolean(a === b));
    }
  }

  return stack[0];
};

const TruthTable = ({
  expression,
  variables,
  table,
  results,
}: {
  expression: string;
  variables: string[];
  table: number[][];
  results: boolean[];
}) => {
  const trueCount = results.filter(Boolean).length;

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-2">Таблица истинности для: <code>{expression}</code></h2>
      <div className="overflow-auto rounded border border-gray-300">
        <table className="table-auto w-full text-center text-sm border-collapse">
          <thead className="bg-blue-100">
            <tr>
              {variables.map((v) => (
                <th key={v} className="border px-3 py-2">{v}</th>
              ))}
              <th className="border px-3 py-2">Результат</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {row.map((val, idx) => (
                  <td key={idx} className="border px-3 py-1">{val}</td>
                ))}
                <td className="border px-3 py-1 font-medium">
                  {results[i] ? '1' : '0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-gray-700">
        Количество истинных результатов: <strong>{trueCount}</strong>
      </p>
    </div>
  );
};

export default function LogicPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<JSX.Element | string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  const insertSymbol = (symbol: string) => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    const start = inputEl.selectionStart ?? input.length;
    const end = inputEl.selectionEnd ?? input.length;

    const newValue = input.slice(0, start) + symbol + input.slice(end);
    setInput(newValue);

    requestAnimationFrame(() => {
      inputEl.selectionStart = inputEl.selectionEnd = start + symbol.length;
      inputEl.focus();
    });
  };

  const handleCalculate = (input: string) => {
    try {
      if (/^\d+\s*⊕\s*\d+$/.test(input)) {
        // Если выражение вида "7⊕12"
        const [a, b] = input.split('⊕').map((n) => parseInt(n.trim(), 10));
        if (isNaN(a) || isNaN(b)) throw new Error('Некорректные числа в выражении.');

        const result = a ^ b; // Побитовый XOR
        const binaryA = a.toString(2).padStart(5, '0');
        const binaryB = b.toString(2).padStart(5, '0');
        const binaryResult = result.toString(2).padStart(5, '0');

        setOutput(
          `Число 1: ${a} = ${binaryA}\nЧисло 2: ${b} = ${binaryB}\n` +
          `Результат XOR: ${binaryA} ⊕ ${binaryB} = ${binaryResult}\nРезультат: ${result}`
        );
      } else {
        // Обычная обработка логических выражений
        const variables = extractVariables(input);
        if (variables.length === 0) throw new Error('Нет переменных.');

        const table = generateTruthTable(variables);
        const postfix = infixToPostfix(input);
        const results = table.map((row) => {
          const values = Object.fromEntries(variables.map((v, i) => [v, Boolean(row[i])]));
          return evaluatePostfix(postfix, values);
        });

        setOutput(
          <TruthTable
            expression={input}
            variables={variables}
            table={table}
            results={results.map((result) => Boolean(result))}
          />
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setOutput(`Ошибка: ${err.message}`);
      } else {
        setOutput('Произошла неизвестная ошибка.');
      }
    }
  };

  const examples = [
    '(A→C)∧(B→C)∧(A∨B)→C',
    '((X‾∧Y)↔(Z⊕Y‾))∧(X→Z)',
    'A↔B',
    '7⊕12',
    '¬A∧(B∨C)',
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Логические выражения
      </h1>

      <div className="mb-4">
        <label className="block mb-2 font-medium">Примеры:</label>
        <div className="flex flex-wrap gap-2">
          {examples.map((example, idx) => (
            <button
              key={idx}
              onClick={() => setInput(example)}
              className="px-4 py-2 bg-gray-100 text-sm rounded hover:bg-gray-200"
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <label className="block mb-2 font-medium">Введите логическое выражение:</label>
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="w-full border rounded-md p-2 text-lg mb-3"
        placeholder="Например: A∧B∨¬C"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {['¬', '‾', '∧', '∨', '⊕', '→', '↔'].map((s) => (
          <button
            key={s}
            onClick={() => insertSymbol(s)}
            className="px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            {s}
          </button>
        ))}
      </div>

      <button
        onClick={() => handleCalculate(input)}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-6"
      >
        Рассчитать
      </button>

      {typeof output === 'string' ? (
        <pre className="text-gray-800 bg-gray-100 p-4 rounded">{output}</pre>
      ) : (
        output
      )}
    </div>
  );
}
