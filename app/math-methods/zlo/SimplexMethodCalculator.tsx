"use client"

import type React from "react"
import { useState } from "react"
import { TbChevronDown, TbCalculator, TbCheck, TbArrowRight, TbMathFunction } from "react-icons/tb"

// --- Класс Дроби ---
class Fraction {
  numerator: number;
  denominator: number;

  constructor(num: number, den: number = 1) {
    if (den === 0) throw new Error("Division by zero");
    if (Math.abs(num - Math.round(num)) < 1e-9) num = Math.round(num);
    if (Math.abs(den - Math.round(den)) < 1e-9) den = Math.round(den);
    const common = this.gcd(Math.abs(num), Math.abs(den));
    if (den < 0) { num = -num; den = -den; }
    this.numerator = num / common;
    this.denominator = den / common;
  }

  private gcd(a: number, b: number): number {
    if (!Number.isInteger(a) || !Number.isInteger(b)) return 1;
    return b === 0 ? a : this.gcd(b, a % b);
  }

  add(other: Fraction): Fraction {
    return new Fraction(this.numerator * other.denominator + other.numerator * this.denominator, this.denominator * other.denominator);
  }
  sub(other: Fraction): Fraction {
    return new Fraction(this.numerator * other.denominator - other.numerator * this.denominator, this.denominator * other.denominator);
  }
  mul(other: Fraction): Fraction {
    return new Fraction(this.numerator * other.numerator, this.denominator * other.denominator);
  }
  div(other: Fraction): Fraction {
    return new Fraction(this.numerator * other.denominator, this.denominator * other.numerator);
  }
  neg(): Fraction { return new Fraction(-this.numerator, this.denominator); }
  toNumber(): number { return this.numerator / this.denominator; }
  
  toString(): string { 
    if (this.denominator === 1) return `${this.numerator}`;
    if (this.denominator > 10000) return (this.numerator / this.denominator).toFixed(3).replace(/\.?0+$/, "");
    return `${this.numerator}/${this.denominator}`; 
  }

  isZero(): boolean { return Math.abs(this.numerator) < 1e-9; }
  isNegative(): boolean { return this.toNumber() < -1e-9; }
  isPositive(): boolean { return this.toNumber() > 1e-9; }
}

// --- Типы ---
type ConstraintType = "<=" | ">=" | "=";

interface ConstraintInput {
  id: number;
  value: string;
  type: ConstraintType;
}

interface SimplexTable {
  phase: 1 | 2;
  colVars: string[];
  rowVars: string[];
  matrix: Fraction[][];
  bCol: Fraction[];
  fRow: Fraction[];
  fVal: Fraction;
  pivot?: { row: number; col: number };
  ratios?: (string | null)[];
  currentObjectiveStr: string;
}

interface FinalSolution {
    varsString: string;
    checkEquation: string;
}

interface SimplexStep {
  table: SimplexTable;
  description: string;
  isOptimal: boolean;
  calculations: string[]; 
  finalSolution?: FinalSolution;
}

const parseEquation = (eq: string): Record<string, number> => {
  const coeffs: Record<string, number> = {};
  const cleanEq = eq.replace(/\s+/g, "").replace(/-/g, "+-");
  const terms = cleanEq.split("+").filter(t => t.length > 0);
  terms.forEach(term => {
    const match = term.match(/^(-?\d*\.?\d*)?([a-zA-Z]+[0-9]*)?$/);
    if (match) {
      const [, numPart, varPart] = match;
      let val = 1;
      if (numPart === "-" || numPart === "-1") val = -1;
      else if (numPart && numPart !== "+") val = parseFloat(numPart);
      
      if (varPart) coeffs[varPart] = (coeffs[varPart] || 0) + val;
      else if (numPart) coeffs["const"] = (coeffs["const"] || 0) + val;
    }
  });
  return coeffs;
};

