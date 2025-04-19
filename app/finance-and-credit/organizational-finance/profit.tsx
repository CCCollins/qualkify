import { useState } from 'react';
import { TbTrash } from 'react-icons/tb';
import { input, parse, safe } from './utils';

export default function ProfitComponent() {
    const [precision, setPrecision] = useState(4);

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
    const [initAO, setAO] = useState('');
    const [materialCost, setMaterialCost] = useState('');
    const [waste, setWaste] = useState('');
    const [salaryFund, setSalaryFund] = useState('');
    const [socialRate, setSocialRate] = useState('30');
    const [creditAmount, setCreditAmount] = useState('');
    const [creditRate, setCreditRate] = useState('');
    const [creditMonths, setCreditMonths] = useState('');
    
    const p = parse;
  
    const AO = p(initAO);
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
  
    const formulas = {
      vp: `ВП = ВР - КН - СС = ${safe(vr, precision)} - ${safe(kn, precision)} - ${safe(effectiveCost, precision)} = ${safe(vp, precision)}`,
      pp: `ПП = ВП - УР - КР = ${safe(vp, precision)} - ${safe(ur, precision)} - ${safe(kr, precision)} = ${safe(pp, precision)}`,
      deltaVO: `ΔВО = ДВО - РВО = ${safe(dvo, precision)} - ${safe(rvo, precision)} = ${safe(deltaVO, precision)}`,
      preTax: `П до н/о = ПП ± ΔВО = ${safe(pp, precision)} + ${safe(deltaVO, precision)} = ${safe(preTax, precision)}`,
      np: `ЧП = П до н/о - ∑Н = ${safe(preTax, precision)} - ${safe(taxSum, precision)} = ${safe(np, precision)}`,
      unrealized: `НерП = ЧП - Ф = ${safe(np, precision)} - ${safe(deductions, precision)} = ${safe(unrealized, precision)}`,
      wholesale: `ОпЦ = СС + ПП + НДС = ${safe(effectiveCost, precision)} + ${safe(pp, precision)} + ${safe(vat, precision)} = ${safe(wholesalePrice, precision)}`
    };
    
    const formulasCost = {
      MZ: `МЗ = Р×Q − Pотх×Qотх = ${safe(p(materialCost), precision)} - ${safe(p(waste), precision)} = ${safe(MZ, precision)}`,
      OSN: `ОСН = ФОТ × Ст = ${safe(FOT, precision)} × ${safe(p(socialRate), precision)}% = ${safe(OSN, precision)}`,
      PR: `ПЛ = ${safe(p(creditAmount), precision)} × (${safe(p(creditRate), precision)}% × ${safe(p(creditMonths), precision)} / 12) = ${safe(PR, precision)}`,
      cost: `СС = АО + МЗ + ФОТ + ОСН + ПЛ = ${safe(AO, precision)} + ${safe(MZ, precision)} + ${safe(FOT, precision)} + ${safe(OSN, precision)} + ${safe(PR, precision)} = ${safe(detailedCost, precision)}`
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
      setMaterialCost('');
      setWaste('');
      setSalaryFund('');
      setSocialRate('30');
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
          <label htmlFor="useDetailedCost">Расширенный расчет себестоимости</label>
        </div>
  
        <h3 className="font-semibold text-base mb-1">Основные параметры</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>Выручка от реализации (ВР){input({ value: revenue, placeholder: "Нетто-выручка (без НДС) = ВР/1,2", onChange: e => setRevenue(e.target.value) })}</label>
          <label>Косвенные налоги (КН){input({ value: indirect, onChange: e => setIndirect(e.target.value) })}</label>
  
          {!useDetailedCost && (
            <label>Себестоимость (СС){input({ value: cost, onChange: e => setCost(e.target.value) })}</label>
          )}
        </div>
  
        {useDetailedCost && (
          <>
            <h3 className="font-semibold text-base mt-6 mb-1">Расширенный расчет себестоимости</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label>Закупка сырья (Р×Q){input({ value: materialCost, onChange: e => setMaterialCost(e.target.value) })}</label>
              <label>Возвратные отходы (Pотх×Qотх){input({ value: waste, onChange: e => setWaste(e.target.value) })}</label>
              <label>Фонд оплаты труда (ФОТ){input({ value: salaryFund, onChange: e => setSalaryFund(e.target.value) })}</label>
              <label>Социальные отчисления (Ст, %) {input({ value: socialRate, onChange: e => setSocialRate(e.target.value) })}</label>
              <label>Амортизация (AO){input({ value: initAO, onChange: e => setAO(e.target.value) })}</label>
              <label>Кредит (К) {input({ value: creditAmount, onChange: e => setCreditAmount(e.target.value) })}</label>
              <label>Ставка (d, %) {input({ value: creditRate, onChange: e => setCreditRate(e.target.value) })}</label>
              <label>Срок (t, мес) {input({ value: creditMonths, onChange: e => setCreditMonths(e.target.value) })}</label>
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
          <label>Отчисления в фонды (Ф){input({ value: funds, onChange: e => setFunds(e.target.value) })}</label>
        </div>
  
        {useDetailedCost && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm space-y-3">
            <h4 className="font-semibold text-base">🧾 Расчет себестоимости</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
              <div>
                <strong>Материальные затраты:</strong> {safe(MZ)}
                <div className="text-xs text-gray-500">{formulasCost.MZ}</div>
              </div>
              <div>
                <strong>Социальные отчисления:</strong> {safe(OSN)}
                <div className="text-xs text-gray-500">{formulasCost.OSN}</div>
              </div>
              <div>
                <strong>Плата за кредит:</strong> {safe(PR)}
                <div className="text-xs text-gray-500">{formulasCost.PR}</div>
              </div>
              <div className="sm:col-span-2">
                <strong className="text-blue-700">Себестоимость:</strong> {safe(detailedCost)}
                <div className="text-xs text-gray-500">{formulasCost.cost}</div>
              </div>
            </div>
          </div>
        )}
  
        <div className="relative mt-6 p-4 bg-white rounded shadow text-sm space-y-3">
          <h4 className="font-semibold text-base mb-1 pr-8">📊 Финансовый результат ( 
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