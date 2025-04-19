'use client';

import { useState } from 'react';
import { input, parse, safe } from './utils';
import { TbTrash } from 'react-icons/tb';

const AMORTIZATION_RATES = [
  { group: 'Первая', years: '1–2', rate: 14.3 },
  { group: 'Вторая', years: '2–3', rate: 8.8 },
  { group: 'Третья', years: '3–5', rate: 5.6 },
  { group: 'Четвертая', years: '5–7', rate: 3.8 },
  { group: 'Пятая', years: '7–10', rate: 2.7 },
  { group: 'Шестая', years: '10–15', rate: 1.8 },
  { group: 'Седьмая', years: '15–20', rate: 1.3 },
  { group: 'Восьмая', years: '20–25', rate: 1.0 },
  { group: 'Девятая', years: '25–30', rate: 0.8 },
  { group: 'Десятая', years: '30+', rate: 0.7 },
];

export default function AmortisationComponent() {
  const [method, setMethod] = useState<'linear' | 'nonlinear' | 'years-sum'>('linear');
  const [cost, setCost] = useState('');
  const [years, setYears] = useState('');
  const [precision, setPrecision] = useState(2);
  const [monthlyView, setMonthlyView] = useState(false);
  const [customRate, setCustomRate] = useState('');

  const base = parse(cost);
  const n = parse(years);

  const resetFields = () => {
    setCost('');
    setYears('');
    setPrecision(2);
    setMonthlyView(false);
    setCustomRate('');
    setMethod('linear');
  };

  const calc = () => {
    if (n <= 0 || base <= 0) return [];

    if (method === 'linear') {
      const value = base / n;
      return Array.from({ length: n }, () => value);
    }

    if (method === 'years-sum') {
      const S = (n * (n + 1)) / 2;
      return Array.from({ length: n }, (_, i) => (base * (n - i)) / S);
    }

    if (method === 'nonlinear') {
      const rate = parse(customRate) / 100; // месячная норма в десятичном виде
      const totalMonths = n * 12;
      let rem = base;
      const monthlyValues: number[] = [];
    
      for (let i = 0; i < totalMonths; i++) {
        let val;
        if (i === totalMonths - 1) { // Если последний месяц
          val = rem; // Используем остаток как значение
        } else {
          val = rem * rate;
          rem -= val;
        }
    
        monthlyValues.push(val);
    
        if (rem < 0.01) {
          rem = 0;
          break;
        }
      }
    
      if (!monthlyView) {
        const yearlyValues: number[] = [];
        for (let i = 0; i < monthlyValues.length; i += 12) {
          const yearChunk = monthlyValues.slice(i, i + 12);
          const sumYear = yearChunk.reduce((acc, val) => acc + val, 0);
          yearlyValues.push(sumYear);
        }
        return yearlyValues;
      }
    
      return monthlyValues;
    }

    return [];
  };

  const result = calc();

  const formula = (() => {
    if (method === 'linear') return 'АО = ПС × Tост / СЧСЛПИ';
    if (method === 'years-sum') return 'АО = СБ × Н';
    if (method === 'nonlinear') return 'АО = Остаток × Н';
  })();

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Амортизация</h2>

      {/* Справка */}
      <div className="bg-yellow-50 border border-yellow-300 text-sm p-3 rounded space-y-1">
        <div className="flex items-center text-xs md:text-lg font-semibold text-yellow-800">
          Нелинейный метод (<a className="text-blue-600" href="https://www.consultant.ru/document/cons_doc_LAW_28165/65680250ca0211e9394c18d8ea86a80b8b06064e/" target="_blank" rel="noopener noreferrer">ст. 259.2</a>)
        </div>
        <table className="w-full text-xs mt-2 table-auto">
          <thead>
            <tr className="text-left text-gray-700 border-b">
              <th>Группа</th>
              <th>Срок (лет)</th>
              <th>Норма (% в мес)</th>
            </tr>
          </thead>
          <tbody>
            {AMORTIZATION_RATES.map(({ group, years, rate }) => (
              <tr key={group}>
                <td>{group}</td>
                <td>{years}</td>
                <td>{rate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ввод */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <label>Первоначальная стоимость (ПС) {input({ value: cost, onChange: e => setCost(e.target.value) })}</label>
        <label>Срок полезного использования (СПИ, лет) {input({ value: years, onChange: e => setYears(e.target.value) })}</label>
        <label>
          Метод: <span className="text-xs text-gray-600">{formula}</span>
          <select
            className="w-full mt-1 p-2 border rounded text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value as 'linear' | 'nonlinear' | 'years-sum')}
          >
            <option value="linear">Линейный</option>
            <option value="years-sum">Сумма чисел лет СПИ</option>
            <option value="nonlinear">Нелинейный (ускоренный)</option>
          </select>
        </label>

        {method === 'nonlinear' && (
          <label>
            Годовая норма (Н, %)
            {input({ value: customRate, onChange: e => setCustomRate(e.target.value) })}
          </label>
        )}
      </div>

      {/* Помесячно (только для линейного/лет) */}
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={monthlyView} onChange={() => setMonthlyView(!monthlyView)} />
        <span>Помесячный вывод</span>
      </label>

      {result.length > 0 && (
        <div className="mt-4 p-4 bg-white rounded shadow text-sm space-y-3 relative">
          <h4 className="font-semibold text-base mb-2 pr-8">
            📊 График амортизации (
            <input
              id="precision"
              type="number"
              min={0}
              max={10}
              value={precision}
              onChange={(e) => setPrecision(Number(e.target.value))}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {(method === 'nonlinear') ? (
            result.map((val, i) => (
              <div key={i} className="bg-gray-50 p-2 rounded border flex justify-between">
                <span>
                  {method === 'nonlinear' && monthlyView
                    ? `Месяц ${i + 1}`
                    : `Год ${i + 1}`}
                </span>
                <span>{safe(val, precision)}</span>
              </div>
            ))
          ) : (
            result.flatMap((val, i) => {
              if (monthlyView) {
                const monthVal = val / 12;
                return Array.from({ length: 12 }, (_, m) => (
                  <div key={`${i}-${m}`} className="bg-gray-50 p-2 rounded border flex justify-between">
                    <span>Год {i + 1}, Месяц {m + 1}</span>
                    <span>{safe(monthVal, precision)}</span>
                  </div>
                ));
              } else {
                return (
                  <div key={i} className="bg-gray-50 p-2 rounded border flex justify-between">
                    <span>Год {i + 1}</span>
                    <span>{safe(val, precision)}</span>
                  </div>
                );
              }
            })
          )}
          </div>

        </div>
      )}
    </div>
  );
}
