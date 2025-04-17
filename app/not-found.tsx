'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 bg-white sm:bg-gradient-to-br from-sky-100 to-indigo-200">
      <h1 className="text-6xl font-bold text-blue-800 mb-4">404</h1>
      <p className="text-xl text-gray-700 mb-6">
        Страница не найдена 😢
      </p>
      <Link
        href="/"
        className="px-6 py-2 bg-blue-600 text-white rounded-full shadow hover:bg-blue-700 transition"
      >
        Вернуться на главную
      </Link>
    </div>
  );
}
