export type ScorePosterKind = 'hole_in_one' | 'albatross' | 'eagle' | 'birdie' | 'par' | 'bogey' | 'double_bogey' | 'meltdown' | 'snowman'

interface Props {
  kind: ScorePosterKind
  onDismiss: () => void
}

const POSTER_MAP: Record<ScorePosterKind, { src: string; alt: string }> = {
  hole_in_one: { src: '/posters/hole-in-one.webp', alt: 'Hole in one poster' },
  albatross: { src: '/posters/albatross.webp', alt: 'Albatross poster' },
  eagle: { src: '/posters/eagle.webp', alt: 'Eagle poster' },
  birdie: { src: '/posters/birdie.webp', alt: 'Birdie poster' },
  par: { src: '/posters/par.webp', alt: 'Par poster' },
  bogey: { src: '/posters/bogey.webp', alt: 'Bogey poster' },
  double_bogey: { src: '/posters/double-bogey.webp', alt: 'Double bogey poster' },
  meltdown: { src: '/posters/meltdown.webp', alt: 'Meltdown poster' },
  snowman: { src: '/posters/snowman.webp', alt: 'Snowman poster' },
}

export default function ScorePosterFlash({ kind, onDismiss }: Props) {
  const poster = POSTER_MAP[kind]
  return <button className="score-poster-flash" type="button" onClick={onDismiss} aria-label={`${poster.alt}. Tap to continue.`}>
    <img src={poster.src} alt={poster.alt} />
    <span className="score-poster-hint">Tap anywhere to continue</span>
  </button>
}
