export type ScorePosterKind = 'albatross' | 'eagle' | 'birdie' | 'par' | 'bogey' | 'double_bogey' | 'meltdown' | 'snowman'

interface Props {
  kind: ScorePosterKind
}

const POSTER_MAP: Record<ScorePosterKind, { src: string; alt: string }> = {
  albatross: { src: '/posters/albatross.webp', alt: 'Albatross poster' },
  eagle: { src: '/posters/eagle.webp', alt: 'Eagle poster' },
  birdie: { src: '/posters/birdie.webp', alt: 'Birdie poster' },
  par: { src: '/posters/par.webp', alt: 'Par poster' },
  bogey: { src: '/posters/bogey.webp', alt: 'Bogey poster' },
  double_bogey: { src: '/posters/double-bogey.webp', alt: 'Double bogey poster' },
  meltdown: { src: '/posters/meltdown.webp', alt: 'Meltdown poster' },
  snowman: { src: '/posters/snowman.webp', alt: 'Snowman poster' },
}

export default function ScorePosterFlash({ kind }: Props) {
  const poster = POSTER_MAP[kind]
  return <div className="score-poster-flash" role="status" aria-live="polite" aria-label={poster.alt}>
    <img src={poster.src} alt={poster.alt} />
  </div>
}
