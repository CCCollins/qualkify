"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbTableOptions, TbMath, TbSettings } from 'react-icons/tb';

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
  calculations: string;
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
  return sign + decimal.toFixed(2);
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
  
  const generateCostData = (cells: Cell[][]) => {
      let sum = 0;
      const terms: string[] = [];
      cells.forEach(row => row.forEach(c => {
          if (c.isBasic && c.value > 1e-6) {
              sum += c.value * c.cost;
              terms.push(`${c.cost}·${toFraction(c.value)}`);
          }
      }));
      return { total: sum, formula: terms.length > 0 ? terms.join(' + ') + ` = ${toFraction(sum)}` : "0" };
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

      if (direction === 0) { 
        for (let j = 0; j < n; j++) {
          if (j !== currC && (cells[currR][j].isBasic || (currR === startR && j === startC))) {
             if (dfs(currR, j, 1)) return true;
          }
        }
      } else { 
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
    
    for (let j = 0; j < n; j++) {
        if (j !== startC && cells[startR][j].isBasic) {
            if (dfs(startR, j, 1)) return path;
        }
    }
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
      
      const currentSupplyVals = supply.map(s => parseFloat(s) || 0);
      const currentDemandVals = demand.map(d => parseFloat(d) || 0);
      const currentCosts = costs.map(row => row.map(c => parseFloat(c) || 0));
      
      const sumS = currentSupplyVals.reduce((a, b) => a + b, 0);
      const sumD = currentDemandVals.reduce((a, b) => a + b, 0);
      
      let calcSuppliers = suppliers;
      let calcConsumers = consumers;
      
      if (Math.abs(sumS - sumD) > 1e-6) {
          if (sumS > sumD) {
              const diff = sumS - sumD;
              currentDemandVals.push(diff);
              currentCosts.forEach(row => row.push(0));
              calcConsumers++;
          } else {
              const diff = sumD - sumS;
              currentSupplyVals.push(diff);
              currentCosts.push(new Array(calcConsumers).fill(0));
              calcSuppliers++;
          }
      }
      
      const logsData: IterationLog[] = [];
      
      const allocation = Array(calcSuppliers).fill(null).map(() => Array(calcConsumers).fill(0));
      const remS = [...currentSupplyVals];
      const remD = [...currentDemandVals];
      const rowDone = Array(calcSuppliers).fill(false);
      const colDone = Array(calcConsumers).fill(false);
      let filled = 0;
      const requiredBasic = calcSuppliers + calcConsumers - 1;
      
      while (filled < requiredBasic) {
        let minC = Infinity, minI = -1, minJ = -1;
        for (let i = 0; i < calcSuppliers; i++) {
          if (rowDone[i]) continue;
          for (let j = 0; j < calcConsumers; j++) {
            if (colDone[j]) continue;
            if (currentCosts[i][j] < minC) { minC = currentCosts[i][j]; minI = i; minJ = j; }
          }
        }
        
        if (minI === -1) break;
        
        const amt = Math.min(remS[minI], remD[minJ]);
        allocation[minI][minJ] = amt;
        remS[minI] -= amt; remD[minJ] -= amt;
        filled++;

        if (remS[minI] < 1e-6 && remD[minJ] > 1e-6) {
             rowDone[minI] = true;
        } else if (remS[minI] > 1e-6 && remD[minJ] < 1e-6) {
             colDone[minJ] = true;
        } else {
            if (rowDone.filter(x => !x).length === 1 && colDone.filter(x => !x).length === 1) {
                rowDone[minI] = true; colDone[minJ] = true;
            } else {
                rowDone[minI] = true;
            }
        }
      }
      
      const cells: Cell[][] = currentCosts.map((row, i) => row.map((cost, j) => ({
          cost, value: allocation[i][j], isBasic: false
      })));

      let basicCnt = 0;
      cells.forEach(row => row.forEach(c => { 
          if(c.value > 1e-6) { c.isBasic = true; basicCnt++; }
      }));
      
      while(basicCnt < requiredBasic) {
           let bestI = -1, bestJ = -1, bestC = Infinity;
           for(let i=0; i<calcSuppliers; i++) for(let j=0; j<calcConsumers; j++) {
               if(!cells[i][j].isBasic && cells[i][j].cost < bestC) {
                   bestC = cells[i][j].cost; bestI=i; bestJ=j;
               }
           }
           if(bestI !== -1) {
               cells[bestI][bestJ].isBasic = true; cells[bestI][bestJ].value = 0; basicCnt++;
           } else break;
      }

      let iter = 0;
      let optimal = false;

      while (iter < 20 && !optimal) {
        iter++;
        
        const u = Array(calcSuppliers).fill(null) as (number|null)[];
        const v = Array(calcConsumers).fill(null) as (number|null)[];
        u[0] = 0;
        
        let changed = true;
        while(changed) {
            changed = false;
            for(let i=0; i<calcSuppliers; i++) for(let j=0; j<calcConsumers; j++) {
                if(cells[i][j].isBasic) {
                    if(u[i]!==null && v[j]===null) { v[j] = cells[i][j].cost - u[i]!; changed=true; }
                    else if(v[j]!==null && u[i]===null) { u[i] = cells[i][j].cost - v[j]!; changed=true; }
                }
            }
        }
        for(let k=0; k<calcSuppliers; k++) if(u[k]===null) u[k]=0;
        for(let k=0; k<calcConsumers; k++) if(v[k]===null) v[k]=0;

        let minP = 0, enterI = -1, enterJ = -1;
        let calculationsText = "";
        
        for(let i=0; i<calcSuppliers; i++) for(let j=0; j<calcConsumers; j++) {
            if(!cells[i][j].isBasic) {
                const p = cells[i][j].cost - u[i]! - v[j]!;
                calculationsText += `p${i+1},${j+1} = ${cells[i][j].cost} - (${toFraction(u[i]!)}) - (${toFraction(v[j]!)}) = ${toFraction(p)}\n`;
                if(p < minP - 1e-6) { minP = p; enterI = i; enterJ = j; }
            }
        }

        const costInfo = generateCostData(cells);

        const currentLog: IterationLog = {
            stepNumber: iter,
            isOptimal: false,
            tableau: {
                cells: JSON.parse(JSON.stringify(cells)),
                supply: [...currentSupplyVals], demand: [...currentDemandVals],
                u: [...u], v: [...v],
                totalCost: costInfo.total,
                costFormula: costInfo.formula
            },
            explanation: iter === 1 ? "Начальный план." : `Итерация ${iter}.`,
            calculations: calculationsText
        };

        if (minP >= -1e-6) {
            currentLog.isOptimal = true;
            currentLog.explanation = "Оптимальный план найден (все p ≥ 0).";
            logsData.push(currentLog);
            optimal = true;
            break;
        }

        currentLog.entering = { r: enterI, c: enterJ, estimate: minP };
        currentLog.explanation = `Вводим клетку (${enterI+1},${enterJ+1}). Оценка: ${toFraction(minP)}`;
        
        const path = buildCycle(enterI, enterJ, cells, calcSuppliers, calcConsumers);
        if (!path) { setError("Ошибка структуры базиса."); break; }

        let theta = Infinity;
        let exitIdx = -1;
        
        for (let k = 1; k < path.length - 1; k += 2) {
            const p = path[k];
            if (cells[p.r][p.c].value < theta) {
                theta = cells[p.r][p.c].value;
                exitIdx = k;
            }
        }
        
        currentLog.cycle = path.map((p, idx) => {
             const sign = idx % 2 === 0 ? "+" : "-";
             if (idx === path.length - 1) return `(${p.r+1},${p.c+1})`; 
             return `${sign}(${p.r+1},${p.c+1})`;
        }).join(' → ');
        
        currentLog.theta = theta;
        currentLog.leaving = { r: path[exitIdx].r, c: path[exitIdx].c, val: theta };
        
        logsData.push(currentLog); 

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
      
      if (logsData.length > 0) {
        const startCost = logsData[0].tableau.totalCost;
        const endCost = logsData[logsData.length-1].tableau.totalCost;
        const pct = startCost > 0 ? ((startCost - endCost) / startCost * 100).toFixed(2) : "0";
        setEconomy({ start: startCost, end: endCost, percent: pct });
      }

    } catch (e) { setError((e as Error).message); }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 space-y-6">
      
      {/* Стили для скрытия стрелок инпута только для класса no-spinner */}
      <style jsx global>{`
        .no-spinner::-webkit-inner-spin-button, 
        .no-spinner::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        .no-spinner {
          -moz-appearance: textfield;
        }
      `}</style>

      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">
          Транспортная задача
        </h1>
      </div>

      {/* Ввод */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
             <h2 className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                <TbSettings className="text-xl text-blue-600"/> Параметры задачи
             </h2>
             <button onClick={calculate} className="bg-blue-600 text-white font-bold py-2 px-8 rounded-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all">
                Решить
            </button>
        </div>
        
        {/* Сетка настроек */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Размеры (стрелки оставлены) */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Размерность матрицы</h3>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Поставщики (m)</label>
                        <input type="number" min="2" max="10" value={suppliers} onChange={(e)=>handleSupplierChange(+e.target.value||2)} className="w-full p-2 border border-gray-300 rounded-md text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Потребители (n)</label>
                        <input type="number" min="2" max="10" value={consumers} onChange={(e)=>handleConsumerChange(+e.target.value||2)} className="w-full p-2 border border-gray-300 rounded-md text-center font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                </div>
            </div>

            {/* Запасы и Потребности (стрелки скрыты) */}
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Ограничения</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-blue-600 mb-1">Запасы поставщиков (a)</label>
                        <div className="flex flex-wrap gap-2">
                            {supply.map((s, i) => (
                                <input key={i} type="number" value={s} onChange={(e)=>{const n=[...supply]; n[i]=e.target.value; setSupply(n)}} className="w-16 p-1.5 border border-gray-300 rounded text-center text-sm font-medium focus:border-blue-500 outline-none no-spinner" placeholder={`a${i+1}`} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-green-600 mb-1">Потребности магазинов (b)</label>
                        <div className="flex flex-wrap gap-2">
                            {demand.map((d, i) => (
                                <input key={i} type="number" value={d} onChange={(e)=>{const n=[...demand]; n[i]=e.target.value; setDemand(n)}} className="w-16 p-1.5 border border-gray-300 rounded text-center text-sm font-medium focus:border-green-500 outline-none no-spinner" placeholder={`b${i+1}`} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
          
        {/* Матрица тарифов (стрелки скрыты, ячейки узкие) */}
        <div className="mt-6">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <TbTableOptions/> Матрица тарифов (C)
            </h3>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="border-collapse w-auto text-sm">
                <thead>
                    <tr className="bg-gray-100 border-b">
                        <th className="p-2 text-left text-gray-400 font-medium w-12">#</th>
                        {Array(consumers).fill(0).map((_, j) => (
                            <th key={j} className="p-2 text-center text-gray-500 font-medium w-12">B{j+1}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                {costs.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="p-2 pl-3 font-bold text-gray-500">A{i+1}</td>
                    {row.map((c, j) => (
                        <td key={j} className="p-1">
                        <input type="number" value={c} onChange={(e)=>{const n=costs.map(r=>[...r]); n[i][j]=e.target.value; setCosts(n)}} className="w-12 p-1.5 text-center bg-white border border-gray-200 rounded focus:ring-2 focus:ring-blue-500 outline-none font-medium no-spinner" />
                        </td>
                    ))}
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-sm">{error}</div>}

      {/* Вывод шагов */}
      {logs && logs.map((log, idx) => {
        return (
            <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`px-6 py-4 border-b flex flex-col md:flex-row md:justify-between md:items-center ${log.isOptimal ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white shadow-sm ${log.isOptimal ? 'bg-green-500' : 'bg-gray-600'}`}>
                        {idx + 1}
                    </span>
                    <span className="font-bold text-gray-800 text-lg">
                        {log.isOptimal ? "Оптимальный план" : `Итерация ${log.stepNumber}`}
                    </span>
                </div>
                
                <div className="mt-3 md:mt-0 font-mono text-sm bg-white px-4 py-2 rounded-lg border shadow-sm text-gray-700 overflow-x-auto">
                    <span className="font-bold text-gray-400 mr-2">F =</span> 
                    {log.tableau.costFormula}
                </div>
            </div>
            
            <div className="p-6">
                <p className="text-gray-600 mb-6 font-medium bg-blue-50/50 p-3 rounded-lg border border-blue-100/50">{log.explanation}</p>

                {/* Таблица */}
                <div className="overflow-x-auto rounded-lg border border-gray-300 mb-6 shadow-inner bg-gray-50">
                    <div className="grid min-w-max" 
                        style={{ gridTemplateColumns: `auto repeat(${log.tableau.cells[0].length}, minmax(70px, 1fr)) auto` }}>
                        
                        {/* Header: V */}
                        <div className="bg-gray-100 border-r border-b border-gray-300 p-2"></div>
                        {log.tableau.v.map((val, j) => (
                            <div key={j} className="bg-gray-100 border-r border-b border-gray-300 p-2 text-center text-xs font-mono font-bold text-blue-700">
                                {j >= consumers ? <span className="text-red-500">Фикт</span> : `v${j+1}`}<br/>
                                <span className="text-gray-500">= {val !== null ? toFraction(val) : '?'}</span>
                            </div>
                        ))}
                        <div className="bg-gray-200 border-b border-gray-300 p-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Запас</div>

                        {/* Rows */}
                        {log.tableau.cells.map((row, i) => (
                            <React.Fragment key={i}>
                                {/* U */}
                                <div className="bg-gray-100 border-r border-b border-gray-300 p-2 flex flex-col items-center justify-center text-xs font-mono font-bold text-blue-700 w-20">
                                    {i >= suppliers ? <span className="text-red-500 text-[10px]">Фикт</span> : `u${i+1}`}<br/>
                                    <span className="text-gray-500">= {log.tableau.u[i] !== null ? toFraction(log.tableau.u[i]!) : '?'}</span>
                                </div>

                                {/* Cells */}
                                {row.map((cell, j) => {
                                    const u = log.tableau.u[i] || 0;
                                    const v = log.tableau.v[j] || 0;
                                    const p_ij = cell.cost - u - v;
                                    const isEntering = log.entering?.r === i && log.entering?.c === j;
                                    const isLeaving = log.leaving?.r === i && log.leaving?.c === j;
                                    
                                    return (
                                        <div key={j} className={`
                                            relative h-16 border-r border-b border-gray-300 flex flex-col items-center justify-center transition-colors
                                            ${cell.isBasic ? 'bg-green-50/50' : 'bg-white'}
                                            ${isEntering ? 'bg-yellow-100 ring-inset ring-4 ring-yellow-200 z-10' : ''}
                                            ${isLeaving ? 'bg-red-50 opacity-60' : ''}
                                        `}>
                                            <div className="absolute top-0 right-0 border-l border-b border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-gray-400">
                                                {cell.cost}
                                            </div>

                                            <span className={`font-bold text-base ${cell.isBasic ? 'text-gray-800' : 'text-transparent'}`}>
                                                {formatValue(cell.value, cell.isBasic)}
                                            </span>

                                            {!cell.isBasic && !log.isOptimal && (
                                                <div className={`absolute bottom-0 left-1 text-[10px] font-bold ${p_ij < -1e-6 ? 'text-red-500 bg-red-50 px-1 rounded' : 'text-gray-300'}`}>
                                                    {p_ij < -1e-6 ? `p=${toFraction(p_ij)}` : ''}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div className="bg-white border-b border-gray-300 p-2 flex items-center justify-center text-sm font-bold text-gray-500">
                                    {log.tableau.supply[i]}
                                </div>
                            </React.Fragment>
                        ))}

                        <div className="bg-gray-200 border-r border-gray-300 p-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Потр.</div>
                        {log.tableau.demand.map((d, j) => (
                            <div key={j} className="bg-white border-r border-gray-300 p-2 text-center text-sm font-bold text-gray-500">{d}</div>
                        ))}
                        <div className="bg-gray-100"></div>
                    </div>
                </div>

                {/* Блок с расчетами p_ij */}
                <div className="mb-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                        <TbMath className="text-lg"/> Расчет оценок свободных клеток
                    </h4>
                    <div className="text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed pl-2 border-l-2 border-gray-300">
                        {log.calculations || "Все клетки базисные."}
                    </div>
                </div>

                {/* Инфо о цикле */}
                {!log.isOptimal && log.cycle && (
                    <div className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-100 text-gray-700 shadow-sm">
                        <div className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <span>🔄 Пересчет плана</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                             <div><span className="font-semibold">Ввод клетки:</span> ({log.entering!.r+1}, {log.entering!.c+1})</div>
                             <div><span className="font-semibold">Сдвиг (θ):</span> {log.theta}</div>
                             <div className="md:col-span-2 font-mono text-xs bg-white p-2 rounded border border-blue-100 mt-1 overflow-x-auto">
                                {log.cycle}
                             </div>
                        </div>
                    </div>
                )}
            </div>
            </div>
        );
      })}

      {/* Сдержанный итог */}
      {economy && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 text-gray-700 shadow-sm">
            <h3 className="font-bold text-gray-800 text-lg mb-4 border-b pb-2">Результаты решения</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Оптимальные затраты (Fₒₚₜ):</span>
                        <span className="font-mono font-bold">{economy.end}</span>
                    </div>
                    <div className="font-mono text-sm mb-2 text-gray-600">
                        Экономия = ({economy.start} - {economy.end}) / {economy.start} × 100% = {economy.percent}%
                    </div>
                </div>
            </div>
        </div>
      )}
    </main>
  );
}