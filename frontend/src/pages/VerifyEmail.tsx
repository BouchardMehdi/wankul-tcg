import { useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { resendVerification, verifyEmail } from '../api/auth';

export default function VerifyEmail() {
  const loc = useLocation() as any;
  const nav = useNavigate();

  const [username, setUsername] = useState(loc?.state?.username ?? '');
  const [code, setCode] = useState('');

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await verifyEmail({ username, code });
      setMsg(res?.message || 'Email vérifié !');
      nav('/login', { state: { username } });
    } catch (e: any) {
      setErr(e?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await resendVerification({ username });
      setMsg(res?.message || 'Code renvoyé.');
    } catch (e: any) {
      setErr(e?.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="center-page">
      <div className="card" style={{ width: '100%', maxWidth: 520 }}>
        <h1>Vérifier l’email</h1>
        <p className="muted">Entre le code recu par email.</p>

        <form className="row" onSubmit={onVerify}>
          <label>
            <span className="label">Username</span>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </label>

          <label>
            <span className="label">Code (6 chiffres)</span>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>

          <button className="btn" disabled={loading}>
            {loading ? 'Vérification...' : 'Vérifier'}
          </button>

          <button type="button" className="btn secondary" onClick={onResend} disabled={loading}>
            Renvoyer le code
          </button>
        </form>

        {msg && <div className="success">{msg}</div>}
        {err && <div className="error">{err}</div>}
      </div>
    </div>
  );
}
