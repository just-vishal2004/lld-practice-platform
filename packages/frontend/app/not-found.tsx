import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="empty-state panel">
      <h2>Not found</h2>
      <p>That problem or attempt doesn&apos;t exist.</p>
      <Link href="/problems" className="btn">
        Back to problems
      </Link>
    </div>
  );
}
