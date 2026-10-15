/**
 * About — server half.
 *
 * The scrolling logo strip is a "backed by" ticker of the same companies the
 * Portfolio section renders, so it reads from the same Payload `portfolio`
 * collection via the shared cached loader — adding a company in the CMS makes
 * it appear in both places. `AboutContent` owns the markup and GSAP work and
 * has to stay a client component.
 */

import { aboutStripCompanies, loadCompanies } from '@/lib/portfolio'
import AboutContent from '@/components/AboutContent'

export default async function About() {
  const companies = await loadCompanies()
  // Editors choose which logos ride the strip via the `showInAboutStrip`
  // checkbox on each portfolio entry; the grid still shows all of them.
  return <AboutContent companies={aboutStripCompanies(companies)} />
}
