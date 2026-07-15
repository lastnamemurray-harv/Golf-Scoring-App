import { useState } from 'react'
import { createWorker, PSM } from 'tesseract.js'
import type { ImportedCourseDraft, SyncState } from '../types'
import { parseScorecardText } from '../lib/scorecardParser'
import SyncBadge from './SyncBadge'

interface Props {
  onSave: (draft: ImportedCourseDraft) => Promise<SyncState>
  onDone: () => void
}

export default function ScorecardImport({ onSave, onDone }: Props) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('Take a clear, straight-on photo in good light.')
  const [draft, setDraft] = useState<ImportedCourseDraft | null>(null)
  const [sync, setSync] = useState<SyncState>('local-only')

  function chooseFile(selected: File | null) {
    if (!selected) return
    setFile(selected)
    setPreview(URL.createObjectURL(selected))
    setDraft(null)
    setProgress(0)
    setStatus('Ready to extract. The photo stays on this device during OCR.')
  }

  async function extract() {
    if (!file) return
    setStatus('Loading OCR engine…')
    const worker = await createWorker('eng', 1, {
      logger: (message) => {
        if (typeof message.progress === 'number') setProgress(Math.round(message.progress * 100))
        if (message.status) setStatus(message.status.replaceAll('_', ' '))
      },
    })
    try {
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
      const { data } = await worker.recognize(file)
      setDraft(parseScorecardText(data.text))
      setStatus('Extraction complete. Review every field before saving.')
    } finally {
      await worker.terminate()
    }
  }

  function patchHole(index: number, key: 'par' | 'yardage' | 'handicap', value: string) {
    if (!draft) return
    const holes = [...draft.holes]
    holes[index] = { ...holes[index], [key]: value === '' ? null : Number(value) }
    setDraft({ ...draft, holes })
  }

  async function save() {
    if (!draft) return
    if (!draft.name.trim() || !draft.tee_name.trim()) {
      setStatus('Course name and tee name are required.')
      return
    }
    setSync('saving')
    const result = await onSave(draft)
    setSync(result)
    setStatus(result === 'saved' ? 'Course saved to your database.' : result === 'offline' ? 'Saved on this phone and will be available offline.' : 'Course saved locally.')
  }

  return (
    <main className="page stack">
      <header className="hole-header"><div><p className="eyebrow">Course setup</p><h1>Import a scorecard</h1></div><SyncBadge state={sync} /></header>
      <section className="card stack">
        <label className="photo-picker">
          <input type="file" accept="image/*" capture="environment" onChange={(e) => chooseFile(e.target.files?.[0] ?? null)} />
          <span>📷 Take or choose photo</span>
        </label>
        {preview && <img className="scorecard-preview" src={preview} alt="Scorecard preview" />}
        <p className="status-text">{status}</p>
        {file && !draft && <><div className="progress"><span style={{ width: `${progress}%` }} /></div><button type="button" className="primary large" onClick={extract}>Extract course information</button></>}
      </section>

      {draft && <section className="card stack">
        <div className="notice"><strong>Review required</strong><span>OCR can confuse small numbers, grid lines, and front/back totals. Confirm the course name, tee, par, yardage, and handicap before saving.</span></div>
        <label className="field"><span>Course name</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label>
        <div className="two-col"><label className="field"><span>Layout</span><input value={draft.layout} onChange={(e) => setDraft({ ...draft, layout: e.target.value })} /></label><label className="field"><span>Tee name</span><input value={draft.tee_name} onChange={(e) => setDraft({ ...draft, tee_name: e.target.value })} /></label></div>
        <div className="two-col"><label className="field"><span>Rating</span><input inputMode="decimal" type="number" step="0.1" value={draft.rating ?? ''} onChange={(e) => setDraft({ ...draft, rating: e.target.value === '' ? null : Number(e.target.value) })} /></label><label className="field"><span>Slope</span><input inputMode="numeric" type="number" value={draft.slope ?? ''} onChange={(e) => setDraft({ ...draft, slope: e.target.value === '' ? null : Number(e.target.value) })} /></label></div>
        <div className="two-col"><label className="field"><span>City</span><input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} /></label><label className="field"><span>Address</span><input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} /></label></div>
        <div className="import-grid"><div className="import-grid-head"><span>Hole</span><span>Par</span><span>Yards</span><span>HCP</span></div>{draft.holes.map((hole,index) => <div className="import-grid-row" key={hole.hole_number}><strong>{hole.hole_number}</strong><input inputMode="numeric" type="number" min="3" max="6" value={hole.par ?? ''} onChange={(e) => patchHole(index,'par',e.target.value)} /><input inputMode="numeric" type="number" min="50" max="800" value={hole.yardage ?? ''} onChange={(e) => patchHole(index,'yardage',e.target.value)} /><input inputMode="numeric" type="number" min="1" max="18" value={hole.handicap ?? ''} onChange={(e) => patchHole(index,'handicap',e.target.value)} /></div>)}</div>
        <button type="button" className="primary large" onClick={save}>Save course and hole data</button>
        <button type="button" className="secondary" onClick={onDone}>Return to round setup</button>
      </section>}
    </main>
  )
}
