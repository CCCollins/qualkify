"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbMathFunction, TbArrowRight } from 'react-icons/tb';

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
  costFormula: string;
}

interface IterationLog {
  stepNumber: number;
  isOptimal: boolean;
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

// Утилиты
const toFraction = (decimal: number): string => {
  if (Math.abs(decimal) < 1e-6) return "0";
  const sign = decimal < 0 ? "-" : "";
  decimal = Math.abs(decimal);
  if (Math.abs(decimal - Math.round(decimal)) < 1e-6) {
    return sign + Math.round(decimal).toString();
  }
  return sign + decimal.toFixed(2); // Компактнее, макс 2 знака
};

const formatValue = (value: number, isBasic: boolean) => {
  if (!isBasic) return "";
  if (value < 1e-6) return "ε";
  return toFraction(value);
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
  
  const [logs, setLogs] = useState<IterationLog[] | null>(null);
  const [economy, setEconomy] = useState<{start: number, end: number, percent: string} | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Хендлеры ---
  const handleSupplierChange = (newCount: number) => {
    setSuppliers(newCount);
    setSupply(prev => Array(newCount).fill('').map((_, i) => prev[i] || '0'));
    setCosts(prev => Array(newCount).fill(null).map((_, i) => prev[i] ? [...prev[i]] : Array(consumers).fill('0')));
  };

  const handleConsumerChange = (newCount: number) => {
    setConsumers(newCount);
    setDemand(prev => Array(newCount).fill('').map((_, i) => prev[i] || '0'));
    setCosts(prev => prev.map(row => Array(newCount).fill('').map((_, i) => row[i] || '0')));
  };

  // --- Логика ---
  
  // Генерация строки формулы: 5*20 + ... = Sum
  const generateCostData = (cells: Cell[][]) => {
      let sum = 0;
      const terms: string[] = [];
      cells.forEach(row => row.forEach(c => {
          if (c.isBasic && c.value > 1e-6) {
              sum += c.value * c.cost;
              terms.push(`${c.cost}·${toFraction(c.value)}`);
          }
      }));
      return { total: sum, formula: terms.join(' + ') + ` = ${toFraction(sum)}` };
  };

  const buildCycle = (startR: number, startC: number, cells: Cell[][], m: number, n: number): Point[] | null => {
    const path: Point[] = [];
    const visited = new Set<string>();

    const dfs = (currR: number, currC: number, direction: 0 | 1): boolean => {
      path.push({ r: currR, c: currC });
      if (path.length >= 4 && currR === startR && currC === startC) return true;

      const key = `${currR},${currC}`;
      if (visited.has(key) && path.length > 1) { path.pop(); return false; }
      visited.add(key);

      if (direction === 0) { // Горизонтально
        for (let j = 0; j < n; j++) {
          if (j !== currC && (cells[currR][j].isBasic || (currR === startR && j === startC))) {
             if (dfs(currR, j, 1)) return true;
          }
        }
      } else { // Вертикально
        for (let i = 0; i < m; i++) {
          if (i !== currR && (cells[i][currC].isBasic || (i === startR && currC === startC))) {
             if (dfs(i, currC, 0)) return true;
          }
        }
      }
      path.pop(); visited.delete(key); return false;
    };
    
    path.push({ r: startR, c: startC });
    visited.add(`${startR},${startC}`);
    
    // Старт по строке
    for (let j = 0; j < n; j++) {
        if (j !== startC && cells[startR][j].isBasic) {
            if (dfs(startR, j, 1)) return path;
        }
    }
    // Если не вышло, по столбцу
    visited.delete(`${startR},${startC}`); path.pop(); 
    path.push({ r: startR, c: startC }); visited.add(`${startR},${startC}`);

    for (let i = 0; i < m; i++) {
        if (i !== startR && cells[i][startC].isBasic) {
            if (dfs(i, startC, 0)) return path;
        }
    }
    return null;
  };

  const calculate = () => {
    try {
      setError(null);
      const supplyVals = supply.map(s => parseFloat(s) || 0);
      const demandVals = demand.map(d => parseFloat(d) || 0);
      const costMtx = costs.map(row => row.map(c => parseFloat(c) || 0));
      
      const sumS = supplyVals.reduce((a, b) => a + b, 0);
      const sumD = demandVals.reduce((a, b) => a + b, 0);
      
      if (Math.abs(sumS - sumD) > 1e-6) {
        setError(`Дисбаланс: Σa=${sumS} ≠ Σb=${sumD}`);
        return;
      }
      
      const logsData: IterationLog[] = [];
      
      // 1. Начальный план (Мимнимальной стоимости)
      const allocation = Array(suppliers).fill(null).map(() => Array(consumers).fill(0));
      const remS = [...supplyVals];
      const remD = [...demandVals];
      const rowDone = Array(suppliers).fill(false);
      const colDone = Array(consumers).fill(false);
      let filled = 0;
      
      while (filled < suppliers + consumers - 1) {
        let minC = Infinity, minI = -1, minJ = -1;
        for (let i = 0; i < suppliers; i++) {
          if (rowDone[i]) continue;
          for (let j = 0; j < consumers; j++) {
            if (colDone[j]) continue;
            if (costMtx[i][j] < minC) { minC = costMtx[i][j]; minI = i; minJ = j; }
          }
        }
        if (minI === -1) break;
        
        const amt = Math.min(remS[minI], remD[minJ]);
        allocation[minI][minJ] = amt;
        remS[minI] -= amt; remD[minJ] -= amt;
        filled++;

        if (remS[minI] < 1e-6 && remD[minJ] > 1e-6) rowDone[minI] = true;
        else if (remS[minI] > 1e-6 && remD[minJ] < 1e-6) colDone[minJ] = true;
        else {
            if (rowDone.filter(x => !x).length === 1 && colDone.filter(x => !x).length === 1) {
                rowDone[minI] = true; colDone[minJ] = true;
            } else {
                rowDone[minI] = true; 
            }
        }
      }
      
      const cells: Cell[][] = costMtx.map((row, i) => row.map((cost, j) => ({
          cost, value: allocation[i][j], isBasic: false
      })));

      // Восстановление базиса + устранение вырожденности
      let basicCnt = 0;
      cells.forEach(row => row.forEach(c => { if(c.value > 1e-6) { c.isBasic = true; basicCnt++; }}));
      
      while(basicCnt < suppliers + consumers - 1) {
           let bestI = -1, bestJ = -1, bestC = Infinity;
           for(let i=0; i<suppliers; i++) for(let j=0; j<consumers; j++) {
               if(!cells[i][j].isBasic && cells[i][j].cost < bestC) {
                   bestC = cells[i][j].cost; bestI=i; bestJ=j;
               }
           }
           if(bestI!==-1) {
               cells[bestI][bestJ].isBasic = true; cells[bestI][bestJ].value = 0; basicCnt++;
           } else break;
      }

      // Цикл оптимизации
      let iter = 0;
      let optimal = false;

      while (iter < 20 && !optimal) {
        iter++;
        
        // Потенциалы
        const u = Array(suppliers).fill(null) as (number|null)[];
        const v = Array(consumers).fill(null) as (number|null)[];
        u[0] = 0;
        let changed = true;
        while(changed) {
            changed = false;
            for(let i=0; i<suppliers; i++) for(let j=0; j<consumers; j++) {
                if(cells[i][j].isBasic) {
                    if(u[i]!==null && v[j]===null) { v[j] = cells[i][j].cost - u[i]!; changed=true; }
                    else if(v[j]!==null && u[i]===null) { u[i] = cells[i][j].cost - v[j]!; changed=true; }
                }
            }
        }
        for(let k=0; k<suppliers; k++) if(u[k]===null) u[k]=0;
        for(let k=0; k<consumers; k++) if(v[k]===null) v[k]=0;

        // Оценки
        let minEst = 0, enterI = -1, enterJ = -1;
        let estimatesTxt = "";
        for(let i=0; i<suppliers; i++) for(let j=0; j<consumers; j++) {
            if(!cells[i][j].isBasic) {
                const est = cells[i][j].cost - u[i]! - v[j]!;
                if(est < 0) estimatesTxt += `Δ${i+1}${j+1}=${toFraction(est)} `;
                if(est < minEst - 1e-6) { minEst = est; enterI = i; enterJ = j; }
            }
        }

        const costInfo = generateCostData(cells);

        // Формируем лог ТЕКУЩЕГО состояния
        const currentLog: IterationLog = {
            stepNumber: iter,
            isOptimal: false,
            tableau: {
                cells: JSON.parse(JSON.stringify(cells)),
                supply: [...supplyVals], demand: [...demandVals],
                u: [...u], v: [...v],
                totalCost: costInfo.total,
                costFormula: costInfo.formula
            },
            explanation: iter === 1 ? "Начальный опорный план." : `Оценки: ${estimatesTxt || "нет отрицательных"}`
        };

        if (minEst >= -1e-6) {
            currentLog.isOptimal = true;
            currentLog.explanation = "Все оценки Δ ≥ 0. План оптимален.";
            logsData.push(currentLog);
            optimal = true;
            break;
        }

        // Если не оптимален, рассчитываем цикл и добавляем инфо в лог
        currentLog.entering = { r: enterI, c: enterJ, estimate: minEst };
        
        const path = buildCycle(enterI, enterJ, cells, suppliers, consumers);
        if (!path) { setError("Ошибка построения цикла"); break; }

        let theta = Infinity;
        let exitIdx = -1;
        
        // Путь: Start(+), A(-), B(+), C(-), Start(+)
        for (let k = 1; k < path.length - 1; k += 2) {
            const p = path[k];
            if (cells[p.r][p.c].value < theta) {
                theta = cells[p.r][p.c].value;
                exitIdx = k;
            }
        }
        
        currentLog.cycle = path.map(p => `(${p.r+1},${p.c+1})`).join('→');
        currentLog.theta = theta;
        currentLog.leaving = { r: path[exitIdx].r, c: path[exitIdx].c, val: theta };
        
        logsData.push(currentLog); // Сохраняем шаг ПЕРЕД изменением

        // Применяем изменения для следующей итерации
        cells[enterI][enterJ].isBasic = true;
        for (let k = 0; k < path.length - 1; k++) {
            const p = path[k];
            if (k % 2 === 0) cells[p.r][p.c].value += theta;
            else cells[p.r][p.c].value -= theta;
        }
        const ex = path[exitIdx];
        cells[ex.r][ex.c].isBasic = false; 
        cells[ex.r][ex.c].value = 0;
      }

      setLogs(logsData);
      
      // Экономия
      const startCost = logsData[0].tableau.totalCost;
      const endCost = logsData[logsData.length-1].tableau.totalCost;
      const pct = startCost > 0 ? ((startCost - endCost) / startCost * 100).toFixed(2) : "0";
      setEconomy({ start: startCost, end: endCost, percent: pct });

    } catch (e) { setError((e as Error).message); }
  };

  return (
    <main className="max-w-5xl mx-auto px-2 py-4 space-y-4 bg-gray-50 min-h-screen text-sm md:text-base">
      <div className="flex justify-between items-center px-2">
        <Link href="/" className="text-blue-600">
          <TbSmartHome className="text-2xl" />
        </Link>
        <h1 className="text-lg md:text-2xl font-bold text-center text-gray-800">
          Транспортная задача
        </h1>
        <div className="w-6"></div>
      </div>

      {/* Ввод */}
      <div className="bg-white p-3 md:p-5 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-3">
             <h2 className="font-bold text-gray-700 flex items-center gap-2"><TbMathFunction/> Условия</h2>
             <button onClick={calculate} className="bg-blue-600 text-white font-bold py-1 px-4 rounded text-sm shadow hover:bg-blue-700">
                Решить
            </button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-gray-500">Поставщики (m)</label>
            <input type="number" min="2" max="8" value={suppliers} onChange={(e)=>handleSupplierChange(+e.target.value||2)} className="w-full p-1 border rounded text-center" />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500">Потребители (n)</label>
            <input type="number" min="2" max="8" value={consumers} onChange={(e)=>handleConsumerChange(+e.target.value||2)} className="w-full p-1 border rounded text-center" />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Запасы (a)</label>
            <div className="flex flex-wrap gap-1">
              {supply.map((s, i) => (
                <input key={i} type="number" value={s} onChange={(e)=>{const n=[...supply]; n[i]=e.target.value; setSupply(n)}} className="w-12 p-1 border rounded text-center text-xs" placeholder={`a${i+1}`} />
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Потребности (b)</label>
            <div className="flex flex-wrap gap-1">
              {demand.map((d, i) => (
                <input key={i} type="number" value={d} onChange={(e)=>{const n=[...demand]; n[i]=e.target.value; setDemand(n)}} className="w-12 p-1 border rounded text-center text-xs" placeholder={`b${i+1}`} />
              ))}
            </div>
          </div>
          
          <div className="overflow-x-auto pb-2">
            <label className="text-xs font-bold text-gray-500 block mb-1">Тарифы (C)</label>
            <table className="border-collapse w-full min-w-[300px]">
              <tbody>
                {costs.map((row, i) => (
                  <tr key={i}>
                    <td className="pr-2 py-1 font-bold text-gray-500 text-xs w-8">A{i+1}</td>
                    {row.map((c, j) => (
                      <td key={j} className="p-0.5">
                        <input type="number" value={c} onChange={(e)=>{const n=costs.map(r=>[...r]); n[i][j]=e.target.value; setCosts(n)}} className="w-full min-w-[40px] p-1 text-center border rounded text-xs" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded text-sm">{error}</div>}

      {/* Вывод шагов */}
      {logs && logs.map((log, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Заголовок шага */}
          <div className={`px-3 py-2 border-b flex flex-col md:flex-row md:justify-between md:items-center ${log.isOptimal ? 'bg-green-50' : 'bg-gray-50'}`}>
            <span className="font-bold text-gray-800 text-sm">
                {idx + 1}. {log.isOptimal ? "Оптимальный план" : "Опорный план"}
            </span>
            <div className="text-xs font-mono bg-white px-2 py-1 rounded border mt-1 md:mt-0 overflow-x-auto whitespace-nowrap max-w-full">
               F = {log.tableau.costFormula}
            </div>
          </div>
          
          <div className="p-3">
            {/* Контейнер таблицы с прокруткой */}
            <div className="overflow-x-auto">
                <div className="grid min-w-max border-t border-l border-gray-200" 
                     style={{ gridTemplateColumns: `auto repeat(${consumers}, minmax(60px, 1fr)) auto` }}>
                    
                    {/* Header V */}
                    <div className="bg-gray-50 border-r border-b p-1"></div>
                    {log.tableau.v.map((val, j) => (
                        <div key={j} className="bg-gray-50 border-r border-b p-1 text-center text-xs font-bold text-blue-600">
                            v{j+1}={val ?? '?'}
                        </div>
                    ))}
                    <div className="bg-gray-100 border-r border-b p-1 text-center text-xs font-bold text-gray-500">Зап.</div>

                    {/* Rows */}
                    {log.tableau.cells.map((row, i) => (
                        <React.Fragment key={i}>
                            {/* Header U */}
                            <div className="bg-gray-50 border-r border-b p-1 flex items-center justify-center text-xs font-bold text-blue-600">
                                u{i+1}={log.tableau.u[i] ?? '?'}
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
                                        relative h-12 md:h-16 border-r border-b flex items-center justify-center
                                        ${cell.isBasic ? 'bg-green-50' : 'bg-white'}
                                        ${isEntering ? 'bg-yellow-100 ring-2 ring-inset ring-yellow-400' : ''}
                                        ${isLeaving ? 'bg-red-50 opacity-80' : ''}
                                    `}>
                                        <span className="absolute top-0.5 right-0.5 text-[10px] text-gray-400 px-1 border rounded bg-white leading-none">
                                            {cell.cost}
                                        </span>
                                        <span className={`font-bold text-sm md:text-base ${cell.isBasic ? 'text-gray-900' : 'text-transparent'}`}>
                                            {formatValue(cell.value, cell.isBasic)}
                                        </span>
                                        {!cell.isBasic && !log.isOptimal && (
                                            <span className={`absolute bottom-0.5 left-1 text-[10px] font-bold ${delta < 0 ? 'text-red-500' : 'text-gray-300'}`}>
                                                {delta < 0 ? delta.toFixed(0) : ''}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                            {/* Supply Val */}
                            <div className="bg-gray-50 border-r border-b p-1 flex items-center justify-center text-xs text-gray-500 font-bold">
                                {log.tableau.supply[i]}
                            </div>
                        </React.Fragment>
                    ))}

                    {/* Header Demand */}
                    <div className="bg-gray-100 border-r border-b p-1 text-center text-xs font-bold text-gray-500">Пот.</div>
                    {log.tableau.demand.map((d, j) => (
                        <div key={j} className="bg-gray-50 border-r border-b p-1 text-center text-xs font-bold text-gray-500">{d}</div>
                    ))}
                    <div className="bg-gray-50 border-r border-b"></div>
                </div>
            </div>

            {/* Пояснения */}
            {!log.isOptimal && log.cycle && (
                <div className="mt-2 text-xs md:text-sm bg-blue-50 p-2 rounded border border-blue-100 text-gray-700">
                    <div className="flex flex-wrap items-center gap-1 mb-1">
                        <span className="font-bold text-red-600">Ввод: ({log.entering!.r+1},{log.entering!.c+1})</span>
                        <span className="text-gray-400">|</span>
                        <span>Δ = {toFraction(log.entering!.estimate)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                        <span className="font-mono text-blue-700 break-all">{log.cycle}</span>
                    </div>
                    <div className="mt-1 font-bold">
                        θ = {log.theta} (выход: {log.leaving?.val})
                    </div>
                </div>
            )}
          </div>
        </div>
      ))}

      {/* Итог */}
      {economy && (
        <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-green-500 flex justify-between items-center text-sm md:text-base">
            <div>
                <div className="text-gray-500 text-xs uppercase">Экономия</div>
                <div className="font-bold text-green-700 text-lg">{economy.percent}%</div>
            </div>
            <div className="text-right">
                <div className="text-gray-400 text-xs line-through">{economy.start}</div>
                <div className="font-bold text-gray-800 text-xl flex items-center gap-1">
                     <TbArrowRight className="text-gray-400 text-sm"/> {economy.end}
                </div>
            </div>
        </div>
      )}
    </main>
  );
}