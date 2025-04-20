'use client';

import { useState } from 'react';
import { input, parse, safe } from './utils';
import { TbTrash } from 'react-icons/tb';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Legend,
    Tooltip,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
  
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Legend, Tooltip);

type YearData = {
  year: number;
  revenue: number;
  variable: number;
  fixed: number;
  depreciation: number;
  liquidation: number;
};

export default function EfficiencyAnalysis() {
  const [years, setYears] = useState(10);
  const [initialInvestment, setInitialInvestment] = useState('1560');
  const [depreciation, setDepreciation] = useState('91.5');
  const [revenuePerYear, setRevenuePerYear] = useState('2200');
  const [variablePerYear, setVariablePerYear] = useState('1600');
  const [fixedPerYear, setFixedPerYear] = useState('120.8');
  const [taxRate, setTaxRate] = useState('20');
  const [discountRate, setDiscountRate] = useState('10');
  const [liquidationValue, setLiquidationValue] = useState('205');
  const [precision, setPrecision] = useState(2);

  const initial = parse(initialInvestment);
  const dep = parse(depreciation);
  const tax = parse(taxRate) / 100;
  const discount = parse(discountRate) / 100;
  const liquidation = parse(liquidationValue);

  const resetFields = () => {
    setYears(10);
    setInitialInvestment('');
    setDepreciation('');
    setRevenuePerYear('');
    setVariablePerYear('');
    setFixedPerYear('');
    setTaxRate('');
    setDiscountRate('');
    setLiquidationValue('');
  };

  const data: YearData[] = [];

  for (let i = 0; i <= years; i++) {
    const revenue = i === 0 ? 0 : parse(revenuePerYear);
    const variable = i === 0 ? 0 : parse(variablePerYear);
    const fixed = i === 0 ? 0 : parse(fixedPerYear);
    const yearDep = i === 0 ? 0 : dep;
    const liq = i === years ? liquidation : 0;
    data.push({ year: i, revenue, variable, fixed, depreciation: yearDep, liquidation: liq });
  }

  const results = data.map((row, i) => {
    const ebt = row.revenue - row.variable - row.fixed - row.depreciation;
    const taxAmount = i === 0 ? 0 : ebt * tax;
    const profit = ebt - taxAmount;
    const cashFlow = profit + row.liquidation;
    const discountFactor = i === 0 ? 1 : 1 / Math.pow(1 + discount, i);
    const dcf = cashFlow * discountFactor;

    return {
      ...row,
      ebt,
      tax: taxAmount,
      profit,
      cashFlow: i === 0 ? -initial : cashFlow,
      discountFactor,
      dcf: i === 0 ? -initial : dcf
    };
  });

  const cumulativeDCF = results.reduce<number[]>((acc, row, i) => {
    const prev = acc[i - 1] ?? 0;
    return [...acc, prev + row.dcf];
  }, []);

  return (
    <div className="space-y-6">
        <h2 className="text-xl font-bold">📈 Оценка эффективности</h2>

        {/* Ввод */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <label>Горизонт планирования (лет) {input({ value: years, onChange: e => setYears(Number(e.target.value)) })}</label>
            <label>Начальные инвестиции {input({ value: initialInvestment, onChange: e => setInitialInvestment(e.target.value) })}</label>
            <label>Амортизация в год {input({ value: depreciation, onChange: e => setDepreciation(e.target.value) })}</label>
            <label>Выручка в год {input({ value: revenuePerYear, onChange: e => setRevenuePerYear(e.target.value) })}</label>
            <label>Переменные затраты в год {input({ value: variablePerYear, onChange: e => setVariablePerYear(e.target.value) })}</label>
            <label>Постоянные затраты в год {input({ value: fixedPerYear, onChange: e => setFixedPerYear(e.target.value) })}</label>
            <label>Ликвидационная стоимость {input({ value: liquidationValue, onChange: e => setLiquidationValue(e.target.value) })}</label>
            <label>Ставка налога (%) {input({ value: taxRate, onChange: e => setTaxRate(e.target.value) })}</label>
            <label>Ставка дисконтирования (%) {input({ value: discountRate, onChange: e => setDiscountRate(e.target.value) })}</label>
        </div>

        {/* Таблица */}
        <div className="overflow-x-auto text-xs">
            <table className="w-full table-auto border border-gray-300 text-center">
            <thead className="bg-gray-100">
                <tr>
                <th>Год</th>
                <th>Выручка</th>
                <th>Переменные затраты</th>
                <th>Постоянные затраты</th>
                <th>Аморт.</th>
                <th>Прибыль до налога</th>
                <th>Налог</th>
                <th>Чистая прибыль</th>
                <th>Ликв. ст-ть</th>
                <th>Ден. поток</th>
                <th>Коэфф. диск.</th>
                <th>Диск. поток</th>
                <th>Накопл. DCF</th>
                </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={i} className={`border-t ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <td className="px-2 py-1">{row.year}</td>
                <td className="px-2 py-1 text-right">{safe(row.revenue, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(row.variable, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(row.fixed, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(row.depreciation, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(row.ebt, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(row.tax, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(row.profit, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(row.liquidation, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(row.cashFlow, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(row.discountFactor, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(row.dcf, precision)}</td>
                <td className="px-2 py-1 text-right">{safe(cumulativeDCF[i], precision)}</td>
                </tr>
              ))}
            </tbody>
            </table>
        </div>

        {/* Показатели эффективности */}
        <div className="mt-6 p-4 bg-white rounded shadow text-sm space-y-4 relative">
            <h3 className="font-semibold text-base mb-1 pr-8">📌 Показатели эффективности проекта (
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
            </h3>

            <button
                onClick={resetFields}
                className="absolute top-4 right-4 text-gray-600 hover:text-black"
                title="Очистить все поля"
            >
                <TbTrash className="text-xl" />
            </button>

            {/* NPV */}
            <div>
                <strong>Чистая приведенная стоимость</strong>:{' '}
                <span className={cumulativeDCF.at(-1)! > 0 ? 'text-green-600' : 'text-red-600'}>
                {safe(cumulativeDCF.at(-1)!, precision)} ₽
                </span>
                <div className="text-gray-500 text-xs mt-1">
                NPV = Σ(ЧДП<sub>t</sub> / (1 + r)<sup>t</sup>) = = {results.map(r => safe(r.dcf, precision)).join(' + ')} = {safe(cumulativeDCF.at(-1)!, precision)}
                </div>
            </div>

            {/* PI */}
            <div>
                <strong>Индекс рентабельности</strong>:{' '}
                <span>{safe((cumulativeDCF.at(-1)! + initial) / initial, precision)}</span>
                <div className="text-gray-500 text-xs mt-1">
                    PI = (NPV + IC) / IC = ({safe(cumulativeDCF.at(-1)!, precision)} + {safe(initial)}) / {safe(initial)} = {safe((cumulativeDCF.at(-1)! + initial) / initial, precision)}
                </div>
            </div>

            {/* DPP */}
            <div>
                <strong>Дисконтированный срок окупаемости</strong>:{' '}
                <span>
                {
                    (() => {
                    const posIndex = cumulativeDCF.findIndex(v => v >= 0);
                    if (posIndex <= 0) return 'Не достигнуто';

                    const prev = cumulativeDCF[posIndex - 1];
                    const diff = results[posIndex].dcf;
                    const frac = Math.abs(prev) / diff;
                    return `${posIndex - 1} + ${safe(frac, 2)} = ${safe((posIndex - 1) + frac, 2)} лет`;
                    })()
                }
                </span>
                <div className="text-gray-500 text-xs mt-1">
                    DPP = T<sub>n</sub> + |NPV<sub>T<sub>n</sub></sub>| / DCF<sub>T<sub>n+1</sub></sub> = {
                        (() => {
                        const posIndex = cumulativeDCF.findIndex(v => v >= 0);
                        if (posIndex <= 0) return '—';
                        const prev = cumulativeDCF[posIndex - 1];
                        const diff = results[posIndex].dcf;
                        const frac = Math.abs(prev) / diff;
                        return `${posIndex - 1} + ${safe(Math.abs(prev), 2)} / ${safe(diff, 2)} = ${safe((posIndex - 1) + frac, 2)} лет`;
                        })()
                    }
                </div>
            </div>
        </div>
        
        {/* График потоков */}
        <div className="mt-8">
            <h3 className="font-semibold text-base mb-2">📉 График окупаемости</h3>
            <Chart
                type="bar"
                data={{
                labels: results.map((r) => `Г${r.year}`),
                datasets: [
                    {
                    type: 'bar' as const,
                    label: 'Денежный поток',
                    data: results.map((r) => parseFloat(r.cashFlow.toFixed(2))),
                    backgroundColor: '#60a5fa',
                    },
                    {
                    type: 'line' as const,
                    label: 'Накопл. DCF',
                    data: cumulativeDCF.map((v) => parseFloat(v.toFixed(2))),
                    borderColor: '#16a34a',
                    backgroundColor: '#16a34a',
                    borderWidth: 2,
                    tension: 0.3,
                    },
                ],
                }}
                options={{
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: { mode: 'index', intersect: false },
                },
                scales: {
                    y: { beginAtZero: true },
                },
                }}
            />
        </div>
    </div>
  );
}
