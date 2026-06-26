import { useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import './TeamSplitPage.css'

const MIN_TEAMS = 2
const MAX_TEAMS = 10

type TeamResult = {
  teams: string[][]
  jokers: string[]
}

// Fisher–Yates shuffle then split into EQUAL teams; leftovers become jokers.
function makeTeams(names: string[], numTeams: number): TeamResult {
  const a = names.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  const per = Math.floor(a.length / numTeams)
  const teams: string[][] = []
  let k = 0
  for (let t = 0; t < numTeams; t++) { teams.push(a.slice(k, k + per)); k += per }
  const jokers = a.slice(k) // leftover players who don't divide evenly
  return { teams, jokers }
}

// Split pasted/typed text into clean player names (commas or new lines).
function parseNames(text: string): string[] {
  return text
    .split(/[\n,]+/)
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
}

export default function TeamSplitPage() {
  const [players, setPlayers] = useState<string[]>([])
  const [nameInput, setNameInput] = useState('')
  const [numTeams, setNumTeams] = useState(MIN_TEAMS)
  const [result, setResult] = useState<TeamResult | null>(null)
  const [hasShuffled, setHasShuffled] = useState(false)
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)

  const total = players.length
  const per = numTeams > 0 ? Math.floor(total / numTeams) : 0
  const remainder = numTeams > 0 ? total % numTeams : 0
  const canShuffle = total >= 2 && total >= numTeams

  const helperText = useMemo(() => {
    if (total === 0) return 'Add players to get started'
    if (total < 2) return 'Add at least 2 players'
    if (total < numTeams) {
      const needed = numTeams - total
      return `Add ${needed} more to fill ${numTeams} teams`
    }
    if (remainder === 0) return `${per} per team · even split`
    return `${per} per team · ${remainder} joker${remainder === 1 ? '' : 's'}`
  }, [total, numTeams, per, remainder])

  const addNames = (text: string) => {
    const names = parseNames(text)
    if (names.length === 0) return
    setPlayers((prev) => [...prev, ...names])
  }

  const handleAdd = () => {
    addNames(nameInput)
    setNameInput('')
  }

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  // A single-line input strips newlines, so intercept multi-name pastes here
  // (commas or new lines) before the browser collapses them.
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    const names = parseNames(text)
    // Only intercept when the paste actually represents a list; a single token
    // is left to the default behaviour so the user can keep editing it.
    if (names.length > 1 || /[\n,]/.test(text)) {
      e.preventDefault()
      addNames(text)
      setNameInput('')
    }
  }

  const removePlayer = (index: number) => {
    setPlayers((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setPlayers([])
    setResult(null)
    setHasShuffled(false)
  }

  const changeTeams = (next: number) => {
    setNumTeams(Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, next)))
  }

  const handleTeamsInput = (value: string) => {
    const n = parseInt(value, 10)
    if (Number.isNaN(n)) return
    changeTeams(n)
  }

  const shuffle = () => {
    if (!canShuffle) return
    setResult(makeTeams(players, numTeams))
    setHasShuffled(true)
  }

  const buildResultText = (r: TeamResult): string => {
    const lines = r.teams.map((team, i) => `Team ${i + 1}: ${team.join(', ')}`)
    if (r.jokers.length > 0) {
      lines.push(`${r.jokers.length === 1 ? 'Joker' : 'Jokers'}: ${r.jokers.join(', ')}`)
    }
    return lines.join('\n')
  }

  const copyResult = async () => {
    if (!result) return
    const text = buildResultText(result)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — leave UI unchanged.
    }
  }

  return (
    <main className="team-split-page">
      <div className="ts-container">
        <header className="ts-header">
          <h1 className="ts-title">Team Split</h1>
          <p className="ts-subtitle">
            Add player names, choose how many teams, then shuffle them into equal
            teams. Anyone left over becomes a Joker.
          </p>
        </header>

        <section className="card ts-panel" aria-labelledby="ts-players-label">
          <div className="ts-field">
            <label className="label ts-label" id="ts-players-label" htmlFor="ts-name-input">
              Players
            </label>
            <div className="ts-input-row">
              <input
                id="ts-name-input"
                className="input ts-name-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onPaste={handlePaste}
                placeholder="Type a name, or paste a comma / line separated list"
                aria-describedby="ts-input-hint"
                autoComplete="off"
              />
              <button
                type="button"
                className="btn btn-primary ts-add-btn"
                onClick={handleAdd}
                disabled={parseNames(nameInput).length === 0}
              >
                Add
              </button>
            </div>
            <p id="ts-input-hint" className="ts-hint">
              Press Enter or Add. Paste multiple names separated by commas or new lines.
            </p>
          </div>

          <div className="ts-players">
            <div className="ts-players-head">
              <span className="ts-count" aria-live="polite">
                {total} {total === 1 ? 'player' : 'players'}
              </span>
              {total > 0 && (
                <button type="button" className="ts-clear" onClick={clearAll}>
                  Clear all
                </button>
              )}
            </div>
            {total === 0 ? (
              <p className="ts-empty">No players yet.</p>
            ) : (
              <ul className="ts-chips" aria-label="Added players">
                {players.map((name, i) => (
                  <li key={`${name}-${i}`} className="ts-chip">
                    <span className="ts-chip-name">{name}</span>
                    <button
                      type="button"
                      className="ts-chip-remove"
                      onClick={() => removePlayer(i)}
                      aria-label={`Remove ${name}`}
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ts-controls">
            <div className="ts-field ts-teams">
              <span className="label ts-label" id="ts-teams-label">
                Number of teams
              </span>
              <div className="ts-stepper" role="group" aria-labelledby="ts-teams-label">
                <button
                  type="button"
                  className="ts-step-btn"
                  onClick={() => changeTeams(numTeams - 1)}
                  disabled={numTeams <= MIN_TEAMS}
                  aria-label="Decrease number of teams"
                >
                  <span aria-hidden="true">−</span>
                </button>
                <input
                  className="ts-step-value"
                  type="number"
                  inputMode="numeric"
                  min={MIN_TEAMS}
                  max={MAX_TEAMS}
                  value={numTeams}
                  onChange={(e) => handleTeamsInput(e.target.value)}
                  aria-label="Number of teams"
                />
                <button
                  type="button"
                  className="ts-step-btn"
                  onClick={() => changeTeams(numTeams + 1)}
                  disabled={numTeams >= MAX_TEAMS}
                  aria-label="Increase number of teams"
                >
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            </div>

            <div className="ts-shuffle-wrap">
              <p className="ts-helper" aria-live="polite">{helperText}</p>
              <button
                type="button"
                className="btn btn-primary ts-shuffle"
                onClick={shuffle}
                disabled={!canShuffle}
              >
                {hasShuffled ? 'Shuffle again' : 'Shuffle'}
              </button>
            </div>
          </div>
        </section>
      </div>

      {result && (
        <section className="ts-results-section" aria-label="Team results">
          <div className="ts-results-head">
            <h2 className="ts-results-title">Results</h2>
            <button type="button" className="btn btn-ghost ts-copy" onClick={copyResult}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div className="ts-results">
            {result.teams.map((team, i) => (
              <article className="card ts-team-card" key={`team-${i}`}>
                <h3 className="ts-team-name">Team {i + 1}</h3>
                {team.length === 0 ? (
                  <p className="ts-empty">No players</p>
                ) : (
                  <ul className="ts-team-list">
                    {team.map((name, j) => (
                      <li key={`${name}-${j}`} className="ts-team-player">{name}</li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
            {result.jokers.length > 0 && (
              <article className="card ts-team-card ts-joker-card">
                <h3 className="ts-team-name">
                  {result.jokers.length === 1 ? 'Joker' : 'Jokers'}
                </h3>
                <ul className="ts-team-list">
                  {result.jokers.map((name, j) => (
                    <li key={`joker-${name}-${j}`} className="ts-team-player">{name}</li>
                  ))}
                </ul>
              </article>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
