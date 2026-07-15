import type { HoleResult, Round } from '../types'

export interface RateStat {
  made: number
  attempts: number
  rate: number | null
}

export interface RoundAnalysis {
  completedHoles: number
  totalScore: number | null
  totalPar: number | null
  toPar: number | null
  fairways: RateStat
  gir: RateStat
  upDown: RateStat
  inside4ft: RateStat
  enteringZone: RateStat
  downZone: RateStat
  scoringZone: RateStat
  method: RateStat
  methodCategories: Record<'Plan' | 'Routine' | 'Commit' | 'Smart decision' | 'Reset', RateStat>
  totalPutts: number
  puttingHoles: number
  averagePutts: number | null
  threePutts: number
  penalties: number
  multiChipHoles: number
  blowUpHoles: number
  damageEvents: number
  longestPutt: number | null
  birdiesOrBetter: number
  pars: number
  bogeys: number
  doubles: number
  triplesPlus: number
  bestHole: HoleResult | null
  worstHole: HoleResult | null
  strengths: Insight[]
  opportunities: Insight[]
  nextFocus: Insight
}

export interface Insight {
  title: string
  detail: string
  tone?: 'good' | 'warning' | 'neutral'
}

export interface RoundBundle {
  round: Round
  holes: HoleResult[]
}

export interface AggregateAnalysis {
  rounds: number
  averageScore: number | null
  averageToPar: number | null
  bestScore: number | null
  bestToPar: number | null
  fairways: RateStat
  gir: RateStat
  upDown: RateStat
  inside4ft: RateStat
  enteringZone: RateStat
  downZone: RateStat
  scoringZone: RateStat
  method: RateStat
  averagePutts: number | null
  penaltiesPerRound: number | null
  threePuttsPerRound: number | null
  blowUpsPerRound: number | null
  scoreDistribution: Array<{ label: string; value: number }>
  trend: Array<{ label: string; score: number | null; toPar: number | null }>
  strength: Insight
  opportunity: Insight
}

function rate(made: number, attempts: number): RateStat {
  return { made, attempts, rate: attempts ? made / attempts : null }
}

function percent(value: number | null): string {
  return value == null ? '—' : `${Math.round(value * 100)}%`
}

function scoreToPar(hole: HoleResult): number | null {
  return hole.score == null || hole.par == null ? null : hole.score - hole.par
}

function lowestMethodCategory(categories: RoundAnalysis['methodCategories']): [string, RateStat] | null {
  const eligible = Object.entries(categories).filter(([, stat]) => stat.attempts > 0)
  if (!eligible.length) return null
  return eligible.sort((a, b) => (a[1].rate ?? 1) - (b[1].rate ?? 1))[0]
}

