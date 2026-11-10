import { useLayoutEffect, useState } from 'react';
import { localKey } from '../state/AppContext';
import { Icon } from './ui';

type Mode = 'night' | 'day';

function readMode(): Mode {
  try {
    return localStorage.getItem(localKey(':theme')) === 'day' ? 'day' : 'night';
  } catch {
    return 'night';
  }
}

export default function ThemeToggle() {
  const [mode, setMode] = useState<Mode>(readMode);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = mode === 'day' ? 'day' : '';
    try {
      localStorage.setItem(localKey(':theme'), mode);
    } catch {}
  }, [mode]);
  const day = mode === 'day';
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={day}
      aria-label="Giao diện sáng"
      title={day ? 'Chuyển sang trăng đêm' : 'Chuyển sang trăng ngày'}
      onClick={() => setMode(current => current === 'day' ? 'night' : 'day')}>
      <Icon name={day ? 'sun' : 'moon'} size={18} />
      <span aria-hidden="true">{day ? 'Sáng' : 'Tối'}</span>
    </button>
  );
}
