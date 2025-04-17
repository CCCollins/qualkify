import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Qualkify | Статистика',
  description: 'Раздел калькулятора по математической статистике: средние значения, дисперсия, стандартное отклонение и другое.',
  keywords: [
    'статистика',
    'математическая статистика',
    'среднее значение',
    'дисперсия',
    'СКО',
    'стандартное отклонение',
    'анализ данных',
    'медиана',
    'мода',
    'онлайн калькулятор',
    'статистика для студентов'
  ],
  openGraph: {
    title: 'Qualkify | Статистика',
    description: 'Темы по статистике: дисперсия, средние, СКО и многое другое.',
    url: 'https://qualkify.vercel.app/statistics',
    siteName: 'Qualkify',
    type: 'website',
    locale: 'ru_RU',
    images: [
      {
        url: 'https://qualkify.vercel.app/favicon.ico',
        width: 1200,
        height: 630,
        alt: 'Qualkify — Статистика',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qualkify | Статистика',
    description: 'Раздел по статистике: средние, дисперсия и другие методы анализа.',
    images: ['https://qualkify.vercel.app/favicon.ico'],
    creator: '@qualkify',
  },
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function StatsLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <>{children}</>;
  }