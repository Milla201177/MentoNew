import React from 'react'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { OG_IMAGE_URL } from '@/lib/ogImage'
import GridOverlayGate from '@/components/GridOverlayGate'
import BrandCursor from '@/components/BrandCursor'
import DesktopSectionSpacing from '@/components/DesktopSectionSpacing'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'
import './design-system.css'
import './responsive.css'

/** Brand typefaces from the logobook; served locally as variable WOFF2. */
const clashDisplay = localFont({
  src: '../../../public/fonts/ClashDisplay-Variable.woff2',
  weight: '200 700',
  display: 'swap',
  variable: '--font-clash-display',
})

const satoshi = localFont({
  src: [
    { path: '../../../public/fonts/Satoshi-Variable.woff2', weight: '300 900', style: 'normal' },
    {
      path: '../../../public/fonts/Satoshi-VariableItalic.woff2',
      weight: '300 900',
      style: 'italic',
    },
  ],
  display: 'swap',
  variable: '--font-satoshi',
})

/**
 * The share card is two lines, and this is the second one — the sentence under
 * the name in Telegram, Slack, LinkedIn and X, and the one Google may lift as
 * the search snippet.
 *
 * It does not name the fund, because the line above it already does (see
 * SITE_NAME): "Mento.vc" / "Data-driven, early-stage fund investing in
 * outstanding startups." reads as one sentence, where "Mento.vc is a
 * data-driven…" would say the name twice. The About section's heading on the
 * page keeps the longer form — it has no name above it to lean on.
 *
 * Stages and geographies stay out of it on purpose: that inventory lives in the
 * structured data (the Organization node in `page.tsx` and `llms.txt`), where
 * machines read it, not in the two lines a person skims in a chat window.
 *
 * Declared once because the meta tag and the OpenGraph tag must not drift: a
 * crawler that reads one and a chat client that reads the other would otherwise
 * describe the same page differently.
 */
const SHARE_DESCRIPTION = 'Data-driven, early-stage fund investing in outstanding startups.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  /**
   * The tab, the switcher and the blue link in Google — all of them the name
   * and nothing else.
   *
   * This used to be the hero sentence, on the reasoning that a title should say
   * what the fund does. In a tab strip it does not get the chance: a title is
   * given a few words before it truncates, and a switcher stacks them one under
   * another, so the sentence spent its length repeating the `<h1>` already on
   * screen and crowding out everything that tells one tab from another.
   *
   * What it said is not lost. `<meta name="description">` below carries the
   * sentence for the search snippet, the `<h1>` carries it for whoever arrives,
   * and the `og:image` alt carries it for the share card.
   */
  title: SITE_NAME,
  description: SHARE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    /**
     * The name on the card's first line — and, deliberately, on its second-line
     * slot too.
     *
     * Telegram draws a share card as site name, then title, then description.
     * With no `og:site_name` it falls back to the bare hostname, so every link
     * we send announced itself as "mento-astro.vercel.app" above a title that
     * repeated the hero sentence.
     *
     * Setting the site name AND the OpenGraph title to the same string
     * collapses those two lines into one: the client sees nothing new to add
     * and draws the name once, leaving "Mento.vc" above the sentence below and
     * nothing else. This is exactly how the cards we were shown as the
     * reference are built (basecase.vc ships `og:site_name` and `og:title` both
     * as "basecase"), and it degrades safely — a client that does not collapse
     * them shows the name twice, never something wrong.
     */
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SHARE_DESCRIPTION,
    type: 'website',
    url: '/',
    /**
     * The share preview, and the default every page inherits unless it sets its
     * own. Article pages do — they use their cover — so this covers the
     * homepage and the blog index.
     *
     * Without it the site declared `summary_large_image` and then supplied no
     * image, so every link posted to LinkedIn, X, Slack or a mail client
     * rendered as a grey box. For a fund whose distribution is people
     * forwarding links, that is worth more than any score on a performance
     * report.
     *
     * PNG rather than WebP on purpose. This file is never fetched by a visitor
     * — only by a crawler unfurling a link — so WebP's smaller size buys
     * nobody anything, while X and LinkedIn still fail to render WebP cards.
     * `width` and `height` are declared so crawlers can lay out the card before
     * the image arrives.
     *
     * The URL carries a hash of the file's own bytes — see `lib/ogImage.ts`.
     * Without it, every unfurl cache that ever saw this link keeps serving the
     * card it cached, whatever we deploy.
     */
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        alt: 'Mento — we help the outliers on their journey to build generational companies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    images: [OG_IMAGE_URL],
  },
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en" className={`${clashDisplay.variable} ${satoshi.variable}`}>
      <body>
        {/* The cloud backdrop (used by Hero and the article page) is the LCP element; preload it so the
         * fetch starts immediately instead of after CSS background discovery. */}
        <link
          rel="preload"
          as="image"
          href="/images/hero-bg.webp"
          type="image/webp"
          fetchPriority="high"
        />
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        {children}
        {/* Draws the layout grid over the page, but only for a URL carrying
            `?grid`. See GridOverlayGate for why it costs a visitor nothing. */}
        <GridOverlayGate />
        <BrandCursor />
        <DesktopSectionSpacing />
      </body>
    </html>
  )
}
