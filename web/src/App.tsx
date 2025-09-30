import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { analyzeLatexTextOnly, buildHighlightedHtml } from './lib/latexAnalyzer'

type AnalysisResult = {
  filename: string
  words: number
  characters: number
  sentences: number
  paragraphs: number
  figures: number
  tables: number
  equations: number
  references: { bibItems: number; uniqueCiteKeys: number }
  sections: { abstract?: { words: number } }
  constraints?: {
    wordLimit?: { limit: number; withinLimit: boolean; overBy: number; remaining: number }
    maxReferences?: { limit: number; withinLimit: boolean; overBy: number; remaining: number }
  }
}

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [wordLimit, setWordLimit] = useState<string>('')
  const [maxReferences, setMaxReferences] = useState<string>('')
  const [rawLatex, setRawLatex] = useState<string>('')
  const [liveMetrics, setLiveMetrics] = useState<{ words: number; characters: number; sentences: number; paragraphs: number; figures: number; tables: number; equations: number; references: { bibItems: number; uniqueCiteKeys: number }; sections: { abstract?: { words: number } } } | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>('')

  const canSubmit = useMemo(() => !!file && file.name.endsWith('.tex'), [file])

  async function submitFile(selected: File) {
    setIsLoading(true)
    setError(null)
    setResult(null)

    const form = new FormData()
    form.append('file', selected)

    try {
      const apiBaseRaw = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || ''
      const normalizedBase = apiBaseRaw
        ? (apiBaseRaw.match(/^https?:\/\//) ? apiBaseRaw : `https://${apiBaseRaw}`)
        : ''
      const base = normalizedBase.replace(/\/+$/, '')
      const params = new URLSearchParams()
      if (wordLimit) params.set('wordLimit', wordLimit)
      if (maxReferences) params.set('maxReferences', maxReferences)
      const path = `/api/analyze${params.size ? `?${params.toString()}` : ''}`
      const url = base ? `${base}${path}` : path
      const res = await fetch(url, { method: 'POST', body: form })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Request failed: ${res.status}`)
      }
      const data = (await res.json()) as AnalysisResult
      setResult(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    await submitFile(file)
  }

  async function handleSaveAndAnalyze() {
    if (!rawLatex) return
    const edited = new File([rawLatex], file?.name || 'edited.tex', { type: 'text/x-tex' })
    await submitFile(edited)
  }

  useEffect(() => {
    if (!rawLatex) {
      setLiveMetrics(null)
      setPreviewHtml('')
      return
    }
    try {
      const metrics = analyzeLatexTextOnly(rawLatex)
      setLiveMetrics(metrics)
      setPreviewHtml(buildHighlightedHtml(rawLatex, 40000))
    } catch {
      // ignore live parse errors
    }
  }, [rawLatex])

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Textally</h1>
      <p>Upload a .tex file to analyze words and manuscript metrics.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="file"
          accept=".tex"
          onChange={async (e) => {
            const f = e.target.files?.[0] || null
            setFile(f)
            if (f) {
              try {
                const text = await f.text()
                setRawLatex(text)
              } catch {
                // ignore
              }
            } else {
              setRawLatex('')
            }
          }}
        />
        <div style={{ marginTop: 12 }}>
          <label>
            Word limit:&nbsp;
            <input
              type="number"
              min={0}
              value={wordLimit}
              onChange={(e) => setWordLimit(e.target.value)}
              style={{ width: 120 }}
            />
          </label>
          <label style={{ marginLeft: 16 }}>
            Max references:&nbsp;
            <input
              type="number"
              min={0}
              value={maxReferences}
              onChange={(e) => setMaxReferences(e.target.value)}
              style={{ width: 120 }}
            />
          </label>
        </div>
        <button type="submit" disabled={!canSubmit || isLoading} style={{ marginLeft: 12 }}>
          {isLoading ? 'Analyzing…' : 'Analyze'}
        </button>
      </form>
      {error && (
        <div style={{ color: 'red', marginTop: 12 }}>Error: {error}</div>
      )}
      {result && (
        <div style={{ marginTop: 24 }}>
          <h2>Results</h2>
          <ul>
            <li><strong>File</strong>: {result.filename}</li>
            <li><strong>Words</strong>: {result.words}</li>
            <li><strong>Characters</strong>: {result.characters}</li>
            <li><strong>Sentences</strong>: {result.sentences}</li>
            <li><strong>Paragraphs</strong>: {result.paragraphs}</li>
            <li><strong>Figures</strong>: {result.figures}</li>
            <li><strong>Tables</strong>: {result.tables}</li>
            <li><strong>Equations</strong>: {result.equations}</li>
            <li><strong>References</strong>: {result.references.bibItems} bibitems; {result.references.uniqueCiteKeys} unique cite keys</li>
            {result.sections.abstract && (
              <li><strong>Abstract words</strong>: {result.sections.abstract.words}</li>
            )}
          </ul>
          {result.constraints && (
            <div style={{ marginTop: 12 }}>
              <h3>Constraints</h3>
              <ul>
                {result.constraints.wordLimit && (
                  <li>
                    <strong>Word limit</strong>: {result.constraints.wordLimit.limit} — {result.constraints.wordLimit.withinLimit ? 'OK' : `Over by ${result.constraints.wordLimit.overBy}`}
                  </li>
                )}
                {result.constraints.maxReferences && (
                  <li>
                    <strong>Max references</strong>: {result.constraints.maxReferences.limit} — {result.constraints.maxReferences.withinLimit ? 'OK' : `Over by ${result.constraints.maxReferences.overBy}`}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <h2>Editor</h2>
        <p>Paste or edit your LaTeX here. Preview highlights the first 40k characters counted as words.</p>
        <textarea
          value={rawLatex}
          onChange={(e) => setRawLatex(e.target.value)}
          placeholder={'Paste your LaTeX here...'}
          style={{ width: '100%', height: 240 }}
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={handleSaveAndAnalyze} disabled={!rawLatex || isLoading}>
            {isLoading ? 'Analyzing…' : 'Save and analyze'}
          </button>
        </div>

        {liveMetrics && (
          <div style={{ marginTop: 16 }}>
            <h3>Live metrics (client)</h3>
            <ul>
              <li><strong>Words</strong>: {liveMetrics.words}</li>
              <li><strong>Characters</strong>: {liveMetrics.characters}</li>
              <li><strong>Sentences</strong>: {liveMetrics.sentences}</li>
              <li><strong>Paragraphs</strong>: {liveMetrics.paragraphs}</li>
              <li><strong>Figures</strong>: {liveMetrics.figures}</li>
              <li><strong>Tables</strong>: {liveMetrics.tables}</li>
              <li><strong>Equations</strong>: {liveMetrics.equations}</li>
              <li><strong>References</strong>: {liveMetrics.references.bibItems} bibitems; {liveMetrics.references.uniqueCiteKeys} unique cite keys</li>
              {liveMetrics.sections.abstract && (
                <li><strong>Abstract words</strong>: {liveMetrics.sections.abstract.words}</li>
              )}
            </ul>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <h3>Preview (first 40k chars)</h3>
          <div
            style={{
              border: '1px solid #ddd', padding: 12, borderRadius: 4,
              maxHeight: 240, overflow: 'auto', background: '#fff'
            }}
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>
    </div>
  )
}

export default App