export function analyzeRound(_round: Round, holes: HoleResult[]): RoundAnalysis {
  const completed = holes.filter((hole) => hole.score != null && hole.par != null)
  const totalScore = completed.length ? completed.reduce((sum, hole) => sum + Number(hole.score), 0) : null
  const totalPar = completed.length ? completed.reduce((sum, hole) => sum + Number(hole.par), 0) : null
  const relativeHoles = completed.map((hole) => ({ hole, relative: scoreToPar(hole) ?? 0 }))

  const fairwayAttempts = holes.filter((hole) => hole.par !== 3 && hole.tee_result && hole.tee_result !== 'N/A')
  const girAttempts = holes.filter((hole) => hole.gir === 'Yes' || hole.gir === 'No')
  const upDownAttempts = holes.filter((hole) => hole.up_down === 'Yes' || hole.up_down === 'No')
  const shortPuttAttempts = holes.filter((hole) => hole.inside_4ft_result === 'Made' || hole.inside_4ft_result === 'Missed')
  const enteringAttempts = holes.filter((hole) => hole.entering_zone_point != null)
  const downAttempts = holes.filter((hole) => hole.down_zone_point != null)
  const methodDefinitions = [
    ['Plan', 'plan'],
    ['Routine', 'routine'],
    ['Commit', 'commit'],
    ['Smart decision', 'smart_decision'],
    ['Reset', 'reset'],
  ] as const
  const methodCategories = Object.fromEntries(methodDefinitions.map(([label, key]) => {
    const values = holes.map((hole) => hole[key]).filter((value): value is 0 | 1 => value != null)
    return [label, rate(values.reduce<number>((sum, value) => sum + value, 0), values.length)]
  })) as RoundAnalysis['methodCategories']
  const allMethod = Object.values(methodCategories)
  const methodMade = allMethod.reduce((sum, stat) => sum + stat.made, 0)
  const methodAttempts = allMethod.reduce((sum, stat) => sum + stat.attempts, 0)

  const totalPutts = holes.reduce((sum, hole) => sum + Number(hole.putts ?? 0), 0)
  const puttingHoles = holes.filter((hole) => hole.putts != null).length
  const threePutts = holes.filter((hole) => (hole.putts ?? 0) >= 3).length
  const penalties = holes.reduce((sum, hole) => sum + Number(hole.penalty_strokes ?? 0), 0)
  const multiChipHoles = holes.filter((hole) => (hole.chips_pitches ?? 0) >= 2).length
  const blowUpHoles = relativeHoles.filter(({ relative }) => relative >= 3).length
  const longestPuttValues = holes.map((hole) => hole.made_putt_length_ft).filter((value): value is number => value != null)

  const analysis: RoundAnalysis = {
    completedHoles: completed.length,
    totalScore,
    totalPar,
    toPar: totalScore == null || totalPar == null ? null : totalScore - totalPar,
    fairways: rate(fairwayAttempts.filter((hole) => hole.tee_result === 'FIR').length, fairwayAttempts.length),
    gir: rate(girAttempts.filter((hole) => hole.gir === 'Yes').length, girAttempts.length),
    upDown: rate(upDownAttempts.filter((hole) => hole.up_down === 'Yes').length, upDownAttempts.length),
    inside4ft: rate(shortPuttAttempts.filter((hole) => hole.inside_4ft_result === 'Made').length, shortPuttAttempts.length),
    enteringZone: rate(enteringAttempts.reduce((sum, hole) => sum + Number(hole.entering_zone_point), 0), enteringAttempts.length),
    downZone: rate(downAttempts.reduce((sum, hole) => sum + Number(hole.down_zone_point), 0), downAttempts.length),
    scoringZone: rate(
      enteringAttempts.reduce((sum, hole) => sum + Number(hole.entering_zone_point), 0) + downAttempts.reduce((sum, hole) => sum + Number(hole.down_zone_point), 0),
      enteringAttempts.length + downAttempts.length,
    ),
    method: rate(methodMade, methodAttempts),
    methodCategories,
    totalPutts,
    puttingHoles,
    averagePutts: puttingHoles ? totalPutts / puttingHoles : null,
    threePutts,
    penalties,
    multiChipHoles,
    blowUpHoles,
    damageEvents: penalties + threePutts + multiChipHoles,
    longestPutt: longestPuttValues.length ? Math.max(...longestPuttValues) : null,
    birdiesOrBetter: relativeHoles.filter(({ relative }) => relative <= -1).length,
    pars: relativeHoles.filter(({ relative }) => relative === 0).length,
    bogeys: relativeHoles.filter(({ relative }) => relative === 1).length,
    doubles: relativeHoles.filter(({ relative }) => relative === 2).length,
    triplesPlus: relativeHoles.filter(({ relative }) => relative >= 3).length,
    bestHole: relativeHoles.length ? [...relativeHoles].sort((a, b) => a.relative - b.relative)[0].hole : null,
    worstHole: relativeHoles.length ? [...relativeHoles].sort((a, b) => b.relative - a.relative)[0].hole : null,
    strengths: [],
    opportunities: [],
    nextFocus: { title: 'Keep collecting data', detail: 'Complete more tracked holes to generate a focused recommendation.', tone: 'neutral' },
  }

  const strengths: Insight[] = []
  if (analysis.penalties === 0 && completed.length) strengths.push({ title: 'Kept the ball in play', detail: 'No penalty strokes were recorded.', tone: 'good' })
  if (analysis.blowUpHoles === 0 && completed.length) strengths.push({ title: 'Protected the scorecard', detail: 'You avoided triple bogey or worse.', tone: 'good' })
  if (analysis.threePutts === 0 && puttingHoles) strengths.push({ title: 'Clean putting card', detail: 'No three-putts were recorded.', tone: 'good' })
  if ((analysis.method.rate ?? 0) >= .8) strengths.push({ title: 'Strong process', detail: `${percent(analysis.method.rate)} of tracked method actions earned a point.`, tone: 'good' })
  if ((analysis.scoringZone.rate ?? 0) >= .75) strengths.push({ title: 'Efficient scoring zone', detail: `${percent(analysis.scoringZone.rate)} of scoring-zone points were earned.`, tone: 'good' })
  if ((analysis.gir.rate ?? 0) >= .5) strengths.push({ title: 'Quality approach play', detail: `${analysis.gir.made}/${analysis.gir.attempts} greens were hit in regulation.`, tone: 'good' })
  if ((analysis.inside4ft.rate ?? 0) >= .9 && analysis.inside4ft.attempts >= 3) strengths.push({ title: 'Reliable inside four feet', detail: `${analysis.inside4ft.made}/${analysis.inside4ft.attempts} short putts were made.`, tone: 'good' })
  if ((analysis.upDown.rate ?? 0) >= .5 && analysis.upDown.attempts >= 2) strengths.push({ title: 'Saved strokes around the green', detail: `${analysis.upDown.made}/${analysis.upDown.attempts} up-and-down attempts were converted.`, tone: 'good' })
  if (analysis.longestPutt != null && analysis.longestPutt >= 10) strengths.push({ title: 'Made a momentum putt', detail: `Longest made putt: ${analysis.longestPutt} feet.`, tone: 'good' })

  const opportunities: Insight[] = []
  if (analysis.penalties > 0) opportunities.push({ title: 'Penalty avoidance', detail: `${analysis.penalties} penalty stroke${analysis.penalties === 1 ? '' : 's'} added directly to the score.`, tone: 'warning' })
  if (analysis.blowUpHoles > 0) opportunities.push({ title: 'Contain the big numbers', detail: `${analysis.blowUpHoles} hole${analysis.blowUpHoles === 1 ? '' : 's'} reached triple bogey or worse.`, tone: 'warning' })
  if (analysis.threePutts > 0) opportunities.push({ title: 'Lag putting', detail: `${analysis.threePutts} three-putt hole${analysis.threePutts === 1 ? '' : 's'} were recorded.`, tone: 'warning' })
  if (analysis.multiChipHoles > 0) opportunities.push({ title: 'One-shot short-game priority', detail: `${analysis.multiChipHoles} hole${analysis.multiChipHoles === 1 ? '' : 's'} required multiple chips or pitches.`, tone: 'warning' })
  if (analysis.inside4ft.attempts >= 2 && (analysis.inside4ft.rate ?? 1) < .85) opportunities.push({ title: 'Short-putt conversion', detail: `${analysis.inside4ft.made}/${analysis.inside4ft.attempts} putts inside four feet were made.`, tone: 'warning' })
  if (analysis.gir.attempts >= 6 && (analysis.gir.rate ?? 1) < .4) opportunities.push({ title: 'Approach accuracy', detail: `GIR finished at ${percent(analysis.gir.rate)}.`, tone: 'warning' })
  if (analysis.scoringZone.attempts >= 8 && (analysis.scoringZone.rate ?? 1) < .65) opportunities.push({ title: 'Scoring-zone efficiency', detail: `Only ${percent(analysis.scoringZone.rate)} of available scoring-zone points were earned.`, tone: 'warning' })
  if (analysis.method.attempts >= 10 && (analysis.method.rate ?? 1) < .75) opportunities.push({ title: 'Process consistency', detail: `Method score finished at ${percent(analysis.method.rate)}.`, tone: 'warning' })
  const lowCategory = lowestMethodCategory(methodCategories)
  if (lowCategory && lowCategory[1].attempts >= 3 && (lowCategory[1].rate ?? 1) < .7) opportunities.push({ title: `${lowCategory[0]} was the weakest method area`, detail: `${percent(lowCategory[1].rate)} of ${lowCategory[0].toLowerCase()} checks earned a point.`, tone: 'warning' })

  analysis.strengths = strengths.slice(0, 4)
  analysis.opportunities = opportunities.slice(0, 4)
  analysis.nextFocus = opportunities[0] ?? strengths[0] ?? analysis.nextFocus
  return analysis
}

