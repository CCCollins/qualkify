'use client';

import { useState } from 'react';

const createEmptyMatrix = (rows: number, cols: number): number[][] =>
  Array.from({ length: rows }, () => Array(cols).fill(0));

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

const computeKirchhoff = (adjMatrix: number[][]): number[][] => {
  const n = adjMatrix.length;
  const degreeMatrix = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? adjMatrix[i].reduce((a, b) => a + b, 0) : 0))
  );
  return degreeMatrix.map((row, i) =>
    row.map((deg, j) => deg - adjMatrix[i][j])
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
    const updated = matrix.map((row) => [...row]);
    updated[i][j] = Number(value);
    setMatrix(updated);
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">{label}</h3>
        <div className="flex gap-2">
          <button onClick={addRow} title="Добавить строку" className="text-sm px-2 py-1 bg-blue-500 text-white rounded">+↧</button>
          <button onClick={addCol} title="Добавить столбец" className="text-sm px-2 py-1 bg-blue-500 text-white rounded">+⇨</button>
          <button onClick={removeRow} title="Удалить строку" className="text-sm px-2 py-1 bg-gray-600 text-white rounded">−↧</button>
          <button onClick={removeCol} title="Удалить столбец" className="text-sm px-2 py-1 bg-gray-600 text-white rounded">−⇨</button>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {matrix.map((row, i) => (
          <div key={i} className="flex gap-1">
            {row.map((val, j) => (
              <input
                key={j}
                type="number"
                className="w-12 border rounded text-center"
                value={val}
                onChange={(e) => updateCell(i, j, e.target.value)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function KirchhoffPage() {
  const [size, setSize] = useState(3);
  const [adjMatrix, setAdjMatrix] = useState(createEmptyMatrix(3, 3));
  const [matrixA, setMatrixA] = useState(createEmptyMatrix(2, 2));
  const [matrixB, setMatrixB] = useState(createEmptyMatrix(2, 2));
  const [result, setResult] = useState<number[][] | null>(null);
  const [error, setError] = useState('');

  const handleAdjChange = (i: number, j: number, value: string) => {
    const updated = adjMatrix.map((row) => [...row]);
    updated[i][j] = Number(value);
    updated[j][i] = Number(value); // симметрия
    setAdjMatrix(updated);
  };

  const renderAdjMatrix = () =>
    adjMatrix.map((row, i) => (
      <div key={i} className="flex gap-2 mb-1">
        {row.map((_, j) => (
          <input
            key={`${i}-${j}`}
            type="number"
            className="w-12 border rounded text-center"
            value={adjMatrix[i][j]}
            onChange={(e) => handleAdjChange(i, j, e.target.value)}
          />
        ))}
      </div>
    ));

  const generateMatrix = () => {
    if (size < 1 || size > 20) {
      setError('Размер от 1 до 20');
      return;
    }
    setAdjMatrix(createEmptyMatrix(size, size));
    setResult(null);
    setError('');
  };

  const calculateKirchhoff = () => {
    try {
      const kirchhoff = computeKirchhoff(adjMatrix);
      setResult(kirchhoff);
      setError('');
    } catch (e: unknown) {
      setResult(null);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Произошла неизвестная ошибка');
      }
    }
  };

  const handleMultiply = () => {
    try {
      const result = multiplyMatrices(matrixA, matrixB);
      setResult(result);
      setError('');
    } catch (e: unknown) {
      setResult(null);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Произошла неизвестная ошибка');
      }
    }
  };

  const handleBoolMultiply = () => {
    try {
      const result = booleanMatrixMultiply(matrixA, matrixB);
      setResult(result);
      setError('');
    } catch (e: unknown) {
      setResult(null);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Произошла неизвестная ошибка');
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Матрица Кирхгофа и умножение</h1>

      {/* Adjacency matrix */}
      <div className="mb-6">
        <label className="font-medium">Количество вершин:</label>
        <input
          type="number"
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="ml-2 border p-1 rounded w-20"
        />
        <button
          onClick={generateMatrix}
          className="ml-4 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          Сгенерировать
        </button>

        <h2 className="font-semibold mt-4 mb-2">Матрица смежности:</h2>
        {renderAdjMatrix()}
        <button
          onClick={calculateKirchhoff}
          className="mt-3 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Построить матрицу Кирхгоффа
        </button>
      </div>

      <hr className="my-8" />

      {/* Matrix A & B */}
      <div className="grid md:grid-cols-2 gap-6">
        <MatrixEditor label="Матрица A" matrix={matrixA} setMatrix={setMatrixA} />
        <MatrixEditor label="Матрица B" matrix={matrixB} setMatrix={setMatrixB} />
      </div>

      <div className="flex flex-wrap gap-4 mt-2">
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

      {error && <div className="mt-4 text-red-600 font-medium">Ошибка: {error}</div>}

      {result && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Результат:</h3>
          <MatrixTable data={result} />
        </div>
      )}
    </div>
  );
}
