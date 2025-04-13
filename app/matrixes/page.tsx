'use client';

import React, { useState } from 'react';
import { Graphviz } from 'graphviz-react';
import { FaRegArrowAltCircleRight } from 'react-icons/fa';
import { TbSmartHome } from 'react-icons/tb';
import Link from 'next/link';

// Вспомогательные функции
const parseGraph = (input: string) => {
  const edges: [number, number][] = [];
  const nodes = new Set<number>();

  input.split(',').forEach((edge) => {
    const [from, to] = edge.trim().split('-').map(Number);
    if (isNaN(from) || isNaN(to)) {
      throw new Error(`Неверный формат ребра: "${edge}". Используйте формат "1-2, 2-3".`);
    }
    edges.push([from, to]);
    nodes.add(from);
    nodes.add(to);
  });

  const nodeCount = Math.max(...nodes);

  // Матрица смежности
  const adjacencyMatrix = Array.from({ length: nodeCount }, () =>
    Array(nodeCount).fill(0)
  );
  edges.forEach(([from, to]) => {
    adjacencyMatrix[from - 1][to - 1] = 1;
    adjacencyMatrix[to - 1][from - 1] = 1; // Симметрия для неориентированного графа
  });

  return { edges, adjacencyMatrix, nodeCount };
};

const buildIncidenceMatrix = (edges: [number, number][], nodeCount: number) => {
  const incidenceMatrix = Array.from({ length: nodeCount }, () =>
    Array(edges.length).fill(0)
  );

  edges.forEach(([from, to], index) => {
    incidenceMatrix[from - 1][index] = 1;
    incidenceMatrix[to - 1][index] = 1;
  });

  return incidenceMatrix;
};

const transposeMatrix = (matrix: number[][]): number[][] =>
  matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));

const multiplyMatrices = (a: number[][], b: number[][]): number[][] => {
  const aRows = a.length, aCols = a[0].length;
  const bRows = b.length, bCols = b[0].length;
  if (aCols !== bRows) throw new Error('Несовместимые размеры матриц для умножения');

  return Array.from({ length: aRows }, (_, i) =>
    Array.from({ length: bCols }, (_, j) =>
      a[i].reduce((sum, val, k) => sum + val * b[k][j], 0)
    )
  );
};

const booleanMatrixMultiply = (a: number[][], b: number[][]): number[][] => {
  const aRows = a.length, aCols = a[0].length;
  const bRows = b.length, bCols = b[0].length;
  if (aCols !== bRows) throw new Error('Несовместимые размеры матриц для булевого умножения');

  return Array.from({ length: aRows }, (_, i) =>
    Array.from({ length: bCols }, (_, j) =>
      a[i].some((val, k) => val && b[k][j]) ? 1 : 0
    )
  );
};

