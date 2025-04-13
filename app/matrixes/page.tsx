'use client';

import React, { useState } from 'react';
import { Graphviz } from 'graphviz-react';

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
    <div className="mb-6 relative">
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
  const [steps, setSteps] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [matrixA, setMatrixA] = useState<number[][]>([[0, 1], [1, 0]]);
  const [matrixB, setMatrixB] = useState<number[][]>([[1, 0], [0, 1]]);
  const [resultMatrix, setResultMatrix] = useState<number[][] | null>(null);

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
        `Формула: II^T - 2A = K\n\n1. Построение матрицы инцидентности:`,
        ...incidenceMatrix.map(
          (row, i) => `   Строка ${i + 1}: [${row.join(', ')}]`
        ),
        `2. Транспонирование матрицы инцидентности:`,
        ...incidenceMatrixT.map(
          (row, i) => `   Строка ${i + 1}: [${row.join(', ')}]`
        ),
        `3. Умножение матрицы инцидентности на её транспонированную:`,
        ...product.map(
          (row, i) => `   Строка ${i + 1}: [${row.join(', ')}]`
        ),
        `4. Умножение матрицы смежности на 2:`,
        ...scaledAdjMatrix.map(
          (row, i) => `   Строка ${i + 1}: [${row.join(', ')}]`
        ),
        `5. Построение матрицы Кирхгоффа:`,
        ...kirchhoff.map(
          (row, i) => `   Строка ${i + 1}: [${row.join(', ')}]`
        ),
      ];

      setSteps(stepsDescription);
      setKirchhoffMatrix(kirchhoff);
      setGraphViz(generateGraphViz(edges));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Произошла ошибка');
      setKirchhoffMatrix(null);
      setSteps([]);
    }
  };

  const handleMultiply = () => {
    try {
      const result = multiplyMatrices(matrixA, matrixB);
  
      // Генерация шагов для отображения
      const stepsDescription = [
        '1. Проверка совместимости матриц для умножения.',
        '2. Умножение строк матрицы A на столбцы матрицы B:',
        ...matrixA.map((row, i) =>
          matrixB[0].map((_, j) => {
            const computation = row
              .map((val, k) => `${val} * ${matrixB[k][j]}`)
              .join(' + ');
            return `   Элемент [${i + 1}, ${j + 1}] = ${computation}`;
          })
        ).flat(),
      ];
  
      setSteps(stepsDescription);
      setResultMatrix(result);
      setError('');
    } catch (e) {
      setResultMatrix(null);
      setSteps([]);
      setError(e instanceof Error ? e.message : 'Произошла ошибка при умножении матриц');
    }
  };

  const handleBoolMultiply = () => {
    try {
      const result = booleanMatrixMultiply(matrixA, matrixB);
  
      // Генерация шагов для отображения
      const stepsDescription = [
        '1. Проверка совместимости матриц для булевого умножения.',
        '2. Выполнение булевого умножения:',
        ...matrixA.map((row, i) =>
          matrixB[0].map((_, j) => {
            const computation = row
              .map((val, k) => `${val} ∧ ${matrixB[k][j]}`)
              .join(' ∨ ');
            return `   Элемент [${i + 1}, ${j + 1}] = ${computation}`;
          })
        ).flat(),
      ];
  
      setSteps(stepsDescription);
      setResultMatrix(result);
      setError('');
    } catch (e) {
      setResultMatrix(null);
      setSteps([]);
      setError(e instanceof Error ? e.message : 'Произошла ошибка при булевом умножении матриц');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Матрица Кирхгоффа и операции над матрицами</h1>

      {/* Ввод графа */}
      <div className="mb-4">
        <label className="block mb-2 font-medium">Введите граф:</label>
        <input
          value={graphInput}
          onChange={(e) => setGraphInput(e.target.value)}
          className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500"
          placeholder="Формат: 1-2, 2-3, 1-3, 1-4"
        />
      </div>

      <button
        onClick={calculateKirchhoff}
        className="w-full py-3 px-4 rounded-lg shadow bg-blue-600 hover:bg-blue-700 text-white"
      >
        Построить матрицу Кирхгоффа
      </button>

      {error && <div className="mt-4 text-red-600 font-medium">{error}</div>}

      {graphViz && (
        <div className="mt-6">
          <Graphviz dot={graphViz} options={{ height: '300px', width: '100%' }} />
        </div>
      )}

      {kirchhoffMatrix && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Матрица Кирхгоффа:</h3>
          <MatrixTable data={kirchhoffMatrix} />
        </div>
      )}

      {steps.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Шаги вычислений:</h3>
          <pre className="bg-gray-100 p-4 rounded text-sm text-gray-800 whitespace-pre-wrap">
            {steps.join('\n')}
          </pre>
        </div>
      )}

      {/* Операции над матрицами */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">Операции над матрицами</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">Матрица A:</h3>
            <MatrixEditor label="" matrix={matrixA} setMatrix={setMatrixA} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Матрица B:</h3>
            <MatrixEditor label="" matrix={matrixB} setMatrix={setMatrixB} />
          </div>
        </div>

        <div className="flex justify-center items-center flex-wrap gap-4 mt-8">
          <button
            onClick={handleMultiply}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            Умножить A × B
          </button>
          <button
            onClick={handleBoolMultiply}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Булево умножение A × B
          </button>
        </div>

        {resultMatrix && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Результат:</h3>
            <MatrixTable data={resultMatrix} />
          </div>
        )}
      </div>
    </div>
  );
}