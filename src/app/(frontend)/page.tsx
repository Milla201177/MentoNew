import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import About from '@/components/About'
import Focus from '@/components/Focus'
import Portfolio from '@/components/Portfolio'
import Footer from '@/components/Footer'
import { SITE_URL, SOCIAL_LINKS } from '@/lib/site'

/**
 * Organization + WebSite structured data (schema.org), emitted as a single
 * `application/ld+json` script so crawlers / LLMs get machine-readable context.
 *
 * The facts here mirror `src/lib/llmsContent.ts`, the prose half of llms.txt —
 * founding year, HQ, stages, sectors and geographies — because an answer engine
 * asked "who backs pre-seed AI startups in the UK?" needs them as data, not as
 * prose it has to infer from the marketing copy. Keep the two in sync when
 * either changes.
 *
 * `sameAs` used to be deliberately absent, on the grounds that the footer's
 * social links were `#` placeholders and that publishing an unverified profile
 * URL would assert an identity link we could not back up. The real LinkedIn and
 * X profiles have since been supplied, so it is here — one of the stronger
 * signals for entity resolution.
 *
 * It reads the same constant the footer links to. These two must name the same
 * URLs: `sameAs` claims the profiles and this site are one entity, and a typo
 * in one copy would point that claim at something that is not us.
 */
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Mento',
      alternateName: 'Mento VC',
      url: SITE_URL,
      sameAs: [SOCIAL_LINKS.linkedin, SOCIAL_LINKS.x],
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logos/logotype.svg`,
      },
      description:
        'Mento is a data-driven, early-stage fund backing the outliers from Pre-Seed to Series A across the USA, UK, Israel and EU.',
      foundingDate: '2023',
      email: 'welcome@mento.vc',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'Investment enquiries',
        email: 'welcome@mento.vc',
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Wilmington',
        addressRegion: 'DE',
        addressCountry: 'US',
      },
      areaServed: [
        { '@type': 'Country', name: 'United States' },
        { '@type': 'Country', name: 'United Kingdom' },
        { '@type': 'Country', name: 'Israel' },
        { '@type': 'Place', name: 'European Union' },
      ],
      knowsAbout: [
        'Venture capital',
        'Pre-Seed, Seed and Series A investing',
        'AI economy',
        'Productivity tools',
        'Fintech',
        'Future of work',
        'B2B SaaS',
        'HR technology',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Mento',
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en',
    },
  ],
}

export default function HomePage() {
  return (
    <>
      {/* `JSON.stringify` escapes quotes but not `<`, so any value containing
          `</script>` would close this tag early and let the rest be parsed as
          HTML. Nothing here comes from the CMS today, but the article route
          escapes the same block and the guard is worth keeping identical — the
          day a CMS field is interpolated in, this line will not change, so
          review would have nothing to catch. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Navbar darkHero />
      <main id="main">
        <Hero />
        <About />
        <Portfolio />
        <Focus />
      </main>
      <Footer />
    </>
  )
}
