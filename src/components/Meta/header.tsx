import { useInitialData, useKamiConfig } from 'common/hooks/use-initial-data'
import Head from 'next/head'
import { FC, memo } from 'react'
import { isDev } from 'utils'
export const DynamicHeaderMeta: FC = memo(() => {
  const initialData = useInitialData()
  const title = initialData.seo.title

  const themeConfig = useKamiConfig()
  const favicon = themeConfig.site.favicon || '/favicon.svg'
  return (
    <Head>
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, shrink-to-fit=no"
      />
      {!isDev ? (
        <meta
          httpEquiv="Content-Security-Policy"
          content="upgrade-insecure-requests"
        />
      ) : null}

      {/* for pwa */}
      <meta name="application-name" content={title} />
      <meta name="apple-mobile-web-app-title" content={title} />
      <meta name="msapplication-tooltip" content={title} />
      <meta name="theme-color" content="#39C5BB" />
      <meta name="msapplication-navbutton-color" content="#39C5BB" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black" />

      {/* for favicon */}
      <link rel="shortcut icon" href={favicon} />
      <link rel="icon" href={favicon} />
      <link rel="apple-touch-icon" href={favicon} />
    </Head>
  )
})
