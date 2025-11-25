"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbMathFunction } from 'react-icons/tb';

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
  totalCost: number;
}

interface IterationLog {
  type: 'initial' | 'optimization' | 'final';
  tableau: Tableau;
  explanation: string;
  entering?: { r: number, c: number, estimate: number };
  leaving?: { r: number, c: number, val: number };
  cycle?: string;
  theta?: number;
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

// Функция для отображения значений (0 как ε если базисная)
const formatValue = (value: number, isBasic: boolean) => {
  if (!isBasic) return "";
  if (value < 1e-6) return "ε";
  return toFraction(value);
};

export default function TransportProblemPage() {
  // Данные по умолчанию как в Задаче 1 с фото
  const [suppliers, setSuppliers] = useState(3);
  const [consumers, setConsumers] = useState(4);
  const [supply, setSupply] = useState<string[]>(['20', '50', '30']);
  const [demand, setDemand] = useState<string[]>(['30', '20', '40', '10']);
  const [costs, setCosts] = useState<string[][]>([
    ['5', '7', '6', '8'],
    ['9', '2', '11', '3'],
    ['10', '3', '2', '4']
  ]);
  
  const [logs, setLogs] = useState<IterationLog[] | null>(null);
  const [economy, setEconomy] = useState<{start: number, end: number, percent: string} | null>(null);
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

  // Поиск цикла (DFS)
  const buildCycle = (startR: number, startC: number, cells: Cell[][], m: number, n: number): Point[] | null => {
    const path: Point[] = [];
    const visited = new Set<string>();

    const dfs = (currR: number, currC: number, direction: 0 | 1): boolean => {
      path.push({ r: currR, c: currC });
      
      if (path.length >= 4 && currR === startR && currC === startC) {
        return true;
      }

      const key = `${currR},${currC}`;
      if (visited.has(key) && path.length > 1) {
         path.pop();
         return false; 
      }
      visited.add(key);

      if (direction === 0) { // Ищем горизонтально
        for (let j = 0; j < n; j++) {
          if (j !== currC) {
             if (cells[currR][j].isBasic || (currR === startR && j === startC)) {
                if (dfs(currR, j, 1)) return true;
             }
          }
        }
      } else { // Ищем вертикально
        for (let i = 0; i < m; i++) {
          if (i !== currR) {
             if (cells[i][currC].isBasic || (i === startR && currC === startC)) {
                if (dfs(i, currC, 0)) return true;
             }
          }
        }
      }

      path.pop();
      visited.delete(key);
      return false;
    };
    
    // Старт: ищем соседа по строке (чтобы образовать угол)
    path.push({ r: startR, c: startC });
    visited.add(`${startR},${startC}`);
    
    for (let j = 0; j < n; j++) {
        if (j !== startC && cells[startR][j].isBasic) {
            if (dfs(startR, j, 1)) return path;
        }
    }
    
    // Если не вышло, пробуем по столбцу
    visited.delete(`${startR},${startC}`);
    path.pop(); 
    path.push({ r: startR, c: startC });
    visited.add(`${startR},${startC}`);

    for (let i = 0; i < m; i++) {
        if (i !== startR && cells[i][startC].isBasic) {
            if (dfs(i, startC, 0)) return path;
        }
    }
    
    return null;
  };

  const calculateTotalCost = (cells: Cell[][], m: number, n: number) => {
      let sum = 0;
      for(let i=0; i<m; i++)
          for(let j=0; j<n; j++)
              if(cells[i][j].isBasic) sum += cells[i][j].value * cells[i][j].cost;
      return sum;
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
        setError(`Задача не сбалансирована: Σa = ${totalSupply}, Σb = ${totalDemand}.`);
        return;
      }
      
      const logsData: IterationLog[] = [];
      
      // 1. Построение начального плана (Метод минимальной стоимости)
      const allocation: number[][] = Array(suppliers).fill(null).map(() => Array(consumers).fill(0));
      const remSupply = [...supplyValues];
      const remDemand = [...demandValues];
      const rowDone = Array(suppliers).fill(false);
      const colDone = Array(consumers).fill(false);
      
      let filledCount = 0;
      const totalCellsNeeded = suppliers + consumers - 1;
      let initExpl = "Метод минимальной стоимости (Initial Solution):\n";

      while (filledCount < totalCellsNeeded) {
        let minCost = Infinity;
        let minI = -1, minJ = -1;
        
        for (let i = 0; i < suppliers; i++) {
          if (rowDone[i]) continue;
          for (let j = 0; j < consumers; j++) {
            if (colDone[j]) continue;
            if (costMatrix[i][j] < minCost) {
              minCost = costMatrix[i][j];
              minI = i;
              minJ = j;
            }
          }
        }
        
        if (minI === -1) break;
        
        const amount = Math.min(remSupply[minI], remDemand[minJ]);
        allocation[minI][minJ] = amount;
        remSupply[minI] -= amount;
        remDemand[minJ] -= amount;
        filledCount++;

        // Логика вычеркивания для сохранения базисности
        if (remSupply[minI] < 1e-6 && remDemand[minJ] > 1e-6) {
            rowDone[minI] = true;
        } else if (remSupply[minI] > 1e-6 && remDemand[minJ] < 1e-6) {
            colDone[minJ] = true;
        } else {
            const remainingRows = rowDone.filter(x => !x).length;
            const remainingCols = colDone.filter(x => !x).length;
            if (remainingRows === 1 && remainingCols === 1) {
                rowDone[minI] = true;
                colDone[minJ] = true;
            } else {
                rowDone[minI] = true; // Оставляем столбец активным (будет 0)
            }
        }
      }
      
      const cells: Cell[][] = Array(suppliers).fill(null).map((_, i) =>
        Array(consumers).fill(null).map((_, j) => ({
          cost: costMatrix[i][j],
          value: allocation[i][j],
          isBasic: false 
        }))
      );

      // Восстанавливаем isBasic на основе алгоритма
      let basicCount = 0;
      // Простой подход: все > 0 базисные. Если не хватает, добавляем 0.
      for(let i=0; i<suppliers; i++) for(let j=0; j<consumers; j++) {
          if(cells[i][j].value > 1e-6) { cells[i][j].isBasic = true; basicCount++; }
      }
      
      // Добиваем вырожденность
      while(basicCount < totalCellsNeeded) {
           // Эвристика: добавить в min cost без цикла
           let bestI = -1, bestJ = -1, bestC = Infinity;
           for(let i=0; i<suppliers; i++) for(let j=0; j<consumers; j++) {
               if(!cells[i][j].isBasic && cells[i][j].cost < bestC) {
                   bestC = cells[i][j].cost; bestI=i; bestJ=j;
               }
           }
           if(bestI!==-1) {
               cells[bestI][bestJ].isBasic = true;
               cells[bestI][bestJ].value = 0;
               basicCount++;
               initExpl += `Добавлена базисная ε в (${bestI+1},${bestJ+1})\n`;
           } else break;
      }

      const initialCost = calculateTotalCost(cells, suppliers, consumers);

      // 2. Метод потенциалов
      let iteration = 0;
      let optimalFound = false;
      
      while (iteration < 20 && !optimalFound) {
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
              if (cells[i][j].isBasic) {
                if (u[i] !== null && v[j] === null) {
                  v[j] = cells[i][j].cost - u[i]!;
                  changed = true;
                } else if (v[j] !== null && u[i] === null) {
                  u[i] = cells[i][j].cost - v[j]!;
                  changed = true;
                }
              }
            }
          }
        }
        // Заглушка для несвязных графов
        for(let k=0; k<suppliers; k++) if(u[k]===null) u[k]=0;
        for(let k=0; k<consumers; k++) if(v[k]===null) v[k]=0;

        // Расчет оценок
        let minEstimate = 0;
        let enterI = -1, enterJ = -1;
        let estimatesLog = ""; // теперь используется и модифицируется
        
        for (let i = 0; i < suppliers; i++) {
          for (let j = 0; j < consumers; j++) {
            if (!cells[i][j].isBasic) {
              const est = cells[i][j].cost - u[i]! - v[j]!;
              // собираем поясняющий лог для вывода
              estimatesLog += `p${i + 1}${j + 1} = ${cells[i][j].cost} - ${toFraction(u[i]!)} - ${toFraction(v[j]!)} = ${toFraction(est)}\n`;
              if (est < minEstimate - 1e-6) {
                minEstimate = est;
                enterI = i;
                enterJ = j;
                estimatesLog += "  ← минимальная\n";
              }
            }
          }
        }

        const currentCost = calculateTotalCost(cells, suppliers, consumers);
        
        const logEntry: IterationLog = {
            type: iteration === 1 ? 'initial' : 'optimization',
            tableau: {
                cells: JSON.parse(JSON.stringify(cells)),
                supply: [...supplyValues],
                demand: [...demandValues],
                u: [...u],
                v: [...v],
                totalCost: currentCost
            },
            explanation: iteration === 1
              ? `${initExpl}Начальный план (F = ${currentCost}).\nПроверка оптимальности.\n\n${estimatesLog}`
              : `Итерация ${iteration-1}. F = ${currentCost}.\n\n${estimatesLog}`
        };

        if (minEstimate >= -1e-6) {
            logEntry.explanation += "\nВсе оценки Δij ≥ 0. План оптимален!";
            logEntry.type = 'final';
            logsData.push(logEntry);
            optimalFound = true;
            break;
        }

        // Подготовка к пересчету
        logEntry.entering = { r: enterI, c: enterJ, estimate: minEstimate };
        logEntry.explanation += `\nВводим клетку (${enterI+1}, ${enterJ+1}) с оценкой Δ = ${toFraction(minEstimate)}.`;
        
        const path = buildCycle(enterI, enterJ, cells, suppliers, consumers);
        if (path) {
            let theta = Infinity;
            let exitIndex = -1;
            
            // Находим theta (по нечетным индексам пути: -, +, -, +)
            // path: Start(+), A(-), B(+), C(-), Start
            for (let k = 1; k < path.length - 1; k += 2) {
                const p = path[k];
                if (cells[p.r][p.c].value < theta) {
                    theta = cells[p.r][p.c].value;
                    exitIndex = k;
                }
            }
            
            logEntry.cycle = path.map(p => `(${p.r+1},${p.c+1})`).join(' → ');
            logEntry.theta = theta;
            logEntry.leaving = { r: path[exitIndex].r, c: path[exitIndex].c, val: theta };
            
            logsData.push(logEntry); // Сохраняем состояние ДО изменения

            // Применяем изменения для СЛЕДУЮЩЕЙ итерации
            cells[enterI][enterJ].isBasic = true;
            for (let k = 0; k < path.length - 1; k++) {
                const p = path[k];
                if (k % 2 === 0) cells[p.r][p.c].value += theta;
                else cells[p.r][p.c].value -= theta;
            }
            const exitNode = path[exitIndex];
            cells[exitNode.r][exitNode.c].isBasic = false;
            cells[exitNode.r][exitNode.c].value = 0;
        } else {
             // Ошибка цикла
             logsData.push(logEntry);
             break;
        }
      }

      setLogs(logsData);
      
      // Расчет экономии
      const finalCost = logsData[logsData.length-1].tableau.totalCost;
      const percent = initialCost > 0 ? ((initialCost - finalCost) / initialCost * 100).toFixed(2) : "0";
      setEconomy({ start: initialCost, end: finalCost, percent });
      
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center text-gray-800">
          Транспортная задача (Метод потенциалов)
        </h1>
      </div>

      {/* Ввод данных */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
            <TbMathFunction className="mr-2"/> Параметры
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Поставщики (m)</label>
            <input type="number" min="2" max="10" value={suppliers} onChange={(e) => handleSupplierChange(parseInt(e.target.value)||2)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Потребители (n)</label>
            <input type="number" min="2" max="10" value={consumers} onChange={(e) => handleConsumerChange(parseInt(e.target.value)||2)} className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Запасы поставщиков (a)</label>
          <div className="flex flex-wrap gap-2">
            {supply.map((s, i) => (
              <input key={i} type="number" value={s} onChange={(e) => {const n=[...supply]; n[i]=e.target.value; setSupply(n);}} className="w-20 p-2 border border-gray-300 rounded-md text-center" placeholder={`a${i+1}`} />
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Потребности (b)</label>
          <div className="flex flex-wrap gap-2">
            {demand.map((d, i) => (
              <input key={i} type="number" value={d} onChange={(e) => {const n=[...demand]; n[i]=e.target.value; setDemand(n);}} className="w-20 p-2 border border-gray-300 rounded-md text-center" placeholder={`b${i+1}`} />
            ))}
          </div>
        </div>

        <div className="mb-6 overflow-x-auto">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Тарифы (C)</label>
            <table className="border-collapse">
              <tbody>
                {costs.map((row, i) => (
                  <tr key={i}>
                    <td className="pr-4 py-2 font-bold text-gray-600">A{i+1}</td>
                    {row.map((c, j) => (
                      <td key={j} className="p-1">
                        <input type="number" value={c} onChange={(e) => {const n=costs.map(r=>[...r]); n[i][j]=e.target.value; setCosts(n);}} className="w-16 p-2 text-center border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        <button onClick={calculate} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 transition-all shadow-md active:transform active:scale-95">
          Рассчитать решение
        </button>
      </div>

      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow">{error}</div>}

      {/* Вывод решения */}
      {logs && logs.map((log, stepIdx) => (
        <div key={stepIdx} className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
          <div className={`p-4 border-b ${log.type === 'final' ? 'bg-green-50' : 'bg-gray-50'} flex justify-between items-center`}>
            <h3 className="font-bold text-lg text-gray-800">
                {log.type === 'initial' ? "1. Начальный опорный план" : log.type === 'final' ? "Оптимальный план" : `${stepIdx + 1}. Улучшение плана`}
            </h3>
            <span className="bg-white px-3 py-1 rounded-full border text-sm font-mono font-bold shadow-sm">
                F = {log.tableau.totalCost}
            </span>
          </div>
          
          <div className="p-6 overflow-x-auto">
            <div className="inline-block min-w-full">
                {/* Сетка таблицы */}
                <div className="grid" style={{ gridTemplateColumns: `auto repeat(${consumers}, minmax(80px, 1fr)) auto` }}>
                    
                    {/* Header Row: V potentials */}
                    <div className="p-2"></div>
                    {log.tableau.v.map((val, j) => (
                        <div key={j} className="p-2 text-center font-mono text-sm text-blue-600 font-bold border-b-2 border-blue-100 bg-gray-50">
                            v{j+1}={val !== null ? toFraction(val) : '?'}
                        </div>
                    ))}
                    <div className="p-2 font-bold text-center text-gray-500">Запас</div>

                    {/* Rows */}
                    {log.tableau.cells.map((row, i) => (
                        <React.Fragment key={i}>
                            {/* U potential */}
                            <div className="p-2 flex items-center justify-end font-mono text-sm text-blue-600 font-bold border-r-2 border-blue-100 bg-gray-50 pr-4">
                                u{i+1}={log.tableau.u[i] !== null ? toFraction(log.tableau.u[i]!) : '?'}
                            </div>

                            {/* Cells */}
                            {row.map((cell, j) => {
                                const u = log.tableau.u[i] || 0;
                                const v = log.tableau.v[j] || 0;
                                const delta = cell.cost - u - v;
                                const isEntering = log.entering?.r === i && log.entering?.c === j;
                                const isLeaving = log.leaving?.r === i && log.leaving?.c === j;
                                
                                return (
                                    <div key={j} className={`
                                        relative h-20 border border-gray-300 p-1 transition-colors
                                        ${cell.isBasic ? 'bg-green-50 ring-inset ring-2 ring-green-100' : 'bg-white'}
                                        ${isEntering ? 'bg-yellow-50 ring-2 ring-yellow-400 z-10' : ''}
                                        ${isLeaving ? 'opacity-70 bg-red-50' : ''}
                                    `}>
                                        {/* Cost (Top Right) */}
                                        <div className="absolute top-1 right-1 border border-gray-400 px-1 text-xs text-gray-500 bg-white min-w-[20px] text-center">
                                            {cell.cost}
                                        </div>

                                        {/* Value (Center) */}
                                        <div className="flex items-center justify-center h-full">
                                            <span className={`text-xl font-bold ${cell.isBasic ? 'text-gray-900' : 'text-transparent'}`}>
                                                {formatValue(cell.value, cell.isBasic)}
                                            </span>
                                        </div>

                                        {/* Delta (Bottom Right for non-basic) */}
                                        {!cell.isBasic && log.type !== 'final' && (
                                            <div className={`absolute bottom-1 right-1 text-xs font-bold ${delta < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {delta < 0 ? `Δ=${toFraction(delta)}` : ''}
                                            </div>
                                        )}
                                        
                                        {/* Cycle arrows visual cue could go here */}
                                    </div>
                                );
                            })}

                            {/* Supply */}
                            <div className="p-2 flex items-center justify-center font-bold text-gray-500 border-l border-gray-200">
                                {log.tableau.supply[i]}
                            </div>
                        </React.Fragment>
                    ))}

                    {/* Demand Row */}
                    <div className="p-2 font-bold text-right text-gray-500 pr-4">Потр.</div>
                    {log.tableau.demand.map((d, j) => (
                        <div key={j} className="p-2 text-center font-bold text-gray-500 border-t border-gray-200">{d}</div>
                    ))}
                    <div></div>

                </div>
            </div>

            {/* Explanation Footer */}
            <div className="mt-4 text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200">
                <p className="whitespace-pre-wrap font-medium">{log.explanation}</p>
                {log.cycle && (
                    <div className="mt-2 pl-3 border-l-4 border-blue-400">
                        <p>Цикл пересчета: <span className="font-mono text-blue-700">{log.cycle}</span></p>
                        <p>Величина сдвига: <span className="font-bold">θ = {log.theta}</span> (выходит клетка с {log.leaving?.val})</p>
                    </div>
                )}
            </div>
          </div>
        </div>
      ))}

      {/* Блок Экономии */}
      {economy && (
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-green-200 mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Результаты оптимизации</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                    <div className="text-gray-500 text-sm uppercase tracking-wide">Начальные затраты</div>
                    <div className="text-2xl font-mono font-bold text-gray-700">{economy.start}</div>
                </div>
                <div>
                    <div className="text-green-600 text-sm uppercase tracking-wide font-bold">Оптимальные затраты</div>
                    <div className="text-3xl font-mono font-bold text-green-600">{economy.end}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-2">
                    <div className="text-gray-500 text-sm uppercase tracking-wide">Экономия (Э)</div>
                    <div className="text-2xl font-bold text-green-700">
                        {economy.percent}%
                    </div>
                    <div className="text-xs text-gray-400 mt-1 font-mono">
                        ({economy.start} - {economy.end}) / {economy.start} * 100
                    </div>
                </div>
            </div>
        </div>
      )}
    </main>
  );
}