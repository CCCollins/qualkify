'use client';

import Link from 'next/link';

const modules = [
  { name: 'Средние значения', path: '/stats/intervals', emoji: '📈' },
  { name: 'Анализ дисперсий', path: '/stats/variance', emoji: '📉' },
];

export default function Home() {
  return (
    <main className="bg-white sm:bg-gradient-to-br sm:from-sky-100 sm:to-blue-200 flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
          <Link href="/">
            <span className="bg-blue-600 text-white px-4 py-1 rounded-xl shadow transition">
              Qualkify
            </span>
          </Link>
        </h1>
        <p className="text-base md:text-lg text-gray-700 mt-4 font-medium">
          Модульный калькулятор по статистике для студентов
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {modules.map(({ name, path, emoji }) => (
          <Link
            key={name}
            href={path}
            className="w-full flex items-center gap-4 px-6 py-5 bg-white text-blue-800 font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-blue-50 border border-blue-100 transition-all duration-200 text-left"
          >
            <span className="text-2xl">{emoji}</span>
            <span>{name}</span>
          </Link>
        ))}
      </div>

      <footer className="mt-16 text-sm text-gray-500 text-center flex items-center justify-center gap-2">
        © {new Date().getFullYear()} Qualkify
        <Link
          href="https://github.com/CCCollins/qualkify"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="GitHub Repository"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.461-1.11-1.461-.908-.62.069-.608.069-.608 1.004.07 1.532 1.032 1.532 1.032.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.983 1.03-2.682-.103-.253-.447-1.27.098-2.645 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.91-1.294 2.75-1.025 2.75-1.025.545 1.375.201 2.392.099 2.645.64.699 1.03 1.591 1.03 2.682 0 3.842-2.337 4.687-4.565 4.936.36.31.682.92.682 1.855 0 1.338-.012 2.419-.012 2.747 0 .267.18.578.688.48C19.137 20.165 22 16.418 22 12c0-5.523-4.477-10-10-10z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
      </footer>
    </main>
  );
}
