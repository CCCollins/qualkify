import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Qualkify | Дискретная математика',
  description: 'Раздел калькулятора, посвящённый дискретной математике: логика, множества, графы, алгоритмы и многое другое.',
  keywords: [
    'дискретная математика',
    'логика',
    'индукция',
    'множества',
    'графы',
    'алгоритмы графов',
    'таблица истинности',
    'алгоритм Дейкстры',
    'булева алгебра',
    'матрицы',
    'онлайн калькулятор',
    'учебный калькулятор'
  ],
  openGraph: {
    title: 'Qualkify | Дискретная математика',
    description: 'Раздел калькулятора по дискретной математике: логические выражения, графы, множества и другие темы.',
    url: 'https://qualkify.vercel.app/dm',
    siteName: 'Qualkify',
    type: 'website',
    locale: 'ru_RU',
    images: [
      {
        url: 'https://qualkify.vercel.app/favicon.ico',
        width: 1200,
        height: 630,
        alt: 'Qualkify — Дискретная математика',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qualkify | Дискретная математика',
    description: 'Темы дискретной математики: логика, множества, графы и т.д.',
    images: ['https://qualkify.vercel.app/favicon.ico'],
    creator: '@qualkify',
  },
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function DmLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <>{children}</>;
  }
