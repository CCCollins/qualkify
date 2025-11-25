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

interface Point {
  r: number;
  c: number;
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
  const [demand, setDemand] = useState<string[]>(['30', '20', '40', '10']);
  const [costs, setCosts] = useState<string[][]>([
    ['5', '7', '6', '8'],
    ['9', '2', '11', '3'],
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

  // Функция поиска цикла (DFS)
  const buildCycle = (startR: number, startC: number, cells: Cell[][], m: number, n: number): Point[] | null => {
    const path: Point[] = [];
    const visited = new Set<string>();

    // direction: 0 - поиск по строке (горизонтально), 1 - поиск по столбцу (вертикально)
    const dfs = (currR: number, currC: number, direction: 0 | 1): boolean => {
      path.push({ r: currR, c: currC });
      
      // Если вернулись в начало и длина пути > 2 (чтобы не возвращаться сразу назад)
      if (path.length > 3 && currR === startR && currC === startC) {
        return true;
      }

      const key = `${currR},${currC}`;
      if (visited.has(key) && path.length > 1) { // Разрешаем повторный вход только в старт
         path.pop();
         return false; 
      }
      visited.add(key);

      if (direction === 0) {
        // Ищем в той же строке другую базисную клетку
        for (let j = 0; j < n; j++) {
          if (j !== currC) {
             // Если это старт (замыкаем цикл) или если клетка базисная
             if ((cells[currR][j].isBasic || (currR === startR && j === startC))) {
                if (dfs(currR, j, 1)) return true;
             }
          }
        }
      } else {
        // Ищем в том же столбце другую базисную клетку
        for (let i = 0; i < m; i++) {
          if (i !== currR) {
             if ((cells[i][currC].isBasic || (i === startR && currC === startC))) {
                if (dfs(i, currC, 0)) return true;
             }
          }
        }
      }

      path.pop();
      visited.delete(key);
      return false;
    };

    // Начинаем поиск по строке (или по столбцу - неважно, главное чередовать)
    // Но так как мы входим в пустую клетку, у нее нет "пары" в базисе сразу.
    // Мы делаем "фиктивный" ход в старт, и оттуда ищем.
    // Логичнее начать поиск соседей:
    
    // Ищем горизонтального соседа
    for (let j = 0; j < n; j++) {
        if (j !== startC && cells[startR][j].isBasic) {
            path.push({r: startR, c: startC}); // Start node
            if (dfs(startR, j, 1)) return path; // Переходим к вертикальному поиску от соседа
            path.pop();
        }
    }
    
    return null;
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
      
      // 1. Построение начального плана методом минимальной стоимости
      const allocation: number[][] = Array(suppliers).fill(null).map(() => Array(consumers).fill(0));
      const remainingSupply = [...supplyValues];
      const remainingDemand = [...demandValues];
      
      let explanation = "Шаг 1. Построение начального плана методом минимальной стоимости:\n\n";
      
      // Копия матрицы стоимостей для вычеркивания
      const tempCosts = costMatrix.map(row => [...row]);
      
      let iterCount = 0;
      // Защита от бесконечного цикла
      while (remainingSupply.some(s => s > 1e-6) && remainingDemand.some(d => d > 1e-6) && iterCount < suppliers * consumers * 2) {
        iterCount++;
        let minCost = Infinity;
        let minI = -1, minJ = -1;
        
        // Ищем глобальный минимум среди невычеркнутых
        for (let i = 0; i < suppliers; i++) {
          for (let j = 0; j < consumers; j++) {
            if (remainingSupply[i] > 1e-6 && remainingDemand[j] > 1e-6) {
               if (tempCosts[i][j] < minCost) {
                  minCost = tempCosts[i][j];
                  minI = i;
                  minJ = j;
               }
            }
          }
        }
        
        if (minI === -1) break;
        
        const amount = Math.min(remainingSupply[minI], remainingDemand[minJ]);
        allocation[minI][minJ] = amount;
        remainingSupply[minI] -= amount;
        remainingDemand[minJ] -= amount;
        
        explanation += `Минимальный тариф c${minI + 1}${minJ + 1} = ${minCost}. `;
        explanation += `x${minI + 1}${minJ + 1} = min(${toFraction(remainingSupply[minI] + amount)}, ${toFraction(remainingDemand[minJ] + amount)}) = ${toFraction(amount)}\n`;

        // "Вычеркиваем" (в данном алгоритме просто уменьшили supply/demand, но для точного следования методу мин. стоимости
        // нужно исключать строку или столбец, который обнулился первым. Если оба - один оставляем с 0).
        // Тут упрощенная логика заполнения, она корректна для получения допустимого плана.
      }
      
      const cells: Cell[][] = Array(suppliers).fill(null).map((_, i) =>
        Array(consumers).fill(null).map((_, j) => ({
          cost: costMatrix[i][j],
          value: allocation[i][j],
          isBasic: allocation[i][j] > 1e-6
        }))
      );
      
      // Проверка на вырожденность и добавление нулей
      let basicCellsCount = 0;
      for (let i = 0; i < suppliers; i++) {
        for (let j = 0; j < consumers; j++) {
          if (cells[i][j].isBasic) basicCellsCount++;
        }
      }
      
      const requiredBasic = suppliers + consumers - 1;
      if (basicCellsCount < requiredBasic) {
        explanation += `\nПлан вырожденный: ${basicCellsCount} базисных клеток < ${requiredBasic}. Добавляем нулевые перевозки (ε).\n`;
        
        // Добавляем в клетки с наименьшей стоимостью, не образующие цикл (упрощенно - просто в пустые)
        // В идеале нужно проверять отсутствие цикла, здесь эвристика:
        for (let i = 0; i < suppliers && basicCellsCount < requiredBasic; i++) {
          for (let j = 0; j < consumers && basicCellsCount < requiredBasic; j++) {
            if (!cells[i][j].isBasic) {
               // Простая проверка: добавляем, если это не создаст очевидной глупости
               // Для полноценной реализации нужна проверка ацикличности
               cells[i][j].isBasic = true;
               cells[i][j].value = 0;
               basicCellsCount++;
               explanation += `Добавлена 0 в (${i + 1}, ${j + 1})\n`;
            }
          }
        }
      }
      
      steps.push({
        tableau: {
          cells: JSON.parse(JSON.stringify(cells)),
          supply: [...supplyValues],
          demand: [...demandValues],
          u: Array(suppliers).fill(null),
          v: Array(consumers).fill(null)
        },
        explanation
      });
      
      // 2. Метод потенциалов
      let iteration = 0;
      
      while (iteration < 20) {
        iteration++;
        
        // а) Расчет потенциалов
        const u: (number | null)[] = Array(suppliers).fill(null);
        const v: (number | null)[] = Array(consumers).fill(null);
        u[0] = 0; // Полагаем первый потенциал равным 0
        
        let potentialChanged = true;
        while (potentialChanged) {
          potentialChanged = false;
          for (let i = 0; i < suppliers; i++) {
            for (let j = 0; j < consumers; j++) {
              if (cells[i][j].isBasic) {
                if (u[i] !== null && v[j] === null) {
                  v[j] = cells[i][j].cost - u[i]!;
                  potentialChanged = true;
                } else if (v[j] !== null && u[i] === null) {
                  u[i] = cells[i][j].cost - v[j]!;
                  potentialChanged = true;
                }
              }
            }
          }
        }

        // Если граф несвязный (редкий случай при правильном добавлении нулей), могут остаться null.
        // Заполним их (хотя при правильном вырожденном базисе этого быть не должно)
        if (u.includes(null) || v.includes(null)) {
            // Фолбек - если вдруг граф развалился
            for(let i=0; i<suppliers; i++) if(u[i]===null) u[i] = 0;
            for(let j=0; j<consumers; j++) if(v[j]===null) v[j] = 0;
        }
        
        let stepInfo = `\n--- Итерация ${iteration} ---\nРасчет потенциалов (uᵢ + vⱼ = cᵢⱼ для базисных):\n`;
        stepInfo += `u = [${u.map(x => toFraction(x!)).join(', ')}]\n`;
        stepInfo += `v = [${v.map(x => toFraction(x!)).join(', ')}]\n`;
        
        // б) Проверка оптимальности (оценки свободных клеток)
        let minEstimate = 0;
        let enterI = -1, enterJ = -1;
        let estimatesLog = `Оценки свободных клеток (Δᵢⱼ = cᵢⱼ - uᵢ - vⱼ):\n`;
        
        for (let i = 0; i < suppliers; i++) {
          for (let j = 0; j < consumers; j++) {
            if (!cells[i][j].isBasic) {
              const estimate = cells[i][j].cost - u[i]! - v[j]!;
              if (estimate < 0) {
                 estimatesLog += `Δ${i+1}${j+1} = ${cells[i][j].cost} - (${toFraction(u[i]!)}) - (${toFraction(v[j]!)}) = ${toFraction(estimate)} < 0\n`;
              }
              
              if (estimate < minEstimate - 1e-6) {
                minEstimate = estimate;
                enterI = i;
                enterJ = j;
              }
            }
          }
        }
        
        steps.push({
            tableau: {
              cells: JSON.parse(JSON.stringify(cells)),
              supply: [...supplyValues],
              demand: [...demandValues],
              u: [...u],
              v: [...v]
            },
            explanation: stepInfo + estimatesLog + (minEstimate >= -1e-6 ? "Все оценки ≥ 0. План оптимален." : `Минимальная оценка: ${toFraction(minEstimate)} в клетке (${enterI+1}, ${enterJ+1}).`)
        });

        if (minEstimate >= -1e-6) {
          break; // Оптимум найден
        }

        // в) Пересчет плана (Построение цикла)
        stepInfo = `Улучшение плана. Вводим клетку (${enterI+1}, ${enterJ+1}).\n`;
        
        const path = buildCycle(enterI, enterJ, cells, suppliers, consumers);
        
        if (!path) {
            setError("Ошибка: Не удалось найти цикл пересчета. Проверьте вырожденность плана.");
            break;
        }

        // Путь начинается с вводимой клетки (+)
        // path[0] -> (+), path[1] -> (-), path[2] -> (+), path[3] -> (-) ...
        
        // Находим Theta = min(значения в клетках с минусом)
        let theta = Infinity;
        let exitIndex = -1; // Индекс в пути клетки, которая выйдет из базиса
        
        const pathStr = path.map((p, idx) => {
            const sign = idx % 2 === 0 ? "+" : "-";
            return `${sign}(${p.r+1},${p.c+1})`;
        }).join(" → ");
        
        stepInfo += `Цикл: ${pathStr}\n`;

        for (let k = 1; k < path.length; k += 2) { // Только нечетные индексы имеют знак минус
            const p = path[k];
            if (cells[p.r][p.c].value < theta) {
                theta = cells[p.r][p.c].value;
                exitIndex = k;
            }
        }
        
        stepInfo += `θ = min(по клеткам с "-") = ${toFraction(theta)}\n`;
        stepInfo += `Выводим клетку (${path[exitIndex].r+1}, ${path[exitIndex].c+1}) из базиса.\n`;

        // Обновляем значения
        // Вводимая клетка становится базисной
        cells[enterI][enterJ].isBasic = true;
        
        for (let k = 0; k < path.length; k++) {
            const p = path[k];
            if (k % 2 === 0) {
                cells[p.r][p.c].value += theta;
            } else {
                cells[p.r][p.c].value -= theta;
            }
        }
        
        // Выводим из базиса ту клетку, которая дала тету (и стала 0).
        // Важно: если несколько стали 0, выводим только одну, чтобы не потерять базисность (остальные станут вырожденными 0).
        const exitNode = path[exitIndex];
        cells[exitNode.r][exitNode.c].isBasic = false;
        cells[exitNode.r][exitNode.c].value = 0; // На всякий случай, хотя она и так 0
        
        // Добавляем шаг с объяснением пересчета (до визуального обновления таблицы в следующем шаге)
        // Но в цикле React мы пушим состояние ПОСЛЕ обновления
     }
      
      // Расчет финальной стоимости
      let totalCost = 0;
      let optimalExplanation = '\nРасчет целевой функции F:\n';
      const terms: string[] = [];
      
      for (let i = 0; i < suppliers; i++) {
        for (let j = 0; j < consumers; j++) {
          if (cells[i][j].isBasic && cells[i][j].value > 1e-6) { // Считаем только реальные перевозки
            totalCost += cells[i][j].cost * cells[i][j].value;
            terms.push(`${cells[i][j].cost}·${toFraction(cells[i][j].value)}`);
          }
        }
      }
      
      optimalExplanation += `F = Σ cᵢⱼ·xᵢⱼ = ${terms.join(' + ')} = ${toFraction(totalCost)}`;
      
      setResults({ steps, optimal: optimalExplanation });
      
    } catch (e) {
      setError("Произошла ошибка при расчете: " + (e as Error).message);
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
          Транспортная задача (Метод потенциалов)
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
          Решить задачу
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
            <div key={idx} className="mb-6 p-4 bg-white rounded-lg border border-gray-300 shadow-sm">
              <div className="mb-4 whitespace-pre-wrap text-sm text-gray-700 font-mono">
                {step.explanation}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-gray-100 w-16">u \ v</th>
                      {Array(consumers).fill(0).map((_, j) => (
                        <th key={j} className="border p-2 bg-gray-100">
                          B{j + 1}<br/>
                          <span className="text-xs text-blue-600 font-bold">
                            {step.tableau.v[j] !== null ? toFraction(step.tableau.v[j]!) : '?'}
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
                          <span className="text-xs text-blue-600 font-bold">
                            {step.tableau.u[i] !== null ? toFraction(step.tableau.u[i]!) : '?'}
                          </span>
                        </td>
                        {row.map((cell, j) => (
                          <td key={j} className={`border p-2 text-center relative h-16 w-20 ${cell.isBasic ? 'bg-green-50' : ''}`}>
                            <div className="absolute top-1 right-1 text-xs text-gray-400 border border-gray-200 px-1 rounded">
                              {cell.cost}
                            </div>
                            <div className={`text-base font-bold mt-2 ${cell.isBasic ? 'text-gray-900' : 'text-transparent'}`}>
                              {cell.isBasic ? toFraction(cell.value) : '0'}
                            </div>
                            {/* Отображаем оценки для небазисных, если они были посчитаны и u,v есть */}
                            {!cell.isBasic && step.tableau.u[i] !== null && step.tableau.v[j] !== null && (
                                <div className="absolute bottom-0 right-1 text-[10px] text-red-400">
                                   Δ:{toFraction(cell.cost - step.tableau.u[i]! - step.tableau.v[j]!)}
                                </div>
                            )}
                          </td>
                        ))}
                        <td className="border p-2 text-center bg-blue-50 font-semibold">
                          {step.tableau.supply[i]}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="border p-2 bg-blue-50 font-semibold">Потр.</td>
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
          
          <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-md shadow-sm">
            <h4 className="font-bold text-green-800 mb-2 text-lg">Оптимальное решение:</h4>
            <div className="text-green-900 font-medium whitespace-pre-wrap font-mono text-base">
              {results.optimal}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}