import Link from 'next/link';
import { api } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function ProblemsPage() {
  let problems;
  try {
    problems = await api.listProblems();
  } catch {
    return (
      <div className="empty-state panel">
        <h2>Can&apos;t reach the backend</h2>
        <p>
          Make sure the API server is running (see README) and that <code>NEXT_PUBLIC_API_URL</code> points at it.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="eyebrow">Practice loop: choose problem → design → submit → feedback → review → try again</div>
      <h1>Choose a problem to practice</h1>
      <p>
        Each problem gives you the requirements and constraints you need to design a solution. Submit your design as
        classes, interfaces, and relationships, and get feedback split into requirement/structural checks and
        AI-assisted design-quality notes.
      </p>

      <div className="problem-grid">
        {problems.map((p) => (
          <Link key={p.id} href={`/problems/${p.slug}`} className="problem-card">
            <h3>{p.title}</h3>
            <p>{p.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
