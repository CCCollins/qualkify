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

type Point = { x1: number; x2: number };

// Parses a string like "2*x1 + 3*x2 <= 12" into a structured object.
const parseConstraint = (str: string): ParsedConstraint | null => {
  const cleanedStr = str.replace(/\s/g, '');
  const match = cleanedStr.match(/([+-]?\d*\.?\d*\*?x1)?([+-]?\d*\.?\d*\*?x2)?(<=|>=|=)([+-]?\d+\.?\d*)/);
  if (!match) return null;

  const [, x1Part, x2Part, operator, rhs] = match;

  const getCoeff = (part: string | undefined, variable: string): number => {
    if (!part) return 0;
    if (part === `+${variable}` || part === variable) return 1;
    if (part === `-${variable}`) return -1;
    return parseFloat(part.replace(`*${variable}`, ''));
  };

  return {
    coeffs: [getCoeff(x1Part, 'x1'), getCoeff(x2Part, 'x2')],
    operator: operator as '<=' | '>=' | '=',
    rhs: parseFloat(rhs),
  };
};

// Solves a system of two linear equations: a1x1 + b1x2 = c1, a2x1 + b2x2 = c2
const solveLinearSystem = (c1: ParsedConstraint, c2: ParsedConstraint): Point | null => {
    const [a1, b1] = c1.coeffs;
    const [a2, b2] = c2.coeffs;
    const rhs1 = c1.rhs;
    const rhs2 = c2.rhs;

    const determinant = a1 * b2 - a2 * b1;
    if (Math.abs(determinant) < 1e-9) { // Lines are parallel or coincident
        return null;
    }

    const x1 = (b2 * rhs1 - b1 * rhs2) / determinant;
    const x2 = (a1 * rhs2 - a2 * rhs1) / determinant;

    return { x1, x2 };
};

// Checks if a point satisfies a given constraint.
const isPointFeasible = (point: Point, constraint: ParsedConstraint): boolean => {
    const { coeffs, operator, rhs } = constraint;
    const val = coeffs[0] * point.x1 + coeffs[1] * point.x2;
    const tolerance = 1e-9; // To handle floating point inaccuracies

    switch (operator) {
        case '<=': return val <= rhs + tolerance;
        case '>=': return val >= rhs - tolerance;
        case '=': return Math.abs(val - rhs) < tolerance;
        default: return false;
    }
};


interface ConstraintInput {
  id: number;
  value: string;
}

