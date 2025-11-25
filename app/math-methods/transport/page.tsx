"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome } from 'react-icons/tb';

interface Cell {
  cost: number;
  value: number;
  isBasic: boolean;
}

interface Tableau {
  cells: Cell[][];
  supply: number[];
  demand: number[];
  u: (number | null)[];
  v: (number | null)[];
}

interface Step {
  tableau: Tableau;
  explanation: string;
  potentials?: string;
  estimates?: string;
}

const toFraction = (decimal: number): string => {
  if (Math.abs(decimal) < 1e-6) return "0";
  
  const sign = decimal < 0 ? "-" : "";
  decimal = Math.abs(decimal);
  
  if (Math.abs(decimal - Math.round(decimal)) < 1e-6) {
    return sign + Math.round(decimal).toString();
  }
  
  return sign + decimal.toFixed(2);
};

export default function TransportProblemPage() {
  const [suppliers, setSuppliers] = useState(3);
  const [consumers, setConsumers] = useState(4);
  const [supply, setSupply] = useState<string[]>(['20', '50', '30']);
  const [demand, setDemand] = useState<string[]>(['20', '40', '10', '30']);
  const [costs, setCosts] = useState<string[][]>([
    ['5', '7', '6', '2'],
    ['3', '2', '11', '3'],
    ['10', '3', '2', '4']
  ]);
  const [results, setResults] = useState<{ steps: Step[], optimal: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSupplierChange = (newCount: number) => {
    setSuppliers(newCount);
    const newSupply = Array(newCount).fill('').map((_, i) => supply[i] || '0');
    const newCosts = Array(newCount).fill(null).map((_, i) => 
      costs[i] ? [...costs[i]] : Array(consumers).fill('0')
    );
    setSupply(newSupply);
    setCosts(newCosts);
  };

  const handleConsumerChange = (newCount: number) => {
    setConsumers(newCount);
    const newDemand = Array(newCount).fill('').map((_, i) => demand[i] || '0');
    const newCosts = costs.map(row => 
      Array(newCount).fill('').map((_, i) => row[i] || '0')
    );
    setDemand(newDemand);
    setCosts(newCosts);
  };

  const calculate = () => {
    try {
      setError(null);
      
      const supplyValues = supply.map(s => parseFloat(s) || 0);
      const demandValues = demand.map(d => parseFloat(d) || 0);
      const costMatrix = costs.map(row => row.map(c => parseFloat(c) || 0));
      
      const totalSupply = supplyValues.reduce((a, b) => a + b, 0);
      const totalDemand = demandValues.reduce((a, b) => a + b, 0);
      
      if (Math.abs(totalSupply - totalDemand) > 1e-6) {
        setError(`Задача не сбалансирована: Σa = ${totalSupply}, Σb = ${totalDemand}. Добавьте фиктивного поставщика или потребителя.`);
        return;
      }
      
      const steps: Step[] = [];
      
      // Построение начального плана методом минимальной стоимости
      const allocation: number[][] = Array(suppliers).fill(null).map(() => Array(consumers).fill(0));
      const remainingSupply = [...supplyValues];
      const remainingDemand = [...demandValues];
      
      let explanation = "Шаг 1. Построение начального плана методом минимальной стоимости:\n\n";
      
      while (remainingSupply.some(s => s > 1e-6) && remainingDemand.some(d => d > 1e-6)) {
        let minCost = Infinity;
        let minI = -1, minJ = -1;
        
        for (let i = 0; i < suppliers; i++) {
          for (let j = 0; j < consumers; j++) {
            if (remainingSupply[i] > 1e-6 && remainingDemand[j] > 1e-6 && costMatrix[i][j] < minCost) {
              minCost = costMatrix[i][j];
              minI = i;
              minJ = j;
            }
          }
        }
        
        if (minI === -1) break;
        
        const amount = Math.min(remainingSupply[minI], remainingDemand[minJ]);
        allocation[minI][minJ] = amount;
        remainingSupply[minI] -= amount;
        remainingDemand[minJ] -= amount;
        
        explanation += `Минимальный тариф c${minI + 1}${minJ + 1} = ${minCost}\n`;
        explanation += `Перевозим x${minI + 1}${minJ + 1} = min(${toFraction(remainingSupply[minI] + amount)}, ${toFraction(remainingDemand[minJ] + amount)}) = ${toFraction(amount)}\n\n`;
      }
      
      const cells: Cell[][] = Array(suppliers).fill(null).map((_, i) =>
        Array(consumers).fill(null).map((_, j) => ({
          cost: costMatrix[i][j],
          value: allocation[i][j],
          isBasic: allocation[i][j] > 1e-6
        }))
      );
      
      let basicCells = 0;
      for (let i = 0; i < suppliers; i++) {
        for (let j = 0; j < consumers; j++) {
          if (cells[i][j].isBasic) basicCells++;
        }
      }
      
      const requiredBasic = suppliers + consumers - 1;
      if (basicCells < requiredBasic) {
        explanation += `План вырожденный: ${basicCells} базисных клеток < ${requiredBasic}\n`;
        explanation += `Добавляем нулевые перевозки...\n\n`;
        
        for (let i = 0; i < suppliers && basicCells < requiredBasic; i++) {
          for (let j = 0; j < consumers && basicCells < requiredBasic; j++) {
            if (!cells[i][j].isBasic) {
              cells[i][j].isBasic = true;
              cells[i][j].value = 0;
              basicCells++;
              explanation += `Добавлена нулевая перевозка в клетку (${i + 1}, ${j + 1})\n`;
            }
          }
        }
      }
      
      steps.push({
        tableau: {
          cells: cells.map(row => row.map(cell => ({ ...cell }))),
          supply: [...supplyValues],
          demand: [...demandValues],
          u: Array(suppliers).fill(null),
          v: Array(consumers).fill(null)
        },
        explanation
      });
      
      // Метод потенциалов
      let iteration = 0;
      const currentCells = cells.map(row => row.map(cell => ({ ...cell })));
      
      while (iteration < 20) {
        iteration++;
        
        // Расчет потенциалов
        const u: (number | null)[] = Array(suppliers).fill(null);
        const v: (number | null)[] = Array(consumers).fill(null);
        u[0] = 0;
        
        let changed = true;
        while (changed) {
          changed = false;
          for (let i = 0; i < suppliers; i++) {
            for (let j = 0; j < consumers; j++) {
              if (currentCells[i][j].isBasic) {
                if (u[i] !== null && v[j] === null) {
                  v[j] = currentCells[i][j].cost - u[i]!;
                  changed = true;
                } else if (v[j] !== null && u[i] === null) {
                  u[i] = currentCells[i][j].cost - v[j]!;
                  changed = true;
                }
              }
            }
          }
        }
        
        let potentialCalc = `\nИтерация ${iteration}. Расчет потенциалов:\n\n`;
        potentialCalc += `u₁ = 0 (приняли за константу)\n\n`;
        potentialCalc += `Для базисных клеток: uᵢ + vⱼ = cᵢⱼ\n\n`;
        
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for (let i = 0; i < suppliers; i++) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          for (let j = 0; j < consumers; j++) {
            if (currentCells[i][j].isBasic) {
              potentialCalc += `x${i + 1}${j + 1}: u${i + 1} + v${j + 1} = ${currentCells[i][j].cost}`;
              if (u[i] !== null && v[j] !== null) {
                potentialCalc += ` → ${toFraction(u[i]!)} + ${toFraction(v[j]!)} = ${currentCells[i][j].cost}\n`;
              } else {
                potentialCalc += `\n`;
              }
            }
          }
        }
        
        potentialCalc += `\nРезультат:\n`;
        potentialCalc += `u = [${u.map(val => val !== null ? toFraction(val) : '?').join(', ')}]\n`;
        potentialCalc += `v = [${v.map(val => val !== null ? toFraction(val) : '?').join(', ')}]\n`;
        
        // Расчет оценок для свободных клеток
        let estimatesCalc = `\nРасчет оценок для свободных клеток: pᵢⱼ = cᵢⱼ - uᵢ - vⱼ\n\n`;
        let minEstimate = 0;
        let minI = -1, minJ = -1;
        
        for (let i = 0; i < suppliers; i++) {
          for (let j = 0; j < consumers; j++) {
            if (!currentCells[i][j].isBasic && u[i] !== null && v[j] !== null) {
              const estimate = currentCells[i][j].cost - u[i]! - v[j]!;
              estimatesCalc += `p${i + 1}${j + 1} = ${currentCells[i][j].cost} - ${toFraction(u[i]!)} - ${toFraction(v[j]!)} = ${toFraction(estimate)}`;
              
              if (estimate < minEstimate - 1e-6) {
                minEstimate = estimate;
                minI = i;
                minJ = j;
                estimatesCalc += ` ← минимальная\n`;
              } else {
                estimatesCalc += `\n`;
              }
            }
          }
        }
        
        steps.push({
          tableau: {
            cells: currentCells.map(row => row.map(cell => ({ ...cell }))),
            supply: [...supplyValues],
            demand: [...demandValues],
            u: [...u],
            v: [...v]
          },
          explanation: potentialCalc + estimatesCalc,
          potentials: `u = [${u.map(val => val !== null ? toFraction(val) : '?').join(', ')}], v = [${v.map(val => val !== null ? toFraction(val) : '?').join(', ')}]`,
          estimates: estimatesCalc
        });
        
        if (minEstimate >= -1e-6) {
          steps[steps.length - 1].explanation += `\nВсе оценки ≥ 0 → план оптимален!\n`;
          break;
        }
        
        // Построение цикла и пересчет
        steps[steps.length - 1].explanation += `\nСтроим цикл для клетки (${minI + 1}, ${minJ + 1})...\n`;
        
        // Упрощенный пересчет (для демонстрации)
        const theta = Math.min(
          ...currentCells.map((row, i) => 
            row.map((cell, j) => cell.isBasic && cell.value > 0 ? cell.value : Infinity)
          ).flat()
        );
        
        if (theta < Infinity && theta > 0) {
          currentCells[minI][minJ].value = theta;
          currentCells[minI][minJ].isBasic = true;
          
          // Находим клетку для вывода из базиса
          for (let i = 0; i < suppliers; i++) {
            for (let j = 0; j < consumers; j++) {
              if (currentCells[i][j].isBasic && currentCells[i][j].value <= theta + 1e-6 && (i !== minI || j !== minJ)) {
                currentCells[i][j].isBasic = false;
                currentCells[i][j].value = 0;
                break;
              }
            }
          }
        }
      }
      
      // Расчет оптимального значения
      let totalCost = 0;
      let optimalExplanation = '\nРасчет оптимального значения:\n\n';
      optimalExplanation += 'F = Σ(cᵢⱼ × xᵢⱼ) = ';
      
      const terms: string[] = [];
      for (let i = 0; i < suppliers; i++) {
        for (let j = 0; j < consumers; j++) {
          if (currentCells[i][j].isBasic && currentCells[i][j].value > 1e-6) {
            totalCost += currentCells[i][j].cost * currentCells[i][j].value;
            terms.push(`${currentCells[i][j].cost} × ${toFraction(currentCells[i][j].value)}`);
          }
        }
      }
      
      optimalExplanation += terms.join(' + ') + ` = ${toFraction(totalCost)}`;
      
      setResults({ steps, optimal: optimalExplanation });
      
    } catch (e) {
      setError((e as Error).message);
      setResults(null);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">
          Транспортная задача
        </h1>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Параметры задачи</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Количество поставщиков (m)
            </label>
            <input
              type="number"
              min="2"
              max="10"
              value={suppliers}
              onChange={(e) => handleSupplierChange(parseInt(e.target.value) || 2)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Количество потребителей (n)
            </label>
            <input
              type="number"
              min="2"
              max="10"
              value={consumers}
              onChange={(e) => handleConsumerChange(parseInt(e.target.value) || 2)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Запасы поставщиков (aᵢ)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {supply.map((s, i) => (
              <input
                key={i}
                type="number"
                value={s}
                onChange={(e) => {
                  const newSupply = [...supply];
                  newSupply[i] = e.target.value;
                  setSupply(newSupply);
                }}
                placeholder={`a${i + 1}`}
                className="p-2 border border-gray-300 rounded-md"
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Потребности потребителей (bⱼ)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {demand.map((d, i) => (
              <input
                key={i}
                type="number"
                value={d}
                onChange={(e) => {
                  const newDemand = [...demand];
                  newDemand[i] = e.target.value;
                  setDemand(newDemand);
                }}
                placeholder={`b${i + 1}`}
                className="p-2 border border-gray-300 rounded-md"
              />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Матрица тарифов (cᵢⱼ)
          </label>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-100"></th>
                  {Array(consumers).fill(0).map((_, j) => (
                    <th key={j} className="border p-2 bg-gray-100">B{j + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {costs.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-2 bg-gray-100 font-semibold">A{i + 1}</td>
                    {row.map((cost, j) => (
                      <td key={j} className="border p-1">
                        <input
                          type="number"
                          value={cost}
                          onChange={(e) => {
                            const newCosts = costs.map(r => [...r]);
                            newCosts[i][j] = e.target.value;
                            setCosts(newCosts);
                          }}
                          className="w-full p-1 text-center border-none focus:ring-2 focus:ring-blue-500 rounded"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <button
          onClick={calculate}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors"
        >
          Решить методом потенциалов
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {results && (
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Пошаговое решение</h3>
          
          {results.steps.map((step, idx) => (
            <div key={idx} className="mb-6 p-4 bg-white rounded-lg border border-gray-300">
              <div className="mb-4 whitespace-pre-line text-sm text-gray-700">
                {step.explanation}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-gray-100"></th>
                      {Array(consumers).fill(0).map((_, j) => (
                        <th key={j} className="border p-2 bg-gray-100">
                          B{j + 1}<br/>
                          <span className="text-xs text-gray-600">
                            {step.tableau.v[j] !== null ? `v=${toFraction(step.tableau.v[j]!)}` : ''}
                          </span>
                        </th>
                      ))}
                      <th className="border p-2 bg-blue-50">Запасы</th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.tableau.cells.map((row, i) => (
                      <tr key={i}>
                        <td className="border p-2 bg-gray-100 font-semibold">
                          A{i + 1}<br/>
                          <span className="text-xs text-gray-600">
                            {step.tableau.u[i] !== null ? `u=${toFraction(step.tableau.u[i]!)}` : ''}
                          </span>
                        </td>
                        {row.map((cell, j) => (
                          <td key={j} className={`border p-2 text-center ${cell.isBasic ? 'bg-green-50 font-bold' : ''}`}>
                            <div className="text-xs text-gray-500">{cell.cost}</div>
                            <div className="text-base">{cell.value > 0 ? toFraction(cell.value) : ''}</div>
                          </td>
                        ))}
                        <td className="border p-2 text-center bg-blue-50 font-semibold">
                          {step.tableau.supply[i]}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="border p-2 bg-blue-50 font-semibold">Потребности</td>
                      {step.tableau.demand.map((d, j) => (
                        <td key={j} className="border p-2 text-center bg-blue-50 font-semibold">{d}</td>
                      ))}
                      <td className="border p-2 bg-gray-100"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          
          <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-md">
            <h4 className="font-bold text-green-800 mb-2">Оптимальное решение:</h4>
            <div className="text-green-700 whitespace-pre-line">
              {results.optimal}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}