export default function SimplexMethodCalculator() {
  const [objective, setObjective] = useState("-2x1 + x2"); 
  const [objectiveType, setObjectiveType] = useState<"max" | "min">("max");
  const [constraints, setConstraints] = useState<ConstraintInput[]>([
    { id: 1, value: "-x1 + x2 >= -4", type: ">=" },
    { id: 2, value: "x1 + x2 >= 2", type: ">=" },
    { id: 3, value: "-x1 + x2 <= 3", type: "<=" },
  ]);
  
  const [resultSteps, setResultSteps] = useState<SimplexStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addConstraint = () => setConstraints([...constraints, { id: Date.now(), value: "", type: "<=" }]);
  const removeConstraint = (id: number) => setConstraints(constraints.filter(c => c.id !== id));
  const updateConstraint = (id: number, field: keyof ConstraintInput, val: string | number | ConstraintType) => 
    setConstraints(constraints.map(c => c.id === id ? { ...c, [field]: val } : c));

  const calculate = () => {
    setError(null);
    setResultSteps(null);

    try {
      const decisionVars = new Set<string>();
      const objCoeffsMap = parseEquation(objective);
      Object.keys(objCoeffsMap).forEach(v => { if (v !== "const") decisionVars.add(v); });

      const parsedConstraints = constraints.map(c => {
        let type = c.type;
        if (c.value.includes("<=") || c.value.includes("≤")) type = "<=";
        else if (c.value.includes(">=") || c.value.includes("≥")) type = ">=";
        else if (c.value.includes("=")) type = "=";

        const parts = c.value.split(/<=|>=|≤|≥|=/);
        const lhs = parseEquation(parts[0]);
        let rhs = parseFloat(parts[1] || "0");

        if (rhs < 0) {
          rhs = -rhs;
          for (const k in lhs) lhs[k] = -lhs[k];
          if (type === "<=") type = ">=";
          else if (type === ">=") type = "<=";
        }
        Object.keys(lhs).forEach(v => { if (v !== "const") decisionVars.add(v); });
        return { lhs, rhs, type };
      });

      const sortedVars = Array.from(decisionVars).sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));

      const colVars: string[] = [...sortedVars];
      const rowVars: string[] = [];
      const matrix: Fraction[][] = [];
      const bCol: Fraction[] = [];

      let uCount = 0, wCount = 0;

      parsedConstraints.forEach(c => {
        const rowData: Fraction[] = colVars.map(v => new Fraction(c.lhs[v] || 0));
        bCol.push(new Fraction(c.rhs));

        if (c.type === "<=") {
          uCount++;
          rowVars.push(`u${uCount}`);
          matrix.push(rowData);
        } else if (c.type === ">=") {
          uCount++; wCount++;
          colVars.push(`u${uCount}`);
          rowVars.push(`w${wCount}`);
          const newRow = [...rowData, new Fraction(-1)];
          matrix.forEach(r => r.push(new Fraction(0)));
          matrix.push(newRow);
        } else {
          wCount++;
          rowVars.push(`w${wCount}`);
          matrix.push(rowData);
        }
      });

      const totalCols = colVars.length;
      matrix.forEach(row => {
          while(row.length < totalCols) row.push(new Fraction(0));
      });

      const objSign = objectiveType === "min" ? -1 : 1;
      const getC = (v: string, phase: 1 | 2): Fraction => {
        if (phase === 1) return v.startsWith("w") ? new Fraction(-1) : new Fraction(0);
        return new Fraction((objCoeffsMap[v] || 0) * objSign);
      };

      const calcFRow = (mat: Fraction[][], rVars: string[], cVars: string[], phase: 1 | 2) => {
        const f: Fraction[] = [];
        const cBasis = rVars.map(v => getC(v, phase));
        for (let j = 0; j < cVars.length; j++) {
          let zj = new Fraction(0);
          for (let i = 0; i < mat.length; i++) {
            zj = zj.add(cBasis[i].mul(mat[i][j]));
          }
          f.push(zj.sub(getC(cVars[j], phase)));
        }
        return f;
      };

      const calcFVal = (b: Fraction[], rVars: string[], phase: 1 | 2) => {
        let val = new Fraction(0);
        const cBasis = rVars.map(v => getC(v, phase));
        for (let i = 0; i < b.length; i++) {
          val = val.add(cBasis[i].mul(b[i]));
        }
        return val;
      };

      const generateFRowLogs = (mat: Fraction[][], b: Fraction[], rVars: string[], cVars: string[], phase: 1 | 2): string[] => {
        const fLabel = phase === 1 ? "F" : "f";
        const logs: string[] = [`--- Расчет оценок ${fLabel} (по формуле Zj - Cj) ---`];
        const cBasis = rVars.map(v => getC(v, phase));
        
        // Расчет для переменных (столбцов)
        cVars.forEach((vName, j) => {
            const parts: string[] = [];
            for(let i=0; i<mat.length; i++) {
                if(!cBasis[i].isZero() && !mat[i][j].isZero()) {
                    parts.push(`${cBasis[i]}·(${mat[i][j]})`);
                }
            }
            const cj = getC(vName, phase);
            const zVal = parts.length > 0 ? parts.join(" + ") : "0";
            let res = new Fraction(0);
            for(let i=0; i<mat.length; i++) res = res.add(cBasis[i].mul(mat[i][j]));
            res = res.sub(cj);

            logs.push(`${fLabel}(${vName}) = [${zVal}] - (${cj}) = ${res}`);
        });

        // Расчет для столбца b
        const bParts: string[] = [];
        for (let i = 0; i < b.length; i++) {
          if (!cBasis[i].isZero() && !b[i].isZero()) {
            bParts.push(`${cBasis[i]}·(${b[i]})`)
          }
        }
        const bValStr = bParts.length > 0 ? bParts.join(" + ") : "0"
        let bRes = new Fraction(0)
        for (let i = 0; i < b.length; i++) bRes = bRes.add(cBasis[i].mul(b[i]))

        logs.push(`${fLabel}(b) = [${bValStr}] = ${bRes}`)

        return logs;
      };

      const steps: SimplexStep[] = [];
      let phase = wCount > 0 ? 1 : 2;
      let iter = 0;
      
      let currMatrix = matrix.map(r => r.map(c => c));
      let currB = bCol.map(c => c);
      const currRowVars = [...rowVars];
      let currColVars = [...colVars];
      let transitionLogs: string[] = []; 

      while (iter < 15) {
        const fRow = calcFRow(currMatrix, currRowVars, currColVars, phase as 1 | 2);
        const fVal = calcFVal(currB, currRowVars, phase as 1 | 2);
        
        let currentObjStr = "";
        if (phase === 1) currentObjStr = "F_aux = -Σw → max";
        else currentObjStr = `f(x) = ${objective} → ${objectiveType}`;

        let currentDisplayLogs: string[] = [];
        const isNewPhase = (steps.length > 0 && steps[steps.length-1].table.phase !== phase);
        
        if (iter === 0 || isNewPhase) {
            currentDisplayLogs = generateFRowLogs(currMatrix, currB, currRowVars, currColVars, phase as 1 | 2);
        } else {
            currentDisplayLogs = transitionLogs;
        }

        let pivotCol = -1;
        let minVal = new Fraction(0);

        for (let j = 0; j < fRow.length; j++) {
          if (fRow[j].toNumber() < -1e-9) {
            if (fRow[j].toNumber() < minVal.toNumber()) {
              minVal = fRow[j];
              pivotCol = j;
            }
          }
        }

        const isOptimal = pivotCol === -1;
        let pivotRow = -1;
        const ratios: (string|null)[] = new Array(currMatrix.length).fill(null);

        if (!isOptimal) {
          let minRatio = Infinity;
          for (let i = 0; i < currMatrix.length; i++) {
            const a = currMatrix[i][pivotCol];
            if (a.isPositive()) {
              const r = currB[i].div(a);
              ratios[i] = r.toString();
              if (r.toNumber() < minRatio) {
                minRatio = r.toNumber();
                pivotRow = i;
              }
            }
          }
          if (pivotRow === -1) throw new Error("Функция не ограничена");
        }

        let finalSolution: FinalSolution | undefined = undefined;
        if (isOptimal && phase === 2) {
            const finalVals: Record<string, string> = {};
            sortedVars.forEach(v => finalVals[v] = "0");
            currRowVars.forEach((v, i) => {
                if (sortedVars.includes(v)) finalVals[v] = currB[i].toString();
            });
            const finalFNum = calcFVal(currB, currRowVars, 2);
            const displayF = objectiveType === "min" ? finalFNum.neg().toString() : finalFNum.toString();
            
            const varsStr = sortedVars.map(v => `${v}=${finalVals[v]}`).join(", ");
            let eqStr = objective;
            const sortedVarsLen = [...sortedVars].sort((a, b) => b.length - a.length);
            sortedVarsLen.forEach(v => {
                const regex = new RegExp(v + "(?![0-9a-zA-Z])", 'g');
                eqStr = eqStr.replace(regex, `(${finalVals[v]})`);
            });
            finalSolution = { 
                varsString: varsStr, 
                checkEquation: `f* = ${eqStr} = ${displayF}` 
            };
        }

        steps.push({
          table: {
            phase: phase as 1 | 2,
            colVars: [...currColVars],
            rowVars: [...currRowVars],
            matrix: currMatrix.map(r => r.map(c => new Fraction(c.numerator, c.denominator))),
            bCol: [...currB],
            fRow,
            fVal,
            pivot: isOptimal ? undefined : { row: pivotRow, col: pivotCol },
            ratios: isOptimal ? undefined : ratios,
            currentObjectiveStr: currentObjStr
          },
          description: isOptimal 
            ? (phase === 1 ? "Оптимум фазы I. Искусственные переменные исключены." : "План оптимален.")
            : `Ввод: ${currColVars[pivotCol]}. Вывод: ${currRowVars[pivotRow]}. RE: ${currMatrix[pivotRow][pivotCol]}`,
          isOptimal,
          calculations: currentDisplayLogs,
          finalSolution
        });

        if (isOptimal) {
          if (phase === 1) {
            if (Math.abs(fVal.toNumber()) > 1e-6) throw new Error(`Решения нет (F* = ${fVal.toNumber().toFixed(2)} != 0 в фазе 1)`);
            const newColIndices: number[] = [];
            const newColVars: string[] = [];
            currColVars.forEach((v, i) => {
              if (!v.startsWith("w")) {
                newColVars.push(v);
                newColIndices.push(i);
              }
            });
            const nextMatrix = currMatrix.map(row => newColIndices.map(i => row[i]));
            currColVars = newColVars;
            currMatrix = nextMatrix;
            phase = 2;
            transitionLogs = [];
            continue;
          } else {
            break;
          }
        }

        // --- ГЕНЕРАЦИЯ ЛОГОВ ПЕРЕХОДА (ДЛЯ СЛЕДУЮЩЕГО ШАГА) ---
        // Создаем "будущие" имена переменных для логов
        transitionLogs = [];
        const pivotEl = currMatrix[pivotRow][pivotCol];
        const fLabel = phase === 1 ? "F" : "f";
        const enteringVar = currColVars[pivotCol];
        const leavingVar = currRowVars[pivotRow];

        const nextRowVars = [...currRowVars];
        nextRowVars[pivotRow] = enteringVar; // Строка станет enteringVar
        const nextColVars = [...currColVars];
        nextColVars[pivotCol] = leavingVar; // Столбец станет leavingVar

        transitionLogs.push(`Разрешающий элемент (RE) = ${pivotEl}`);
        transitionLogs.push(`Строка: ${leavingVar}, Столбец: ${enteringVar}`);
        
        const nextMatrix = currMatrix.map(r => [...r]);
        const nextB = [...currB];

        // 1. Ведущая строка
        transitionLogs.push(`--- 1. Разрешающая строка (станет строкой '${nextRowVars[pivotRow]}') ---`);
        transitionLogs.push(`Формула: a_new = a_old / RE`);
        
        nextMatrix[pivotRow][pivotCol] = new Fraction(1).div(pivotEl);
        transitionLogs.push(`Ячейка на месте RE: 1 / ${pivotEl} = ${nextMatrix[pivotRow][pivotCol]}`);

        for (let j = 0; j < currColVars.length; j++) {
          if (j !== pivotCol) {
            const oldVal = currMatrix[pivotRow][j];
            nextMatrix[pivotRow][j] = oldVal.div(pivotEl);
            transitionLogs.push(`[${nextRowVars[pivotRow]}, ${nextColVars[j]}]: ${oldVal} / ${pivotEl} = ${nextMatrix[pivotRow][j]}`);
          }
        }
        nextB[pivotRow] = currB[pivotRow].div(pivotEl);
        transitionLogs.push(`[${nextRowVars[pivotRow]}, b]: ${currB[pivotRow]} / ${pivotEl} = ${nextB[pivotRow]}`);

        // 2. Разрешающий столбец
        transitionLogs.push(`--- 2. Разрешающий столбец (станет столбцом '${nextColVars[pivotCol]}') ---`);
        transitionLogs.push(`Формула: a_new = -a_old / RE`);
        for (let i = 0; i < currRowVars.length; i++) {
          if (i !== pivotRow) {
            const oldVal = currMatrix[i][pivotCol];
            nextMatrix[i][pivotCol] = oldVal.div(pivotEl).neg();
            transitionLogs.push(`[${nextRowVars[i]}, ${nextColVars[pivotCol]}]: -(${oldVal}) / ${pivotEl} = ${nextMatrix[i][pivotCol]}`);
          }
        }

        // 3. Остальные
        transitionLogs.push(`--- 3. Остальные элементы (Правило прямоугольника) ---`);
        transitionLogs.push(`Формула: a_new = a_old - (RowElem * ColElem) / RE`);
        
        for (let i = 0; i < currRowVars.length; i++) {
          if (i === pivotRow) continue;
          for (let j = 0; j < currColVars.length; j++) {
            if (j === pivotCol) continue;
            
            const oldVal = currMatrix[i][j];
            const rowEl = currMatrix[i][pivotCol];
            const colEl = currMatrix[pivotRow][j];
            const rect = rowEl.mul(colEl).div(pivotEl);
            nextMatrix[i][j] = oldVal.sub(rect);
            
            transitionLogs.push(`[${nextRowVars[i]}, ${nextColVars[j]}]: ${oldVal} - (${rowEl}·${colEl})/${pivotEl} = ${nextMatrix[i][j]}`);
          }
          const oldB = currB[i];
          const rowEl = currMatrix[i][pivotCol];
          const colEl = currB[pivotRow];
          const rect = rowEl.mul(colEl).div(pivotEl);
          nextB[i] = oldB.sub(rect);
          transitionLogs.push(`[${nextRowVars[i]}, b]: ${oldB} - (${rowEl}·${colEl})/${pivotEl} = ${nextB[i]}`);
        }

        // 4. Пересчет F
        transitionLogs.push(`--- 4. Строка оценок ${fLabel} (Правило прямоугольника) ---`);
        const fPivot = fRow[pivotCol];
        
        const newFPivotCol = fPivot.div(pivotEl).neg();
        transitionLogs.push(`${fLabel}(${nextColVars[pivotCol]}): -(${fPivot}) / ${pivotEl} = ${newFPivotCol}`);

        for (let j = 0; j < currColVars.length; j++) {
            if (j !== pivotCol) {
                const oldF = fRow[j];
                const colEl = currMatrix[pivotRow][j]; 
                const rect = fPivot.mul(colEl).div(pivotEl);
                const newF = oldF.sub(rect);
                transitionLogs.push(`${fLabel}(${nextColVars[j]}): ${oldF} - (${fPivot}·${colEl})/${pivotEl} = ${newF}`);
            }
        }
        const oldFVal = fVal;
        const bEl = currB[pivotRow];
        const rectF = fPivot.mul(bEl).div(pivotEl);
        const newFVal = oldFVal.sub(rectF);
        transitionLogs.push(`${fLabel}(b): ${oldFVal} - (${fPivot}·${bEl})/${pivotEl} = ${newFVal}`);

        currColVars[pivotCol] = leavingVar;
        currRowVars[pivotRow] = enteringVar;

        currMatrix = nextMatrix;
        currB = nextB;
        
        iter++;
      }
      setResultSteps(steps);

    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans text-gray-800">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">Симплекс-метод</h1>

      <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-blue-100 mb-8">
        <div className="flex flex-col md:flex-row gap-6 items-start mb-6">
            <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wider">Целевая функция F(x)</label>
                <div className="flex flex-col md:flex-row items-stretch md:items-center bg-gray-50 p-1 rounded-2xl md:rounded-full border focus-within:ring-2 focus-within:ring-blue-300 focus-within:border-blue-400 transition-all gap-2 md:gap-0">
                    <input 
                        value={objective} 
                        onChange={e => setObjective(e.target.value)} 
                        className="flex-1 bg-transparent p-3 outline-none font-mono text-lg pl-4 text-center md:text-left" 
                        placeholder="-2x1 + x2"
                    />
                    <div className="flex bg-white rounded-full p-1 shadow-sm justify-center">
                        <button onClick={() => setObjectiveType("max")} className={`px-4 py-2 rounded-full text-xs font-bold transition ${objectiveType === "max" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:bg-gray-100"}`}>max</button>
                        <button onClick={() => setObjectiveType("min")} className={`px-4 py-2 rounded-full text-xs font-bold transition ${objectiveType === "min" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:bg-gray-100"}`}>min</button>
                    </div>
                    
                    <button onClick={calculate} className="bg-blue-600 hover:bg-blue-700 text-white h-12 md:w-12 rounded-full md:ml-2 shadow-md transition-transform active:scale-95 flex items-center justify-center flex-shrink-0 mt-2 md:mt-0">
                        <span className="md:hidden font-bold mr-2">Решить</span>
                        <TbArrowRight className="text-xl"/>
                    </button>
                </div>
            </div>
        </div>

        <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Система ограничений</label>
            <div className="space-y-3">
                {constraints.map((c, i) => (
                <div key={c.id} className="flex items-center gap-3">
                    <span className="text-gray-300 font-mono w-6 text-right text-sm">{i+1}.</span>
                    <input value={c.value} onChange={e => updateConstraint(c.id, "value", e.target.value)} className="flex-1 p-3 border rounded-lg font-mono bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition text-sm md:text-base min-w-0" placeholder="x1 + x2 <= 5"/>
                    <button onClick={() => removeConstraint(c.id)} className="text-red-300 hover:text-red-500 p-2 rounded hover:bg-red-50 transition shrink-0">✕</button>
                </div>
                ))}
            </div>
            <button onClick={addConstraint} className="mt-4 text-blue-600 text-sm font-bold hover:underline flex items-center gap-1">
                <span>+</span> Добавить ограничение
            </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg mb-6">{error}</div>}

      {resultSteps && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {resultSteps.map((step, idx) => (
            <div key={idx} className="bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-2 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm shadow-md shrink-0">
                        {idx}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 font-medium border-l border-gray-300 pl-3">
                        <TbMathFunction className="text-blue-500"/> 
                        <span className="truncate max-w-[200px] md:max-w-none">{step.table.currentObjectiveStr}</span>
                    </div>
                </div>
                {step.isOptimal && <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide self-start md:self-auto">Оптимально</span>}
              </div>

              <div className="p-4 md:p-6">
                <div className="mb-6 text-sm text-gray-600 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                    {step.description}
                </div>
                
                <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
                    <table className="w-full border-collapse text-center text-sm font-mono shadow-sm rounded-lg overflow-hidden min-w-[300px]">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 uppercase text-xs tracking-wider">
                        <th className="p-2 md:p-3 border-b border-gray-200">Базис</th>
                        {step.table.colVars.map(h => <th key={h} className="p-2 md:p-3 border-b border-gray-200 bg-white">{h}</th>)}
                        <th className="p-2 md:p-3 border-b border-gray-200 bg-gray-50">b</th>
                        {!step.isOptimal && <th className="p-2 md:p-3 border-b border-gray-200 text-gray-400">ratio</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {step.table.rowVars.map((rowVar, rIdx) => {
                            const isPivotRow = step.table.pivot?.row === rIdx;
                            return (
                                <tr key={rIdx} className={isPivotRow ? "bg-yellow-50" : "hover:bg-gray-50 transition-colors"}>
                                    <td className="p-2 md:p-3 border-b border-gray-100 font-bold text-gray-700 bg-gray-50">{rowVar}</td>
                                    {step.table.matrix[rIdx].map((val, cIdx) => {
                                        const isPivot = isPivotRow && step.table.pivot?.col === cIdx;
                                        return (
                                            <td key={cIdx} className={`p-2 md:p-3 border-b border-gray-100 ${isPivot ? "bg-yellow-200 font-bold text-yellow-900 ring-2 ring-yellow-300 ring-inset" : ""}`}>
                                                {val.toString()}
                                            </td>
                                        );
                                    })}
                                    <td className="p-2 md:p-3 border-b border-gray-100 font-bold text-blue-600 bg-gray-50/50">{step.table.bCol[rIdx].toString()}</td>
                                    {!step.isOptimal && <td className="p-2 md:p-3 border-b border-gray-100 text-xs text-gray-400">{step.table.ratios?.[rIdx] || "-"}</td>}
                                </tr>
                            );
                        })}
                        <tr className="bg-gray-50 font-bold border-t-2 border-gray-200">
                        <td className="p-2 md:p-3 text-red-500">{step.table.phase === 1 ? "F" : "f"}</td>
                        {step.table.fRow.map((val, idx) => (
                            <td key={idx} className={`p-2 md:p-3 ${val.isNegative() ? "text-red-600" : "text-green-700"} ${step.table.pivot?.col === idx ? "bg-blue-50" : ""}`}>
                            {val.toString()}
                            </td>
                        ))}
                        <td className="p-2 md:p-3 text-blue-800 text-base">{step.table.fVal.toString()}</td>
                        {!step.isOptimal && <td></td>}
                        </tr>
                    </tbody>
                    </table>
                </div>

                <details className="group mt-6">
                    <summary className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-400 hover:text-blue-600 uppercase tracking-wider transition-colors select-none p-2 -ml-2">
                        <TbCalculator className="text-lg"/>
                        <span>Подробные расчеты</span>
                        <TbChevronDown className="transition-transform group-open:rotate-180 text-lg"/>
                    </summary>
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 space-y-1.5 max-h-80 overflow-y-auto shadow-inner">
                        {step.calculations.length > 0 
                            ? step.calculations.map((line, i) => (
                                <div key={i} className={`pb-1 ${line.startsWith("---") || line.startsWith("Разрешающий") || line.startsWith("Расчет") || line.startsWith("Формула") ? "font-bold text-blue-700 pt-2 border-b border-slate-200 mb-1" : "border-b border-slate-100 last:border-0"}`}>
                                    {line.replace("---", "").trim()}
                                </div>
                            ))
                            : <div className="text-gray-400 italic">Начальная таблица.</div>
                        }
                    </div>
                </details>

                {step.finalSolution && (
                    <div className="mt-8 bg-green-50 rounded-xl border border-green-200 p-5">
                        <div className="flex items-center gap-2 text-green-800 font-bold mb-2 border-b border-green-200 pb-2">
                            <TbCheck className="text-xl"/> Ответ
                        </div>
                        <div className="font-mono text-green-900 font-bold text-sm break-all">
                            {step.finalSolution.varsString}, {step.finalSolution.checkEquation}
                        </div>
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}