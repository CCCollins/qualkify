'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome } from 'react-icons/tb';

type Mode = 'universal' | 'profit' | 'reference';

export default function TaxesPage() {
  const [mode, setMode] = useState<Mode>('universal');

  // Universal tax state
  const [base, setBase] = useState('');
  const [rate, setRate] = useState('20');
  const [isPercent, setIsPercent] = useState(true);
  const [useDates, setUseDates] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [manualMonths, setManualMonths] = useState('12');
  const [progressive, setProgressive] = useState(false);
  const [limit, setLimit] = useState('2759000');
  const [rateUnder, setRateUnder] = useState('30');
  const [rateAbove, setRateAbove] = useState('15,1');

  // Profit tax state
  const [revenue, setRevenue] = useState('');
  const [indirect, setIndirect] = useState('');
  const [cost, setCost] = useState('');
  const [mgmt, setMgmt] = useState('');
  const [comm, setComm] = useState('');
  const [nonOpInc, setNonOpInc] = useState('');
  const [nonOpExp, setNonOpExp] = useState('');
  const [taxes, setTaxes] = useState('');
  const [rf, setRF] = useState('');
  const [funds, setFunds] = useState('');

  const parse = (val: string) => parseFloat(val.replace(',', '.')) || 0;

  const input = (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    <input {...props} className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-200 text-sm transition" />;

  const calcMonths = () => {
    if (useDates && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) return 0;
      return Math.min(
        Math.max((end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1, 1),
        12
      );
    }

    return Math.min(Math.max(parseInt(manualMonths) || 0, 1));
  };

  const months = calcMonths();

  const calcUniversal = () => {
    const b = parse(base);
    const m = months / 12;
  
    if (progressive) {
      const lim = parse(limit);
      const r1 = parse(rateUnder);
      const r2 = parse(rateAbove);
      const below = Math.min(b, lim);
      const above = Math.max(b - lim, 0);
      const tax = ((below * r1 + above * r2) / 100) * m;
      const total = b + tax;
      return { tax, total };
    }
  
    const r = parse(rate);
    const tax = isPercent ? (b * r / 100 * m) : (b * r * m);
    const total = b + tax;
    return { tax, total };
  };

  const calcProfit = () => {
    const vr = parse(revenue);
    const kn = parse(indirect);
    const ss = parse(cost);
    const ur = parse(mgmt);
    const kr = parse(comm);
    const dvo = parse(nonOpInc);
    const rvo = parse(nonOpExp);
    const taxSum = parse(taxes);
    const rfSum = parse(rf);
    const fundSum = parse(funds);

    const vp = vr - kn - ss;
    const pp = vp - ur - kr;
    const deltaVO = dvo - rvo;
    const preTax = pp + deltaVO;
    const np = preTax - taxSum;
    const unrealized = np - rfSum - fundSum;

    return {
      vp, pp, deltaVO, preTax, np, unrealized,
      formulas: {
        vp: `ВП = ВР - КН - СС = ${vr} - ${kn} - ${ss} = ${vp}`,
        pp: `ПП = ВП - УР - КР = ${vp} - ${ur} - ${kr} = ${pp}`,
        deltaVO: `ΔВО = ДВО - РВО = ${dvo} - ${rvo} = ${deltaVO}`,
        preTax: `Пдо нал.обл. = ПП ± ΔВО = ${pp} + ${deltaVO} = ${preTax}`,
        np: `ЧП = Пдо нал.обл. - ∑Н = ${preTax} - ${taxSum} = ${np}`,
        unrealized: `НерП = ЧП - РФ - Ф = ${np} - ${rfSum} - ${fundSum} = ${unrealized}`
      }
    };
  };

  const renderUniversal = () => {
    const res = calcUniversal();

    return (
      <>
        <h2 className="text-xl font-bold mb-3">Универсальный налог</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>
            <span>Налоговая база (в единицах / ₽)</span>
            {input({ value: base, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setBase(e.target.value) })}
          </label>

          {!progressive ? (
            <label>
              <span>Ставка налога {isPercent ? '(%)' : '(₽ на единицу)'}</span>
              {input({ value: rate, onChange: (e) => setRate(e.target.value) })}
            </label>
          ) : (
            <>
              <label>
                <span>Лимит (₽)</span>
                {input({ value: limit, onChange: (e) => setLimit(e.target.value) })}
              </label>
              <label>
                <span>Ставка до лимита (%)</span>
                {input({ value: rateUnder, onChange: (e) => setRateUnder(e.target.value) })}
              </label>
              <label>
                <span>Ставка сверх лимита (%)</span>
                {input({ value: rateAbove, onChange: (e) => setRateAbove(e.target.value) })}
              </label>
            </>
          )}
        </div>

        <div className="flex text-xs md:text-sm items-center gap-2 mt-3 mb-1">
          Ставка: 
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={isPercent} onChange={() => setIsPercent(!isPercent)} />
            <span>в процентах</span>
          </label>

          <label className="flex items-center gap-1">
            <input type="checkbox" checked={progressive} onChange={() => setProgressive(!progressive)} />
            <span>прогрессивная</span>
          </label>
        </div>

        {useDates ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <label>
              <span>Дата начала</span>
              {input({ type: 'date', value: startDate, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value) })}
            </label>
            <label>
              <span>Дата окончания</span>
              {input({ type: 'date', value: endDate, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value) })}
            </label>
          </div>
        ) : (
          <div className="mt-2">
            <label>
              <span>Количество месяцев</span>
               {input({ type: 'number', min: 1, value: manualMonths, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setManualMonths(e.target.value) })}
            </label>
          </div>
        )}

        <label className="flex items-center mt-2 gap-2">
          <input type="checkbox" checked={useDates} onChange={() => setUseDates(!useDates)} />
          <span className="text-sm">Указать даты</span>
        </label>

        <div className="mt-4 bg-white p-3 rounded shadow text-sm space-y-1">
          <p><strong>Учтено месяцев:</strong> {months}</p>
          <p><strong>Сумма налога:</strong> {res.tax.toFixed(2).replace('.', ',')} ₽</p>
          <p className="text-gray-500 text-xs">
            Формула: налог = НБ × СН × (месяцы / 12)
          </p>
        </div>
      </>
    );
  };

  const renderProfit = () => {
    const r = calcProfit();

    return (
      <>
        <h2 className="text-xl font-bold mb-3">Налог на прибыль</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>Выручка от реализации (ВР){input({ value: revenue, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setRevenue(e.target.value) })}</label>
          <label>Косвенные налоги (КН){input({ value: indirect, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setIndirect(e.target.value) })}</label>
          <label>Себестоимость (СС){input({ value: cost, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setCost(e.target.value) })}</label>
          <label>Управленческие расходы (УР){input({ value: mgmt, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setMgmt(e.target.value) })}</label>
          <label>Коммерческие расходы (КР){input({ value: comm, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setComm(e.target.value) })}</label>
          <label>Внереализационные доходы (ДВО){input({ value: nonOpInc, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNonOpInc(e.target.value) })}</label>
          <label>Внереализационные расходы (РВО){input({ value: nonOpExp, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNonOpExp(e.target.value) })}</label>
          <label>Налоги (∑Н){input({ value: taxes, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTaxes(e.target.value) })}</label>
          <label>РФ отчисления{input({ value: rf, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setRF(e.target.value) })}</label>
          <label>Фонды{input({ value: funds, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setFunds(e.target.value) })}</label>
        </div>

        <div className="mt-4 bg-white p-3 rounded shadow text-sm space-y-1">
          <p><strong>Валовая прибыль:</strong> {r.vp.toFixed(2)} <br /><span className="text-gray-500 text-xs">{r.formulas.vp}</span></p>
          <p><strong>Процент от прибыли:</strong> {r.pp.toFixed(2)} <br /><span className="text-gray-500 text-xs">{r.formulas.pp}</span></p>
          <p><strong>Процент от внереализационных операций:</strong> {r.deltaVO.toFixed(2)} <br /><span className="text-gray-500 text-xs">{r.formulas.deltaVO}</span></p>
          <p><strong>Прибыль до налогообложения:</strong> {r.preTax.toFixed(2)} <br /><span className="text-gray-500 text-xs">{r.formulas.preTax}</span></p>
          <p><strong>Чистая прибыль:</strong> {r.np.toFixed(2)} <br /><span className="text-gray-500 text-xs">{r.formulas.np}</span></p>
          <p><strong>Нереализованная прибыль:</strong> {r.unrealized.toFixed(2)} <br /><span className="text-gray-500 text-xs">{r.formulas.unrealized}</span></p>
        </div>
      </>
    );
  };

  const renderReference = () => {
    return (
      <div className="space-y-5 text-sm">
        <h2 className="text-xl font-bold mb-2">Справка по НК РФ (<a className="text-blue-600" href="https://www.consultant.ru/document/cons_doc_LAW_19671/" target="_blank" rel="noopener noreferrer">ч. 1</a> и <a className="text-blue-600" href="https://www.consultant.ru/document/cons_doc_LAW_28165/" target="_blank" rel="noopener noreferrer">ч. 2</a>)</h2>
  
        <section>
          <h3 className="font-semibold text-base">Основное</h3>
          <ul className="list-disc list-inside">
            <li>Налоги округляются вверх до целого (а другие отчисления - нет)</li>
            <li>Из-за такого округления, если мы расчитываем налоги поквартально (по 4 месяца), то последний квартал вычисляется как сумма налогов за весь период - сумма налогов в предыдущих кварталах</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-base">Ставки налога на добавленную стоимость (НДС)</h3>
          <ul className="list-disc list-inside">
            <li>20% — стандартная ставка</li>
            <li>10% — социально значимые товары</li>
            <li>0% — экспорт, международные перевозки</li>
          </ul>
          <p className="text-xs text-gray-500">Источник: <a className="text-blue-600 underline" href="https://www.consultant.ru/document/cons_doc_LAW_28165/35cc6698564adc4507baa31c9cfdbb4f2516d068/" target="_blank" rel="noopener noreferrer">НК РФ ч. 2, гл. 21, ст. 164</a></p>
        </section>
  
        <section>
          <h3 className="font-semibold text-base">Ставки налога на прибыль организаций</h3>
          <ul className="list-disc list-inside">
            <li>20% — стандартная ставка</li>
            <li>3% — упрощенная система налогообложения (УСН)</li>
          </ul>
          <p className="text-xs text-gray-500">Источник: <a className="text-blue-600 underline" href="https://www.consultant.ru/document/cons_doc_LAW_28165/eb9180fc785448d58fe76ef323fb67d1832b9363/" target="_blank" rel="noopener noreferrer">НК РФ ч. 2, гл. 25, ст. 284</a></p>
        </section>
  
        <section>
          <h3 className="font-semibold text-base">Транспортный налог (пример: легковые автомобили в СПб)</h3>
          <ul className="list-disc list-inside">
            <li>до 100 л.с. — 24 ₽ / л.с.</li>
            <li>101–150 л.с. — 35 ₽ / л.с.</li>
            <li>151–200 л.с. — 50 ₽ / л.с.</li>
            <li>201–250 л.с. — 75 ₽ / л.с.</li>
            <li>свыше 250 л.с. — 150 ₽ / л.с.</li>
          </ul>
          <p className="text-xs text-gray-500">Источник: <a className="text-blue-600 underline" href="https://www.consultant.ru/document/cons_doc_LAW_28165/74259166683667ce2b14c160952f1885c5b83961/" target="_blank" rel="noopener noreferrer">НК РФ ч. 2, гл. 28, ст. 361</a></p>
        </section>
  
        <section>
          <h3 className="font-semibold text-base">Налог на имущество организаций</h3>
          <ul className="list-disc list-inside">
            <li>2.2% от средней стоимости имущества (ССИ)</li>
            <li>2.5% от кадастровой стоимости (КС) — для отдельных видов имущества</li>
          </ul>
          <p className="text-xs text-gray-500">Источник: <a className="text-blue-600 underline" href="https://www.consultant.ru/document/cons_doc_LAW_28165/ce7353ef8711e5b40f860860b7b77e724c028b65/" target="_blank" rel="noopener noreferrer">НК РФ ч. 2, гл. 30, ст. 380</a></p>
        </section>

        <section>
          <h3 className="font-semibold text-base">Уровни налоговой системы</h3>
          <ul className="list-disc list-inside">
            <li>Федеральные налоги и сборы</li>
            <li>Региональные налоги</li>
            <li>Местные налоги и сборы</li>
            <li>Туристические налоги</li>
          </ul>
          <p className="text-xs text-gray-500">Источник: <a className="text-blue-600 underline" href="https://www.consultant.ru/document/cons_doc_LAW_19671/a96566c217a4dcd2d92872193965c95256f42062/" target="_blank" rel="noopener noreferrer">НК РФ ч. 1, гл. 2</a> + <a className="text-blue-600 underline" href="https://www.consultant.ru/document/cons_doc_LAW_28165/cb2709830e59edae5cb1db2524682f0ad21c6ba9/" target="_blank" rel="noopener noreferrer">НК РФ ч. 2, гл. 33.1.</a></p>
        </section>
      </div>

      
    );
  };

  return (
    <main className="max-w-6xl mx-auto px-4 space-y-6">
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">
          Расчет налогов
        </h1>
      </div>

      <div className="flex text-sm sm:text-md font-bold gap-1 sm:gap-3 flex-wrap justify-center">
        <button
          onClick={() => setMode('universal')}
          className={`px-2 sm:px-4 py-2 rounded ${mode === 'universal' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
        >
          Универсальный налог
        </button>
        <button
          onClick={() => setMode('profit')}
          className={`px-2 sm:px-4 py-2 rounded ${mode === 'profit' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
        >
          Налог на прибыль
        </button>
        <button
          onClick={() => setMode('reference')}
          className={`px-2 sm:px-4 py-2 rounded ${mode === 'reference' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}
        >
          Справка
        </button>
      </div>

      <div>
        {mode === 'universal' && renderUniversal()}
        {mode === 'profit' && renderProfit()}
        {mode === 'reference' && renderReference()}
      </div>
    </main>
  );
}
