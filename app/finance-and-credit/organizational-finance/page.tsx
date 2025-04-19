'use client';

import { useState } from 'react';
import { TbSmartHome } from 'react-icons/tb';
import ProfitComponent from './profit';
import AmortisationComponent from './amortisation';
import Link from 'next/link';

type Mode = 'profit' | 'amortisation';

export default function OrgFinancePage() {
  const [mode, setMode] = useState<Mode>('profit');

  return (
    <main className="max-w-6xl mx-auto px-4 space-y-6">
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">
          Финансы организаций
        </h1>
      </div>

      <div className="flex text-sm sm:text-md font-bold gap-1 sm:gap-3 flex-wrap justify-center">
        <button
          onClick={() => setMode('profit')}
          className={`px-2 sm:px-4 py-2 rounded ${
            mode === 'profit'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          Прибыль и налоги
        </button>
        <button
          onClick={() => setMode('amortisation')}
          className={`px-2 sm:px-4 py-2 rounded ${
            mode === 'amortisation'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          Амортизация
        </button>
      </div>

      <section>
        {mode === 'profit' ? <ProfitComponent /> : <AmortisationComponent />}
      </section>
    </main>
  );
}