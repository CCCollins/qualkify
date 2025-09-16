import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Qualkify | Математические методы',
  description: 'Раздел калькулятора по математическим методам в экономике и управлении: решение задач линейной оптимизации и другое.',
  keywords: [
    'математические методы',
    'линейная оптимизация',
    'симплекс-метод',
    'графический метод',
    'ЗЛО',
    'экономика',
    'управление',
    'онлайн калькулятор'
  ],
  openGraph: {
    title: 'Qualkify | Математические методы',
    description: 'Темы по математическим методам: ЗЛО, симплекс-метод и другие.',
    url: 'https://qualkify.vercel.app/math-methods',
    siteName: 'Qualkify',
    type: 'website',
    locale: 'ru_RU',
    images: [
      {
        url: 'https://qualkify.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Qualkify — Математические методы',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qualkify | Математические методы',
    description: 'Раздел по математическим методам в экономике и управлении.',
    images: ['https://qualkify.vercel.app/og-image.png'],
    creator: '@qualkify',
  },
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function MathMethodsLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <>{children}</>;
  }
