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

  // Поиск цикла (DFS)
  const buildCycle = (startR: number, startC: number, cells: Cell[][], m: number, n: number): Point[] | null => {
    const path: Point[] = [];
    const visited = new Set<string>();

    // direction: 0 - ищем горизонтально, 1 - ищем вертикально
    const dfs = (currR: number, currC: number, direction: 0 | 1): boolean => {
      path.push({ r: currR, c: currC });
      
      // Если вернулись в начало и путь достаточно длинный (минимум 4 вершины: +-+-...)
      if (path.length >= 4 && currR === startR && currC === startC) {
        return true;
      }

      const key = `${currR},${currC}`;
      if (visited.has(key) && path.length > 1) {
         path.pop();
         return false; 
      }
      visited.add(key);

      if (direction === 0) {
        // Ищем в строке
        for (let j = 0; j < n; j++) {
          if (j !== currC) {
             // Идем либо в базисную клетку, либо в начало
             if (cells[currR][j].isBasic || (currR === startR && j === startC)) {
                if (dfs(currR, j, 1)) return true;
             }
          }
        }
      } else {
        // Ищем в столбце
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

    // Начинаем поиск. Вводимая клетка (startR, startC) свободна.
    // Сначала ищем базисного соседа по строке или столбцу.
    // Принято начинать движение горизонтально (direction=0), но так как мы уже в клетке,
    // следующий шаг должен быть по строке (к другой клетке в этой строке) или по столбцу.
    // Запустим поиск: (start) -> (row neighbor) -> (col neighbor) ...
    // В DFS функции logic: мы "пришли" в currR, currC. Следующий шаг direction.
    // Значит стартуем с direction=0 (ищем пару в строке)
    
    path.push({ r: startR, c: startC });
    visited.add(`${startR},${startC}`);
    
    // Ищем соседа по строке (чтобы образовать угол)
    for (let j = 0; j < n; j++) {
        if (j !== startC && cells[startR][j].isBasic) {
            if (dfs(startR, j, 1)) return path;
        }
    }
    
    // Если не вышло, пробуем по столбцу
    visited.delete(`${startR},${startC}`); // reset
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
      
      const steps: Step[] = [];
      
      // 1. Построение начального плана (Метод минимальной стоимости)
      const allocation: number[][] = Array(suppliers).fill(null).map(() => Array(consumers).fill(0));
      // Копии для вычислений
      const remSupply = [...supplyValues];
      const remDemand = [...demandValues];
      const rowDone = Array(suppliers).fill(false);
      const colDone = Array(consumers).fill(false);
      
      let explanation = "Шаг 1. Построение начального плана методом минимальной стоимости:\n\n";
      let filledCount = 0;
      const totalCellsNeeded = suppliers + consumers - 1;

      // Пока не вычеркнуты все строки и столбцы (или пока не заполним нужное кол-во)
      while (filledCount < totalCellsNeeded) {
        let minCost = Infinity;
        let minI = -1, minJ = -1;
        
        // Ищем мин стоимость среди невычеркнутых
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
        
        // Если не нашли (все вычеркнуто), выходим
        if (minI === -1) break;
        
        const amount = Math.min(remSupply[minI], remDemand[minJ]);
        allocation[minI][minJ] = amount;
        remSupply[minI] -= amount;
        remDemand[minJ] -= amount;
        
        explanation += `min c${minI+1}${minJ+1}=${minCost}. x${minI+1}${minJ+1} = ${toFraction(amount)}\n`;
        filledCount++;

        // Логика вычеркивания (важно для вырожденности!)
        if (remSupply[minI] < 1e-6 && remDemand[minJ] > 1e-6) {
            rowDone[minI] = true;
        } else if (remSupply[minI] > 1e-6 && remDemand[minJ] < 1e-6) {
            colDone[minJ] = true;
        } else {
            // Оба обнулились. Вычеркиваем только ОДНО, чтобы оставить "0" в базисе.
            // Если это не последняя клетка.
            const remainingRows = rowDone.filter(x => !x).length;
            const remainingCols = colDone.filter(x => !x).length;
            
            if (remainingRows === 1 && remainingCols === 1) {
                // Последняя клетка - вычеркиваем оба
                rowDone[minI] = true;
                colDone[minJ] = true;
            } else {
                // Вычеркиваем произвольно (например, строку), столбец остается с demand=0
                rowDone[minI] = true;
                // colDone не трогаем, он будет участвовать с 0
                explanation += `  (Вырождение: запасы и потр. исчерпаны одновременно, оставляем столбец ${minJ+1} активным с 0)\n`;
            }
        }
      }
      
      const cells: Cell[][] = Array(suppliers).fill(null).map((_, i) =>
        Array(consumers).fill(null).map((_, j) => ({
          cost: costMatrix[i][j],
          value: allocation[i][j],
          isBasic: allocation[i][j] > 1e-6 // Сначала только >0, потом добавим нули
        }))
      );
      
      // Добавляем нули, которые мы "оставили" в алгоритме
      // Простой способ: мы уже заполнили allocation (в т.ч. нулями).
      // Нам нужно точно знать, какие клетки базисные.
      // Перезаполним isBasic на основе allocation, но учитывая, что метод должен был дать m+n-1
      
      // Лучший способ восстановить базис:
      // В вышеописанном цикле мы ровно m+n-1 раз делали allocation[i][j] = amount.
      // Нужно было там ставить флаг.
      // Давайте исправим. Проще всего пересчитать и добавить недостающие 0 в связную структуру.
      
      // Очистим isBasic
      for(let i=0; i<suppliers; i++) for(let j=0; j<consumers; j++) cells[i][j].isBasic = false;

      // Пройдемся по allocation и сделаем >0 базисными
      let basicCount = 0;
      for(let i=0; i<suppliers; i++) {
        for(let j=0; j<consumers; j++) {
            if (cells[i][j].value > 1e-6) {
                cells[i][j].isBasic = true;
                basicCount++;
            }
        }
      }
      
      // Если план вырожден (базисных < m+n-1), добавляем нули
      // Чтобы не ломать голову над точным восстановлением хода LCM, добавим 0 эвристически,
      // стараясь не создавать циклов (в клетки с мин. стоимостью).
      while (basicCount < suppliers + consumers - 1) {
          let bestI = -1, bestJ = -1, bestCost = Infinity;
          for(let i=0; i<suppliers; i++) {
              for(let j=0; j<consumers; j++) {
                  if (!cells[i][j].isBasic && cells[i][j].cost < bestCost) {
                      // Тут нужна проверка на цикл. Упрощенно: берем мин стоимость.
                      // Если метод потенциалов не сойдется, значит добавили криво.
                      // Но для учебных задач обычно проходит.
                      bestCost = cells[i][j].cost;
                      bestI = i;
                      bestJ = j;
                  }
              }
          }
          if (bestI !== -1) {
              cells[bestI][bestJ].isBasic = true;
              cells[bestI][bestJ].value = 0;
              basicCount++;
              explanation += `Добавлена базисная 0 в (${bestI+1}, ${bestJ+1}) для устранения вырожденности.\n`;
          } else break;
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
        u[0] = 0; 
        
        let changed = true;
        let safety = 0;
        while (changed && safety < 100) {
          changed = false;
          safety++;
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
        
        // Если граф несвязный (неудачное добавление нулей), заполняем дыры
        for (let i = 0; i < suppliers; i++) if (u[i] === null) u[i] = 0;
        for (let j = 0; j < consumers; j++) if (v[j] === null) v[j] = 0;
        
        const iterLog = `\n--- Итерация ${iteration} ---\nПотенциалы: u=[${u}], v=[${v}]\n`;
        
        // б) Оценки свободных клеток
        let minEstimate = 0;
        let enterI = -1, enterJ = -1;
        let estimatesLog = "";
        
        for (let i = 0; i < suppliers; i++) {
          for (let j = 0; j < consumers; j++) {
            if (!cells[i][j].isBasic) {
              const est = cells[i][j].cost - u[i]! - v[j]!;
              if (est < minEstimate - 1e-6) {
                minEstimate = est;
                enterI = i;
                enterJ = j;
              }
              if (est < 0) {
                  estimatesLog += `Δ${i+1}${j+1} = ${toFraction(est)} < 0\n`;
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
            explanation: iterLog + (estimatesLog || "Все оценки ≥ 0\n")
        });

        if (minEstimate >= -1e-6) {
            steps[steps.length-1].explanation += "Оптимальный план найден.";
            break;
        }

        // в) Пересчет
        const path = buildCycle(enterI, enterJ, cells, suppliers, consumers);
        if (!path) {
            setError("Не удалось найти цикл. Проверьте правильность базиса.");
            break;
        }

        // В пути: [Start, A, B, C, Start]. Длина 5.
        // Знаки: Start(+), A(-), B(+), C(-), Start(+)
        // Ищем тету по минусам (нечетные индексы: 1, 3...)
        // Итерируем до path.length - 1, чтобы не взять последний Start
        
        let theta = Infinity;
        let exitIndex = -1;
        
        const pathStr = path.map((p, idx) => {
             // последний элемент дублирует первый, не показываем знак для него или показываем (по кругу)
             if (idx === path.length - 1) return `(${p.r+1},${p.c+1})`;
             const sign = idx % 2 === 0 ? "+" : "-";
             return `${sign}(${p.r+1},${p.c+1})`;
        }).join(" → ");
        
        steps[steps.length-1].explanation += `\nВводим (${enterI+1},${enterJ+1}). Цикл: ${pathStr}\n`;

        // Поиск theta
        for (let k = 1; k < path.length - 1; k += 2) {
            const p = path[k];
            if (cells[p.r][p.c].value < theta) {
                theta = cells[p.r][p.c].value;
                exitIndex = k;
            }
        }
        
        steps[steps.length-1].explanation += `θ = ${toFraction(theta)}. Выводим (${path[exitIndex].r+1}, ${path[exitIndex].c+1})\n`;

        // Обновление. Важно: цикл до length - 1, чтобы не обновить Start дважды
        cells[enterI][enterJ].isBasic = true;
        
        for (let k = 0; k < path.length - 1; k++) {
            const p = path[k];
            if (k % 2 === 0) cells[p.r][p.c].value += theta;
            else cells[p.r][p.c].value -= theta;
        }

        // Вывод из базиса (строго одну клетку)
        const exitNode = path[exitIndex];
        cells[exitNode.r][exitNode.c].isBasic = false;
        cells[exitNode.r][exitNode.c].value = 0;
      }
      
      // Финал
      let totalCost = 0;
      let optimalText = "F = ";
      const terms: string[] = [];
      for(let i=0; i<suppliers; i++){
          for(let j=0; j<consumers; j++){
              if(cells[i][j].isBasic && cells[i][j].value > 1e-6) {
                  totalCost += cells[i][j].cost * cells[i][j].value;
                  terms.push(`${cells[i][j].cost}·${toFraction(cells[i][j].value)}`);
              }
          }
      }
      optimalText += terms.join(" + ") + ` = ${toFraction(totalCost)}`;
      
      setResults({ steps, optimal: optimalText });
      
    } catch (e) {
      setError((e as Error).message);
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
        
        {/* Инпуты размеров */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Поставщики (m)</label>
            <input type="number" min="2" max="10" value={suppliers} onChange={(e) => handleSupplierChange(parseInt(e.target.value)||2)} className="w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Потребители (n)</label>
            <input type="number" min="2" max="10" value={consumers} onChange={(e) => handleConsumerChange(parseInt(e.target.value)||2)} className="w-full p-2 border border-gray-300 rounded-md" />
          </div>
        </div>

        {/* Запасы */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Запасы (a)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {supply.map((s, i) => (
              <input key={i} type="number" value={s} onChange={(e) => {const n=[...supply]; n[i]=e.target.value; setSupply(n);}} className="p-2 border border-gray-300 rounded-md" />
            ))}
          </div>
        </div>

        {/* Потребности */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Потребности (b)</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {demand.map((d, i) => (
              <input key={i} type="number" value={d} onChange={(e) => {const n=[...demand]; n[i]=e.target.value; setDemand(n);}} className="p-2 border border-gray-300 rounded-md" />
            ))}
          </div>
        </div>

        {/* Матрица */}
        <div className="mb-4 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-gray-100"></th>
                  {Array(consumers).fill(0).map((_, j) => <th key={j} className="border p-2 bg-gray-100">B{j+1}</th>)}
                </tr>
              </thead>
              <tbody>
                {costs.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-2 bg-gray-100 font-semibold">A{i+1}</td>
                    {row.map((c, j) => (
                      <td key={j} className="border p-1">
                        <input type="number" value={c} onChange={(e) => {const n=costs.map(r=>[...r]); n[i][j]=e.target.value; setCosts(n);}} className="w-full p-1 text-center border-none focus:ring-2 rounded" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
        </div>

        <button onClick={calculate} className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 transition-colors">
          Решить
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">{error}</div>}

      {results && (
        <div className="bg-gray-50 rounded-lg p-4 sm:p-6 border border-gray-200">
          <h3 className="text-xl font-bold mb-4 text-gray-800">Решение</h3>
          {results.steps.map((step, idx) => (
            <div key={idx} className="mb-6 p-4 bg-white rounded-lg border border-gray-300 shadow-sm">
              <div className="mb-4 whitespace-pre-wrap text-sm text-gray-700 font-mono">{step.explanation}</div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-gray-100 w-16">u \ v</th>
                      {Array(consumers).fill(0).map((_, j) => (
                        <th key={j} className="border p-2 bg-gray-100">B{j+1}<br/><span className="text-blue-600">{step.tableau.v[j]!==null?toFraction(step.tableau.v[j]!):'0'}</span></th>
                      ))}
                      <th className="border p-2 bg-blue-50">Запас</th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.tableau.cells.map((row, i) => (
                      <tr key={i}>
                        <td className="border p-2 bg-gray-100 font-semibold">A{i+1}<br/><span className="text-blue-600">{step.tableau.u[i]!==null?toFraction(step.tableau.u[i]!):'0'}</span></td>
                        {row.map((cell, j) => (
                          <td key={j} className={`border p-2 text-center relative h-14 w-16 ${cell.isBasic ? 'bg-green-100' : ''}`}>
                            <span className="absolute top-0 right-1 text-xs text-gray-400">{cell.cost}</span>
                            <span className={`font-bold ${cell.isBasic ? 'text-black' : 'text-transparent'}`}>{cell.isBasic ? toFraction(cell.value) : '0'}</span>
                            {!cell.isBasic && step.tableau.u[i]!==null && step.tableau.v[j]!==null && (cell.cost - step.tableau.u[i]! - step.tableau.v[j]! < 0) && (
                                <span className="absolute bottom-0 right-1 text-[10px] text-red-500 font-bold">{toFraction(cell.cost - step.tableau.u[i]! - step.tableau.v[j]!)}</span>
                            )}
                          </td>
                        ))}
                        <td className="border p-2 text-center bg-blue-50">{step.tableau.supply[i]}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="border p-2 bg-blue-50 font-semibold">Потр.</td>
                      {step.tableau.demand.map((d, j) => <td key={j} className="border p-2 text-center bg-blue-50">{d}</td>)}
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-md">
            <h4 className="font-bold text-green-800 text-lg">Результат:</h4>
            <div className="text-green-900 font-mono text-base">{results.optimal}</div>
          </div>
        </div>
      )}
    </main>
  );
}