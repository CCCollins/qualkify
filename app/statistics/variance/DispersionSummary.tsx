'use client';

import { TbTrash, TbCopy } from 'react-icons/tb';
import type { Results } from './dispersion';

type Props = {
  results: Results;
  toFixed: (n: number) => string;
  precision: number;
  setPrecision: (value: number) => void;
  resetFields: () => void;
  copyResults: () => void;
};

export default function DispersionSummary({
  results,
  toFixed,
  precision,
  setPrecision,
  resetFields,
  copyResults,
}: Props) {
  return (
    <div className="relative bg-white rounded shadow p-4 space-y-4">
      <h4 className="font-semibold text-base mb-1 pr-12">
        📊 Результаты (
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

      <button
        onClick={copyResults}
        className="absolute top-4 right-14 text-gray-600 hover:text-black"
        title="Копировать в буфер"
      >
        <TbCopy className="text-xl" />
      </button>

      <ul className="list-disc list-inside text-sm space-y-1">
        <li>
          Общее среднее: <strong>{toFixed(results.overallMean)}</strong>
          <br />
          <span className="text-gray-600 text-xs">{results.formulas.overallMean}</span>
        </li>
        <li>
          Общая дисперсия: <strong>{toFixed(results.overallDisp)}</strong>
          <br />
          <span className="text-gray-600 text-xs">{results.formulas.overallDisp}</span>
        </li>
        <li>
          СКО: <strong>{toFixed(results.overallStd)}</strong>
          <br />
          <span className="text-gray-600 text-xs">{results.formulas.overallStd}</span>
        </li>
        <li>
          Средняя внутригрупповая дисперсия: <strong>{toFixed(results.Dvnutr)}</strong>
          <br />
          <span className="text-gray-600 text-xs">{results.formulas.Dvnutr}</span>
        </li>
        <li>
          Межгрупповая дисперсия: <strong>{toFixed(results.Dmezh)}</strong>
          <br />
          <span className="text-gray-600 text-xs">{results.formulas.Dmezh}</span>
        </li>
        <li>
          Проверка: σ² ≈ D + δ² → <strong>{toFixed(results.Dvnutr + results.Dmezh)}</strong>
        </li>
        <li>
          Коэффициент детерминации η²: <strong>{toFixed(results.etaSquared)}</strong>
          <br />
          <span className="text-gray-600 text-xs">{results.formulas.etaSquared}</span>
        </li>
      </ul>
    </div>
  );
}
