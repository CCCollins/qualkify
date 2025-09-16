"use client"

import { useState } from "react"
import Link from "next/link"
import GraphicalMethodCalculator from "./GraphicalMethodCalculator"
import SimplexMethodCalculator from "./SimplexMethodCalculator"
import { TbSmartHome } from "react-icons/tb"

type Tab = "graphical" | "simplex"

export default function LinearOptimizationPage() {
  const [activeTab, setActiveTab] = useState<Tab>("graphical")

  return (
    <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-center items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <Link href="/" className="text-blue-600 hover:text-blue-800 transition" title="Домашняя страница">
          <TbSmartHome className="text-2xl sm:text-3xl mr-0 sm:mr-2" />
        </Link>
        <h1 className="text-lg sm:text-xl md:text-3xl font-bold text-center text-balance">
          Решение задач линейной оптимизации (ЗЛО)
        </h1>
      </div>

      <div className="flex text-xs sm:text-sm md:text-base font-bold gap-1 sm:gap-3 flex-wrap justify-center">
        <button
          onClick={() => setActiveTab("graphical")}
          className={`px-3 sm:px-4 py-3 sm:py-2 rounded-lg min-h-[44px] flex-1 sm:flex-none transition-colors ${
            activeTab === "graphical"
              ? "bg-blue-600 text-white shadow-md"
              : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          Графический метод
        </button>
        <button
          onClick={() => setActiveTab("simplex")}
          className={`px-3 sm:px-4 py-3 sm:py-2 rounded-lg min-h-[44px] flex-1 sm:flex-none transition-colors ${
            activeTab === "simplex" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-800 hover:bg-gray-200"
          }`}
        >
          Симплекс-метод
        </button>
      </div>

      <div>
        {activeTab === "graphical" && <GraphicalMethodCalculator />}
        {activeTab === "simplex" && <SimplexMethodCalculator />}
      </div>
    </main>
  )
}
