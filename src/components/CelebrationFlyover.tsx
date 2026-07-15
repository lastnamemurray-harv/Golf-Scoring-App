interface Props {
  kind: 'birdie' | 'eagle'
  animationKey: number
}

export default function CelebrationFlyover({ kind, animationKey }: Props) {
  return <div key={animationKey} className={`celebration-flyover celebration-${kind}`} role="status" aria-live="polite">
    <span className="celebration-animal" aria-hidden="true">{kind === 'eagle' ? '🦅' : '🐦'}</span>
    <span className="celebration-label">{kind === 'eagle' ? 'Eagle!' : 'Birdie!'}</span>
  </div>
}
