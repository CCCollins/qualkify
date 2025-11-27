"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbCheck, TbArrowRight, TbCalculator, TbChevronDown } from 'react-icons/tb';

// --- Класс Дроби ---
class Fraction {
  numerator: number;
  denominator: number;

  constructor(num: number, den: number = 1) {
    if (den === 0) throw new Error("Division by zero");
    if (!Number.isInteger(num) || !Number.isInteger(den)) {
        const precision = 1000000;
        num = Math.round(num * precision);
        den = Math.round(den * precision);
    }
    const common = this.gcd(Math.abs(num), Math.abs(den));
    if (den < 0) { num = -num; den = -den; }
    this.numerator = num / common;
    this.denominator = den / common;
  }

  private gcd(a: number, b: number): number {
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
    return `${this.numerator}/${this.denominator}`; 
  }
  toDecimal(digits = 3): string { return (this.numerator / this.denominator).toFixed(digits).replace(/\.?0+$/, ""); }
  
  toCoeff(varName: string): string {
      if (this.numerator === 0) return ""; 
      if (this.numerator === 1 && this.denominator === 1) return varName;
      return `${this.toString()}${varName}`;
  }

  isPositive(): boolean { return this.numerator > 0; }
  isZero(): boolean { return this.numerator === 0; }
}

// --- Типы ---
interface SimplexTable {
    colHeaders: string[]; // Исправлено с colVars
    rowHeaders: string[]; // Исправлено с rowVars
    matrix: Fraction[][];
    b: Fraction[];
    fRow: Fraction[];
    pivot?: { r: number, c: number };
}

interface SimplexStep {
    table: SimplexTable;
    desc: string;
    calculations: string[];
}

interface Step {
  title: string;
  desc: string;
  matrix?: Fraction[][];
  rowLabels?: string[];
  colLabels?: string[];
  highlight?: { r?: number, c?: number, type: 'min' | 'max' | 'saddle' | 'remove' }[];
  math?: React.ReactNode[];
  simplexSteps?: SimplexStep[];
}

interface Result {
  V: string;
  P: string[];
  Q: string[];
  steps: Step[];
}

