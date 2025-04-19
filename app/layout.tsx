import type { Metadata } from 'next';
import { Inter, Fira_Code } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});

const firaCode = Fira_Code({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Qualkify | Модульный калькулятор',
  description: 'Модульный калькулятор для студентов: дискретная математика, статистика, финансы и кредит.',
  metadataBase: new URL('https://qualkify.vercel.app'),
  keywords: [
    'калькулятор для студентов',
    'дискретная математика',
    'статистика',
    'финансы',
    'логика',
    'индукция',
    'множества',
    'графы',
    'алгоритмы',
    'аннуитеты',
    'кредит',
    'СКО',
    'дисперсия',
    'таблица истинности',
    'умножение матриц',
    'онлайн калькулятор'
  ],
  authors: [{ name: 'Qualkify', url: 'https://qualkify.vercel.app' }],
  openGraph: {
    title: 'Qualkify | Модульный калькулятор',
    description: 'Универсальный модульный калькулятор для студентов: от дискретной математики до финансов.',
    url: 'https://qualkify.vercel.app',
    siteName: 'Qualkify',
    images: [
      {
        url: 'https://qualkify.vercel.app/favicon.ico',
        width: 1200,
        height: 630,
        alt: 'Qualkify — модульный калькулятор',
      },
    ],
    type: 'website',
    locale: 'ru_RU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Qualkify | Модульный калькулятор',
    description: 'Модульный калькулятор для студентов: дискретная математика, статистика, финансы и кредит.',
    images: ['https://qualkify.vercel.app/favicon.ico'],
    creator: '@qualkify',
  },
  icons: {
    icon: 'https://qualkify.vercel.app/favicon.ico',
    apple: 'https://qualkify.vercel.app/favicon.ico',
  },
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${firaCode.variable}`}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#ffffff" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="yandex-verification" content="ed28aa269cce631d" />
        <meta name="google-site-verification" content="CrK9H1Ma_dMxFmA3uhTYs9F9flePHdvsTm5FbhmDjE4" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />
        <link rel="canonical" href="https://qualkify.vercel.app" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Qualkify',
            description: 'Модульный калькулятор по математике, статистике и финансам для студентов',
            url: 'https://qualkify.vercel.app',
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'All',
            inLanguage: 'ru-RU',
          })
        }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

            ym(101018553, "init", {
              clickmap:true,
              trackLinks:true,
              accurateTrackBounce:true
            });
          `
          }}
        />
      </head>
      <body className="bg-gradient-to-br from-blue-100 via-sky-200 to-indigo-300 text-gray-900 min-h-screen flex items-center justify-center">
        <div className="container mx-auto bg-white shadow-lg rounded-lg p-8 md:max-w-4xl max-w-[90vw] px-2 sm:px-8 lg:px-10 max-h-[95vh] overflow-auto">
          {children}
        </div>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/101018553" style={{ position: 'absolute', left: '-9999px' }} alt="yandex" />
          </div>
        </noscript>
      </body>
    </html>
  );
}
