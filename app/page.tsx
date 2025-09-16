'use client';

import Link from 'next/link';

const categories = [
  {
    name: 'Дискретная математика',
    path: '/discrete-math',
    icon: '🧠',
    color: 'from-blue-100 to-blue-50',
    text: 'text-blue-800',
    modules: [
      { name: 'Логические выражения', path: '/discrete-math/logic', emoji: '🔣' },
      { name: 'Математическая индукция', path: '/discrete-math/induction', emoji: '🔁' },
      { name: 'Операции над множествами', path: '/discrete-math/sets', emoji: '📚' },
      { name: 'Анализ отношений', path: '/discrete-math/relations', emoji: '🧩' },
      { name: 'Алгоритм Дейкстры', path: '/discrete-math/dijkstra', emoji: '🗺️' },
      { name: 'Операции с матрицами', path: '/discrete-math/matrixes', emoji: '🔢' },
    ],
  },
  {
    name: 'Статистика',
    path: '/statistics',
    icon: '📊',
    color: 'from-green-100 to-green-50',
    text: 'text-green-800',
    modules: [
      { name: 'Интервальный вариационный ряд', path: '/statistics/intervals', emoji: '📈' },
      { name: 'Анализ дисперсий', path: '/statistics/variance', emoji: '📉' },
    ],
  },
  {
    name: 'Финансы и кредит',
    path: '/finance-and-credit',
    icon: '💸',
    color: 'from-yellow-100 to-yellow-50',
    text: 'text-yellow-800',
    modules: [
      { name: 'Расчет налогов', path: '/finance-and-credit/taxes', emoji: '💰' },
      { name: 'Баланс бюджета', path: '/finance-and-credit/budget', emoji: '🏦' },
      { name: 'Финансы организаций', path: '/finance-and-credit/organizational-finance', emoji: '🏢' },
    ],
  },
  {
    name: 'Математические методы',
    path: '/math-methods',
    icon: '📈',
    color: 'from-purple-100 to-purple-50',
    text: 'text-purple-800',
    modules: [
      { name: 'Решение задач линейной оптимизации (ЗЛО)', path: '/math-methods/zlo', emoji: '📐' },
    ],
  },
];

export default function Home() {
  return (
    <main className="bg-white sm:bg-gradient-to-br from-sky-100 to-blue-200 px-4 py-8 sm:px-6 sm:py-10">
      <div className="text-center mb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-2">
          <span className="bg-blue-600 text-white px-4 py-1 rounded-xl shadow">
            Qualkify
          </span>
        </h1>
        <p className="text-base md:text-lg text-gray-700 mt-4 font-medium">
          Модульный калькулятор для студентов
        </p>
      </div>

      <div className="space-y-7 sm:space-y-5 max-w-6xl mx-auto">
        {categories.map(({ name, icon, color, text, modules, path }) => (
          <section
            key={name}
            className={`bg-gradient-to-br ${color} p-4 rounded-2xl shadow`}
          >
            <Link href={path} className="group block w-fit">
              <h2 className={`text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2 ${text} transition`}>
                <span className="text-2xl">{icon}</span> {name}
              </h2>
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {modules.map(({ name, path, emoji }) => (
                <Link
                  key={name}
                  href={path}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-white text-gray-800 font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-gray-50 border border-gray-200 transition-all duration-200 text-left"
                >
                  <span className="text-xl sm:text-2xl group-hover:scale-[1.05] transition-transform">
                    {emoji}
                  </span>
                  <span className="text-sm sm:text-base">{name}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="mt-7 pt-6 text-sm text-gray-500 text-center">
        <div className="flex justify-center items-center gap-2">
          © {new Date().getFullYear()} Qualkify
          <Link
            href="https://github.com/CCCollins/qualkify"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 transition"
            aria-label="GitHub Repository"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 24 24"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.49.5.09.68-.22.68-.48 0-.24-.01-.87-.01-1.7-2.78.6-3.37-1.34-3.37-1.34-.46-1.15-1.11-1.46-1.11-1.46-.91-.62.07-.61.07-.61 1.01.07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.03A9.57 9.57 0 0 1 12 6.84c.86.01 1.72.12 2.52.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.86 0 1.34-.01 2.42-.01 2.75 0 .27.18.58.69.48A10.02 10.02 0 0 0 22 12c0-5.52-4.48-10-10-10z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </footer>
    </main>
  );
}
