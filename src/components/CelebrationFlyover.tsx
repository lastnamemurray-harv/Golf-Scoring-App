interface Props {
  kind: 'birdie' | 'eagle' | 'bogey' | 'double_bogey'
  animationKey: number
}

const CELEBRATION_MAP = {
  birdie: { animal: '🦉', label: 'Birdie!' },
  eagle: { animal: '🦅', label: 'Eagle!' },
  bogey: { animal: '👹', label: 'Bogey!' },
  double_bogey: { animal: '🦅', label: 'Double bogey!' },
} as const

export default function CelebrationFlyover({ kind, animationKey }: Props) {
  const config = CELEBRATION_MAP[kind]
  return <div key={animationKey} className={`celebration-flyover celebration-${kind}`} role="status" aria-live="polite">
    <span className="celebration-animal" aria-hidden="true">{config.animal}</span>
    <span className="celebration-label">{config.label}</span>
  </div>
}
