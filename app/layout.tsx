import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const firaCode = Fira_Code({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Qualkify | Дискретная математика",
  description: "Модульный калькулятор для дискретной математики",
  robots: "index, follow",
  keywords: [
    "дискретная математика",
    "логика",
    "индукция",
    "множества",
    "графы",
    "алгоритм Дейкстры",
    "матрица Кирхгоффа",
    "таблица истинности",
    "булева алгебра",
    "умножение матриц",
    "калькулятор",
    "дискретная математика калькулятор",
    "дискретная математика онлайн"
  ],
  authors: [{ name: "Qualkify", url: "https://qualkify.vercel.app" }],
  metadataBase: new URL("https://qualkify.vercel.app"),
  openGraph: {
    title: "Qualkify | Дискретная математика",
    description: "Модульный калькулятор по дискретной математике для студентов",
    url: "https://qualkify.vercel.app",
    siteName: "Qualkify",
    images: [
      {
        url: "https://qualkify.vercel.app/favicon.ico",
        width: 1200,
        height: 630,
        alt: "Qualkify — Дискретная математика",
      },
    ],
    type: "website",
    locale: "ru_RU",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qualkify | Дискретная математика",
    description: "Модульный калькулятор для дискретной математики",
    images: ["https://qualkify.vercel.app/favicon.ico"],
    creator: "@qualkify",
  },
  icons: {
    icon: "https://qualkify.vercel.app/favicon.ico",
    apple: "https://qualkify.vercel.app/favicon.ico",
  },
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
        <link rel="icon" type="image/x-icon" href="https://qualkify.vercel.app/favicon.ico" />
        <link rel="shortcut icon" href="https://qualkify.vercel.app/favicon.ico" />
        <link rel="apple-touch-icon" href="https://qualkify.vercel.app/favicon.ico" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="yandex-verification" content="ed28aa269cce631d" />
        <meta name="google-site-verification" content="CrK9H1Ma_dMxFmA3uhTYs9F9flePHdvsTm5FbhmDjE4" />

        <title>
          Qualkify | Дискретная математика
        </title>
        <meta
          name="description"
          content="Модульный калькулятор по дискретной математике для студентов"
        />
        
        <meta
          name="keywords"
          content="дискретная математика, логика, индукция, множества, графы, алгоритм Дейкстры, матрица Кирхгоффа, таблица истинности, булева алгебра, умножение матриц, калькулятор, дискретная математика калькулятор, дискретная математика онлайн"
        />
        
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://qualkify.vercel.app" />
        <meta
          property="og:title"
          content="Qualkify | Дискретная математика"
        />
        <meta 
          property="og:description"
          content="Модульный калькулятор по дискретной математике для студентов"
        />
        <meta property="og:image" content="https://qualkfiy.vercel.app/favicon.ico" />

        <meta name="author" content="Qualkify" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://qualkify.vercel.app" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="theme-color" content="#000000" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        <meta property="og:site_name" content="Qualkify" />
        <meta property="og:locale" content="ru_RU" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@qualkify" />
        
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "Qualkify",
              "description": "Модульный калькулятор по дискретной математике для студентов",
              "url": "https://qualkify.vercel.app",
              "applicationCategory": "EducationalApplication",
              "operatingSystem": "Any",
              "inLanguage": "ru-RU"
            }
          `}
        </script>

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
        <div className="container mx-auto bg-white shadow-lg rounded-lg p-8 md:max-w-4xl max-w-[90vw] px-2 sm:px-8 lg:px-10 max-h-[95vh] overflow-auto">
          {children}
        </div>
      </body>
    </html>
  );
}
