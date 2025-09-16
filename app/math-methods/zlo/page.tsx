'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import GraphicalMethodCalculator from './GraphicalMethodCalculator';
import SimplexMethodCalculator from './SimplexMethodCalculator';
import { TbSmartHome } from 'react-icons/tb';

type Tab = 'graphical' | 'simplex';

export default function LinearOptimizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('graphical');

  return (
    <main className="max-w-6xl mx-auto px-4 space-y-6">
      <div className="flex justify-center items-center mb-6">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-3xl mr-2" />
        </Link>
        <h1 className="text-xl md:text-3xl font-bold text-center">
          Решение задач линейной оптимизации (ЗЛО)
        </h1>
      </div>

      <div className="flex text-sm sm:text-md font-bold gap-1 sm:gap-3 flex-wrap justify-center">
        <button
          onClick={() => setActiveTab('graphical')}
          className={`px-2 sm:px-4 py-2 rounded ${
            activeTab === 'graphical'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          Графический метод
        </button>
        <button
          onClick={() => setActiveTab('simplex')}
          className={`px-2 sm:px-4 py-2 rounded ${
            activeTab === 'simplex'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          Симплекс-метод
        </button>
      </div>

      <div>
        {activeTab === 'graphical' && <GraphicalMethodCalculator />}
        {activeTab === 'simplex' && <SimplexMethodCalculator />}
      </div>
    </main>
  );
}