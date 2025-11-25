"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbArrowRight, TbTableOptions } from 'react-icons/tb';

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

// Утилиты форматирования
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
  // Дефолтные значения из вашего примера (Задача 1)
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

  // --- Хендлеры изменения размеров и данных ---
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

  // --- Вспомогательные функции ---

  // Генерация строки формулы: F = 5*20 + ... = Sum
  const generateCostData = (cells: Cell[][]) => {
      let sum = 0;
      const terms: string[] = [];
      cells.forEach(row => row.forEach(c => {
          // Учитываем только реальные грузы, эпсилон (0) не влияет на стоимость
          if (c.isBasic && c.value > 1e-6) {
              sum += c.value * c.cost;
              terms.push(`${c.cost}·${toFraction(c.value)}`);
          }
      }));
      return { total: sum, formula: terms.length > 0 ? terms.join(' + ') + ` = ${toFraction(sum)}` : "0" };
  };

  // Поиск цикла для пересчета (DFS)
  const buildCycle = (startR: number, startC: number, cells: Cell[][], m: number, n: number): Point[] | null => {
    const path: Point[] = [];
    const visited = new Set<string>();

    const dfs = (currR: number, currC: number, direction: 0 | 1): boolean => {
      path.push({ r: currR, c: currC });
      // Цикл замкнулся (вернулись в начало, путь >= 4 узлов)
      if (path.length >= 4 && currR === startR && currC === startC) return true;

      const key = `${currR},${currC}`;
      if (visited.has(key) && path.length > 1) { path.pop(); return false; }
      visited.add(key);

      if (direction === 0) { // Ищем пару по горизонтали
        for (let j = 0; j < n; j++) {
          if (j !== currC && (cells[currR][j].isBasic || (currR === startR && j === startC))) {
             if (dfs(currR, j, 1)) return true;
          }
        }
      } else { // Ищем пару по вертикали
        for (let i = 0; i < m; i++) {
          if (i !== currR && (cells[i][currC].isBasic || (i === startR && currC === startC))) {
             if (dfs(i, currC, 0)) return true;
          }
        }
      }
      path.pop(); visited.delete(key); return false;
    };
    
    // Старт поиска
    path.push({ r: startR, c: startC });
    visited.add(`${startR},${startC}`);
    
    // Пробуем найти соседа по строке
    for (let j = 0; j < n; j++) {
        if (j !== startC && cells[startR][j].isBasic) {
            if (dfs(startR, j, 1)) return path;
        }
    }
    // Если не вышло, пробуем по столбцу
    visited.delete(`${startR},${startC}`); path.pop(); 
    path.push({ r: startR, c: startC }); visited.add(`${startR},${startC}`);

    for (let i = 0; i < m; i++) {
        if (i !== startR && cells[i][startC].isBasic) {
            if (dfs(i, startC, 0)) return path;
        }
    }
    return null;
  };

  // --- Основной алгоритм ---
  const calculate = () => {
    try {
      setError(null);
      const supplyVals = supply.map(s => parseFloat(s) || 0);
      const demandVals = demand.map(d => parseFloat(d) || 0);
      const costMtx = costs.map(row => row.map(c => parseFloat(c) || 0));
      
      const sumS = supplyVals.reduce((a, b) => a + b, 0);
      const sumD = demandVals.reduce((a, b) => a + b, 0);
      
      if (Math.abs(sumS - sumD) > 1e-6) {
        setError(`Задача открытая: Σa=${sumS} ≠ Σb=${sumD}. Добавьте фиктивного поставщика/потребителя.`);
        return;
      }
      
      const logsData: IterationLog[] = [];
      
      // 1. Построение начального плана (Метод минимальной стоимости)
      const allocation = Array(suppliers).fill(null).map(() => Array(consumers).fill(0));
      const remS = [...supplyVals];
      const remD = [...demandVals];
      const rowDone = Array(suppliers).fill(false);
      const colDone = Array(consumers).fill(false);
      let filled = 0;
      const requiredBasic = suppliers + consumers - 1;
      
      while (filled < requiredBasic) {
        let minC = Infinity, minI = -1, minJ = -1;
        
        // Ищем ячейку с мин стоимостью среди невычеркнутых
        for (let i = 0; i < suppliers; i++) {
          if (rowDone[i]) continue;
          for (let j = 0; j < consumers; j++) {
            if (colDone[j]) continue;
            if (costMtx[i][j] < minC) { minC = costMtx[i][j]; minI = i; minJ = j; }
          }
        }
        
        // Если все вычеркнуто, но базиса не хватает (редкий случай) или цикл закончен
        if (minI === -1) break;
        
        const amt = Math.min(remS[minI], remD[minJ]);
        allocation[minI][minJ] = amt;
        remS[minI] -= amt; remD[minJ] -= amt;
        filled++;

        // Логика вычеркивания (важно для сохранения ε при вырождении)
        if (remS[minI] < 1e-6 && remD[minJ] > 1e-6) {
             rowDone[minI] = true;
        } else if (remS[minI] > 1e-6 && remD[minJ] < 1e-6) {
             colDone[minJ] = true;
        } else {
            // Оба обнулились. Вычеркиваем только одного, чтобы второй остался активным (для ε)
            // Если это не самые последние ячейки
            if (rowDone.filter(x => !x).length === 1 && colDone.filter(x => !x).length === 1) {
                rowDone[minI] = true; colDone[minJ] = true;
            } else {
                rowDone[minI] = true; // Оставляем столбец
            }
        }
      }
      
      const cells: Cell[][] = costMtx.map((row, i) => row.map((cost, j) => ({
          cost, value: allocation[i][j], isBasic: false
      })));

      // Устанавливаем флаги базиса и лечим вырожденность
      let basicCnt = 0;
      cells.forEach(row => row.forEach(c => { 
          if(c.value > 1e-6) { c.isBasic = true; basicCnt++; }
      }));
      
      // Добавляем ε (нули) в базис, если не хватает
      while(basicCnt < requiredBasic) {
           let bestI = -1, bestJ = -1, bestC = Infinity;
           // Эвристика: добавляем в самую дешевую свободную
           for(let i=0; i<suppliers; i++) for(let j=0; j<consumers; j++) {
               if(!cells[i][j].isBasic && cells[i][j].cost < bestC) {
                   bestC = cells[i][j].cost; bestI=i; bestJ=j;
               }
           }
           if(bestI !== -1) {
               cells[bestI][bestJ].isBasic = true; 
               cells[bestI][bestJ].value = 0; 
               basicCnt++;
           } else break;
      }

      // Цикл оптимизации (Метод потенциалов)
      let iter = 0;
      let optimal = false;

      while (iter < 20 && !optimal) {
        iter++;
        
        // а) Расчет потенциалов: u[i] + v[j] = c[ij]
        const u = Array(suppliers).fill(null) as (number|null)[];
        const v = Array(consumers).fill(null) as (number|null)[];
        u[0] = 0; // Полагаем u1 = 0
        
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
        // Заглушка, если граф несвязный (при ошибках вырожденности)
        for(let k=0; k<suppliers; k++) if(u[k]===null) u[k]=0;
        for(let k=0; k<consumers; k++) if(v[k]===null) v[k]=0;

        // б) Расчет оценок p_ij (в коде user delta)
        // Конспект: p_ij = c_ij - u_i - v_j
        let minP = 0, enterI = -1, enterJ = -1;
        
        for(let i=0; i<suppliers; i++) for(let j=0; j<consumers; j++) {
            if(!cells[i][j].isBasic) {
                const p = cells[i][j].cost - u[i]! - v[j]!;
                // Если p < 0, это улучшение
                if(p < minP - 1e-6) { minP = p; enterI = i; enterJ = j; }
            }
        }

        const costInfo = generateCostData(cells);

        // Сохраняем ТЕКУЩЕЕ состояние таблицы (перед изменениями)
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
            explanation: iter === 1 
                ? "Начальный опорный план (ММС)." 
                : `Итерация ${iter}. Проверка оптимальности.`,
        };

        // Если minP >= 0, план оптимален
        if (minP >= -1e-6) {
            currentLog.isOptimal = true;
            currentLog.explanation = "Все оценки pᵢⱼ ≥ 0. План оптимален.";
            logsData.push(currentLog);
            optimal = true;
            break;
        }

        // Если не оптимален - готовим пересчет
        currentLog.entering = { r: enterI, c: enterJ, estimate: minP };
        currentLog.explanation = `Есть отрицательная оценка: p${enterI+1}${enterJ+1} = ${toFraction(minP)}. Вводим клетку (${enterI+1},${enterJ+1}) в базис.`;

        // Строим цикл
        const path = buildCycle(enterI, enterJ, cells, suppliers, consumers);
        if (!path) { setError("Ошибка построения цикла (нарушена структура базиса)."); break; }

        let theta = Infinity;
        let exitIdx = -1;
        
        // Поиск теты (минимальное значение в клетках с "-")
        // Путь: Start(+), A(-), B(+), C(-), Start(+)
        for (let k = 1; k < path.length - 1; k += 2) {
            const p = path[k];
            if (cells[p.r][p.c].value < theta) {
                theta = cells[p.r][p.c].value;
                exitIdx = k;
            }
        }
        
        // Дописываем данные цикла в лог
        currentLog.cycle = path.map((p, idx) => {
             const sign = idx % 2 === 0 ? "+" : "-";
             // Последний элемент равен первому, не дублируем знак или ставим для наглядности
             if (idx === path.length - 1) return `(${p.r+1},${p.c+1})`; 
             return `${sign}(${p.r+1},${p.c+1})`;
        }).join(' → ');
        
        currentLog.theta = theta;
        currentLog.leaving = { r: path[exitIdx].r, c: path[exitIdx].c, val: theta };
        
        // Пушим лог и переходим к изменению состояния
        logsData.push(currentLog); 

        // Пересчет таблицы (для следующей итерации)
        // 1. Вводим новую клетку в базис
        cells[enterI][enterJ].isBasic = true;
        
        // 2. Обновляем значения по циклу
        for (let k = 0; k < path.length - 1; k++) {
            const p = path[k];
            if (k % 2 === 0) cells[p.r][p.c].value += theta;
            else cells[p.r][p.c].value -= theta;
        }
        
        // 3. Выводим клетку из базиса (та, где было min значение)
        const ex = path[exitIdx];
        cells[ex.r][ex.c].isBasic = false; 
        cells[ex.r][ex.c].value = 0;
      }

      setLogs(logsData);
      
      // Расчет итоговой экономии
      if (logsData.length > 0) {
        const startCost = logsData[0].tableau.totalCost;
        const endCost = logsData[logsData.length-1].tableau.totalCost;
        const pct = startCost > 0 ? ((startCost - endCost) / startCost * 100).toFixed(2) : "0";
        setEconomy({ start: startCost, end: endCost, percent: pct });
      }

    } catch (e) { setError((e as Error).message); }
  };

  return (
    <main className="max-w-4xl mx-auto px-2 py-6 space-y-6 bg-gray-50 min-h-screen text-sm md:text-base">
      
      {/* Заголовок (восстановлен дизайн) */}
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center text-gray-800">
          Транспортная задача
        </h1>
      </div>

      {/* Панель управления и ввода */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-4 border-b pb-2">
             <h2 className="font-bold text-gray-700 flex items-center gap-2 text-lg">
                <TbTableOptions className="text-xl"/> Ввод условий
             </h2>
             <button onClick={calculate} className="bg-blue-600 text-white font-bold py-2 px-6 rounded shadow hover:bg-blue-700 active:scale-95 transition-transform">
                Решить
            </button>
        </div>
        
        {/* Размеры */}
        <div className="grid grid-cols-2 gap-4 mb-4 max-w-xs">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Поставщики (m)</label>
            <input type="number" min="2" max="8" value={suppliers} onChange={(e)=>handleSupplierChange(+e.target.value||2)} className="w-full mt-1 p-2 border rounded text-center font-bold text-gray-700" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Потребители (n)</label>
            <input type="number" min="2" max="8" value={consumers} onChange={(e)=>handleConsumerChange(+e.target.value||2)} className="w-full mt-1 p-2 border rounded text-center font-bold text-gray-700" />
          </div>
        </div>

        {/* Данные: Запасы и Потребности */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Запасы (aᵢ)</label>
                <div className="flex flex-wrap gap-2">
                {supply.map((s, i) => (
                    <input key={i} type="number" value={s} onChange={(e)=>{const n=[...supply]; n[i]=e.target.value; setSupply(n)}} className="w-14 p-2 border rounded text-center bg-blue-50 focus:bg-white transition" placeholder={`a${i+1}`} />
                ))}
                </div>
            </div>
            <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Потребности (bⱼ)</label>
                <div className="flex flex-wrap gap-2">
                {demand.map((d, i) => (
                    <input key={i} type="number" value={d} onChange={(e)=>{const n=[...demand]; n[i]=e.target.value; setDemand(n)}} className="w-14 p-2 border rounded text-center bg-green-50 focus:bg-white transition" placeholder={`b${i+1}`} />
                ))}
                </div>
            </div>
          </div>
          
          {/* Матрица тарифов */}
          <div className="overflow-x-auto pb-2">
            <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Матрица тарифов (cᵢⱼ)</label>
            <table className="border-collapse min-w-max">
              <tbody>
                {costs.map((row, i) => (
                  <tr key={i}>
                    <td className="pr-3 py-1 font-bold text-gray-500 text-sm">A{i+1}</td>
                    {row.map((c, j) => (
                      <td key={j} className="p-1">
                        <input type="number" value={c} onChange={(e)=>{const n=costs.map(r=>[...r]); n[i][j]=e.target.value; setCosts(n)}} className="w-16 p-2 text-center border rounded text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded shadow">{error}</div>}

      {/* Вывод шагов решения */}
      {logs && logs.map((log, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Заголовок итерации */}
          <div className={`px-4 py-3 border-b flex flex-col md:flex-row md:justify-between md:items-center ${log.isOptimal ? 'bg-green-100' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-2">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${log.isOptimal ? 'bg-green-600' : 'bg-gray-600'}`}>
                    {log.stepNumber}
                </span>
                <span className="font-bold text-gray-800">
                    {log.isOptimal ? "Оптимальный план" : `Итерация ${log.stepNumber}`}
                </span>
            </div>
            
            {/* Блок с формулой F */}
            <div className="mt-2 md:mt-0 font-mono text-xs md:text-sm bg-white px-3 py-1.5 rounded border shadow-sm w-full md:w-auto overflow-x-auto whitespace-nowrap">
               <span className="font-bold text-gray-500 mr-2">F =</span> 
               {log.tableau.costFormula}
            </div>
          </div>
          
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-4 font-medium">{log.explanation}</p>

            {/* Компактная таблица */}
            <div className="overflow-x-auto rounded border border-gray-300">
                <div className="grid min-w-max" 
                     style={{ gridTemplateColumns: `auto repeat(${consumers}, minmax(70px, 1fr)) auto` }}>
                    
                    {/* Header: V potentials */}
                    <div className="bg-gray-50 border-r border-b p-2"></div>
                    {log.tableau.v.map((val, j) => (
                        <div key={j} className="bg-gray-50 border-r border-b p-2 text-center text-xs font-mono font-bold text-blue-700">
                            v{j+1}={val !== null ? toFraction(val) : '?'}
                        </div>
                    ))}
                    <div className="bg-gray-100 border-b p-2 text-center text-xs font-bold text-gray-600">Запас</div>

                    {/* Rows */}
                    {log.tableau.cells.map((row, i) => (
                        <React.Fragment key={i}>
                            {/* U potential */}
                            <div className="bg-gray-50 border-r border-b p-2 flex items-center justify-center text-xs font-mono font-bold text-blue-700 w-16">
                                u{i+1}={log.tableau.u[i] !== null ? toFraction(log.tableau.u[i]!) : '?'}
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
                                        relative h-14 border-r border-b flex flex-col items-center justify-center
                                        ${cell.isBasic ? 'bg-green-50' : 'bg-white'}
                                        ${isEntering ? 'bg-yellow-100 ring-2 ring-inset ring-yellow-400 z-10' : ''}
                                        ${isLeaving ? 'bg-red-50 opacity-70' : ''}
                                    `}>
                                        {/* Cost (в уголке) */}
                                        <div className="absolute top-0 right-0 border-l border-b bg-gray-50 px-1 text-[10px] text-gray-500">
                                            {cell.cost}
                                        </div>

                                        {/* Value (в центре) */}
                                        <span className={`font-bold text-sm md:text-base ${cell.isBasic ? 'text-gray-900' : 'text-transparent'}`}>
                                            {formatValue(cell.value, cell.isBasic)}
                                        </span>

                                        {/* p_ij estimate (для свободных) */}
                                        {!cell.isBasic && !log.isOptimal && log.tableau.u[i] !== null && (
                                            <div className={`absolute bottom-0 left-1 text-[10px] font-bold ${p_ij < -1e-6 ? 'text-red-500' : 'text-gray-300'}`}>
                                                {p_ij < -1e-6 ? `p=${toFraction(p_ij)}` : ''}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {/* Supply Value */}
                            <div className="bg-white border-b p-2 flex items-center justify-center text-xs font-bold text-gray-500">
                                {log.tableau.supply[i]}
                            </div>
                        </React.Fragment>
                    ))}

                    {/* Footer: Demand */}
                    <div className="bg-gray-100 border-r p-2 text-center text-xs font-bold text-gray-600">Потр.</div>
                    {log.tableau.demand.map((d, j) => (
                        <div key={j} className="bg-white border-r p-2 text-center text-xs font-bold text-gray-500">{d}</div>
                    ))}
                    <div className="bg-gray-50"></div>
                </div>
            </div>

            {/* Информация о пересчете (Цикл) */}
            {!log.isOptimal && log.cycle && (
                <div className="mt-4 text-xs md:text-sm bg-blue-50 p-3 rounded-lg border border-blue-100 text-gray-700">
                    <div className="flex flex-col gap-1">
                        <div className="font-bold text-blue-800">Пересчет плана:</div>
                        <div><span className="font-semibold">Ввод:</span> ({log.entering!.r+1}, {log.entering!.c+1}) <span className="text-gray-400">|</span> Оценка: <span className="text-red-600 font-bold">{toFraction(log.entering!.estimate)}</span></div>
                        <div className="break-words leading-relaxed"><span className="font-semibold">Цикл:</span> {log.cycle}</div>
                        <div><span className="font-semibold">Сдвиг (θ):</span> {log.theta} (исключаем клетку со значением {log.leaving?.val})</div>
                    </div>
                </div>
            )}
          </div>
        </div>
      ))}

      {/* Блок итоговой экономии */}
      {economy && (
        <div className="bg-white p-5 rounded-lg shadow-md border-l-4 border-green-500 flex flex-col md:flex-row justify-between items-center text-sm md:text-base mb-10">
            <div className="mb-2 md:mb-0">
                <div className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Экономическая эффективность</div>
                <div className="font-bold text-green-700 text-2xl flex items-baseline gap-1">
                    {economy.percent}% <span className="text-sm font-normal text-green-600">экономии</span>
                </div>
            </div>
            <div className="text-right">
                <div className="text-gray-400 text-xs font-mono line-through mb-1">Нач: {economy.start}</div>
                <div className="font-bold text-gray-800 text-2xl flex items-center gap-2 font-mono">
                     <TbArrowRight className="text-gray-400"/> {economy.end}
                </div>
            </div>
        </div>
      )}
    </main>
  );
}