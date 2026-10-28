import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errMsg } from '../api/client';
import ThemeToggle from '../components/ThemeToggle';
import { Button, Card, Field, Input } from '../components/ui';
import { DEMO_PASSWORD } from '../constants';
import { useAuth } from '../context/AuthContext';

const DEMOS = [
  { email: 'alice@acme.test', label: 'AK.SAM: owner of Acme Cloud' },
  { email: 'bob@acme.test', label: 'SAM: admin' },
  { email: 'carol@acme.test', label: 'UK: product manager' },
  { email: 'dave@acme.test', label: 'SAMGO: customer' },
];

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/workspaces" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: typeof errors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) er.email = 'Enter a valid email address.';
    if (!password) er.password = 'Enter your password.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await login(email, password);
      nav((loc.state as { from?: string } | null)?.from ?? '/workspaces', { replace: true });
    } catch (err) {
      setErrors({ form: errMsg(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hero hidden flex-col justify-between p-12 text-white lg:flex">
        <span className="text-lg font-bold tracking-tight">ProductPulse</span>
        <div>
          <h2 className="max-w-md text-4xl font-extrabold leading-tight tracking-tight">Know what to build next.</h2>
          <ul className="mt-6 max-w-sm space-y-3 text-teal-50/90">
            <li>Customers vote on the ideas they care about most.</li>
            <li>Merge duplicates so every request counts once.</li>
            <li>Share a public roadmap and release notes in one place.</li>
          </ul>
        </div>
        <p className="text-sm text-teal-50/70">Demo workspaces: Acme Cloud and Nimbus Notes</p>
      </div>
      <div className="relative flex items-center justify-center p-4">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md">
        <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="mb-6 text-slate-500">Log in to collect feedback, rank what matters, and show customers what is coming.</p>
        <Card>
          <form onSubmit={submit} className="space-y-4" noValidate>
            {errors.form && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
            <Field label="Email" error={errors.email}>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            </Field>
            <Field label="Password" error={errors.password}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</Button>
          </form>
        </Card>
        <Card className="mt-4">
          <p className="mb-2 text-sm font-medium">Demo accounts (password: {DEMO_PASSWORD})</p>
          <div className="flex flex-wrap gap-2">
            {DEMOS.map((d) => (
              <Button key={d.email} variant="secondary" className="text-xs" onClick={() => { setEmail(d.email); setPassword(DEMO_PASSWORD); setErrors({}); }}>
                {d.label}
              </Button>
            ))}
          </div>
          <Link to="/roadmap/acme-cloud" className="mt-3 block text-sm underline">View the public roadmap without logging in</Link>
        </Card>
      </div>
      </div>
    </div>
  );
}