const MatrixTable = ({ data }: { data: number[][] }) => (
  <div className="w-full flex justify-center mt-6">
    <div className="overflow-auto rounded border border-gray-300 shadow-md max-w-full">
      <table className="table-auto border-collapse text-sm text-center bg-white">
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="even:bg-gray-50 hover:bg-blue-50 transition">
              {row.map((val, j) => (
                <td
                  key={j}
                  className="border border-gray-300 px-4 py-2 font-medium text-gray-800 min-w-[50px]"
                >
                  {val}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const MatrixEditor = ({
  label,
  matrix,
  setMatrix,
}: {
  label: string;
  matrix: number[][];
  setMatrix: (m: number[][]) => void;
}) => {
  const addRow = () => {
    const cols = matrix[0]?.length || 0;
    setMatrix([...matrix, Array(cols).fill(0)]);
  };

  const addCol = () => {
    setMatrix(matrix.map((row) => [...row, 0]));
  };

  const removeRow = () => {
    if (matrix.length > 1) setMatrix(matrix.slice(0, -1));
  };

  const removeCol = () => {
    if (matrix[0]?.length > 1) setMatrix(matrix.map((row) => row.slice(0, -1)));
  };

  const updateCell = (i: number, j: number, value: string) => {
    if (value === '' || value === '-' || !isNaN(Number(value))) {
      const updated = matrix.map((row) => [...row]);
      // @ts-expect-error TypeScript doesn't know that value can be a number or string
      updated[i][j] = value === '' || value === '-' ? value : Number(value);
      setMatrix(updated);
    }
  };

  return (
    <div className="mb-6 text-center relative">
      <h3 className="font-semibold mb-2">{label}</h3>
      <div className="relative inline-block">
        {/* Матрица */}
        <div className="flex flex-col gap-1 relative">
          {matrix.map((row, i) => (
            <div key={i} className="flex gap-1">
              {row.map((val, j) => (
                <input
                  key={j}
                  type="number"
                  className="w-12 border rounded text-center"
                  value={val}
                  onChange={(e) => updateCell(i, j, e.target.value)}
                  onFocus={(e) => e.target.select()} // Выделяем текст при фокусе
                />
              ))}
            </div>
          ))}

          {/* Кнопки для добавления/удаления строк */}
          <div className="absolute -bottom-9 left-1/2 transform -translate-x-1/2 flex gap-2">
            <button
              onClick={addRow}
              title="Добавить строку"
              className="text-sm px-2 py-1 bg-blue-500 text-white rounded"
            >
              +
            </button>
            <button
              onClick={removeRow}
              title="Удалить строку"
              className="text-sm px-2 py-1 bg-gray-600 text-white rounded"
            >
              −
            </button>
          </div>
        </div>

        {/* Кнопки для добавления/удаления столбцов */}
        <div className="absolute top-1/2 -right-9 transform -translate-y-1/2 flex flex-col gap-2">
          <button
            onClick={addCol}
            title="Добавить столбец"
            className="text-sm px-2 py-1 bg-blue-500 text-white rounded"
          >
            +
          </button>
          <button
            onClick={removeCol}
            title="Удалить столбец"
            className="text-sm px-2 py-1 bg-gray-600 text-white rounded"
          >
            −
          </button>
        </div>
      </div>
    </div>
  );
};

export default function KirchhoffPage() {
  const [graphInput, setGraphInput] = useState('1-2, 2-3, 1-3, 1-4');
  const [graphViz, setGraphViz] = useState('');
  const [kirchhoffMatrix, setKirchhoffMatrix] = useState<number[][] | null>(null);
  const [error, setError] = useState('');
  const [matrixA, setMatrixA] = useState<number[][]>([[0, 1], [1, 0]]);
  const [matrixB, setMatrixB] = useState<number[][]>([[1, 0], [0, 1]]);
  const [resultMatrix, setResultMatrix] = useState<number[][] | null>(null);
  const [kirchhoffSteps, setKirchhoffSteps] = useState<string[]>([]);
  const [multiplicationSteps, setMultiplicationSteps] = useState<string[]>([]);

  const generateGraphViz = (edges: [number, number][]) => {
    let dot = 'graph G {\n';
    dot += '  layout=neato;\n';
    dot += '  node [shape=circle];\n';

    edges.forEach(([from, to]) => {
      dot += `  ${from} -- ${to};\n`;
    });

    dot += '}';
    return dot;
  };

  const calculateKirchhoff = () => {
    try {
      setError('');
      const { edges, adjacencyMatrix, nodeCount } = parseGraph(graphInput);
  
      // Строим матрицу инцидентности
      const incidenceMatrix = buildIncidenceMatrix(edges, nodeCount);
  
      // Транспонируем матрицу инцидентности
      const incidenceMatrixT = transposeMatrix(incidenceMatrix);
  
      // Умножаем I * I^T
      const product = multiplyMatrices(incidenceMatrix, incidenceMatrixT);
  
      // Умножаем матрицу смежности на 2
      const scaledAdjMatrix = adjacencyMatrix.map((row) =>
        row.map((val) => 2 * val)
      );
  
      // Вычисляем матрицу Кирхгоффа: K = I * I^T - 2 * A
      const kirchhoff = product.map((row, i) =>
        row.map((val, j) => val - scaledAdjMatrix[i][j])
      );
  
      // Генерация шагов для отображения
      const stepsDescription = [
        `Формула: II^T - 2A = K\n\n1️⃣ Построение матрицы инцидентности:`,
        ...incidenceMatrix.map(
          (row) => `   [${row.join(', ')}]`
        ),
        `2️⃣ Транспонирование матрицы инцидентности:`,
        ...incidenceMatrixT.map(
          (row) => `   [${row.join(', ')}]`
        ),
        `3️⃣ Умножение матрицы инцидентности на её транспонированную:`,
        ...product.map(
          (row) => `   [${row.join(', ')}]`
        ),
        `4️⃣ Умножение матрицы смежности на 2:`,
        ...scaledAdjMatrix.map(
          (row) => `   [${row.join(', ')}]`
        ),
        `5️⃣ Построение матрицы Кирхгоффа:`,
        ...kirchhoff.map(
          (row) => `   [${row.join(', ')}]`
        ),
      ];
  
      setKirchhoffSteps(stepsDescription); // Сохраняем шаги для матрицы Кирхгоффа
      setKirchhoffMatrix(kirchhoff);
      setGraphViz(generateGraphViz(edges));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Произошла ошибка');
      setKirchhoffMatrix(null);
      setKirchhoffSteps([]); // Очищаем шаги при ошибке
    }
  };

  const handleMultiply = () => {
    try {
      const result = multiplyMatrices(matrixA, matrixB);
  
      // Генерация шагов для отображения
      const stepsDescription = [
        '1️⃣ Проверка совместимости матриц для умножения.',
        '2️⃣ Умножение строк матрицы A на столбцы матрицы B:',
        ...matrixA.map((row, i) =>
          matrixB[0].map((_, j) => {
            const computation = row
              .map((val, k) => `${val} * ${matrixB[k][j]}`)
              .join(' + ');
            return ` [${i + 1}, ${j + 1}] = ${computation}`;
          })
        ).flat(),
      ];
  
      setMultiplicationSteps(stepsDescription); // Сохраняем шаги для умножения
      setResultMatrix(result);
      setError('');
    } catch (e) {
      setResultMatrix(null);
      setMultiplicationSteps([]); // Очищаем шаги при ошибке
      setError(e instanceof Error ? e.message : 'Произошла ошибка при умножении матриц');
    }
  };
  
  const handleBoolMultiply = () => {
    try {
      const result = booleanMatrixMultiply(matrixA, matrixB);
  
      // Генерация шагов для отображения
      const stepsDescription = [
        '1️⃣ Проверка совместимости матриц для булевого умножения.',
        '2️⃣ Выполнение булевого умножения:',
        ...matrixA.map((row, i) =>
          matrixB[0].map((_, j) => {
            const computation = row
              .map((val, k) => `${val} ∧ ${matrixB[k][j]}`)
              .join(' ∨ ');
            return ` [${i + 1}, ${j + 1}] = ${computation}`;
          })
        ).flat(),
      ];
  
      setMultiplicationSteps(stepsDescription); // Сохраняем шаги для булевого умножения
      setResultMatrix(result);
      setError('');
    } catch (e) {
      setResultMatrix(null);
      setMultiplicationSteps([]); // Очищаем шаги при ошибке
      setError(e instanceof Error ? e.message : 'Произошла ошибка при булевом умножении матриц');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-center items-center mb-6">
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-800 transition"
          title="Домашняя страница"
        >
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">
          Матрица Кирхгоффа и операции над матрицами
        </h1>
      </div>
  
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-stretch">
      {/* Ввод графа */}
      <div className="bg-white shadow rounded-lg p-4 space-y-4 h-full">
        <label className="block font-medium">Введите граф:</label>
        <div className="relative flex items-center w-full">
          <input
            value={graphInput}
            onChange={(e) => setGraphInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && calculateKirchhoff()}
            className="flex-1 border rounded p-3 pr-12 font-medium text-sm md:text-base w-full"
            placeholder="Формат: 1-2, 2-3, 1-3, 1-4"
          />
          <button
            onClick={calculateKirchhoff}
            className="absolute right-2 rounded-full bg-blue-600 text-white p-2 hover:bg-blue-700 transition flex-shrink-0"
          >
            <FaRegArrowAltCircleRight className="text-lg" />
          </button>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        {kirchhoffSteps.length > 0 && (
          <div>
            <h3 className="text-base font-semibold mb-1">Шаги:</h3>
            <pre className="text-sm bg-gray-100 p-3 rounded whitespace-pre-wrap overflow-x-auto">
              {kirchhoffSteps.join('\n')}
            </pre>
          </div>
        )}
      </div>

      {/* Правая часть: граф и матрица */}
      <div className="flex flex-col gap-4 h-full">
        <div className="bg-white rounded shadow p-4 flex-1 flex flex-col gap-4 justify-start">
          {graphViz && (
            <div className="border rounded p-2 overflow-auto">
              <Graphviz dot={graphViz} options={{ height: '300px', width: '100%' }} />
            </div>
          )}

          {kirchhoffMatrix && (
            <div>
              <h3 className="font-semibold text-center">Матрица Кирхгоффа</h3>
              <MatrixTable data={kirchhoffMatrix} />
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Операции над матрицами */}
    <div className="bg-white rounded-lg shadow p-4 md:p-6 mt-6">
      <h2 className="text-xl md:text-2xl font-bold text-center mb-4 md:mb-6">
        Операции над матрицами
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <MatrixEditor label="Матрица A" matrix={matrixA} setMatrix={setMatrixA} />
        <MatrixEditor label="Матрица B" matrix={matrixB} setMatrix={setMatrixB} />
      </div>

      <div className="flex flex-wrap justify-center gap-4 mt-4 md:mt-6">
        <button
          onClick={handleMultiply}
          className="bg-purple-600 text-white px-3 py-2 md:px-4 md:py-2 rounded hover:bg-purple-700 transition"
        >
          A × B
        </button>
        <button
          onClick={handleBoolMultiply}
          className="bg-yellow-500 text-white px-3 py-2 md:px-4 md:py-2 rounded hover:bg-yellow-600 transition"
        >
          Булево A × B
        </button>
      </div>

      {multiplicationSteps.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
          <div>
            <h3 className="text-lg font-semibold mb-2 text-center">Шаги</h3>
            <pre className="text-sm bg-gray-100 p-4 rounded whitespace-pre-wrap overflow-x-auto">
              {multiplicationSteps.join('\n')}
            </pre>
          </div>

          {resultMatrix && (
            <div>
              <h3 className="text-lg font-semibold mb-2 text-center">Результат</h3>
              <div className="overflow-x-auto">
                <MatrixTable data={resultMatrix} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  );
}