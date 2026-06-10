import { z } from "zod"

export const runEvaluationCriterionFeedbackSchema = z.object({
  criterionId: z.string(),
  criterionName: z.string(),
  weight: z.number().positive(),
  score: z.number().min(0).max(100),
  feedback: z.string(),
})

export const runEvaluationSchema = z.object({
  rubricId: z.string(),
  rubricName: z.string(),
  score: z.number().min(0).max(100),
  criteria: z.array(runEvaluationCriterionFeedbackSchema),
  evaluatedAt: z.string(),
})

export type RunEvaluationCriterionFeedback = z.infer<
  typeof runEvaluationCriterionFeedbackSchema
>
export type RunEvaluation = z.infer<typeof runEvaluationSchema>
