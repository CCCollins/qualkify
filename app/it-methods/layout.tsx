import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Qualkify | Методы оценки эффективности ИТ-проектов',
  description: 'Раздел калькулятора по оценке эффективности информационных технологий и IT-проектов: метрики производительности, ROI и анализ инвестиций.',
  keywords: [
    'оценка эффективности IT-проектов',
    'методы оценки ИТ',
    'ROI расчет',
    'производительность проектов',
    'инвестиции в IT',
    'метрики IT',
    'анализ проектов',
    'информационные технологии',
    'онлайн калькулятор'
  ],
  openGraph: {
    title: 'Qualkify | Методы оценки эффективности ИТ-проектов',
    description: 'Раздел калькулятора по оценке эффективности IT-проектов: расчёт ROI, метрики производительности и анализ инвестиций.',
    url: 'https://qualkify.vercel.app/it-methods',
    siteName: 'Qualkify',
    type: 'website',
    locale: 'ru_RU',
    images: [
      {
        url: 'https://qualkify.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Qualkify — Методы оценки эффективности ИТ-проектов',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qualkify | Методы оценки эффективности ИТ-проектов',
    description: 'Расчёты ROI, метрики производительности и анализ инвестиций в IT-проекты.',
    images: ['https://qualkify.vercel.app/og-image.png'],
    creator: '@qualkify',
  },
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function ITMethodsLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
  return children;
}
