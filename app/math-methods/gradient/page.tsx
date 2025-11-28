"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbCheck, TbArrowRight, TbCalculator, TbChevronDown, TbMathFunction } from 'react-icons/tb';

// --- Класс Дроби ---
class Fraction {
  numerator: number;
  denominator: number;

  constructor(val: number | string | Fraction, den: number = 1) {
    if (val instanceof Fraction) {
        this.numerator = val.numerator;
        this.denominator = val.denominator;
        return;
    }

    if (typeof val === 'string') {
        val = val.trim();
        if (val.includes('/')) {
            const [n, d] = val.split('/');
            this.numerator = parseInt(n);
            this.denominator = parseInt(d);
        } else if (val.includes('.')) {
            const v = parseFloat(val);
            const len = val.split('.')[1].length;
            const factor = Math.pow(10, len);
            this.numerator = Math.round(v * factor);
            this.denominator = factor;
        } else {
            this.numerator = parseInt(val) || 0;
            this.denominator = 1;
        }
    } else {
        this.numerator = val;
        this.denominator = den;
    }
    
    if (this.denominator === 0) throw new Error("Division by zero");
    
    if (this.denominator < 0) {
        this.numerator = -this.numerator;
        this.denominator = -this.denominator;
    }
    
    const common = this.gcd(Math.abs(this.numerator), Math.abs(this.denominator));
    this.numerator /= common;
    this.denominator /= common;
  }

  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b);
  }

  add(other: Fraction | number): Fraction {
    const o = new Fraction(other);
    return new Fraction(this.numerator * o.denominator + o.numerator * this.denominator, this.denominator * o.denominator);
  }
  sub(other: Fraction | number): Fraction {
    const o = new Fraction(other);
    return new Fraction(this.numerator * o.denominator - o.numerator * this.denominator, this.denominator * o.denominator);
  }
  mul(other: Fraction | number): Fraction {
    const o = new Fraction(other);
    return new Fraction(this.numerator * o.numerator, this.denominator * o.denominator);
  }
  div(other: Fraction | number): Fraction {
    const o = new Fraction(other);
    return new Fraction(this.numerator * o.denominator, this.denominator * o.numerator);
  }
  neg(): Fraction { return new Fraction(-this.numerator, this.denominator); }
  
  toNumber(): number { return this.numerator / this.denominator; }
  
  isZero(): boolean { return this.numerator === 0; }
  isNegative(): boolean { return this.numerator < 0; }

  toString(isCoeff = false, wrapInParensIfNegative = false): string { 
    let str = "";
    if (this.denominator === 1) str = `${this.numerator}`;
    else str = `${this.numerator}/${this.denominator}`;

    if (isCoeff) {
        if (this.numerator === 0) return "";
        if (this.numerator === 1 && this.denominator === 1) return "";
        if (this.numerator === -1 && this.denominator === 1) return "-";
    }

    if (wrapInParensIfNegative && this.isNegative()) return `(${str})`;
    return str;
  }
}

// --- Типы ---
interface IterationLog {
    k: number;
    point: { x1: Fraction, x2: Fraction };
    grad: { x1: Fraction, x2: Fraction };
    normSquared: Fraction;
    normVal: number;
    stepParam: Fraction; // alpha или t
    nextPoint: { x1: Fraction, x2: Fraction };
    desc: string;
    calculations: string[];
}

interface CoeffsInput {
    A: string; B: string; C: string; D: string; E: string; F: string;
}

// Пресеты из лекций
const PRESETS = [
    {
        name: "x₁² - 5x₁ + x₂² + 3x₂",
        coeffs: { A: "1", B: "1", C: "0", D: "-5", E: "3", F: "0" },
        start: { x1: "0", x2: "0" },
        mode: 'steepest' as const, // Наискорейший спуск
        alpha: "0"
    },
    {
        name: "x₁² - 4x₁ + x₂² - 2x₂",
        coeffs: { A: "1", B: "1", C: "0", D: "-4", E: "-2", F: "0" },
        start: { x1: "4", x2: "5" }, 
        mode: 'steepest' as const,
        alpha: "0"
    }
];

