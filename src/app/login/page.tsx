'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      localStorage.setItem('percy_auth', 'true');
      router.replace('/');
    } else {
      setError(true);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-display-lg text-primary tracking-tight">Percy</h1>
          <p className="text-body-md text-on-surface-variant mt-2">Percy Fitness</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            className={`w-full px-5 py-4 rounded-xl border-2 text-body-md bg-surface-container-lowest outline-none transition-colors ${
              error ? 'border-error text-error' : 'border-outline-variant focus:border-primary'
            }`}
            autoFocus
          />
          {error && <p className="text-label-sm text-error -mt-2">Incorrect password</p>}
          <button
            type="submit"
            className="w-full bg-primary text-on-primary py-4 rounded-xl text-label-md shadow-lg shadow-primary/20 active:scale-95 transition-all"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
