import { useState } from 'react';
import { ArrowLeft, ArrowRight, Leaf } from 'lucide-react';
import { basicAuth, requestApi } from '../api.js';

export default function AccountPage({ register, navigate, onSignIn }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const username = fields.get('username');
    const password = fields.get('password');
    const body = { username, password };

    setPending(true);
    setError('');
    try {
      // Registration creates the account first. Login then checks the credentials.
      if (register) await requestApi('/api/register', { method: 'POST', body });
      await requestApi('/api/login', { method: 'POST', body });

      // The account and Basic Auth header stay in React memory for this visit.
      const authorization = basicAuth(username, password);
      const [user, restaurants] = await Promise.all([
        requestApi('/api/user', { authorization }),
        requestApi('/api/owner/restaurants', { authorization }),
      ]);
      onSignIn({ ...user, authorization, restaurants });
    } catch (error) {
      setError(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="page-width grid min-h-screen content-center gap-6 py-10">
      <button type="button" className="text-link mx-auto w-fit" disabled={pending} onClick={() => navigate('/')}>
        <ArrowLeft size={16} /> Back to FoodFlow
      </button>

      <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm md:grid-cols-2">
        <aside className="flex flex-col justify-between gap-6 bg-[#153d2c] p-7 text-white md:gap-12 md:p-11">
          <p className="flex items-center gap-3 text-lg font-bold"><Leaf size={24} /> FoodFlow</p>
          <div>
            <p className="eyebrow text-[#cde5b8]">GOOD FOOD, CLOSE TO HOME</p>
            <p className="mt-3 font-serif text-3xl leading-tight md:text-4xl">Local favourites.<br />A little closer.</p>
            <p className="mt-3 text-sm leading-6 text-green-100">Find your next meal and follow it from the kitchen to your door.</p>
          </div>
        </aside>

        <div className="p-7 md:p-11">
          <h1 className="section-heading">{register ? 'Create an account' : 'Sign in'}</h1>
          <p className="mt-3 text-sm text-stone-600">
            {register ? 'Choose a username and password to get started.' : 'Enter your FoodFlow username and password.'}
          </p>

          <form className="mt-7 grid gap-4" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-semibold">
              Username
              <input className="rounded-lg border border-stone-300 px-3 py-2.5" name="username"
                autoComplete="username" maxLength={100} required />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Password
              <input className="rounded-lg border border-stone-300 px-3 py-2.5" name="password" type="password"
                autoComplete={register ? 'new-password' : 'current-password'} required />
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            <button className="orange-button mt-2 justify-between disabled:opacity-60" disabled={pending}>
              {pending ? 'Please wait…' : register ? 'Create account' : 'Sign in'} <ArrowRight size={17} />
            </button>
          </form>

          <button type="button" className="text-link mt-5" disabled={pending} onClick={() => navigate(register ? '/login' : '/register')}>
            {register ? 'Already have an account? Sign in' : 'New to FoodFlow? Create an account'}
          </button>
        </div>
      </div>
    </main>
  );
}