const GraphicalMethodCalculator: React.FC = () => {
  const [objective, setObjective] = useState('x1 + 2*x2');
  const [objectiveType, setObjectiveType] = useState<'maximize' | 'minimize'>('maximize');
  const [constraints, setConstraints] = useState<ConstraintInput[]>([
    { id: 1, value: '2*x1 + 3*x2 <= 12' },
    { id: 2, value: 'x1 + x2 <= 5' },
    { id: 3, value: 'x1 >= 0'},
    { id: 4, value: 'x2 >= 0'}
  ]);
  const [results, setResults] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartData<'line' | 'scatter'> | null>(null);


  const handleAddConstraint = () => {
    setConstraints([...constraints, { id: Date.now(), value: '' }]);
  };

  const handleRemoveConstraint = (id: number) => {
    setConstraints(constraints.filter(c => c.id !== id));
  };

  const handleConstraintChange = (id: number, value: string) => {
    setConstraints(constraints.map(c => (c.id === id ? { ...c, value } : c)));
  };

  const calculate = () => {
    setChartData(null);
    const parsedConstraints = constraints
      .map(c => parseConstraint(c.value))
      .filter((c): c is ParsedConstraint => c !== null);

    if (parsedConstraints.length < 2) {
      setResults("Ошибка: необходимо как минимум два ограничения.");
      return;
    }

    const intersectionPoints: Point[] = [];
    for (let i = 0; i < parsedConstraints.length; i++) {
      for (let j = i + 1; j < parsedConstraints.length; j++) {
        const point = solveLinearSystem(parsedConstraints[i], parsedConstraints[j]);
        if (point) {
          intersectionPoints.push(point);
        }
      }
    }

    const feasiblePoints = intersectionPoints.filter(p =>
      p.x1 >= -1e-9 && p.x2 >= -1e-9 && parsedConstraints.every(c => isPointFeasible(p, c))
    );

    const uniqueFeasiblePoints = feasiblePoints.reduce<Point[]>((acc, point) => {
      if (!acc.some(p => Math.abs(p.x1 - point.x1) < 1e-9 && Math.abs(p.x2 - point.x2) < 1e-9)) {
        acc.push(point);
      }
      return acc;
    }, []);

    let optimalPoint: Point | null = null;
    let optimalValue = objectiveType === 'maximize' ? -Infinity : Infinity;
    let steps = 'Шаги решения:\n\n';

    steps += '1. Найдены угловые точки допустимой области:\n';
    uniqueFeasiblePoints.forEach(p => {
      steps += `   - (${format(p.x1, { notation: 'fixed', precision: 2 })}, ${format(p.x2, { notation: 'fixed', precision: 2 })})\n`;
    });

    if (uniqueFeasiblePoints.length === 0) {
      setResults("Не удалось найти допустимых угловых точек. Область может быть неограниченной или не существует.");
      return;
    }
    
    uniqueFeasiblePoints.sort((a, b) => Math.atan2(a.x2, a.x1) - Math.atan2(b.x2, b.x1));

    steps += '\n2. Вычисление значения целевой функции в каждой точке:\n';
    uniqueFeasiblePoints.forEach(point => {
      try {
        const value = evaluate(objective, { x1: point.x1, x2: point.x2 });
        steps += `   - F(${format(point.x1, { notation: 'fixed', precision: 2 })}, ${format(point.x2, { notation: 'fixed', precision: 2 })}) = ${format(value, { notation: 'fixed', precision: 2 })}\n`;
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

    if (optimalPoint !== null) {
      const point = optimalPoint as Point;
      steps += `\n3. Оптимальное решение:\n`;
      steps += `   - ${objectiveType === 'maximize' ? 'Максимальное' : 'Минимальное'} значение F = ${format(optimalValue, { notation: 'fixed', precision: 2 })} достигается в точке (${format(point.x1, { notation: 'fixed', precision: 2 })}, ${format(point.x2, { notation: 'fixed', precision: 2 })})\n`;
    } else {
      steps += "\nНе удалось найти оптимальное решение.";
    }

    setResults(steps);
    generateChartData(parsedConstraints, uniqueFeasiblePoints, optimalPoint);
  };

  const generateChartData = (constraints: ParsedConstraint[], feasiblePoints: Point[], optimalPoint: Point | null) => {
    const allPoints = [...feasiblePoints, ...(optimalPoint ? [optimalPoint] : [])];
    const xMax = allPoints.reduce((max, p) => Math.max(max, p.x1), 0) * 1.2 + 5;
    const yMax = allPoints.reduce((max, p) => Math.max(max, p.x2), 0) * 1.2 + 5;
  
    const datasets: ChartDataset<'line' | 'scatter'>[] = constraints.map((c, i) => {
      const [a, b] = c.coeffs;
      const rhs = c.rhs;
      let p1, p2;
  
      if (Math.abs(b) > 1e-9) { // Not a vertical line
        p1 = { x: 0, y: rhs / b };
        p2 = { x: xMax, y: (rhs - a * xMax) / b };
      } else { // Vertical line
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
  
    // Add feasible region polygon
    if (feasiblePoints.length > 1) {
      datasets.push({
        label: 'Допустимая область',
        data: [...feasiblePoints, feasiblePoints[0]].map(p => ({ x: p.x1, y: p.x2 })),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderWidth: 1,
        fill: true,
        pointRadius: 0,
        type: 'line' as const,
      });
    }
  
    // Add corner points
    datasets.push({
      label: 'Угловые точки',
      data: feasiblePoints.map(p => ({ x: p.x1, y: p.x2 })),
      backgroundColor: 'rgba(255, 99, 132, 1)',
      pointRadius: 5,
      type: 'scatter' as const,
    });
  
    // Add optimal point
    if (optimalPoint) {
      datasets.push({
        label: 'Оптимальная точка',
        data: [{ x: optimalPoint.x1, y: optimalPoint.x2 }],
        backgroundColor: 'rgba(54, 162, 235, 1)',
        pointRadius: 7,
        pointStyle: 'rectRot',
        type: 'scatter' as const,
      });
    }
  
    setChartData({
      datasets: datasets,
    });
  };

  const chartOptions: ChartOptions<'line' | 'scatter'> = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.5,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Графическое представление решения',
      },
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        title: {
          display: true,
          text: 'x1',
        },
        min: 0,
      },
      y: {
        type: 'linear',
        title: {
          display: true,
          text: 'x2',
        },
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
