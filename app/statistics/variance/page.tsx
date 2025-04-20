'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TbSmartHome } from 'react-icons/tb';

import EditableTable from './EditableTable';
import GroupDetailTable from './GroupDetailTable';
import DispersionSummary from './DispersionSummary';

type TableRow = (number | string)[];

interface GroupStats {
  fi: number;
  sumXiFi: number;
  sumXi2Fi: number;
  mean: number;
  disp: number;
  std: number;
  formulas: {
    mean: string;
    disp: string;
    std: string;
  };
}

interface Results {
  overallMean: number;
  overallDisp: number;
  overallStd: number;
  Dvnutr: number;
  Dmezh: number;
  etaSquared: number;
  N_total: number;
  groupStats: GroupStats[];
  formulas: {
    overallMean: string;
    overallDisp: string;
    overallStd: string;
    Dvnutr: string;
    Dmezh: string;
    etaSquared: string;
  };
}

export default function DispersionTable() {
  const [table, setTable] = useState<TableRow[]>([
    [50, 20, 40],
    [100, 80, 160],
    [150, 150, 200],
    [350, 300, 400],
    [200, 150, 250],
    [150, 100, 50],
  ]);
  const [rowLabels, setRowLabels] = useState(['1', '2', '3', '4', '5', '6']);
  const [colLabels, setColLabels] = useState(['#1', '#2', '#3']);
  const [results, setResults] = useState<Results | null>(null);
  const [decimalPlaces, setDecimalPlaces] = useState(4);

  const parseNumeric = (val: number | string): number => {
    const parsed = parseFloat(String(val));
    return isNaN(parsed) ? 0 : parsed;
  };

  const toFixed = (val: number) => val.toFixed(decimalPlaces).replace(/\./g, ',');

  const calculate = () => {
    let N_total = 0;
    let totalSumXiFi = 0;
    let totalSumXi2Fi = 0;
  
    const parsedRowLabels = rowLabels.map(label => parseFloat(label)).map(v => isNaN(v) ? 0 : v);
  
    const groupStats = table[0].map((_, col) => {
      let fi = 0, sumXiFi = 0, sumXi2Fi = 0;
  
      table.forEach((row, i) => {
        const xi = parsedRowLabels[i];
        const f = parseNumeric(row[col]);
        fi += f;
        sumXiFi += xi * f;
        sumXi2Fi += xi ** 2 * f;
      });
  
      const mean = fi === 0 ? 0 : sumXiFi / fi;
      const disp = fi === 0 ? 0 : sumXi2Fi / fi - mean ** 2;
      const std = Math.sqrt(disp);
  
      N_total += fi;
      totalSumXiFi += sumXiFi;
      totalSumXi2Fi += sumXi2Fi;
  
      return {
        fi,
        sumXiFi,
        sumXi2Fi,
        mean,
        disp,
        std,
        formulas: {
          mean: `X̄ = ∑(x·f) / ∑f = ${sumXiFi} / ${fi} = ${toFixed(mean)}`,
          disp: `D = (∑(x²·f) / ∑f) - X̄² = (${sumXi2Fi} / ${fi}) - (${toFixed(mean)}²) = ${toFixed(disp)}`,
          std: `σ = √D = √${toFixed(disp)} = ${toFixed(std)}`,
        },
      };
    });
  
    const overallMean = totalSumXiFi / N_total;
    const overallDisp = totalSumXi2Fi / N_total - overallMean ** 2;
    const overallStd = Math.sqrt(overallDisp);
    const Dvnutr = groupStats.reduce((sum, g) => sum + g.disp * g.fi, 0) / N_total;
    const Dmezh = groupStats.reduce((sum, g) => sum + g.fi * (g.mean - overallMean) ** 2, 0) / N_total;
    const etaSquared = Dmezh / overallDisp;
  
    setResults({
      overallMean,
      overallDisp,
      overallStd,
      Dvnutr,
      Dmezh,
      etaSquared,
      groupStats,
      N_total,
      formulas: {
        overallMean: `X̄ = ∑(x·f) / N = ${totalSumXiFi} / ${N_total} = ${toFixed(overallMean)}`,
        overallDisp: `σ² = (∑(x²·f) / N) - X̄² = (${totalSumXi2Fi} / ${N_total}) - (${toFixed(overallMean)}²) = ${toFixed(overallDisp)}`,
        overallStd: `σ = √σ² = √${toFixed(overallDisp)} = ${toFixed(overallStd)}`,
        Dvnutr: `D̄ = ∑(Dᵢ·∑fᵢ) / N = ${groupStats.map((g) => `(${toFixed(g.disp)}·${g.fi})`).join(' + ')} / ${N_total} = ${toFixed(Dvnutr)}`,
        Dmezh: `δ² = ∑(∑fᵢ·(X̄ᵢ - X̄)²) / N = ${groupStats.map((g) => `(${g.fi}·(${toFixed(g.mean)} - ${toFixed(overallMean)})²)`).join(' + ')} / ${N_total} = ${toFixed(Dmezh)}`,
        etaSquared: `η² = D̄ / σ² = ${toFixed(Dmezh)} / ${toFixed(overallDisp)} = ${toFixed(etaSquared)}`,
      },
    });
  };

  const clearTable = () => {
    setTable([[0]]);
    setRowLabels(['1']);
    setColLabels(['Группа #1']);
    setResults(null);
  };

  const copyResults = () => {
    if (!results) return;
    const groupRows = results.groupStats.map((g, i) =>
      `${colLabels[i]}\t${g.fi}\t${g.sumXiFi}\t${g.sumXi2Fi}\t${toFixed(g.mean)}\t${toFixed(g.disp)}\t${toFixed(g.std)}`
    ).join('\n');

    const text = `
Общее среднее:\t${toFixed(results.overallMean)}
Общая дисперсия:\t${toFixed(results.overallDisp)}
СКО:\t${toFixed(results.overallStd)}
Средняя внутригрупповая дисперсия:\t${toFixed(results.Dvnutr)}
Межгрупповая дисперсия:\t${toFixed(results.Dmezh)}
Проверка (σ² ≈ D + δ²):\t${toFixed(results.Dvnutr + results.Dmezh)}
Коэффициент детерминации η²:\t${toFixed(results.etaSquared)}

Группа\t∑f\t∑x·f\t∑x²·f\tX̄\tDᵢ\tσᵢ
${groupRows}
    `.trim();

    navigator.clipboard.writeText(text);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 pb-10">
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">Анализ дисперсий</h1>
      </div>

      <EditableTable
        table={table}
        setTable={setTable}
        rowLabels={rowLabels}
        setRowLabels={setRowLabels}
        colLabels={colLabels}
        setColLabels={setColLabels}
        onCalculate={calculate}
      />

      {results && (
        <>
          <DispersionSummary
            results={results}
            toFixed={toFixed}
            precision={decimalPlaces}
            setPrecision={setDecimalPlaces}
            resetFields={clearTable}
            copyResults={copyResults}
          />
          <GroupDetailTable results={results} colLabels={colLabels} toFixed={toFixed} />
        </>
      )}
    </main>
  );
}
