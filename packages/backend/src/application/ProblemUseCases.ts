import { ProblemRepository } from './ports';
import { NotFoundError } from './errors';
import { Problem } from '../domain/Problem';

export class ProblemUseCases {
  constructor(private readonly problems: ProblemRepository) {}

  async listProblems(): Promise<Problem[]> {
    return this.problems.findAll();
  }

  async getProblemBySlug(slug: string): Promise<Problem> {
    const problem = await this.problems.findBySlug(slug);
    if (!problem) throw new NotFoundError('Problem', slug);
    return problem;
  }
}
