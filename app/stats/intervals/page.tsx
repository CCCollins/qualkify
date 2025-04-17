'use client';

import { useState, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import Link from 'next/link';
import { TbCopy, TbSmartHome } from 'react-icons/tb';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface IntervalRow {
  range: string;
  L: number;
  R: number;
  fi: number;
  wi: number;
  Fi: number;
  Wi: number;
}

export default function IntervalsPage() {
  const [input, setInput] = useState('');
  const [precision, setPrecision] = useState<number>(4);
  const [intervals, setIntervals] = useState<IntervalRow[]>([]);
  const [x, setX] = useState<number[]>([]);
  const [f, setF] = useState<number[]>([]);
  const [w, setW] = useState<number[]>([]);
  const [Moda, setModa] = useState<number | null>(null);
  const [ModaInterval, setModaInterval] = useState<string>('');
  const [Median, setMedian] = useState<number | null>(null);
  const [MedianInterval, setMedianInterval] = useState<string>('');
  const [chartData, setChartData] = useState<any>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const copyTooltip = useRef<HTMLSpanElement>(null);

  const round = (num: number) => {
    return precision !== null ? +num.toFixed(precision) : num;
  };

  const processData = () => {
    const rawNumbers = input
      .split(/[\s,]+/)
      .map((v) => parseFloat(v))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    if (rawNumbers.length === 0) return;

    const frequencyMap: Record<number, number> = {};
    rawNumbers.forEach((num) => {
      frequencyMap[num] = (frequencyMap[num] || 0) + 1;
    });

    const xVals = Object.keys(frequencyMap).map(Number).sort((a, b) => a - b);
    const fVals = xVals.map((num) => frequencyMap[num]);
    const total = fVals.reduce((a, b) => a + b, 0);
    const wVals = fVals.map((fi) => round(fi / total));

    const Xmin = rawNumbers[0];
    const Xmax = rawNumbers[rawNumbers.length - 1];
    const k = Math.floor(1 + 3.322 * Math.log10(rawNumbers.length));
    const h = (Xmax - Xmin) / k;

    const int: IntervalRow[] = [];
    let Fi = 0;
    let Wi = 0;

    for (let i = 0; i < k; i++) {
      const L = Xmin + i * h;
      const R = L + h;
      const valuesInInterval = rawNumbers.filter((v) => v >= L && (v < R || (i === k - 1 && v === R)));
      const fi = valuesInInterval.length;
      const wi = round(fi / total);
      Fi += fi;
      Wi += wi;

      int.push({
        range: `${round(L)}-${round(R)}`,
        L,
        R,
        fi,
        wi,
        Fi,
        Wi: round(Wi),
      });
    }

    const modalIndex = int.findIndex((i) => i.fi === Math.max(...int.map((r) => r.fi)));
    const M0 = int[modalIndex];
    const f1 = modalIndex > 0 ? int[modalIndex - 1].fi : 0;
    const f2 = modalIndex < int.length - 1 ? int[modalIndex + 1].fi : 0;
    const moda = M0.L + h * ((M0.fi - f1) / ((M0.fi - f1) + (M0.fi - f2)));

    const half = total / 2;
    const medianIndex = int.findIndex((i) => i.Fi >= half);
    const MeI = int[medianIndex];
    const Sprev = medianIndex > 0 ? int[medianIndex - 1].Fi : 0;
    const median = MeI.L + h * ((half - Sprev) / MeI.fi);

    const labels = int.map((i) => `${round(i.L)}–${round(i.R)}`);
    const fiData = int.map((i) => i.fi);
    const FiData = int.map((i) => i.Fi);

    setChartData({
      labels,
      polygon: {
        labels,
        datasets: [
          {
            label: 'fi (Полигон)',
            data: fiData,
            borderColor: 'blue',
            backgroundColor: 'blue',
            tension: 0.2,
          },
        ],
      },
      cumulative: {
        labels,
        datasets: [
          {
            type: 'bar' as const,
            label: 'Fi (Кумулята)',
            data: FiData,
            backgroundColor: 'green',
          },
        ],
      },
      histogram: {
        labels,
        datasets: [
          {
            type: 'bar' as const,
            label: 'Гистограмма',
            data: fiData,
            backgroundColor: 'rgba(255,99,132,0.5)',
            borderColor: 'red',
            borderWidth: 1,
          },
          {
            type: 'line' as const,
            label: 'Полигон',
            data: fiData,
            borderColor: 'black',
            backgroundColor: 'black',
            tension: 0.3,
          },
        ],
      },
    });

    setX(xVals);
    setF(fVals);
    setW(wVals);
    setIntervals(int);
    setModa(round(moda));
    setModaInterval(int[modalIndex].range);
    setMedian(round(median));
    setMedianInterval(int[medianIndex].range);
  };

  const handleCopy = () => {
    if (!outputRef.current) return;

    const text = outputRef.current.innerText;
    navigator.clipboard.writeText(text)
  };

  return (
    <main className="max-w-6xl mx-auto px-4">
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">
          Интервальный вариационный ряд
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center space-x-2 mt-4">
          <label className="font-medium">Знаков после запятой:</label>
          <input
            type="number"
            min={0}
            className="border px-2 py-1 w-14 rounded text-sm"
            value={precision}
            onChange={(e) => {
              const v = e.target.value;
              setPrecision(v === '' ? 4 : parseInt(v));
            }}
          />
        </div>
        <textarea
          rows={3}
          className="w-full border rounded p-3 font-mono"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="305 308 343 402 412 474 ..."
        />

        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded"
          onClick={processData}
        >
          Построить
        </button>
      </div>

      {(x.length > 0 || intervals.length > 0) && (
        <div className="bg-gray-50 mt-6 p-4 rounded-lg text-sm border relative" ref={outputRef}>
          <button
            title="Скопировать результат"
            onClick={handleCopy}
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          >
            <TbCopy className="text-xl" />
          </button>

          <div className="overflow-x-auto">
            <h2 className="font-semibold mb-1">📊 Дискретный ряд на основе {f.reduce((acc, val) => acc + val, 0)} значений</h2>
            <table className="table-auto border border-collapse mb-4">
              <thead>
              <tr>
                <th className="border px-2 py-1">X</th>
                {x.map((val, i) => (
                  <td key={i} className="border px-2 py-1">{val.toString().replace('.', ',')}</td>
                ))}
              </tr>
              <tr>
                <th className="border px-2 py-1">f</th>
                {f.map((val, i) => (
                  <td key={i} className="border px-2 py-1">{val.toString().replace('.', ',')}</td>
                ))}
              </tr>
              <tr>
                <th className="border px-2 py-1">w</th>
                {w.map((val, i) => (
                  <td key={i} className="border px-2 py-1">{val.toString().replace('.', ',')}</td>
                ))}
              </tr>
              </thead>
            </table>

            <h2 className="font-semibold mb-1">📈 Интервальный вариационный ряд</h2>
            <table className="table-auto border border-collapse w-full mb-2">
              <thead>
                <tr>
                  <th className="border px-2 py-1">№</th>
                  <th className="border px-2 py-1">Интервал</th>
                  <th className="border px-2 py-1">fi</th>
                  <th className="border px-2 py-1">wi</th>
                  <th className="border px-2 py-1">Fi</th>
                  <th className="border px-2 py-1">Wi</th>
                </tr>
              </thead>
              <tbody>
                {intervals.map((row, index) => (
                  <tr key={index}>
                    <td className="border px-2 py-1">{index + 1}</td>
                    <td className="border px-2 py-1">{row.range.replace('.', ',')}</td>
                    <td className="border px-2 py-1">{row.fi.toString().replace('.', ',')}</td>
                    <td className="border px-2 py-1">{row.wi.toString().replace('.', ',')}</td>
                    <td className="border px-2 py-1">{row.Fi.toString().replace('.', ',')}</td>
                    <td className="border px-2 py-1">{row.Wi.toString().replace('.', ',')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="mt-2">📌 <strong>Мода:</strong> {Moda?.toString().replace('.', ',')} (интервал {ModaInterval.replace('.', ',')})</p>
            <p className="mb-4">📌 <strong>Медиана:</strong> {Median?.toString().replace('.', ',')} (интервал {MedianInterval.replace('.', ',')})</p>
          </div>
        </div>
      )}

      {chartData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <div>
            <h2 className="font-semibold mb-2">📉 Кумулята</h2>
            <Line data={chartData.cumulative} />
          </div>

          <div>
            <h2 className="font-semibold mb-2">📈 Полигон</h2>
            <Line data={chartData.polygon} />
          </div>

          <div className="md:col-span-2">
            <h2 className="font-semibold mb-2">📊 Гистограмма + Полигон</h2>
            <Bar data={chartData.histogram} />
          </div>
        </div>
      )}
    </main>
  );
}
