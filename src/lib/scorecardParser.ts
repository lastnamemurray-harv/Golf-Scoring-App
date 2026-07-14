import type { ImportedCourseDraft } from '../types'

const GENERIC = /^(scorecard|golf|hole|holes|out|in|total|par|yards?|yardage|handicap|hcp|hdcp|index|men|women)$/i
const TEE_WORDS = /(black|blue|white|gold|red|green|silver|bronze|championship|member|forward|middle|regular|combo|fox)/i

function numbersFrom(line: string): number[] {
  return (line.match(/\d{1,4}/g) ?? []).map(Number)
}

function takeHoleValues(values: number[], min: number, max: number): number[] {
  return values.filter((n) => n >= min && n <= max).slice(0, 18)
}

function candidateCourseName(lines: string[]): string {
  const candidates = lines.filter((line) => {
    const clean = line.trim()
    if (clean.length < 4 || clean.length > 60 || GENERIC.test(clean)) return false
    if ((clean.match(/\d/g) ?? []).length > 3) return false
    return /[A-Za-z]/.test(clean)
  })
  return candidates[0]?.replace(/\s{2,}/g, ' ').trim() || 'Imported Golf Course'
}

export function parseScorecardText(text: string): ImportedCourseDraft {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/[|_[\]{}]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  let pars: number[] = []
  let handicaps: number[] = []
  let yards: number[] = []
  let teeName = 'Imported Tee'

  for (const line of lines) {
    const nums = numbersFrom(line)
    if (!pars.length && /\bpar\b/i.test(line)) {
      const values = takeHoleValues(nums, 3, 5)
      if (values.length >= 9) pars = values
    }
    if (!handicaps.length && /(handicap|hdcp|hcp|stroke\s*index|\bsi\b)/i.test(line)) {
      const values = takeHoleValues(nums, 1, 18)
      if (values.length >= 9) handicaps = values
    }
    if (!yards.length && TEE_WORDS.test(line)) {
      const values = takeHoleValues(nums, 60, 700)
      if (values.length >= 9) {
        yards = values
        teeName = line.match(TEE_WORDS)?.[0] ?? teeName
        teeName = teeName[0].toUpperCase() + teeName.slice(1).toLowerCase()
      }
    }
  }

  // OCR often reads front and back rows separately. Add second matching line when needed.
  if (pars.length === 9) {
    const another = lines
      .filter((line) => /\bpar\b/i.test(line))
      .map((line) => takeHoleValues(numbersFrom(line), 3, 5))
      .find((values) => values.length >= 9 && values.join(',') !== pars.join(','))
    if (another) pars = [...pars, ...another].slice(0, 18)
  }
  if (handicaps.length === 9) {
    const another = lines
      .filter((line) => /(handicap|hdcp|hcp|stroke\s*index|\bsi\b)/i.test(line))
      .map((line) => takeHoleValues(numbersFrom(line), 1, 18))
      .find((values) => values.length >= 9 && values.join(',') !== handicaps.join(','))
    if (another) handicaps = [...handicaps, ...another].slice(0, 18)
  }
  if (yards.length === 9) {
    const another = lines
      .filter((line) => TEE_WORDS.test(line))
      .map((line) => takeHoleValues(numbersFrom(line), 60, 700))
      .find((values) => values.length >= 9 && values.join(',') !== yards.join(','))
    if (another) yards = [...yards, ...another].slice(0, 18)
  }

  return {
    name: candidateCourseName(lines),
    layout: 'Imported scorecard',
    city: '',
    address: '',
    tee_name: teeName,
    source_text: text,
    holes: Array.from({ length: 18 }, (_, index) => ({
      hole_number: index + 1,
      par: pars[index] ?? null,
      yardage: yards[index] ?? null,
      handicap: handicaps[index] ?? null,
    })),
  }
}
