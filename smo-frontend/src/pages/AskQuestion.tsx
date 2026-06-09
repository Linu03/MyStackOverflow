import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import TagPill from '../components/tagPill'
import { questionsApi } from '../lib/api'

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
  const navigate = useNavigate()

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
              <input
                id="title"
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's your question?"
              />
              {titleError && <p className="field-error">{titleError}</p>}
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

            <button type="submit" className="form-button" disabled={isSubmitting}>
              {isSubmitting ? 'Posting...' : 'Post your question'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
