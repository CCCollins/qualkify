'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbTrash } from 'react-icons/tb';

export default function BudgetQuickPage() {
  const [incomeRaw, setIncomeRaw] = useState('');
  const [expensesRaw, setExpensesRaw] = useState('');
  const [precision, setPrecision] = useState(2);

  const parseValues = (str: string): number[] => {
    return str
      .trim()
      .split(/\s+/)
      .map(expr => {
        try {
          const normalized = expr.replace(',', '.');
          if (/^[\d.+\-*/\s()]+$/.test(normalized)) {
            return Function(`"use strict"; return (${normalized})`)();
          }
          return 0;
        } catch {
          return 0;
        }
      })
      .filter(n => !isNaN(n));
  };

  const incomeVals = parseValues(incomeRaw);
  const expenseVals = parseValues(expensesRaw);

  const incomeSum = incomeVals.reduce((sum, n) => sum + n, 0);
  const expenseSum = expenseVals.reduce((sum, n) => sum + n, 0);
  const balance = incomeSum - expenseSum;

  const status =
    balance > 0 ? 'Профицитный' : balance < 0 ? 'Дефицитный' : 'Сбалансированный';

  const percent = (val: number) =>
    incomeSum > 0 ? Math.min(Math.abs(val / incomeSum) * 100, 100) : 0;

  const safe = (n: number, digits = precision) =>
    isNaN(n) || !isFinite(n) ? '0,00' : n.toFixed(digits).replace('.', ',');

  const resetFields = () => {
    setIncomeRaw('');
    setExpensesRaw('');
  };

  return (
    <main className="max-w-4xl mx-auto px-4 space-y-6 pb-10">
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">
          Баланс бюджета
        </h1>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 text-sm rounded">
        <ul className="list-disc list-inside text-xs text-gray-700">
          <li><b>Доходы = Регулирующие + Собственные:</b> налоги, сборы, акцизы, прибыль госпредприятий, пошлины, соцвзносы, ...</li>
          <li><b>Расходы = Дефицит + Доходы:</b> госдолг, госзакупки, трансферты, инвестиции, ...</li>
          <li><b>Гос. долг на конец года = Гос. долг на начало года + Дефицит</b></li>
          <li><b>Бремя гос. долга = Сумма долга / ВНП</b></li>
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <label>
          <span className="font-medium">Доходы</span>
          <textarea
            rows={3}
            value={incomeRaw}
            onChange={e => setIncomeRaw(e.target.value)}
            placeholder="840/120*100 9 ..."
            className="w-full mt-1 p-2 border rounded shadow-sm focus:ring focus:ring-blue-200 transition"
          />
        </label>

        <label>
          <span className="font-medium">Расходы</span>
          <textarea
            rows={3}
            value={expensesRaw}
            onChange={e => setExpensesRaw(e.target.value)}
            placeholder="34 25 15 + 140*0.08 ..."
            className="w-full mt-1 p-2 border rounded shadow-sm focus:ring focus:ring-blue-200 transition"
          />
        </label>
      </div>

      <div className="relative bg-white p-4 rounded shadow text-sm space-y-3 mt-4">
        <h4 className="font-semibold text-base mb-1 pr-8">
          📊 Результаты бюджета (
          <input
            id="precision"
            type="number"
            min={0}
            max={10}
            value={precision}
            onChange={(e) => setPrecision(Number(e.target.value))}
            onFocus={(e) => e.target.select()}
            className="w-8"
          />
          знаков)
        </h4>

        <button
          onClick={resetFields}
          className="absolute top-4 right-4 text-gray-600 hover:text-black"
          title="Очистить все поля"
        >
          <TbTrash className="text-xl" />
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          <div><strong>Сумма доходов:</strong> {safe(incomeSum, precision)}</div>
          <div><strong>Сумма расходов:</strong> {safe(expenseSum, precision)}</div>
          <div><strong>Сальдо:</strong> {safe(balance, precision)}</div>
          <div>
            <strong>Бюджет:</strong>{' '}
            <span className={`font-semibold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
              {status}
            </span>
          </div>
        </div>

        <div className="space-y-2 mt-4">
          {/* Доходы */}
          <div className="text-xs font-medium text-gray-700">Расходы</div>
          <div className="relative h-5 rounded bg-gradient-to-r from-rose-100 to-red-200 overflow-hidden">
            <div
              className="absolute top-0 bottom-0 left-0 bg-red-500 transition-all duration-300"
              style={{ width: `${percent(expenseSum)}%` }}
              title="Доля расходов"
            />
            <div className="absolute inset-0 flex items-center justify-end px-2 text-xs text-white font-bold">
              {safe(expenseSum)}
            </div>
          </div>

          {/* Сальдо */}
          <div className="text-xs font-medium text-gray-700">Сальдо</div>
          <div className="relative h-5 rounded bg-gradient-to-r from-green-100 to-green-200 overflow-hidden">
            <div
              className={`absolute top-0 bottom-0 left-0 ${balance < 0 ? 'bg-orange-500' : 'bg-green-600'} transition-all duration-300`}
              style={{ width: `${percent(balance)}%` }}
              title="Сальдо"
            />
            <div className="absolute inset-0 flex items-center justify-end px-2 text-xs text-white font-bold">
              {safe(balance)}
            </div>
          </div>

          {/* Легенда */}
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0%</span>
            <span>100% от доходов ({safe(incomeSum)})</span>
          </div>
        </div>
      </div>
    </main>
  );
}
