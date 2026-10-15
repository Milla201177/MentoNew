/** Server-side portfolio data; client-side view and expansion live in PortfolioContent. */
import { loadCompanies } from '@/lib/portfolio'
import PortfolioContent from '@/components/PortfolioContent'

export default async function Portfolio() {
  const companies = await loadCompanies()
  return <PortfolioContent companies={companies} />
}
