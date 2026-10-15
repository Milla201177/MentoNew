/**
 * The prose half of llms.txt.
 *
 * Split from the generated half on one rule: anything the CMS knows is
 * generated, anything only a person knows lives here. So the portfolio, the
 * articles and every link are built from the database in the route, and the
 * thesis, principles, team write-ups and fund facts sit below as text.
 *
 * The team section is deliberately NOT generated, even though the CMS holds a
 * bio for each partner. Those bios are one flowing paragraph written for a
 * human reading the site; what follows is three terse bullets written for a
 * model extracting facts. Generating from the CMS would replace the second with
 * the first and quietly make the file worse at its only job.
 */

/** Everything above the Key Pages section: the H1 and the summary. */
export const LLMS_HEAD = `# Mento VC

> Mento VC, founded in 2023 and headquartered in Wilmington, Delaware, is a data-driven early-stage venture capital firm backing frontier technology that multiplies human potential. The fund invests in Pre-Seed, Seed, and Series A startups across the USA, UK, Israel, and EU. Backed by unicorn founders and world-class operators, Mento partners with purposeful founders building in AI economy, productivity tools, fintech, and future of work. This file helps founders and LLM agents understand the fund's thesis, team, portfolio, and how to engage. Today is 2026.

Mento VC uses a proprietary AI-driven sourcing engine to identify breakout startups before the market. The firm makes investment decisions in days, not weeks. Check sizes range from $10K to $1M. The team brings a combined track record of supporting 10 unicorns and 2 decacorns, with deep roots in the AltaIR Capital ecosystem ($600M AUM, 350+ startups). Major co-investors and follow-on funds include Sequoia, a16z, Khosla, Kleiner Perkins, Notable, Conviction, GV, NEA, Index Ventures, 8VC, and many others.`

/** Investment Principles, Thesis and Team — between Key Pages and Portfolio. */
export const LLMS_MIDDLE = `## Investment Principles

1. Founder first. Mento operates as "founder's friends" with no ego, only direct and honest conversations.
2. High conviction. Where others see risk, Mento sees potential. The fund hunts for unconventional ideas.
3. Hyper velocity. Decisions happen in days, not weeks, with conviction to write the first check.
4. Data-driven. Proprietary AI sourcing engine catches breakout startups before the hype.
5. Global focus. Partners with founders across the USA, UK, Israel, and EU, focusing on Seed to Series A.
6. Minimal bureaucracy. Rapid decision-making within a couple of Zoom calls. No hierarchy, open-door policy.

## Thesis

### AI Economy
- An AI-native ecosystem powering a new economic era
- Autonomous AI agents, AI infrastructure, on-device inference, AI-driven workflows

### Productivity Tools
- Products that make work simpler, more collaborative, and productive
- B2B SaaS, enterprise tools, developer platforms, content creation

### Fintech
- Next-gen infrastructure for payments, services, compliance, and analytics
- Consumer fintech, financial operations, legal and immigration tech

### Future of Work
- Services that rewire how teams hire, pay, and perform
- HRTech, recruitment platforms, remote collaboration, career tools

## Team

### Alex - General Partner (Founder & GP)
- 14 years in Tech, 8 years in VC
- Previously Portfolio Director at AltaIR Capital ($600M AUM), overseeing 350+ startups
- Track record includes supporting 10 unicorns and 2 decacorns
- Angel investments in Miro, Deel, Jeeves, OpenWeb, Sunbit, and others
- Contact: welcome@mento.vc

### Dima (Dmitry) - Partner
- Built CVC arm for a NASDAQ-listed HR tech company from scratch
- 5+ years in venture capital, including at AltaIR Capital
- Founder of a boutique analytics firm serving 20+ clients across the US and Europe
- Leads analysis, sourcing, and internal tools

### Katie (Ekaterina) - Operational Director & Partner
- COO at Mento, builds the fund's operational backbone
- Investor relations, capital calls, team processes, founder support
- Three-time founder; scaled TutGood to acquisition, co-founded HeadStart

### Wider team

Also on the site's roster, with no published biography. Roles are given in the
fund's own shorthand:

- Vi - Ops
- Max - Tech
- Sofya - Invest
- Margo - SMM
- Alina - EA/Ops
- Anastasia - EA/Ops`

/**
 * Fund Details, Co-investors and Contact — after the Portfolio section.
 *
 * Takes the count and the origin rather than stating them: the hand-typed
 * "Total investments: 29 (as of August 2026)" was four companies behind the
 * CMS by the time anyone noticed, in a file whose whole purpose is to be the
 * accurate version. Anything countable is counted.
 */
export const llmsTail = ({
  portfolioCount,
  siteUrl,
}: {
  portfolioCount: number
  siteUrl: string
}) => `## Fund Details

- Founded: 2023
- HQ: Wilmington, Delaware, United States
- Stage: Pre-Seed, Seed, Series A
- Check size: $10K - $1M
- Geographies: USA, UK, Israel, EU
- Sectors: AI Economy, Productivity Tools, Fintech, Future of Work, B2B SaaS, HRTech, Consumer
- Portfolio companies listed here: ${portfolioCount}
- Decision speed: Days, not weeks
- Sourcing: Proprietary AI-driven engine

## Notable Co-investors

Sequoia, a16z, Notable, Khosla, Kleiner Perkins, Bling, Conviction, Uncork, Long Journey, 20VC, BOND, GV, NEA, Forerunner, Fellows Fund, Firestreak, Peak XV, Left Lane Capital, Flint Capital, RTP Global, Soma Capital, AltaIR, M13, Race Capital, Hustle Fund, Day One Ventures, Redseed, Goodwater, Sky9 Capital, Liquid2, 8VC, Gradient, Octopus Ventures, True Ventures, Index Ventures

## Contact

- Email: welcome@mento.vc
- Website: ${siteUrl}`
