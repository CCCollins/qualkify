'use client';

import React, { useState } from 'react';
import { evaluate, format } from 'mathjs';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData,
  ChartOptions,
  ChartDataset,
  ScatterController,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController
);

// --- Helper Types and Functions ---

type ParsedConstraint = {
  coeffs: number[];
  operator: '<=' | '>=' | '=';
  rhs: number;
};

type Point = { x: number; y: number };

const parseExpression = (expr: string, var1: string, var2: string): number[] => {
  const processedExpr = expr.replace(/(\d)([a-zA-Z])/g, '$1*$2');
  const termRegex = /([+-])?\s*(\d+\.?\d*)?\s*\*?\s*([a-zA-Z][a-zA-Z0-9_]*)/g;
  const coeffs: { [key: string]: number } = { [var1]: 0, [var2]: 0 };
  const signedExpr = (processedExpr.startsWith('+') || processedExpr.startsWith('-')) ? processedExpr : `+${processedExpr}`;
  let match;
  while ((match = termRegex.exec(signedExpr)) !== null) {
    const [, sign, coeffStr, variable] = match;
    if (variable !== var1 && variable !== var2) continue;
    let coeff = parseFloat(coeffStr || '1');
    if (sign === '-') {
      coeff = -coeff;
    }
    coeffs[variable] += coeff;
  }
  return [coeffs[var1], coeffs[var2]];
};

const parseConstraint = (str: string, var1: string, var2: string): ParsedConstraint | null => {
  const parts = str.split(/(<=|>=|=)/);
  if (parts.length < 3) return null;
  const lhs = parts[0];
  const operator = parts[1].trim() as ParsedConstraint['operator'];
  const rhs = parseFloat(parts[2].trim());
  if (isNaN(rhs)) return null;
  const coeffs = parseExpression(lhs, var1, var2);
  return { coeffs, operator, rhs };
};

const solveLinearSystem = (c1: ParsedConstraint, c2: ParsedConstraint): Point | null => {
  const [a1, b1] = c1.coeffs;
  const [a2, b2] = c2.coeffs;
  const rhs1 = c1.rhs;
  const rhs2 = c2.rhs;
  const determinant = a1 * b2 - a2 * b1;
  if (Math.abs(determinant) < 1e-9) {
    return null;
  }
  const x = (b2 * rhs1 - b1 * rhs2) / determinant;
  const y = (a1 * rhs2 - a2 * rhs1) / determinant;
  return { x, y };
};

const isPointFeasible = (point: Point, constraints: ParsedConstraint[]): boolean => {
  const tolerance = 1e-9;
  if (point.x < -tolerance || point.y < -tolerance) return false;
  for (const constraint of constraints) {
    const { coeffs, operator, rhs } = constraint;
    const val = coeffs[0] * point.x + coeffs[1] * point.y;
    let isFeasible = false;
    switch (operator) {
      case '<=':
        isFeasible = val <= rhs + tolerance;
        break;
      case '>=':
        isFeasible = val >= rhs - tolerance;
        break;
      case '=':
        isFeasible = Math.abs(val - rhs) < tolerance;
        break;
    }
    if (!isFeasible) return false;
  }
  return true;
};

interface ConstraintInput {
  id: number;
  value: string;
}

