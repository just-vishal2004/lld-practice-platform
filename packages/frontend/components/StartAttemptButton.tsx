'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';

export function StartAttemptButton({ problemId, label }: { problemId: string; label: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const attempt = await api.startAttempt(problemId);
      router.push(`/attempts/${attempt.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start an attempt. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn" onClick={handleClick} disabled={loading}>
        {loading ? 'Starting…' : label}
      </button>
      {error && <p style={{ color: 'var(--brick)', fontSize: '0.85rem', marginTop: 8 }}>{error}</p>}
    </div>
  );
}