export default function GradientCalculator() {
    const [coeffs, setCoeffs] = useState<CoeffsInput>(PRESETS[1].coeffs);
    const [startPoint, setStartPoint] = useState({ x1: "0", x2: "0" }); // Старт из (0,0) по умолчанию для примера 2
    const [alpha, setAlpha] = useState("1/2");
    const [epsilon, setEpsilon] = useState("0.1");
    const [mode, setMode] = useState<'const' | 'steepest'>('steepest');
    
    const [logs, setLogs] = useState<IterationLog[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Helpers
    const parseC = (c: CoeffsInput) => ({
        A: new Fraction(c.A), B: new Fraction(c.B), C: new Fraction(c.C),
        D: new Fraction(c.D), E: new Fraction(c.E), F: new Fraction(c.F)
    });
    
    const getFuncString = () => {
        const c = parseC(coeffs);
        const parts = [];
        if (!c.A.isZero()) parts.push(`${c.A.toString(true)}x₁²`);
        if (!c.B.isZero()) {
            const s = c.B.toString(true);
            parts.push(`${(!s.startsWith('-') && parts.length) ? '+' : ''}${s}x₂²`);
        }
        if (!c.C.isZero()) {
            const s = c.C.toString(true);
            parts.push(`${(!s.startsWith('-') && parts.length) ? '+' : ''}${s}x₁x₂`);
        }
        if (!c.D.isZero()) {
            const s = c.D.toString(true);
            parts.push(`${(!s.startsWith('-') && parts.length) ? '+' : ''}${s}x₁`);
        }
        if (!c.E.isZero()) {
            const s = c.E.toString(true);
            parts.push(`${(!s.startsWith('-') && parts.length) ? '+' : ''}${s}x₂`);
        }
        if (!c.F.isZero()) {
            const s = c.F.toString();
            parts.push(`${(!s.startsWith('-') && parts.length) ? '+' : ''}${s}`);
        }
        return parts.join(' ') || "0";
    };

    // --- MAIN CALCULATION ---
    const calculate = () => {
        setLogs(null);
        setError(null);
        
        try {
            const c = parseC(coeffs);
            const epsVal = new Fraction(epsilon).toNumber();
            const alphaFrac = new Fraction(alpha);

            const steps: IterationLog[] = [];
            let current = { x1: new Fraction(startPoint.x1), x2: new Fraction(startPoint.x2) };
            
            // В конспектах итерации начинаются с 1 (x^(1) - стартовая)
            let iter = 1; 
            const maxIter = 10; 

            while (iter <= maxIter) {
                const calculations: string[] = [];
                calculations.push(`--- Итерация ${iter} ---`);
                calculations.push(`Текущая точка x^(${iter}) = (${current.x1.toString()}; ${current.x2.toString()})`);

                // 1. Градиент
                // df/dx1 = 2Ax1 + Cx2 + D
                // df/dx2 = 2Bx2 + Cx1 + E
                
                // x1 component
                const termA = c.A.mul(current.x1).mul(2);
                const termC1 = c.C.mul(current.x2);
                const gradX1 = termA.add(termC1).add(c.D);

                // x2 component
                const termB = c.B.mul(current.x2).mul(2);
                const termC2 = c.C.mul(current.x1);
                const gradX2 = termB.add(termC2).add(c.E);
                
                calculations.push(`--- 1. Вычисляем градиент ∇f(x^(${iter})) ---`);
                calculations.push(`∇f = ( ∂f/∂x₁; ∂f/∂x₂ )`);
                
                // Красивый вывод подстановки чисел
                const subX1 = `2·${c.A.toString(false, true)}·${current.x1.toString(false, true)} + ${c.C.toString(false, true)}·${current.x2.toString(false, true)} + ${c.D.toString(false, true)}`;
                const subX2 = `2·${c.B.toString(false, true)}·${current.x2.toString(false, true)} + ${c.C.toString(false, true)}·${current.x1.toString(false, true)} + ${c.E.toString(false, true)}`;
                
                calculations.push(`∂f/∂x₁ = ${subX1} = ${gradX1.toString()}`);
                calculations.push(`∂f/∂x₂ = ${subX2} = ${gradX2.toString()}`);
                calculations.push(`∇f(x^(${iter})) = (${gradX1.toString()}; ${gradX2.toString()})`);

                // 2. Норма (длина)
                const normSq = gradX1.mul(gradX1).add(gradX2.mul(gradX2));
                const normVal = Math.sqrt(normSq.toNumber());
                
                calculations.push(`--- 2. Длина градиента ---`);
                calculations.push(`|∇f| = √(${gradX1.toString()}² + ${gradX2.toString()}²) = √${normSq.toString()} ≈ ${normVal.toFixed(3)}`);
                
                // Проверка останова
                if (normVal <= epsVal) {
                    steps.push({
                        k: iter, point: current, grad: { x1: gradX1, x2: gradX2 },
                        normSquared: normSq, normVal, stepParam: new Fraction(0),
                        nextPoint: current,
                        desc: `Критерий выполнен: |∇f| (${normVal.toFixed(3)}) ≤ ε (${epsVal})`,
                        calculations
                    });
                    break;
                }
                
                // 3. Шаг
                let t = new Fraction(0);
                
                if (mode === 'const') {
                    t = alphaFrac;
                    calculations.push(`--- 3. Шаг (постоянный) ---`);
                    calculations.push(`α = ${t.toString()}`);
                } else {
                    // Наискорейший спуск
                    calculations.push(`--- 3. Поиск оптимального шага t ---`);
                    calculations.push(`Составим функцию f(t) вдоль антиградиента:`);
                    calculations.push(`x^(${iter+1}) = x^(${iter}) - t · ∇f(x^(${iter}))`);
                    
                    // Вектор спуска (антиградиент)
                    const g1 = gradX1; 
                    const g2 = gradX2;
                    
                    calculations.push(`x₁ = ${current.x1.toString()} - t·(${g1.toString()})`);
                    calculations.push(`x₂ = ${current.x2.toString()} - t·(${g2.toString()})`);
                    
                    // Коэффициенты для уравнения производной по t: f'(t) = At + B = 0
                    // f(t) для квадратичной функции это парабола a_quad*t^2 + b_lin*t + const
                    // Коэффициент при t^2 (a_quad): A*g1^2 + B*g2^2 + C*g1*g2
                    const termT2_1 = c.A.mul(g1).mul(g1);
                    const termT2_2 = c.B.mul(g2).mul(g2);
                    const termT2_3 = c.C.mul(g1).mul(g2);
                    const a_quad = termT2_1.add(termT2_2).add(termT2_3); // Это коэффициент при t^2
                    
                    // Коэффициент при t (b_lin): -|grad|^2 (всегда так для f(x-t*grad))
                    // Проверим: Производная f(x-tg) по t при t=0 равна -grad*grad.
                    const b_lin = normSq.neg();

                    // Формируем уравнение производной: f'(t) = 2*a_quad*t + b_lin = 0
                    // 2 * a_quad
                    const deriv_slope = a_quad.mul(2);
                    
                    // Логирование как в конспекте
                    // f(t) = ... t^2 ... t
                    calculations.push(`Подставим в f(x):`);
                    calculations.push(`f(t) = ${a_quad.toString()}t² ${b_lin.isNegative() ? '' : '+'}${b_lin.toString()}t + const`);
                    
                    calculations.push(`Берем производную по t и приравниваем к 0:`);
                    calculations.push(`f'(t) = ${deriv_slope.toString()}t ${b_lin.isNegative() ? '' : '+'}${b_lin.toString()} = 0`);
                    
                    if (deriv_slope.isZero()) {
                         throw new Error("Невозможно найти t (коэффициент при t равен 0)");
                    }
                    
                    t = b_lin.neg().div(deriv_slope);
                    calculations.push(`t = ${b_lin.neg().toString()} / ${deriv_slope.toString()} = ${t.toString()}`);
                }

                // 4. Новая точка
                const dx1 = t.mul(gradX1);
                const dx2 = t.mul(gradX2);
                
                const nextX1 = current.x1.sub(dx1);
                const nextX2 = current.x2.sub(dx2);
                
                calculations.push(`--- 4. Вычисляем x^(${iter+1}) ---`);
                calculations.push(`x₁^(${iter+1}) = ${current.x1.toString()} - ${t.toString()}·(${gradX1.toString()}) = ${nextX1.toString()}`);
                calculations.push(`x₂^(${iter+1}) = ${current.x2.toString()} - ${t.toString()}·(${gradX2.toString()}) = ${nextX2.toString()}`);

                const next = { x1: nextX1, x2: nextX2 };
                
                steps.push({
                    k: iter, point: current, grad: { x1: gradX1, x2: gradX2 },
                    normSquared: normSq, normVal, stepParam: t,
                    nextPoint: next,
                    desc: `Итерация ${iter}. Шаг t=${t.toString()}. |∇f| ≈ ${normVal.toFixed(2)}`,
                    calculations
                });

                current = next;
                iter++;
            }
            setLogs(steps);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : "Ошибка: проверьте данные. Возможно, деление на ноль.";
            setError(errorMessage);
        }
    };

    const loadPreset = (idx: number) => {
            const p = PRESETS[idx];
            setCoeffs(p.coeffs);
            setStartPoint(p.start);
            setMode(p.mode as 'const' | 'steepest');
            if ((p.mode as 'const' | 'steepest') === 'const') setAlpha(p.alpha);
            setLogs(null);
        };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 font-sans text-gray-800 pb-20">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center flex items-center justify-center gap-2">
                <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors"><TbSmartHome/></Link> 
                Градиентный спуск
            </h1>

            {/* Ввод данных */}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-blue-100 mb-8">
                <div className="flex flex-col gap-6">
                    
                    {/* Пресеты */}
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {PRESETS.map((p, i) => (
                            <button key={i} onClick={() => loadPreset(i)} className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs rounded-full whitespace-nowrap border border-blue-200 transition">
                                {p.name}
                            </button>
                        ))}
                    </div>

                    {/* Формула */}
                    <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <div className="text-xs font-bold text-gray-400 uppercase mb-2 text-center tracking-wider">Квадратичная функция f(x)</div>
                        <div className="text-center font-mono text-lg md:text-xl font-bold text-gray-700 break-words">
                            f(x) = {getFuncString()}
                        </div>
                    </div>

                    {/* Коэффициенты */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {(Object.keys(coeffs) as Array<keyof CoeffsInput>).map((key) => (
                            <div key={key} className="flex flex-col">
                                <label className="text-xs font-bold text-gray-400 mb-1 pl-1">
                                    {key === 'A' ? 'x₁²' : key === 'B' ? 'x₂²' : key === 'C' ? 'x₁x₂' : key === 'D' ? 'x₁' : key === 'E' ? 'x₂' : 'const'}
                                </label>
                                <input 
                                    type="text"
                                    value={coeffs[key]} 
                                    onChange={(e) => setCoeffs({...coeffs, [key]: e.target.value})}
                                    placeholder="0"
                                    className="p-2 border rounded text-center font-mono bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-100 outline-none transition"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Начальная точка */}
                        <div className="bg-gray-50 p-4 rounded-xl border">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-3">Начальная точка x⁽¹⁾</label>
                            <div className="flex gap-3">
                                <div className="flex items-center gap-2 w-full">
                                    <span className="text-gray-400 font-serif italic">x₁</span>
                                    <input type="text" value={startPoint.x1} onChange={(e) => setStartPoint({...startPoint, x1: e.target.value})} className="w-full p-2 border rounded text-center font-mono"/>
                                </div>
                                <div className="flex items-center gap-2 w-full">
                                    <span className="text-gray-400 font-serif italic">x₂</span>
                                    <input type="text" value={startPoint.x2} onChange={(e) => setStartPoint({...startPoint, x2: e.target.value})} className="w-full p-2 border rounded text-center font-mono"/>
                                </div>
                            </div>
                        </div>

                        {/* Параметры метода */}
                        <div className="bg-gray-50 p-4 rounded-xl border">
                             <div className="flex justify-between items-center mb-3">
                                <label className="block text-xs font-bold text-gray-500 uppercase">Метод спуска</label>
                                <div className="flex bg-white rounded p-0.5 border">
                                    <button onClick={() => setMode('const')} className={`px-2 py-0.5 text-xs rounded transition ${mode==='const' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-500'}`}>α=const</button>
                                    <button onClick={() => setMode('steepest')} className={`px-2 py-0.5 text-xs rounded transition ${mode==='steepest' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-500'}`}>Наискор.</button>
                                </div>
                             </div>
                             
                             <div className="flex gap-3">
                                {mode === 'const' && (
                                    <div className="flex items-center gap-2 w-full">
                                        <span className="text-gray-400 font-serif italic" title="Шаг обучения">α</span>
                                        <input type="text" value={alpha} onChange={(e) => setAlpha(e.target.value)} className="w-full p-2 border rounded text-center font-mono"/>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 w-full">
                                    <span className="text-gray-400 font-serif italic" title="Точность">ε</span>
                                    <input type="text" value={epsilon} onChange={(e) => setEpsilon(e.target.value)} className="w-full p-2 border rounded text-center font-mono"/>
                                </div>
                             </div>
                        </div>
                    </div>

                    <button onClick={calculate} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl shadow-md flex items-center justify-center gap-2 font-bold transition-transform active:scale-95">
                        <TbMathFunction className="text-xl"/> Рассчитать
                    </button>
                </div>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg mb-6 text-center text-sm">{error}</div>}

            {/* Результаты */}
            {logs && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {logs.map((step, idx) => (
                        <div key={idx} className={`bg-white shadow rounded-xl overflow-hidden border ${idx === logs.length - 1 ? 'border-green-200 ring-1 ring-green-100' : 'border-gray-100'}`}>
                            {/* Заголовок шага */}
                            <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center flex-wrap gap-2">
                                <div className="flex items-center gap-3">
                                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold ${idx === logs.length - 1 ? 'bg-green-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                                        {step.k}
                                    </span>
                                    <span className="font-mono text-sm font-bold text-gray-700">
                                        x^({step.k}) = ({step.point.x1.toString()}; {step.point.x2.toString()})
                                    </span>
                                </div>
                                <div className="text-xs font-mono text-gray-500 bg-white px-2 py-1 rounded border" title={`√${step.normSquared.toString()}`}>
                                    |∇f| ≈ {step.normVal.toFixed(3)}
                                </div>
                            </div>

                            <div className="p-4 md:p-6">
                                {/* Основная информация */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                                        <div className="text-xs text-blue-400 font-bold uppercase mb-1">Градиент ∇f</div>
                                        <div className="font-mono text-blue-800 font-bold">({step.grad.x1.toString()}; {step.grad.x2.toString()})</div>
                                    </div>
                                    <div className="bg-purple-50/50 p-3 rounded-lg border border-purple-100">
                                        <div className="text-xs text-purple-400 font-bold uppercase mb-1">{mode === 'const' ? 'Шаг α' : 'Опт. шаг t'}</div>
                                        <div className="font-mono text-purple-800 font-bold">{step.stepParam.toString()}</div>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 mb-4">{step.desc}</p>

                                {/* Раскрывающийся список расчетов */}
                                <details className="group">
                                    <summary className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-400 hover:text-blue-600 uppercase tracking-wider transition-colors select-none p-2 -ml-2">
                                        <TbCalculator className="text-lg"/>
                                        <span>Подробные расчеты</span>
                                        <TbChevronDown className="transition-transform group-open:rotate-180 text-lg"/>
                                    </summary>
                                    <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-mono text-slate-600 space-y-1.5 max-h-80 overflow-y-auto shadow-inner">
                                        {step.calculations.map((line, i) => (
                                            <div key={i} className={`pb-1 ${line.startsWith("---") ? "font-bold text-blue-700 pt-2 border-b border-slate-200 mb-1" : "border-b border-slate-100 last:border-0"}`}>
                                                {line}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </div>
                            
                            {/* Следующая точка */}
                            {idx !== logs.length - 1 && (
                                <div className="bg-gray-50/50 px-4 py-2 border-t text-xs font-mono text-gray-500 flex items-center justify-end gap-2">
                                    <span>Следующая точка:</span>
                                    <span className="font-bold text-gray-700">x^({step.k+1}) = ({step.nextPoint.x1.toString()}; {step.nextPoint.x2.toString()})</span>
                                    <TbArrowRight/>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Итоговый ответ */}
                    <div className="bg-green-50 border border-green-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-green-100 p-3 rounded-full text-green-700"><TbCheck className="text-2xl"/></div>
                            <div>
                                <div className="text-xs font-bold text-green-600 uppercase mb-1">Минимум найден</div>
                                <div className="text-xl md:text-2xl font-bold text-green-900 font-mono">
                                    ({logs[logs.length-1].point.x1.toString()}; {logs[logs.length-1].point.x2.toString()})
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
