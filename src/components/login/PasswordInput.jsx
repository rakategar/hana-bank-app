import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({ label = 'Password', value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          className="w-full px-4 py-2.5 pr-11 text-sm shadow-sm"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-text-muted transition-colors hover:text-ink focus:outline-none"
          aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </div>
  );
}
