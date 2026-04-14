import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Qualkify | Эконометрическое моделирование',
  description: 'Раздел калькулятора по эконометрическому моделированию: регрессионный анализ, статистические модели, прогнозирование и анализ данных.',
  keywords: [
    'эконометрическое моделирование',
    'эконометрика',
    'регрессионный анализ',
    'статистические модели',
    'прогнозирование',
    'анализ данных',
    'временные ряды',
    'корреляция',
    'тестирование гипотез',
    'онлайн калькулятор'
  ],
  openGraph: {
    title: 'Qualkify | Эконометрическое моделирование',
    description: 'Модуль эконометрического моделирования: регрессия, статистические модели и прогнозирование.',
    url: 'https://qualkify.vercel.app/econometrics',
    siteName: 'Qualkify',
    type: 'website',
    locale: 'ru_RU',
    images: [
      {
        url: 'https://qualkify.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Qualkify — Эконометрическое моделирование',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qualkify | Эконометрическое моделирование',
    description: 'Регрессионный анализ, статистические модели и прогнозирование в эконометрике.',
    images: ['https://qualkify.vercel.app/og-image.png'],
    creator: '@qualkify',
  },
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function EconometricModelingLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
  return children;
}
