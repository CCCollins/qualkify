'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import GraphicalMethodCalculator from './GraphicalMethodCalculator';
import SimplexMethodCalculator from './SimplexMethodCalculator';

type Tab = 'graphical' | 'simplex';

export default function LinearOptimizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('graphical');

  return (
    <main className="bg-white sm:bg-gradient-to-br sm:from-sky-100 sm:to-blue-200 flex flex-col items-center px-4 sm:px-6 py-8 sm:py-12 min-h-screen">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-2">
          <Link href="/math-methods">
            <span className="bg-blue-600 text-white px-4 py-1 rounded-xl shadow transition hover:bg-blue-700">
              Математические методы
            </span>
          </Link>
        </h1>
        <p className="text-base md:text-lg text-gray-700 mt-4 font-medium">
          Решение задач линейной оптимизации (ЗЛО)
        </p>
      </div>

      <div className="w-full max-w-4xl">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('graphical')}
            className={`py-2 px-4 text-lg font-medium transition-colors ${
              activeTab === 'graphical'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Графический метод
          </button>
          <button
            onClick={() => setActiveTab('simplex')}
            className={`py-2 px-4 text-lg font-medium transition-colors ${
              activeTab === 'simplex'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Симплекс-метод
          </button>
        </div>
        <div className="mt-6">
          {activeTab === 'graphical' && <GraphicalMethodCalculator />}
          {activeTab === 'simplex' && <SimplexMethodCalculator />}
        </div>
      </div>

      <footer className="mt-12 text-sm text-gray-500 text-center">
        <p>© {new Date().getFullYear()} Qualkify</p>
      </footer>
    </main>
  );
}