const GraphicalMethodCalculator: React.FC = () => {
  const [objective, setObjective] = useState('6x + 5y');
  const [objectiveType, setObjectiveType] = useState<'maximize' | 'minimize'>('maximize');
  const [constraints, setConstraints] = useState<ConstraintInput[]>([
    { id: 1, value: '3x + 2y <= 10' },
    { id: 2, value: '4x + y <= 8' },
    { id: 3, value: 'x >= 0' },
    { id: 4, value: 'y >= 0' },
  ]);
  const [results, setResults] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData<'line' | 'scatter'> | null>(null);
  const [variableNames, setVariableNames] = useState<[string, string]>(['x', 'y']);

  const handleAddConstraint = () => {
    setConstraints([...constraints, { id: Date.now(), value: '' }]);
  };

  const handleRemoveConstraint = (id: number) => {
    setConstraints(constraints.filter((c) => c.id !== id));
  };

  const handleConstraintChange = (id: number, value: string) => {
    setConstraints(constraints.map((c) => (c.id === id ? { ...c, value } : c)));
  };

  const calculate = () => {
    setChartData(null);

    const allInputs = [objective, ...constraints.map((c) => c.value)];
    const detectedVars = new Set<string>();
    const varRegex = /[a-zA-Z_][a-zA-Z0-9_]*/g;
    allInputs.forEach((input) => {
      const lhs = input.split(/(<=|>=|=)/)[0];
      const matches = lhs.match(varRegex);
      if (matches) {
        matches.forEach((v) => detectedVars.add(v));
      }
    });

    const sortedVars = Array.from(detectedVars).sort();
    if (sortedVars.length > 2) {
      setResults(`Ошибка: Графический метод поддерживает только две переменные. Найдено: ${sortedVars.join(', ')}`);
      return;
    }
    if (sortedVars.length < 2) {
      setResults(`Ошибка: Графический метод требует две переменные. Найдено: ${sortedVars.join(', ')}`);
      return;
    }
    const [var1, var2] = sortedVars as [string, string];
    setVariableNames([var1, var2]);

    const parsedConstraints = constraints
      .map((c) => parseConstraint(c.value, var1, var2))
      .filter((c): c is ParsedConstraint => c !== null);

    if (parsedConstraints.length < 2) {
      setResults('Ошибка: необходимо как минимум два ограничения.');
      return;
    }

    const intersectionPoints: Point[] = [];
    const extendedConstraints = [
        ...parsedConstraints,
        { coeffs: [1, 0], operator: '>=' as const, rhs: 0 }, // x >= 0
        { coeffs: [0, 1], operator: '>=' as const, rhs: 0 }, // y >= 0
    ];

    for (let i = 0; i < extendedConstraints.length; i++) {
      for (let j = i + 1; j < extendedConstraints.length; j++) {
        const point = solveLinearSystem(extendedConstraints[i], extendedConstraints[j]);
        if (point) {
          intersectionPoints.push(point);
        }
      }
    }
    
    const feasiblePoints = intersectionPoints.filter(p => isPointFeasible(p, parsedConstraints));

    const uniqueFeasiblePoints = feasiblePoints.reduce<Point[]>((acc, point) => {
      if (!acc.some((p) => Math.abs(p.x - point.x) < 1e-9 && Math.abs(p.y - point.y) < 1e-9)) {
        acc.push(point);
      }
      return acc;
    }, []);

    if (uniqueFeasiblePoints.length === 0) {
      setResults('Не удалось найти допустимых угловых точек. Область может быть неограниченной или не существует.');
      return;
    }

    let optimalPoint: Point | null = null;
    let optimalValue = objectiveType === 'maximize' ? -Infinity : Infinity;

    uniqueFeasiblePoints.forEach((point) => {
      try {
        const scope = { [var1]: point.x, [var2]: point.y };
        const value = evaluate(objective, scope);
        if (objectiveType === 'maximize' && value > optimalValue) {
          optimalValue = value;
          optimalPoint = point;
        } else if (objectiveType === 'minimize' && value < optimalValue) {
          optimalValue = value;
          optimalPoint = point;
        }
      } catch (error) {
        setResults(`Ошибка при вычислении целевой функции: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
    });

    let steps = 'Шаги решения:\n\n';
    steps += '1. Найдены все возможные точки пересечения (включая оси):\n';
    intersectionPoints.forEach(p => {
      steps += `   - (${format(p.x, { notation: 'fixed', precision: 2 })}, ${format(p.y, { notation: 'fixed', precision: 2 })})\n`;
    });

    steps += '\n2. Найдены угловые точки допустимой области (прошедшие проверку):\n';
    uniqueFeasiblePoints.forEach((p) => {
      steps += `   - (${format(p.x, { notation: 'fixed', precision: 2 })}, ${format(p.y, { notation: 'fixed', precision: 2 })})\n`;
    });
    steps += '\n3. Вычисление значения целевой функции в каждой точке:\n';
    uniqueFeasiblePoints.forEach((point) => {
      const scope = { [var1]: point.x, [var2]: point.y };
      const value = evaluate(objective, scope);
      steps += `   - F(${format(point.x, { notation: 'fixed', precision: 2 })}, ${format(point.y, {
        notation: 'fixed',
        precision: 2,
      })}) = ${format(value, { notation: 'fixed', precision: 2 })}\n`;
    });

    if (
      optimalPoint &&
      typeof (optimalPoint as Point).x === 'number' &&
      typeof (optimalPoint as Point).y === 'number'
    ) {
      steps += `\n4. Оптимальное решение:\n`;
      steps += `   - ${objectiveType === 'maximize' ? 'Максимальное' : 'Минимальное'} значение F = ${format(optimalValue, {
        notation: 'fixed',
        precision: 2,
      })} достигается в точке (${format((optimalPoint as Point).x, { notation: 'fixed', precision: 2 })}, ${format((optimalPoint as Point).y, { notation: 'fixed', precision: 2 })})\n`;
    } else {
      steps += '\nНе удалось найти оптимальное решение.';
    }

    setResults(steps);
    generateChartData(parsedConstraints, uniqueFeasiblePoints, optimalPoint, objective, variableNames);
  };

  const generateChartData = (
    constraints: ParsedConstraint[],
    feasiblePoints: Point[],
    optimalPoint: Point | null,
    objective: string,
    variableNames: [string, string]
  ) => {
    const allPoints: Point[] = [...feasiblePoints];
    if (optimalPoint) {
        allPoints.push(optimalPoint);
    }

    const xMax = allPoints.length > 0
        ? Math.max(...(allPoints as Point[]).map((p: Point) => p.x)) * 1.2 + 5
        : 5;
    const yMax = allPoints.length > 0
        ? Math.max(...(allPoints as Point[]).map((p: Point) => p.y)) * 1.2 + 5
        : 5;

    const datasets: ChartDataset<'line' | 'scatter'>[] = constraints.map((c, i) => {
      const [a, b] = c.coeffs;
      const rhs = c.rhs;
      let p1: Point, p2: Point;

      if (Math.abs(b) > 1e-9) {
        p1 = { x: 0, y: rhs / b };
        p2 = { x: xMax, y: (rhs - a * xMax) / b };
      } else {
        p1 = { x: rhs / a, y: 0 };
        p2 = { x: rhs / a, y: yMax };
      }
      return {
        label: `Ограничение ${i + 1}`,
        data: [p1, p2],
        borderColor: `hsl(${i * 60}, 70%, 50%)`,
        borderWidth: 2,
        fill: false,
        tension: 0,
        pointRadius: 0,
        type: 'line' as const,
      };
    });

    if (feasiblePoints.length > 1) {
      const sortedFeasiblePoints = [...feasiblePoints].sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
      datasets.push({
        label: 'Допустимая область',
        data: ([...sortedFeasiblePoints, sortedFeasiblePoints[0]]).map((p: Point) => ({ x: p.x, y: p.y })),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 1,
        fill: true,
        pointRadius: 0,
        type: 'line' as const,
      });
    }

    datasets.push({
      label: 'Угловые точки',
      data: feasiblePoints.map((p: Point) => ({ x: p.x, y: p.y })),
      backgroundColor: 'rgba(255, 99, 132, 1)',
      pointRadius: 5,
      type: 'scatter' as const,
    });

    if (optimalPoint) {
      datasets.push({
        label: 'Оптимальная точка',
        data: [{ x: optimalPoint.x, y: optimalPoint.y }],
        backgroundColor: 'rgba(54, 162, 235, 1)',
        pointRadius: 7,
        pointStyle: 'rectRot',
        type: 'scatter' as const,
      });
    }

    // Add gradient vector
    const objCoeffs = parseExpression(objective, variableNames[0], variableNames[1]);
    const gradientMagnitude = Math.sqrt(objCoeffs[0]**2 + objCoeffs[1]**2);
    if (gradientMagnitude > 1e-9) {
        const scale = Math.min(xMax, yMax) / gradientMagnitude / 4; // Scale to be 1/4 of the smaller axis length
        const gradientEndPoint = {
            x: objCoeffs[0] * scale,
            y: objCoeffs[1] * scale
        };
        datasets.push({
            label: 'Вектор градиента (F)',
            data: [{ x: 0, y: 0 }, gradientEndPoint] as Point[],
            borderColor: 'rgba(156, 39, 176, 0.8)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: [0, 8],
            pointStyle: ['circle', 'triangle'],
            pointBackgroundColor: 'rgba(156, 39, 176, 0.8)',
            type: 'line' as const,
        });
    }

    setChartData({ datasets });
  };

  const chartOptions: ChartOptions<'line' | 'scatter'> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.5,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Графическое представление решения' },
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: { display: true, text: variableNames[0] },
        min: 0,
      },
      y: {
        type: 'linear',
        title: { display: true, text: variableNames[1] },
        min: 0,
      },
    },
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left side: Inputs */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">Параметры задачи</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Целевая функция</label>
            <div className="flex items-center mt-1">
              <span className="text-gray-500 mr-2">F =</span>
              <input
                type="text"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 2*x1 + 3*x2"
              />
              <select
                value={objectiveType}
                onChange={(e) => setObjectiveType(e.target.value as 'maximize' | 'minimize')}
                className="ml-2 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="maximize">→ max</option>
                <option value="minimize">→ min</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Ограничения</label>
            <div className="space-y-2 mt-1">
              {constraints.map((constraint) => (
                <div key={constraint.id} className="flex items-center">
                  <input
                    type="text"
                    value={constraint.value}
                    onChange={(e) => handleConstraintChange(constraint.id, e.target.value)}
                    className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., x1 + x2 <= 8"
                  />
                  <button
                    onClick={() => handleRemoveConstraint(constraint.id)}
                    className="ml-2 p-2 text-red-500 hover:text-red-700"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={handleAddConstraint}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              + Добавить ограничение
            </button>
          </div>
          <button
            onClick={calculate}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Рассчитать
          </button>
        </div>

        {/* Right side: Results and Chart */}
        <div className="space-y-6">
          {results && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 h-fit">
              <h3 className="text-lg font-semibold text-gray-800">Результаты</h3>
              <p className="mt-2 text-gray-700 whitespace-pre-wrap">{results}</p>
            </div>
          )}
           {chartData && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <Chart type="line" data={chartData as ChartData<'line' | 'scatter'>} options={chartOptions as ChartOptions<'line' | 'scatter'>} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GraphicalMethodCalculator;
