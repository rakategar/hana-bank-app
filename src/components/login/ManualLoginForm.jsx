import { LogIn } from 'lucide-react';
import PasswordInput from './PasswordInput';

export default function ManualLoginForm({ credentials, error, onChange, onSubmit }) {
  return (
    <form
      key="manual-panel"
      onSubmit={onSubmit}
      className="animate-fade-in-up flex min-h-[292px] flex-col justify-center rounded-2xl border border-white/80 bg-white/75 p-5 shadow-card backdrop-blur-xl"
    >
      <div className="space-y-3">
        <div>
          <label className="label">Username / ID</label>
          <input
            className="w-full px-4 py-2.5 text-sm shadow-sm"
            placeholder="fa_001"
            value={credentials.username}
            onChange={(event) => onChange({ username: event.target.value })}
          />
        </div>

        <PasswordInput
          value={credentials.password}
          placeholder="icu2026"
          onChange={(event) => onChange({ password: event.target.value })}
        />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-score-1">{error}</p>}

        <button type="submit" className="btn-teal min-h-11 w-full text-base">
          <LogIn size={17} /> Masuk
        </button>
      </div>
    </form>
  );
}
