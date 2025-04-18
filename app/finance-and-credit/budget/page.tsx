'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome } from 'react-icons/tb';

export default function BudgetQuickPage() {
  const [incomeRaw, setIncomeRaw] = useState('');
  const [expensesRaw, setExpensesRaw] = useState('');

  const parseValues = (str: string): number[] => {
    return str
      .trim()
      .split(/\s+/)
      .map(expr => {
        try {
          // Разрешаем простые арифметические выражения
          const normalized = expr.replace(',', '.');
          // Безопасный eval для 0-9 и операторов
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

  return (
    <main className="max-w-4xl mx-auto px-4 space-y-6">
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
            className="w-full mt-1 p-2 border rounded shadow-sm"
          />
        </label>

        <label>
          <span className="font-medium">Расходы</span>
          <textarea
            rows={3}
            value={expensesRaw}
            onChange={e => setExpensesRaw(e.target.value)}
            placeholder="34 25 15 25 + 140*0,08 - 0.2 ..."
            className="w-full mt-1 p-2 border rounded shadow-sm"
          />
        </label>
      </div>

      <div className="bg-white p-4 rounded shadow text-sm space-y-1">
        <p><strong>Сумма доходов:</strong> {incomeSum.toFixed(2).replace('.', ',')}</p>
        <p><strong>Сумма расходов:</strong> {expenseSum.toFixed(2).replace('.', ',')}</p>
        <p><strong>Сальдо:</strong> {balance.toFixed(2).replace('.', ',')}</p>
        <p className={`mt-1 font-semibold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
          Бюджет: {status}
        </p>
      </div>
    </main>
  );
}
