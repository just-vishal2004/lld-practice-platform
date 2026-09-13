import { z } from 'zod';

export const startAttemptSchema = z.object({
  problemId: z.string().min(1, 'problemId is required'),
});

export const submissionEntitySchema = z.object({
  name: z.string().min(1),
  kind: z.enum(['class', 'interface', 'enum']),
  responsibilities: z.array(z.string()),
});

export const submissionRelationshipSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(['inherits', 'implements', 'composes', 'aggregates', 'uses']),
});

export const submitSolutionSchema = z.object({
  format: z.literal('structured-oop').default('structured-oop'),
  content: z.object({
    entities: z.array(submissionEntitySchema),
    relationships: z.array(submissionRelationshipSchema),
    rationale: z.string(),
  }),
});
