import { Plus, Trash2 } from 'lucide-react'

import type { QuizQuestion } from '@/api/competitions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { emptyQuestion } from '@/features/admin/quiz'

/**
 * Edits a quiz round's questions. The answers are kept on the server: a
 * player's device only ever receives the prompts, options and time limits.
 */
export function QuizEditor({
  questions,
  onChange,
}: {
  questions: QuizQuestion[]
  onChange: (questions: QuizQuestion[]) => void
}) {
  const update = (i: number, patch: Partial<QuizQuestion>) =>
    onChange(questions.map((q, j) => (j === i ? { ...q, ...patch } : q)))

  return (
    <div className="space-y-3 rounded-2xl bg-sky-50 p-4 text-sm ring-1 ring-sky-200">
      <div>
        <p className="font-semibold text-sky-900">Questions</p>
        <p className="text-sky-900/80">
          Everyone answers the same questions. A right answer scores 100, plus up to 50 for answering fast. Mark the
          right option with the circle. Players never receive it.
        </p>
      </div>
      {questions.map((q, i) => (
        <div key={i} className="space-y-2 rounded-xl bg-white p-3 ring-1 ring-sky-100">
          <div className="flex items-center gap-2">
            <span className="w-6 font-semibold text-sky-900">{i + 1}.</span>
            <Input
              value={q.prompt}
              onChange={(e) => update(i, { prompt: e.target.value })}
              placeholder="Question"
              aria-label={`Question ${i + 1}`}
              className="h-9"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 px-2"
              aria-label={`Remove question ${i + 1}`}
              onClick={() => onChange(questions.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          {q.options.map((option, k) => (
            <div key={k} className="flex items-center gap-2 pl-8">
              <input
                type="radio"
                name={`correct-${i}`}
                className="size-4 accent-emerald-600"
                checked={q.correct_index === k}
                onChange={() => update(i, { correct_index: k })}
                aria-label={`Option ${k + 1} is correct`}
              />
              <Input
                value={option}
                onChange={(e) => update(i, { options: q.options.map((o, m) => (m === k ? e.target.value : o)) })}
                placeholder={`Option ${k + 1}`}
                aria-label={`Question ${i + 1} option ${k + 1}`}
                className="h-8"
              />
              {q.options.length > 2 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2"
                  aria-label={`Remove option ${k + 1}`}
                  onClick={() =>
                    update(i, {
                      options: q.options.filter((_, m) => m !== k),
                      correct_index:
                        q.correct_index === k ? 0 : q.correct_index > k ? q.correct_index - 1 : q.correct_index,
                    })
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-3 pl-8">
            {q.options.length < 6 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => update(i, { options: [...q.options, ''] })}
              >
                <Plus className="size-3.5" />
                Option
              </Button>
            ) : null}
            <label className="flex items-center gap-2 text-sky-900/80">
              <Input
                inputMode="numeric"
                value={q.time_limit_seconds || ''}
                onChange={(e) =>
                  update(i, { time_limit_seconds: Number(e.target.value.replace(/[^0-9]/g, '')) || 0 })
                }
                className="h-8 w-20"
                aria-label={`Seconds for question ${i + 1}`}
              />
              seconds
            </label>
          </div>
        </div>
      ))}
      {questions.length < 50 ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-9"
          onClick={() => onChange([...questions, emptyQuestion()])}
        >
          <Plus className="size-4" />
          Add question
        </Button>
      ) : null}
    </div>
  )
}
