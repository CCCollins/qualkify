import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Qualkify | Финансы и кредит',
  description: 'Раздел калькулятора по финансовым вычислениям: проценты, кредиты, аннуитеты и другие финансовые инструменты.',
  keywords: [
    'финансовый калькулятор',
    'проценты',
    'аннуитет',
    'кредит',
    'расчёт кредита',
    'финансовая математика',
    'платёж',
    'переплата',
    'ставка',
    'инвестиции',
    'учебный калькулятор',
    'финансы онлайн'
  ],
  openGraph: {
    title: 'Qualkify | Финансы и кредит',
    description: 'Финансовый модуль: кредиты, проценты, расчёты платежей.',
    url: 'https://qualkify.vercel.app/finance-and-credit',
    siteName: 'Qualkify',
    type: 'website',
    locale: 'ru_RU',
    images: [
      {
        url: 'https://qualkify.vercel.app/favicon.ico',
        width: 1200,
        height: 630,
        alt: 'Qualkify — Финансовый раздел',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qualkify | Финансы и кредит',
    description: 'Финансовые инструменты: расчёт кредита, процентов и платежей.',
    images: ['https://qualkify.vercel.app/favicon.ico'],
    creator: '@qualkify',
  },
  robots: 'index, follow',
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}