import { useEffect, useMemo, useState } from 'react'
import type { Round } from '../types'
import { analyzeBundles, formatPercent, formatToPar, type RoundBundle } from '../lib/analytics'
import { loadRoundBundle } from '../lib/dataService'
import BrandMark from './BrandMark'

interface Props {
  rounds: Round[]
  onOpenRound: (round: Round) => void
}

function LineChart({ data }: { data: Array<{ label: string; value: number | null }> }) {
  const valid = data.filter((point) => point.value != null) as Array<{ label: string; value: number }>
  if (valid.length < 2) return <div className="empty-chart">Complete at least two rounds to see a score trend.</div>
  const width = 640
  const height = 230
  const padX = 34
  const padY = 28
  const min = Math.min(...valid.map((point) => point.value))
  const max = Math.max(...valid.map((point) => point.value))
  const range = Math.max(4, max - min)
  const points = valid.map((point, index) => {
    const x = padX + (index / Math.max(1, valid.length - 1)) * (width - padX * 2)
    const y = padY + ((max - point.value) / range) * (height - padY * 2)
    return { ...point, x, y }
  })
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')
  return (
    <div className="chart-wrap">
      <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Score to par trend">
        {[0, 1, 2, 3].map((line) => {
          const y = padY + (line / 3) * (height - padY * 2)
          return <line key={line} x1={padX} x2={width - padX} y1={y} y2={y} className="chart-gridline" />
        })}
        <polyline points={polyline} className="chart-line" />
        {points.map((point) => <g key={`${point.label}-${point.x}`}>
          <circle cx={point.x} cy={point.y} r="5" className="chart-point" />
          <text x={point.x} y={point.y - 12} textAnchor="middle" className="chart-value">{formatToPar(point.value)}</text>
          <text x={point.x} y={height - 5} textAnchor="middle" className="chart-label">{point.label}</text>
        </g>)}
      </svg>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}

export default function AnalyticsView({ rounds, onOpenRound }: Props) {
  const [range, setRange] = useState<5 | 10 | 'all'>(10)
  const [bundles, setBundles] = useState<RoundBundle[]>([])
  const [loading, setLoading] = useState(true)

  const completed = useMemo(() => rounds.filter((round) => round.status === 'complete'), [rounds])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all(completed.map(async (round) => {
      const bundle = await loadRoundBundle(round.id)
      return { round: bundle.round ?? round, holes: bundle.holes }
    })).then((loaded) => {
      if (!cancelled) {
        setBundles(loaded)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [completed])

  const selected = useMemo(() => range === 'all' ? bundles : bundles.slice(0, range), [bundles, range])
  const analytics = useMemo(() => analyzeBundles(selected), [selected])
  const maxDistribution = Math.max(1, ...analytics.scoreDistribution.map((item) => item.value))

  const rangeOptions: Array<5 | 10 | 'all'> = [5, 10, 'all']

  return <main className="page stack analytics-page">
    <header className="analytics-header">
      <BrandMark compact />
      <div><p className="eyebrow">Performance dashboard</p><h1>Analytics</h1><p className="lead">See the patterns that are helping—or costing—your score.</p></div>
    </header>

    <div className="range-toggle" role="group" aria-label="Analytics range">
      {rangeOptions.map((option) => <button key={option} type="button" className={range === option ? 'active' : ''} onClick={() => setRange(option)}>{option === 'all' ? 'All' : `Last ${option}`}</button>)}
    </div>

    {loading ? <section className="card analytics-loading"><span className="mini-spinner" />Loading round history…</section> : analytics.rounds === 0 ? <section className="card empty-state"><img src="/brand/roundwise-mark.png" alt="" /><h2>Your trends begin with the first completed round.</h2><p>Finish a round and RoundWise will identify strengths, scoring leaks, and improvement priorities.</p></section> : <>
      <section className="analytics-kpis">
        <MetricCard label="Average score" value={analytics.averageScore == null ? '—' : analytics.averageScore.toFixed(1)} detail={`${analytics.rounds} round${analytics.rounds === 1 ? '' : 's'}`} />
        <MetricCard label="Average to par" value={formatToPar(analytics.averageToPar)} detail="Selected rounds" />
        <MetricCard label="Best score" value={analytics.bestScore == null ? '—' : String(analytics.bestScore)} detail={formatToPar(analytics.bestToPar)} />
      </section>

      <section className="card chart-card">
        <div className="section-title"><div><p className="eyebrow">Scoring trend</p><h2>Score against par</h2></div><span className="gold-chip">{analytics.trend.length} rounds</span></div>
        <LineChart data={analytics.trend.map((point) => ({ label: point.label, value: point.toPar }))} />
      </section>

      <section className="metric-dashboard-grid">
        <MetricCard label="Fairways" value={formatPercent(analytics.fairways.rate)} detail={`${analytics.fairways.made}/${analytics.fairways.attempts} tracked`} />
        <MetricCard label="GIR" value={formatPercent(analytics.gir.rate)} detail={`${analytics.gir.made}/${analytics.gir.attempts} greens`} />
        <MetricCard label="Scoring zone" value={formatPercent(analytics.scoringZone.rate)} detail={`${analytics.scoringZone.made}/${analytics.scoringZone.attempts} points`} />
        <MetricCard label="Method score" value={formatPercent(analytics.method.rate)} detail="Process execution" />
        <MetricCard label="Inside 4 ft" value={formatPercent(analytics.inside4ft.rate)} detail={`${analytics.inside4ft.made}/${analytics.inside4ft.attempts} made`} />
        <MetricCard label="Putts / hole" value={analytics.averagePutts == null ? '—' : analytics.averagePutts.toFixed(2)} detail={`${(analytics.threePuttsPerRound ?? 0).toFixed(1)} three-putts / round`} />
      </section>

      <section className="insight-pair">
        <article className="insight-card good"><span className="insight-icon">✓</span><div><p className="eyebrow">Strongest pattern</p><h2>{analytics.strength.title}</h2><p>{analytics.strength.detail}</p></div></article>
        <article className="insight-card warning"><span className="insight-icon">!</span><div><p className="eyebrow">Biggest opportunity</p><h2>{analytics.opportunity.title}</h2><p>{analytics.opportunity.detail}</p></div></article>
      </section>

      <section className="card distribution-card">
        <div><p className="eyebrow">Hole outcomes</p><h2>Scoring distribution</h2></div>
        <div className="distribution-bars">
          {analytics.scoreDistribution.map((item) => <div className="distribution-row" key={item.label}><span>{item.label}</span><div><i style={{ width: `${(item.value / maxDistribution) * 100}%` }} /></div><strong>{item.value}</strong></div>)}
        </div>
      </section>

      <section className="card">
        <div className="section-title"><h2>Rounds included</h2><span className="muted compact">Tap to view summary</span></div>
        {selected.map(({ round }) => <button type="button" className="analytics-round-row" key={round.id} onClick={() => onOpenRound(round)}><span><strong>{round.course_name}</strong><small>{round.date} · {round.tee_name}</small></span><b>{round.total_score ?? '—'} <small>{formatToPar(round.to_par ?? null)}</small></b></button>)}
      </section>
    </>}
  </main>
}
