'use client';

import { useRouter } from 'next/navigation';

const modules = [
  { name: 'Логические выражения', path: '/logic', emoji: '🧠' },
  { name: 'Математическая индукция', path: '/induction', emoji: '🧮' },
  { name: 'Операции над множествами', path: '/sets', emoji: '📚' },
  { name: 'Алгоритм Дейкстры', path: '/dijkstra', emoji: '🗺️' },
  { name: 'Операции с матрицами', path: '/matrixes', emoji: '🔢' },
  { name: 'Исходный код', path: 'https://github.com/CCCollins/qualkify', emoji: '🐱' },
];

export default function Home() {
  const router = useRouter();

  return (
    <main className="bg-gradient-to-br from-sky-100 to-blue-200 flex flex-col items-center justify-center px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-gray-800 mb-2">
          <span className="bg-blue-600 text-white px-4 py-1 rounded-xl shadow">
            Qualkify
          </span>
        </h1>
        <p className="text-lg text-gray-700 mt-4 font-medium">
          Модульный калькулятор по дискретной математике для студентов
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {modules.map((module) => (
          <button
            key={module.name}
            onClick={() => router.push(module.path)}
            className="w-full flex items-center gap-4 px-6 py-5 bg-white text-blue-800 font-semibold rounded-xl shadow-md hover:shadow-lg hover:bg-blue-50 border border-blue-100 transition-all duration-200 text-left"
          >
            <span className="text-2xl">{module.emoji}</span>
            <span>{module.name}</span>
          </button>
        ))}
      </div>

      <footer className="mt-16 text-sm text-gray-500 text-center">
        © {new Date().getFullYear()} Qualkify · Дискретная математика
      </footer>
    </main>
  );
}