export default function MatrixGamePage() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const [matrixInput, setMatrixInput] = useState<string[][]>([
    ['1', '7', '8', '10'],
    ['9', '6', '0', '5'],
    ['0', '3', '4', '2']
  ]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResize = (r: number, c: number) => {
    setRows(r); setCols(c);
    setMatrixInput(prev => {
        const newMat: string[][] = [];
        for(let i=0; i<r; i++) {
            const row: string[] = [];
            for(let j=0; j<c; j++) row.push(prev[i]?.[j] || '0');
            newMat.push(row);
        }
        return newMat;
    });
    setResult(null);
  };

  const updateCell = (r: number, c: number, val: string) => {
    const next = matrixInput.map(row => [...row]);
    next[r][c] = val;
    setMatrixInput(next);
  };

  // --- SIMPLEX ENGINE ---
  const runSimplex = (matA: Fraction[][]) => {
      const m = matA.length;
      const n = matA[0].length;
      
      let colHeaders = Array(n).fill(0).map((_, i) => `y${i+1}`);
      let rowHeaders = Array(m).fill(0).map((_, i) => `u${i+1}`);
      
      let matrix = matA.map(row => row.map(v => v));
      let b = Array(m).fill(new Fraction(1));
      let fRow = Array(n).fill(new Fraction(-1));

      const steps: SimplexStep[] = [];
      let iter = 0;
      let nextLogs: string[] = [];

      // Логи для начального шага
      const initLogs: string[] = ["--- Начальная таблица ---", "F(yj) = Zj - Cj = 0 - 1 = -1"];

      while(iter < 15) {
          let minVal = new Fraction(0);
          let pCol = -1;
          for(let j=0; j<fRow.length; j++) {
              if (fRow[j].toNumber() < minVal.toNumber() - 1e-9) {
                  minVal = fRow[j];
                  pCol = j;
              }
          }

          const isOptimal = pCol === -1;
          let pRow = -1;

          if (!isOptimal) {
              let minRatio = Infinity;
              for(let i=0; i<m; i++) {
                  const val = matrix[i][pCol];
                  if (val.isPositive()) {
                      const r = b[i].div(val).toNumber();
                      if (r < minRatio) { minRatio = r; pRow = i; }
                  }
              }
          }

          steps.push({
              table: { 
                  colHeaders: [...colHeaders], 
                  rowHeaders: [...rowHeaders], 
                  matrix: matrix.map(r=>[...r]), 
                  b: [...b], 
                  fRow: [...fRow], 
                  pivot: isOptimal ? undefined : {r: pRow, c: pCol} 
              },
              desc: isOptimal ? "Оптимальное решение найдено." : `Вводим ${colHeaders[pCol]}, выводим ${rowHeaders[pRow]}.`,
              calculations: iter === 0 ? initLogs : nextLogs
          });

          if (isOptimal || pRow === -1) break;

          // --- Жордановы преобразования (расчет) ---
          nextLogs = [];
          const pivotVal = matrix[pRow][pCol];
          const nextMatrix = matrix.map(r => [...r]);
          const nextB = [...b];
          const nextF = [...fRow];

          nextLogs.push(`Разрешающий элемент (RE) = ${pivotVal.toString()}`);

          // 1. Ведущая строка
          nextMatrix[pRow][pCol] = new Fraction(1).div(pivotVal);
          for(let j=0; j<n; j++) {
              if(j !== pCol) {
                  nextMatrix[pRow][j] = matrix[pRow][j].div(pivotVal);
                  nextLogs.push(`[${rowHeaders[pRow]}, ${colHeaders[j]}]: ${matrix[pRow][j]} / ${pivotVal} = ${nextMatrix[pRow][j]}`);
              }
          }
          nextB[pRow] = b[pRow].div(pivotVal);

          // 2. Ведущий столбец
          for(let i=0; i<m; i++) {
              if(i !== pRow) {
                  nextMatrix[i][pCol] = matrix[i][pCol].div(pivotVal).neg();
              }
          }
          nextF[pCol] = fRow[pCol].div(pivotVal).neg();

          // 3. Прямоугольник
          for(let i=0; i<m; i++) {
              if(i === pRow) continue;
              for(let j=0; j<n; j++) {
                  if(j === pCol) continue;
                  const sub = matrix[i][pCol].mul(matrix[pRow][j]).div(pivotVal);
                  nextMatrix[i][j] = matrix[i][j].sub(sub);
                  // Пример расчета для логов (ограничим, чтобы не забивать)
                  if(nextLogs.length < 20) nextLogs.push(`[${rowHeaders[i]}, ${colHeaders[j]}]: ${matrix[i][j]} - (${matrix[i][pCol]}·${matrix[pRow][j]})/${pivotVal} = ${nextMatrix[i][j]}`);
              }
              const subB = matrix[i][pCol].mul(b[pRow]).div(pivotVal);
              nextB[i] = b[i].sub(subB);
          }

          // F row
          for(let j=0; j<n; j++) {
              if(j === pCol) continue;
              const subF = fRow[pCol].mul(matrix[pRow][j]).div(pivotVal);
              nextF[j] = fRow[j].sub(subF);
          }

          // Swap
          const entering = colHeaders[pCol];
          const leaving = rowHeaders[pRow];
          colHeaders[pCol] = leaving;
          rowHeaders[pRow] = entering;

          matrix = nextMatrix;
          b = nextB;
          fRow = nextF;
          iter++;
      }

      // Результаты
      let Z = new Fraction(0);
      const yRes = Array(n).fill(new Fraction(0));
      rowHeaders.forEach((varName, i) => {
          if (varName.startsWith('y')) {
              const idx = parseInt(varName.slice(1)) - 1;
              yRes[idx] = b[i];
              Z = Z.add(b[i]);
          }
      });

      const xRes = Array(m).fill(new Fraction(0));
      for(let i=0; i<m; i++) {
          // Двойственные переменные находятся в F-строке под бывшими slack-переменными (u)
          // Если u_i в заголовке (свободная) -> значение берем из F
          const uName = `u${i+1}`;
          const colIdx = colHeaders.indexOf(uName);
          if (colIdx !== -1) {
              xRes[i] = fRow[colIdx];
          }
      }

      return { steps, Z, yRes, xRes };
  };

  // --- MAIN SOLVE ---
  const solve = () => {
    try {
      setError(null);
      setResult(null);
      const solutionSteps: Step[] = [];

      let mat = matrixInput.map(row => row.map(v => new Fraction(parseFloat(v) || 0)));
      let rowIndices = Array(rows).fill(0).map((_, i) => i);
      let colIndices = Array(cols).fill(0).map((_, i) => i);

      // 1. Упрощение
      let changed = true;
      while (changed) {
        changed = false;
        const rKeep = new Set(rowIndices.map((_, i) => i));
        const cKeep = new Set(colIndices.map((_, i) => i));
        let removed = false;

        // Строки
        for (let i = 0; i < mat.length; i++) {
            if (!rKeep.has(i)) continue;
            for (let k = 0; k < mat.length; k++) {
                if (i === k || !rKeep.has(k)) continue;
                if (mat[i].every((val, idx) => val.toNumber() <= mat[k][idx].toNumber())) {
                    rKeep.delete(i);
                    solutionSteps.push({
                        title: "Упрощение (Строки)",
                        desc: `A${rowIndices[i]+1} ≤ A${rowIndices[k]+1}. Удаляем A${rowIndices[i]+1}.`,
                        matrix: mat,
                        rowLabels: rowIndices.map(i => `A${i+1}`),
                        colLabels: colIndices.map(i => `B${i+1}`),
                        highlight: [{ r: i, type: 'remove' }]
                    });
                    removed = true; changed = true; break;
                }
            }
            if (removed) break;
        }
        if (removed) {
            mat = mat.filter((_, i) => rKeep.has(i));
            rowIndices = rowIndices.filter((_, i) => rKeep.has(i));
            continue;
        }

        // Столбцы
        for (let j = 0; j < mat[0].length; j++) {
            if (!cKeep.has(j)) continue;
            for (let k = 0; k < mat[0].length; k++) {
                if (j === k || !cKeep.has(k)) continue;
                if (mat.map(r => r[j]).every((v, idx) => v.toNumber() >= mat.map(r => r[k])[idx].toNumber())) {
                    cKeep.delete(j);
                    solutionSteps.push({
                        title: "Упрощение (Столбцы)",
                        desc: `B${colIndices[j]+1} ≥ B${colIndices[k]+1}. Удаляем B${colIndices[j]+1}.`,
                        matrix: mat,
                        rowLabels: rowIndices.map(i => `A${i+1}`),
                        colLabels: colIndices.map(i => `B${i+1}`),
                        highlight: [{ c: j, type: 'remove' }]
                    });
                    removed = true; changed = true; break;
                }
            }
            if (removed) break;
        }
        if (removed) {
            mat = mat.map(r => r.filter((_, j) => cKeep.has(j)));
            colIndices = colIndices.filter((_, j) => cKeep.has(j));
        }
      }

      // 2. Седловая точка
      const rowMins = mat.map(r => r.reduce((min, c) => c.toNumber() < min.toNumber() ? c : min));
      const alpha = rowMins.reduce((max, c) => c.toNumber() > max.toNumber() ? c : max);
      
      const colMaxs: Fraction[] = [];
      for(let j=0; j<mat[0].length; j++) {
          let max = mat[0][j];
          for(let i=1; i<mat.length; i++) if(mat[i][j].toNumber() > max.toNumber()) max = mat[i][j];
          colMaxs.push(max);
      }
      const beta = colMaxs.reduce((min, c) => c.toNumber() < min.toNumber() ? c : min);

      solutionSteps.push({
          title: "Поиск седловой точки",
          desc: `α = ${alpha.toString()}, β = ${beta.toString()}`,
          matrix: mat,
          rowLabels: rowIndices.map(i => `A${i+1}`),
          colLabels: colIndices.map(i => `B${i+1}`),
          highlight: []
      });

      if (Math.abs(alpha.toNumber() - beta.toNumber()) < 1e-9) {
          const P = Array(rows).fill("0"); const Q = Array(cols).fill("0");
          const rIdx = rowMins.findIndex(m => Math.abs(m.toNumber() - alpha.toNumber()) < 1e-9);
          const cIdx = colMaxs.findIndex(m => Math.abs(m.toNumber() - beta.toNumber()) < 1e-9);
          if (rIdx !== -1) P[rowIndices[rIdx]] = "1";
          if (cIdx !== -1) Q[colIndices[cIdx]] = "1";
          setResult({ V: alpha.toString(), P, Q, steps: solutionSteps });
          return;
      }

      // 3. Решение
      let V_final: Fraction;
      let P_res = Array(rows).fill("0");
      let Q_res = Array(cols).fill("0");

      if (mat.length === 2 && mat[0].length === 2) {
          const a11 = mat[0][0], a12 = mat[0][1];
          const a21 = mat[1][0], a22 = mat[1][1];
          
          const denom = a11.add(a22).sub(a12).sub(a21);
          const p1 = a22.sub(a21).div(denom);
          const p2 = new Fraction(1).sub(p1);
          const q1 = a22.sub(a12).div(denom);
          const q2 = new Fraction(1).sub(q1);
          V_final = a11.mul(a22).sub(a12.mul(a21)).div(denom);

          const mathSteps = [
              <div key="s1"><strong>1. Система для B (q):</strong></div>,
              <div key="eq1">{a11.toString()}q₁ + {a12.toString()}q₂ = V</div>,
              <div key="eq2">{a21.toString()}q₁ + {a22.toString()}q₂ = V</div>,
              <div key="eq3">q₁ + q₂ = 1</div>,
              <div key="res1" className="mt-2">q₁ = <b>{q1.toString()}</b>, q₂ = <b>{q2.toString()}</b></div>,
              <div key="s2" className="mt-4"><strong>2. Система для A (p):</strong></div>,
              <div key="eq4">{a11.toString()}p₁ + {a21.toString()}p₂ = V</div>,
              <div key="eq5">{a12.toString()}p₁ + {a22.toString()}p₂ = V</div>,
              <div key="res2" className="mt-2">p₁ = <b>{p1.toString()}</b>, p₂ = <b>{p2.toString()}</b></div>,
              <div key="res3" className="mt-4 border-t pt-2">V = <b>{V_final.toString()}</b></div>
          ];

          solutionSteps.push({
              title: "Аналитическое решение (2x2)",
              desc: "Решаем системы линейных уравнений.",
              math: mathSteps,
          });

          P_res[rowIndices[0]] = p1.toString(); P_res[rowIndices[1]] = p2.toString();
          Q_res[colIndices[0]] = q1.toString(); Q_res[colIndices[1]] = q2.toString();

      } else {
          // SIMPLEX (NO SHIFT)
          const mathLogs: React.ReactNode[] = [];
          mathLogs.push(<div key="t1" className="font-bold">Матрица {mat.length}x{mat[0].length}. Сводим к ЗЛП.</div>);
          
          mathLogs.push(<div key="sys" className="mt-2 font-semibold">Ограничения (по строкам A):</div>);
          for(let i=0; i<mat.length; i++) {
              const parts: string[] = [];
              for(let j=0; j<mat[i].length; j++) {
                  const val = mat[i][j];
                  if (!val.isZero()) {
                      const vName = `y${colIndices[j]+1}`;
                      parts.push(val.toCoeff(vName));
                  }
              }
              mathLogs.push(<div key={`c${i}`}>{parts.join(" + ")} ≤ 1</div>);
          }
          mathLogs.push(<div key="obj" className="mt-1">Z = ∑yᵢ → max, yᵢ ≥ 0</div>);

          const simplexRes = runSimplex(mat);
          const Z = simplexRes.Z;
          const V_val = new Fraction(1).div(Z);
          V_final = V_val;

          const Q_calculated = simplexRes.yRes.map(y => y.mul(V_val));
          const P_calculated = simplexRes.xRes.map(x => x.mul(V_val));

          mathLogs.push(<div key="res" className="mt-4 pt-4 border-t border-blue-200">
              <div>Z (max) = {Z.toString()}</div>
              <div>Цена игры V = 1/Z = <b>{V_final.toString()}</b></div>
          </div>);

          solutionSteps.push({
              title: "Решение симплекс-методом",
              desc: "Используем симплекс-таблицы (метод прямоугольника) для решения ЗЛП.",
              simplexSteps: simplexRes.steps,
              math: mathLogs
          });

          P_calculated.forEach((val, i) => P_res[rowIndices[i]] = val.toString());
          Q_calculated.forEach((val, i) => Q_res[colIndices[i]] = val.toString());
      }

      setResult({
          V: V_final!.toString(),
          P: P_res,
          Q: Q_res,
          steps: solutionSteps
      });

    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 font-sans text-gray-800">
      <h1 className="text-2xl font-bold mb-6 text-center flex items-center justify-center gap-2">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors"><TbSmartHome/></Link> 
        Матричная игра
      </h1>

      <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-8">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-100">
            <div className="flex gap-4">
                <input type="number" value={rows} onChange={e => handleResize(+e.target.value, cols)} className="w-16 p-2 border rounded text-center font-bold"/>
                <span className="self-center text-gray-400">x</span>
                <input type="number" value={cols} onChange={e => handleResize(rows, +e.target.value)} className="w-16 p-2 border rounded text-center font-bold"/>
            </div>
            <button onClick={solve} className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 rounded-full shadow-md flex items-center justify-center transition-transform active:scale-95">
                <TbArrowRight className="text-xl"/>
            </button>
        </div>

        <div className="overflow-x-auto">
            <div className="inline-block border rounded-lg overflow-hidden">
                <div className="grid" style={{ gridTemplateColumns: `40px repeat(${cols}, 70px)` }}>
                    <div className="bg-gray-50 border-r border-b"></div>
                    {Array(cols).fill(0).map((_, j) => (
                        <div key={j} className="bg-gray-50 p-2 text-center text-xs font-bold text-gray-500 border-b border-r last:border-r-0">B{j+1}</div>
                    ))}
                    {matrixInput.map((row, i) => (
                        <React.Fragment key={i}>
                            <div className="bg-gray-50 p-2 text-center text-xs font-bold text-gray-500 border-r border-b last:border-b-0 flex items-center justify-center">A{i+1}</div>
                            {row.map((val, j) => (
                                <div key={j} className="border-r border-b last:border-r-0 last:border-b-0 bg-white">
                                    <input value={val} onChange={e => updateCell(i, j, e.target.value)} className="w-full h-full p-3 text-center outline-none focus:bg-blue-50 transition-colors text-sm font-medium"/>
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg mb-6">{error}</div>}

      {result && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {result.steps.map((step, idx) => (
                <div key={idx} className="bg-white shadow rounded-xl overflow-hidden border border-gray-100">
                    <div className="bg-gray-50 px-6 py-3 border-b font-bold text-gray-700 flex items-center gap-3">
                        <span className="bg-blue-100 text-blue-700 w-6 h-6 flex items-center justify-center rounded-full text-xs">{idx+1}</span>
                        {step.title}
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{step.desc}</p>
                        
                        {/* Обычная матрица */}
                        {step.matrix && !step.simplexSteps && !step.math && (
                            <div className="border rounded-lg overflow-hidden inline-block shadow-sm">
                                <div className="grid" style={{ gridTemplateColumns: `auto repeat(${step.matrix[0].length}, minmax(50px, auto))` }}>
                                    <div className="bg-gray-100"></div>
                                    {step.colLabels?.map((l, j) => <div key={j} className="bg-gray-100 p-2 text-xs font-bold text-center border-l border-white">{l}</div>)}
                                    {step.matrix.map((row, i) => (
                                        <React.Fragment key={i}>
                                            <div className="bg-gray-100 p-2 text-xs font-bold border-t border-white flex items-center justify-center">{step.rowLabels?.[i]}</div>
                                            {row.map((val, j) => {
                                                const hl = step.highlight?.find(h => h.r === i && h.c === j);
                                                let bg = "bg-white";
                                                if (hl?.type === 'remove') bg = "bg-gray-200 text-gray-400 decoration-line-through";
                                                else if (hl?.type === 'min') bg = "bg-blue-100";
                                                else if (hl?.type === 'max') bg = "bg-red-100";
                                                return <div key={j} className={`p-2 text-center border-t border-l border-gray-100 text-sm ${bg}`}>{val.toString()}</div>;
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Симплекс таблицы */}
                        {step.simplexSteps && (
                            <div className="space-y-6">
                                {step.math && <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 mb-4 space-y-1">
                                    {step.math}
                                </div>}
                                
                                <div className="grid gap-6 lg:grid-cols-2">
                                {step.simplexSteps.map((sst, sIdx) => (
                                    <div key={sIdx} className="border rounded-lg overflow-hidden shadow-sm">
                                        <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-600 border-b flex justify-between items-center">
                                            <span className="bg-white px-2 py-0.5 rounded border">Итерация {sIdx}</span>
                                            <span className="truncate ml-2" title={sst.desc}>{sst.desc}</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-center text-xs font-mono">
                                                <thead>
                                                    <tr className="bg-white text-gray-500 border-b">
                                                        <th className="p-1.5 border-r">Б</th>
                                                        {sst.table.colHeaders.map(h => <th key={h} className="p-1.5 border-r">{h}</th>)}
                                                        <th className="p-1.5 font-bold bg-gray-50">b</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sst.table.matrix.map((row, r) => (
                                                        <tr key={r} className="border-b last:border-0">
                                                            <td className="p-1.5 border-r font-bold bg-gray-50 text-slate-700">{sst.table.rowHeaders[r]}</td>
                                                            {row.map((val, c) => {
                                                                const isPivot = sst.table.pivot?.r === r && sst.table.pivot?.c === c;
                                                                return <td key={c} className={`p-1.5 border-r ${isPivot ? "bg-yellow-200 font-bold" : ""}`}>{val.toString()}</td>
                                                            })}
                                                            <td className="p-1.5 font-bold bg-gray-50">{sst.table.b[r].toString()}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="bg-gray-100 font-bold text-red-600 border-t">
                                                        <td className="p-1.5 border-r">F</td>
                                                        {sst.table.fRow.map((v, c) => <td key={c} className="p-1.5 border-r">{v.toString()}</td>)}
                                                        <td></td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                        
                                        <details className="group border-t border-gray-100">
                                            <summary className="bg-gray-50/50 p-2 text-[10px] text-blue-600 font-bold cursor-pointer uppercase flex items-center justify-center gap-1 hover:bg-gray-100 transition">
                                                <TbCalculator/> Расчеты <TbChevronDown className="group-open:rotate-180 transition"/>
                                            </summary>
                                            <div className="p-3 bg-white text-[10px] font-mono text-gray-500 max-h-40 overflow-y-auto space-y-1">
                                                {sst.calculations.map((c, i) => <div key={i} className={c.includes("---") ? "font-bold text-gray-700 pt-1" : ""}>{c}</div>)}
                                            </div>
                                        </details>
                                    </div>
                                ))}
                                </div>
                            </div>
                        )}

                        {/* Аналитический вывод */}
                        {!step.simplexSteps && step.math && (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 text-sm font-mono text-slate-800 w-full">
                                {step.math}
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Ответ */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2"><TbCheck/> Ответ</h3>
                <div className="grid md:grid-cols-3 gap-6">
                    <div>
                        <div className="text-xs font-bold text-green-600 uppercase mb-1">Цена игры (V)</div>
                        <div className="text-3xl font-bold text-green-900">{result.V}</div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-green-600 uppercase mb-1">P (Игрок A)</div>
                        <div className="flex flex-wrap gap-2 font-mono text-sm">
                            {result.P.map((p, i) => (
                                <span key={i} className={parseFloat(p) !== 0 ? "font-bold text-green-800 bg-white px-2 py-1 rounded border border-green-200" : "text-gray-400 opacity-50"}>p{i+1}={p}</span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-green-600 uppercase mb-1">Q (Игрок B)</div>
                        <div className="flex flex-wrap gap-2 font-mono text-sm">
                            {result.Q.map((q, i) => (
                                <span key={i} className={parseFloat(q) !== 0 ? "font-bold text-green-800 bg-white px-2 py-1 rounded border border-green-200" : "text-gray-400 opacity-50"}>q{i+1}={q}</span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