function combineRates(items: RateStat[]): RateStat {
  return rate(items.reduce((sum, item) => sum + item.made, 0), items.reduce((sum, item) => sum + item.attempts, 0))
}

export function analyzeBundles(bundles: RoundBundle[]): AggregateAnalysis {
  const completedBundles = bundles.filter(({ round }) => round.status === 'complete')
  const analyses = completedBundles.map(({ round, holes }) => ({ round, analysis: analyzeRound(round, holes) }))
  const scores = analyses.map(({ analysis }) => analysis.totalScore).filter((value): value is number => value != null)
  const toPars = analyses.map(({ analysis }) => analysis.toPar).filter((value): value is number => value != null)
  const totalPuttingHoles = analyses.reduce((sum, { analysis }) => sum + analysis.puttingHoles, 0)
  const totalPutts = analyses.reduce((sum, { analysis }) => sum + analysis.totalPutts, 0)
  const penalties = analyses.reduce((sum, { analysis }) => sum + analysis.penalties, 0)
  const threePutts = analyses.reduce((sum, { analysis }) => sum + analysis.threePutts, 0)
  const blowUps = analyses.reduce((sum, { analysis }) => sum + analysis.blowUpHoles, 0)

  const aggregate: AggregateAnalysis = {
    rounds: analyses.length,
    averageScore: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    averageToPar: toPars.length ? toPars.reduce((a, b) => a + b, 0) / toPars.length : null,
    bestScore: scores.length ? Math.min(...scores) : null,
    bestToPar: toPars.length ? Math.min(...toPars) : null,
    fairways: combineRates(analyses.map(({ analysis }) => analysis.fairways)),
    gir: combineRates(analyses.map(({ analysis }) => analysis.gir)),
    upDown: combineRates(analyses.map(({ analysis }) => analysis.upDown)),
    inside4ft: combineRates(analyses.map(({ analysis }) => analysis.inside4ft)),
    enteringZone: combineRates(analyses.map(({ analysis }) => analysis.enteringZone)),
    downZone: combineRates(analyses.map(({ analysis }) => analysis.downZone)),
    scoringZone: combineRates(analyses.map(({ analysis }) => analysis.scoringZone)),
    method: combineRates(analyses.map(({ analysis }) => analysis.method)),
    averagePutts: totalPuttingHoles ? totalPutts / totalPuttingHoles : null,
    penaltiesPerRound: analyses.length ? penalties / analyses.length : null,
    threePuttsPerRound: analyses.length ? threePutts / analyses.length : null,
    blowUpsPerRound: analyses.length ? blowUps / analyses.length : null,
    scoreDistribution: [
      { label: 'Birdie+', value: analyses.reduce((sum, { analysis }) => sum + analysis.birdiesOrBetter, 0) },
      { label: 'Par', value: analyses.reduce((sum, { analysis }) => sum + analysis.pars, 0) },
      { label: 'Bogey', value: analyses.reduce((sum, { analysis }) => sum + analysis.bogeys, 0) },
      { label: 'Double', value: analyses.reduce((sum, { analysis }) => sum + analysis.doubles, 0) },
      { label: 'Triple+', value: analyses.reduce((sum, { analysis }) => sum + analysis.triplesPlus, 0) },
    ],
    trend: analyses
      .slice()
      .reverse()
      .map(({ round, analysis }) => ({ label: new Date(`${round.date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), score: analysis.totalScore, toPar: analysis.toPar })),
    strength: { title: 'Complete more rounds', detail: 'Your strongest recurring metric will appear here.', tone: 'neutral' },
    opportunity: { title: 'Complete more rounds', detail: 'Your clearest scoring opportunity will appear here.', tone: 'neutral' },
  }

  const strengthCandidates = ([
    [aggregate.method.rate ?? -1, { title: 'Process execution', detail: `Method score is ${percent(aggregate.method.rate)} across the selected rounds.`, tone: 'good' }],
    [aggregate.scoringZone.rate ?? -1, { title: 'Scoring-zone efficiency', detail: `${percent(aggregate.scoringZone.rate)} of scoring-zone points were earned.`, tone: 'good' }],
    [aggregate.inside4ft.rate ?? -1, { title: 'Putting inside four feet', detail: `${aggregate.inside4ft.made}/${aggregate.inside4ft.attempts} tracked putts were made.`, tone: 'good' }],
    [aggregate.gir.rate ?? -1, { title: 'Greens in regulation', detail: `${percent(aggregate.gir.rate)} GIR across the selected rounds.`, tone: 'good' }],
    [aggregate.fairways.rate ?? -1, { title: 'Tee-shot accuracy', detail: `${percent(aggregate.fairways.rate)} fairways hit on tracked attempts.`, tone: 'good' }],
  ] satisfies Array<[number, Insight]>).filter(([value]) => value >= 0)
  if (strengthCandidates.length) aggregate.strength = strengthCandidates.sort((a, b) => b[0] - a[0])[0][1]

  const opportunityCandidates = ([
    [aggregate.blowUpsPerRound ?? 0, { title: 'Blow-up holes', detail: `${(aggregate.blowUpsPerRound ?? 0).toFixed(1)} triple-or-worse holes per round.`, tone: 'warning' }],
    [aggregate.penaltiesPerRound ?? 0, { title: 'Penalty strokes', detail: `${(aggregate.penaltiesPerRound ?? 0).toFixed(1)} penalty strokes per round.`, tone: 'warning' }],
    [aggregate.threePuttsPerRound ?? 0, { title: 'Three-putt avoidance', detail: `${(aggregate.threePuttsPerRound ?? 0).toFixed(1)} three-putts per round.`, tone: 'warning' }],
    [aggregate.scoringZone.rate == null ? 0 : 1 - aggregate.scoringZone.rate, { title: 'Scoring-zone efficiency', detail: `${percent(aggregate.scoringZone.rate)} of scoring-zone points earned.`, tone: 'warning' }],
    [aggregate.gir.rate == null ? 0 : 1 - aggregate.gir.rate, { title: 'Approach play', detail: `${percent(aggregate.gir.rate)} greens in regulation.`, tone: 'warning' }],
  ] satisfies Array<[number, Insight]>)
  if (opportunityCandidates.length) aggregate.opportunity = opportunityCandidates.sort((a, b) => b[0] - a[0])[0][1]
  return aggregate
}

export function formatPercent(value: number | null): string {
  return percent(value)
}

export function formatToPar(value: number | null): string {
  if (value == null) return '—'
  if (value === 0) return 'E'
  return value > 0 ? `+${Math.round(value * 10) / 10}` : `${Math.round(value * 10) / 10}`
}
