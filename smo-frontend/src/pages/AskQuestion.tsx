import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import TagPill from '../components/tagPill'
import { questionsApi, aiApi } from '../lib/api'

function normalizeTag(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

export default function AskQuestion() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [titleError, setTitleError] = useState('')
  const [descriptionError, setDescriptionError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [generatingTags, setGeneratingTags] = useState(false)
  const [aiDisabled, setAiDisabled] = useState(true)
  const [duplicates, setDuplicates] = useState<{ id: string; title: string }[]>([])
  const [allowAiCompanion, setAllowAiCompanion] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    aiApi.health()
      .then((health) => {
        setAiDisabled(!(health.ok && !health.rateLimited))
      })
      .catch(() => setAiDisabled(true))
  }, [])

  useEffect(() => {
    if (title.trim().length < 10) {
      setDuplicates([])
      return
    }

    const timer = setTimeout(() => {
      aiApi.checkDuplicate(title.trim())
        .then((result) => setDuplicates(result.matches ?? []))
        .catch(() => setDuplicates([]))
    }, 500)

    return () => clearTimeout(timer)
  }, [title])

  function addTag(raw: string) {
    const normalized = normalizeTag(raw)
    if (!normalized) return
    if (tags.includes(normalized)) return
    setTags([...tags, normalized])
    setTagInput('')
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    }
  }

  function removeTag(name: string) {
    setTags(tags.filter((t) => t !== name))
  }

  function mergeTags(suggested: string[]) {
    const merged = [...tags]
    for (const raw of suggested) {
      const normalized = normalizeTag(raw)
      if (!normalized || merged.includes(normalized)) continue
      merged.push(normalized)
    }
    setTags(merged)
  }

  async function handleGenerateTags() {
    if (!title.trim() || aiDisabled) return

    setGeneratingTags(true)
    try {
      const { tags: suggested } = await aiApi.suggestTags(title.trim())
      mergeTags(suggested)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : ''
      if (message.includes('groq_rate_limited') || message.includes('429')) {
        setAiDisabled(true)
      }
    } finally {
      setGeneratingTags(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTitleError('')
    setDescriptionError('')
    setSubmitError('')

    let hasError = false

    if (!title.trim()) {
      setTitleError('Title is required')
      hasError = true
    } else if (title.trim().length < 10) {
      setTitleError('Title must be at least 10 characters')
      hasError = true
    }

    if (!description.trim()) {
      setDescriptionError('Description is required')
      hasError = true
    } else if (description.trim().length < 20) {
      setDescriptionError('Description must be at least 20 characters')
      hasError = true
    }

    if (hasError) return

    setIsSubmitting(true)
    try {
      const question = await questionsApi.create({
        title: title.trim(),
        description: description.trim(),
        tags,
        allow_ai_companion: allowAiCompanion,
      })
      navigate(`/question/${question.id}`, { replace: true })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to post question'
      setSubmitError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="app-container">
      <Navbar />

      <div className="auth-wrapper">
        <div className="auth-card">
          <header className="auth-header">
            <h1>Ask a Question</h1>
            <p>Describe your problem so others can help.</p>
          </header>

          <form onSubmit={handleSubmit} className="auth-form">
            {submitError && <div className="form-error">{submitError}</div>}

            <div className="form-group">
              <label htmlFor="title" className="form-label">Title</label>
              <div className="title-row">
                <input
                  id="title"
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What's your question?"
                />
                {!aiDisabled && (
                  <button
                    type="button"
                    className="generate-tags-button"
                    onClick={handleGenerateTags}
                    disabled={!title.trim() || generatingTags}
                  >
                    {generatingTags ? 'Generating tags...' : '✦ Generate tags'}
                  </button>
                )}
              </div>
              {titleError && <p className="field-error">{titleError}</p>}
              {duplicates.length > 0 && (
                <div className="duplicate-warning">
                  <p>Similar questions already asked:</p>
                  <ul>
                    {duplicates.map((match) => (
                      <li key={match.id}>
                        <Link to={`/question/${match.id}`}>{match.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="description" className="form-label">Description</label>
              <textarea
                id="description"
                className="form-input form-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Be detailed. Markdown is supported. Describe what you tried and what happened."
                rows={6}
              />
              {descriptionError && <p className="field-error">{descriptionError}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="tags" className="form-label">Tags</label>
              <input
                id="tags"
                type="text"
                className="form-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Type a tag and press Enter or comma"
              />
              {tags.length > 0 && (
                <div className="tag-list">
                  {tags.map((tag) => (
                    <TagPill
                      key={tag}
                      tag={{ name: tag }}
                      onRemove={() => removeTag(tag)}
                    />
                  ))}
                </div>
              )}
            </div>

            <label className="companion-toggle">
              <input
                type="checkbox"
                checked={allowAiCompanion}
                onChange={(e) => setAllowAiCompanion(e.target.checked)}
              />
              Allow AI to answer if it thinks it can help
            </label>

            <button type="submit" className="form-button" disabled={isSubmitting}>
              {isSubmitting ? 'Posting...' : 'Post your question'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
