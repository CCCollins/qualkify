'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome, TbTrash } from 'react-icons/tb';

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
  const [funds, setFunds] = useState('');

  const [useDetailedCost, setUseDetailedCost] = useState(false);
  
  // Расширенные поля
  const [buildingCost, setBuildingCost] = useState('');
  const [buildingYears, setBuildingYears] = useState('');
  const [equipmentCost, setEquipmentCost] = useState('');
  const [equipmentYears, setEquipmentYears] = useState('');
  const [materialCost, setMaterialCost] = useState('');
  const [waste, setWaste] = useState('');
  const [salaryFund, setSalaryFund] = useState('');
  const [socialRate, setSocialRate] = useState('30');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditRate, setCreditRate] = useState('');
  const [creditMonths, setCreditMonths] = useState('');

  const parse = (val: string): number => {
    try {
      const sanitized = val
        .replace(/,/g, '.')
        .replace(/[^-()\d/*+.]/g, '');
  
      const result = Function('"use strict"; return (' + sanitized + ')')();
      return typeof result === 'number' && !isNaN(result) ? result : 0;
    } catch {
      return 0;
    }
  };

  const input = (props: React.InputHTMLAttributes<HTMLInputElement>) =>
    <input {...props} className="w-full mt-1 px-3 py-1.5 border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-200 text-sm transition" />;

  const calcMonths = () => {
    if (useDates && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) return 0;
  
      return (
        (end.getFullYear() - start.getFullYear()) * 12 +
        (end.getMonth() - start.getMonth()) + 1
      );
    }
  
    const parsed = parseInt(manualMonths.replace(',', '.'));
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
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

  const renderUniversal = () => {
    const res = calcUniversal();
    const safe = (n: number) => isNaN(n) ? '0,00' : n.toFixed(2).replace('.', ',');

    const resetUniversalFields = () => {
      setBase('');
      setRate('20');
      setIsPercent(true);
      setUseDates(false);
      setStartDate('');
      setEndDate('');
      setManualMonths('12');
      setProgressive(false);
      setLimit('2759000');
      setRateUnder('30');
      setRateAbove('15,1');
    };

    return (
      <>
        <h2 className="text-xl font-bold mb-3">Универсальный налог</h2>
  
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label>
            <span>Налоговая база (в единицах / ₽)</span>
            {input({ value: base, onChange: (e) => setBase(e.target.value) })}
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
              {input({ type: 'date', value: startDate, onChange: (e) => setStartDate(e.target.value) })}
            </label>
            <label>
              <span>Дата окончания</span>
              {input({ type: 'date', value: endDate, onChange: (e) => setEndDate(e.target.value) })}
            </label>
          </div>
        ) : (
          <div className="mt-2">
            <label>
              <span>Количество месяцев</span>
              {input({ type: 'number', min: 1, value: manualMonths, onChange: (e) => setManualMonths(e.target.value) })}
            </label>
          </div>
        )}
  
        <label className="flex items-center mt-2 gap-2">
          <input type="checkbox" checked={useDates} onChange={() => setUseDates(!useDates)} />
          <span className="text-sm">Указать даты</span>
        </label>
  
        {/* 📊 Результаты */}
        <div className="mt-6 p-4 bg-white rounded shadow text-sm space-y-3 relative">
          <h4 className="font-semibold text-base mb-1 pr-8">📊 Результаты</h4>

          <button
            onClick={resetUniversalFields}
            className="absolute top-4 right-4 text-gray-600 hover:text-black"
            title="Очистить все поля"
          >
            <TbTrash className="text-xl" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6">
            <div>
              <strong>Сумма налога:</strong> {safe(res.tax)} ₽
            </div>
            <div>
              <strong>Итого с налогом:</strong> {safe(res.total)} ₽
            </div>
            <div>
              <strong>Учтено месяцев:</strong> {months}
            </div>
          </div>

          {/* Шкала распределения итоговой суммы */}
          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-gray-700">Состав итоговой суммы</div>

            <div className="relative h-5 rounded bg-gray-100 overflow-hidden flex">
              {/* База */}
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${(parseFloat(base) / res.total) * 100}%`,
                }}
                title="Налоговая база"
              />

              {/* Налог */}
              <div
                className="h-full bg-red-500"
                style={{
                  width: `${(res.tax / res.total) * 100}%`,
                }}
                title="Налог"
              />
            </div>

            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>100% ({safe(res.total)})</span>
            </div>
          </div>

          <div className="text-xs text-gray-500">
            Налог = НБ × СН × (месяцы / 12)
          </div>
        </div>
      </>
    );
  };

  const renderProfit = () => {
    const p = parse;
  
    const AO = (p(buildingCost) / p(buildingYears)) + (p(equipmentCost) / p(equipmentYears));
    const MZ = p(materialCost) - p(waste);
    const FOT = p(salaryFund);
    const OSN = FOT * p(socialRate) / 100;
    const PR = p(creditAmount) * (p(creditRate) / 100) * (p(creditMonths) / 12);
    const detailedCost = AO + MZ + FOT + OSN + PR;
  
    const effectiveCost = useDetailedCost ? detailedCost : p(cost);
  
    const vr = p(revenue);
    const kn = p(indirect);
    const ur = p(mgmt);
    const kr = p(comm);
    const dvo = p(nonOpInc);
    const rvo = p(nonOpExp);
    const taxSum = p(taxes);
    const deductions = p(funds);
  
    const vp = vr - kn - effectiveCost;
    const pp = vp - ur - kr;
    const deltaVO = dvo - rvo;
    const preTax = pp + deltaVO;
    const np = preTax - taxSum;
    const unrealized = np - deductions;
  
    // Оптовая цена: себестоимость + чистая прибыль + НДС
    const vat = taxSum;
    const wholesalePrice = effectiveCost + pp + vat;

    const scale = vr > 0 ? 100 / vr : 0;
    const npWidth = np * scale;
    const wholesaleWidth = wholesalePrice * scale;
  
    const safe = (n: number) => isNaN(n) ? '0.00' : n.toFixed(2);
  
    const formulas = {
      vp: `ВП = ВР - КН - СС = ${vr} - ${kn} - ${effectiveCost} = ${vp}`,
      pp: `ПП = ВП - УР - КР = ${vp} - ${ur} - ${kr} = ${pp}`,
      deltaVO: `ΔВО = ДВО - РВО = ${dvo} - ${rvo} = ${deltaVO}`,
      preTax: `П до н/о = ПП ± ΔВО = ${pp} + ${deltaVO} = ${preTax}`,
      np: `ЧП = П до н/о - ∑Н = ${preTax} - ${taxSum} = ${np}`,
      unrealized: `НерП = ЧП - фонды = ${np} - ${deductions} = ${unrealized}`,
      wholesale: `ОпЦ = СС + ПП + НДС = ${effectiveCost} + ${pp} + ${vat} = ${wholesalePrice}`
    };

    const resetFields = () => {
      setRevenue('');
      setIndirect('');
      setCost('');
      setMgmt('');
      setComm('');
      setNonOpInc('');
      setNonOpExp('');
      setTaxes('');
      setFunds('');
    
      // Детализированные:
      setBuildingCost('');
      setBuildingYears('');
      setEquipmentCost('');
      setEquipmentYears('');
      setMaterialCost('');
      setWaste('');
      setSalaryFund('');
      setSocialRate('');
      setCreditAmount('');
      setCreditRate('');
      setCreditMonths('');
    };
  
    return (
      <>
        <h2 className="text-xl font-bold mb-3">Прибыль и налоги</h2>
  
        <div className="flex items-center gap-2 mb-4 text-sm">
          <input
            type="checkbox"
            checked={useDetailedCost}
            onChange={() => setUseDetailedCost(!useDetailedCost)}
            id="useDetailedCost"
          />
          <label htmlFor="useDetailedCost">Использовать расширенный расчет себестоимости</label>
        </div>
  
        <h3 className="font-semibold text-base mb-1">Основные параметры</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>Выручка от реализации (ВР){input({ value: revenue, placeholder: "Нетто-выручка = ВР/1,2", onChange: e => setRevenue(e.target.value) })}</label>
          <label>Косвенные налоги (КН){input({ value: indirect, onChange: e => setIndirect(e.target.value) })}</label>
  
          {!useDetailedCost && (
            <label>Себестоимость (СС){input({ value: cost, onChange: e => setCost(e.target.value) })}</label>
          )}
        </div>
  
        {useDetailedCost && (
          <>
            <h3 className="font-semibold text-base mt-6 mb-1">Расширенный расчет себестоимости</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label>Стоимость здания{input({ value: buildingCost, onChange: e => setBuildingCost(e.target.value) })}</label>
              <label>Срок службы здания (лет){input({ value: buildingYears, onChange: e => setBuildingYears(e.target.value) })}</label>
              <label>Стоимость оборудования{input({ value: equipmentCost, onChange: e => setEquipmentCost(e.target.value) })}</label>
              <label>Срок службы оборудования (лет){input({ value: equipmentYears, onChange: e => setEquipmentYears(e.target.value) })}</label>
              <label>Закупка сырья{input({ value: materialCost, onChange: e => setMaterialCost(e.target.value) })}</label>
              <label>Возвратные отходы{input({ value: waste, onChange: e => setWaste(e.target.value) })}</label>
              <label>ФОТ{input({ value: salaryFund, onChange: e => setSalaryFund(e.target.value) })}</label>
              <label>Социальные отчисления (%) {input({ value: socialRate, onChange: e => setSocialRate(e.target.value) })}</label>
              <label>Кредит {input({ value: creditAmount, onChange: e => setCreditAmount(e.target.value) })}</label>
              <label>Ставка (%) {input({ value: creditRate, onChange: e => setCreditRate(e.target.value) })}</label>
              <label>Срок (мес) {input({ value: creditMonths, onChange: e => setCreditMonths(e.target.value) })}</label>
            </div>
          </>
        )}
  
        <h3 className="font-semibold text-base mt-6 mb-1">Прочие расходы и удержания</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>Управленческие расходы (УР){input({ value: mgmt, onChange: e => setMgmt(e.target.value) })}</label>
          <label>Коммерческие расходы (КР){input({ value: comm, onChange: e => setComm(e.target.value) })}</label>
          <label>Внереализационные доходы (ДВО){input({ value: nonOpInc, onChange: e => setNonOpInc(e.target.value) })}</label>
          <label>Внереализационные расходы (РВО){input({ value: nonOpExp, onChange: e => setNonOpExp(e.target.value) })}</label>
          <label>Налоги (∑Н в т.ч. НДС){input({ value: taxes, placeholder: "НДС = П до н/о * 0,2", onChange: e => setTaxes(e.target.value) })}</label>
          <label>Отчисления в фонды{input({ value: funds, onChange: e => setFunds(e.target.value) })}</label>
        </div>
  
        {useDetailedCost && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm space-y-1">
            <h4 className="font-semibold">🧾 Расчёт себестоимости:</h4>
            <p>АО: {safe(AO)} млн • МЗ: {safe(MZ)} млн • ФОТ: {safe(FOT)} млн</p>
            <p>ОСН: {safe(OSN)} млн • Прочее: {safe(PR)} млн</p>
            <p className="font-semibold">СС: {safe(detailedCost)} млн</p>
          </div>
        )}
  
        <div className="relative mt-6 p-4 bg-white rounded shadow text-sm space-y-3">
          <h4 className="font-semibold text-base mb-1">📊 Финансовый результат</h4>

          <button
            onClick={resetFields}
            className="absolute top-4 right-4 text-gray-600 hover:text-black"
            title="Очистить все поля"
          >
            <TbTrash className="text-xl" />
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <strong>Валовая прибыль:</strong> {safe(vp)}
              <div className="text-xs text-gray-500">{formulas.vp}</div>
            </div>
            <div>
              <strong>Прибыль от продаж:</strong> {safe(pp)}
              <div className="text-xs text-gray-500">{formulas.pp}</div>
            </div>
            <div>
              <strong>Δ Внереализационных операций:</strong> {safe(deltaVO)}
              <div className="text-xs text-gray-500">{formulas.deltaVO}</div>
            </div>
            <div>
              <strong>Прибыль до налогообложения:</strong> {safe(preTax)}
              <div className="text-xs text-gray-500">{formulas.preTax}</div>
            </div>
            <div>
              <strong>Чистая прибыль:</strong> {safe(np)}
              <div className="text-xs text-gray-500">{formulas.np}</div>
            </div>
            <div>
              <strong>Нереализованная прибыль:</strong> {safe(unrealized)}
              <div className="text-xs text-gray-500">{formulas.unrealized}</div>
            </div>
            <div className="sm:col-span-2">
              <strong className="text-green-700">📦 Оптовая цена предприятия:</strong> {safe(wholesalePrice)}
              <div className="text-xs text-gray-500">{formulas.wholesale}</div>
            </div>
          </div>

          <div className="space-y-2 mt-6">
            {/* Оптовая цена */}
            <div className="text-xs font-medium text-gray-700">Оптовая цена</div>
            <div className="relative h-5 rounded bg-gradient-to-r from-blue-200 to-blue-400 overflow-hidden">
              {/* 100% линия */}
              <div className="absolute left-[100%] top-0 bottom-0 w-0.5 bg-gray-300 z-10" />

              {/* Бар оптовой цены */}
              <div
                className={`h-full transition-all duration-300 z-0 ${wholesaleWidth > 100 ? 'bg-red-500' : 'bg-blue-600'}`}
                style={{ width: `${Math.min(Math.abs(wholesaleWidth), 100)}%` }}
              />

              {/* Label */}
              <div className="absolute inset-0 flex items-center justify-end px-2 text-white text-xs font-semibold">
                {safe(wholesalePrice)}
              </div>
            </div>

            {/* Чистая прибыль */}
            <div className="text-xs font-medium text-gray-700">Чистая прибыль</div>
            <div className="relative h-5 rounded bg-gradient-to-r from-emerald-200 to-emerald-400 overflow-hidden">
              {/* 100% линия */}
              <div className="absolute left-[100%] top-0 bottom-0 w-0.5 bg-gray-300 z-10" />

              {/* Бар чистой прибыли */}
              <div
                className={`h-full transition-all duration-300 z-0 ${np < 0 ? 'bg-orange-500' : 'bg-emerald-600'}`}
                style={{ width: `${Math.min(Math.abs(npWidth), 100)}%` }}
              />

              {/* Label */}
              <div className="absolute inset-0 flex items-center justify-end px-2 text-white text-xs font-semibold">
                {safe(np)}
              </div>
            </div>

            {/* Легенда */}
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>100% от выручки ({safe(vr)})</span>
            </div>
          </div>
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
            <li>Во всех полях этого модуля можно производить арифметические операции</li>
            <li>Налоги округляются вверх до целого (а другие отчисления - нет)</li>
            <li>Из-за такого округления, если мы расчитываем налоги поквартально (по 3 месяца), то последний квартал вычисляется как сумма налогов за весь период - сумма налогов в предыдущих кварталах</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-base">Ставки налога на добавленную стоимость (НДС)</h3>
          <ul className="list-disc list-inside">
            <li>20% — стандартная ставка</li>
            <li>10% — социально значимые товары</li>
            <li>0% — экспорт, международные перевозки</li>
            <li>10/110 и 20/120 (т.е. ставка/(100+ставка)) используют, когда из выручки нужно получить НДС</li>
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

        <section className="mt-6">
          <h3 className="font-semibold text-base mb-2">Прогрессивная шкала НДФЛ</h3>

          <div className="overflow-x-auto">
            <table className="text-sm border border-gray-200">
              <thead className="bg-gray-100 text-gray-700 text-left">
                <tr>
                  <th className="border px-3 py-2">Среднемесячный доход (млн ₽)</th>
                  <th className="border px-3 py-2">Среднегодовой доход (млн ₽)</th>
                  <th className="border px-3 py-2">Ставка</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr>
                  <td className="border px-3 py-2">до 0,2</td>
                  <td className="border px-3 py-2">до 2,4</td>
                  <td className="border px-3 py-2">13%</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">0,2 – 0,4167</td>
                  <td className="border px-3 py-2">2,4 – 5</td>
                  <td className="border px-3 py-2">15%</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">0,4 – 1,67</td>
                  <td className="border px-3 py-2">5 – 20</td>
                  <td className="border px-3 py-2">18%</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">1,67 – 4,17</td>
                  <td className="border px-3 py-2">20 – 50</td>
                  <td className="border px-3 py-2">20%</td>
                </tr>
                <tr>
                  <td className="border px-3 py-2">от 4,17</td>
                  <td className="border px-3 py-2">от 50</td>
                  <td className="border px-3 py-2">22%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Источник: <a className="text-blue-600 underline" href="https://www.consultant.ru/document/cons_doc_LAW_28165/3e4bbd6dd9fb5dd4e9394f447653506e1d6fa3a9/" target="_blank" rel="noopener noreferrer">
              НК РФ ч. 2, гл. 23, ст. 224
            </a>
          </p>
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
          Прибыль и налоги
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
