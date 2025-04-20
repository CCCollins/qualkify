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
  title: 'Qualkify — онлайн калькулятор для студентов и преподавателей',
  description: 'Универсальный модульный калькулятор: от дискретной математики до расчёта амортизации и NPV. Бесплатный онлайн-сервис для студентов и вузов.',
  metadataBase: new URL('https://qualkify.vercel.app'),
  keywords: [
    'калькулятор для студентов онлайн',
    'учебный калькулятор для вуза',
    'финансовый калькулятор NPV онлайн',
    'дискретная математика онлайн калькулятор',
    'таблица истинности — логика и вычисления',
    'аннуитетный калькулятор онлайн бесплатно',
    'расчет амортизации основных средств',
    'расчёт кредита и процентов онлайн',
    'статистика и вероятности для студентов',
    'модульный калькулятор по математике',
    'алгоритмы и графы — учебные расчеты',
    'калькулятор множества и логических операций',
    'таблица ДНФ и КНФ по выражению',
    'онлайн калькулятор по матлогике и булевой алгебре',
    'финансовый анализ проекта — расчет NPV и PI',
    'универсальный калькулятор для экзаменов и зачётов',
    'быстрые вычисления для ВУЗов и колледжей',
    'калькулятор по финансам и кредитованию',
    'студенческий калькулятор задач с формулами',
    'калькулятор для подготовки к контрольной'
  ],
  authors: [{ name: 'Qualkify', url: 'https://qualkify.vercel.app' }],
  openGraph: {
    title: 'Qualkify — онлайн калькулятор для студентов и преподавателей',
    description: 'Быстрые расчёты по логике, алгебре, финансам, графам и другим темам. Идеально подходит для учёбы.',
    url: 'https://qualkify.vercel.app',
    siteName: 'Qualkify',
    images: [
      {
        url: 'https://qualkify.vercel.app/og-image.png',
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
    title: 'Qualkify — умный калькулятор для учёбы онлайн',
    description: 'Бесплатный онлайн калькулятор для студентов: дискретная математика, статистика, логика, кредиты и финансы.',
    images: ['https://qualkify.vercel.app/og-image.png'],
    creator: '@qualkify',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/favicon.ico',
  },
  robots: 'index, follow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Qualkify',
              description: 'Универсальный онлайн-калькулятор для учёбы: логика, финансы, математика, графы, амортизация и многое другое.',
              url: 'https://qualkify.vercel.app',
              keywords: 'онлайн калькулятор для студентов, таблица истинности, амортизация, расчет NPV, учебный калькулятор, логика, статистика, графы, множества',
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'All',
              inLanguage: 'ru-RU',
            }),
          }}
        />
        <script type="text/javascript">
          {`
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

            ym(101018553, "init", {
                  clickmap:true,
                  trackLinks:true,
                  accurateTrackBounce:true
            });
          `}
        </script>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/101018553" style={{ position: "absolute", left: "-9999px" }} alt="" />
          </div>
        </noscript>
      </head>
      <body className="bg-gradient-to-br from-blue-100 via-sky-200 to-indigo-300 text-gray-900 min-h-screen flex items-center justify-center">
        <div className="container mx-auto bg-white shadow-lg rounded-lg p-8 md:max-w-5xl max-w-[90vw] px-2 sm:px-8 lg:px-10 max-h-[95vh] overflow-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
