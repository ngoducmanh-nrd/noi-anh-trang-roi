import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { AnimatePresence, motion, useIsPresent } from 'motion/react';
import { useMotionTokens, useShouldReduceMotion } from '@animate-ui/react/utils/motion';
import { Button, Icon } from '../../components/ui';

export type Sticker = { id: string; data: string };

type Props = {
  stickers: Sticker[];
  busy: boolean;
  caption: string;
  onCaption: (value: string) => void;
  onSend: (data: string) => void;
  onRemove: (id: string) => void;
  onFile: (file?: File) => void;
  onEmoji: () => void;
  onClose: () => void;
};

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE = 10;

/**
 * Sticker drawer: a disclosure (height + fade + light blur), items popping in and reflowing.
 * Deleting is deliberate: press and hold a sticker (or right-click, or Delete/Backspace on the
 * keyboard) to reveal its delete bar, then tap the bar. A plain tap still sends the sticker.
 */
export default function StickerPanel({ stickers, busy, caption, onCaption, onSend, onRemove, onFile, onEmoji, onClose }: Props) {
  const { spring, transition, scale, blur, stagger } = useMotionTokens();
  const reduce = useShouldReduceMotion();
  const isPresent = useIsPresent();
  const [armed, setArmed] = useState<{ id: string; keyboard: boolean } | null>(null);
  const hold = useRef<{ timer: number; x: number; y: number } | null>(null);
  const swallowRelease = useRef(false);
  const deleteButton = useRef<HTMLButtonElement>(null);
  // Only the opening of the drawer cascades; stickers added later arrive at once.
  const cascade = useRef(true);
  useEffect(() => {
    const id = window.setTimeout(() => { cascade.current = false; }, 700);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => () => { if (hold.current) window.clearTimeout(hold.current.timer); }, []);

  // While a delete bar is showing: any other click dismisses it (and is not acted on), and the
  // release of the long press that opened it is swallowed instead of sending the sticker.
  useEffect(() => {
    if (!armed) return;
    const clearSwallow = () => { swallowRelease.current = false; };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('.sticker-delete-wrap')) return;
      if (swallowRelease.current) { swallowRelease.current = false; event.stopPropagation(); event.preventDefault(); return; }
      setArmed(null);
      if (target?.closest('.sticker-grid')) { event.stopPropagation(); event.preventDefault(); }
    };
    document.addEventListener('pointerdown', clearSwallow, true);
    document.addEventListener('click', onClick, true);
    return () => { document.removeEventListener('pointerdown', clearSwallow, true); document.removeEventListener('click', onClick, true); };
  }, [armed]);
  useEffect(() => { if (armed?.keyboard) deleteButton.current?.focus(); }, [armed]);

  function arm(id: string, keyboard: boolean) {
    setArmed({ id, keyboard });
    navigator.vibrate?.(12);
  }
  function startHold(event: PointerEvent<HTMLButtonElement>, id: string) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    cancelHold();
    swallowRelease.current = false;
    hold.current = {
      x: event.clientX, y: event.clientY,
      timer: window.setTimeout(() => { hold.current = null; swallowRelease.current = true; arm(id, false); }, LONG_PRESS_MS),
    };
  }
  function moveHold(event: PointerEvent<HTMLButtonElement>) {
    const h = hold.current;
    if (h && Math.hypot(event.clientX - h.x, event.clientY - h.y) > MOVE_TOLERANCE) cancelHold();
  }
  function cancelHold() {
    if (hold.current) { window.clearTimeout(hold.current.timer); hold.current = null; }
  }
  function openMenu(event: ReactMouseEvent<HTMLButtonElement>, id: string) {
    event.preventDefault(); // no browser image/context menu over a sticker
    if (armed?.id !== id) { cancelHold(); arm(id, false); }
  }
  function keyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === 'Delete' || event.key === 'Backspace' || event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      arm(id, true);
    }
  }
  function panelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Escape' || !armed) return;
    event.stopPropagation(); // the chat screen closes on Escape; this only cancels the delete bar
    const id = armed.id;
    setArmed(null);
    if (armed.keyboard) document.querySelector<HTMLElement>(`[data-sticker-id="${id}"] .sticker-send`)?.focus();
  }
  function confirmRemove(id: string) {
    // A17: a removed item that had the focus hands it to a neighbour.
    const tile = document.querySelector<HTMLElement>(`[data-sticker-id="${id}"]`);
    if (tile?.contains(document.activeElement)) {
      const next = (tile.nextElementSibling ?? tile.previousElementSibling) as HTMLElement | null;
      (next?.querySelector<HTMLElement>('.sticker-send') ?? document.querySelector<HTMLElement>('.sticker-panel input.input'))?.focus();
    }
    setArmed(null);
    onRemove(id);
  }

  // Reduced motion: the height jumps; the fade and the blur still play.
  const collapsed = { height: reduce ? 'auto' : 0, opacity: 0, filter: blur.disclosure };
  const expanded = { height: 'auto', opacity: 1, filter: 'blur(0px)', transitionEnd: { filter: 'none' } };
  const restScale = 'scale(1)';
  const popFrom = `scale(${reduce ? 1 : scale.popover})`;
  const pressed = `scale(${reduce ? 1 : scale.press})`;
  const barFrom = reduce ? 'translateY(0) scale(1)' : `translateY(8px) scale(${scale.action})`;

  return <motion.div
    className="sticker-panel"
    // A17: what is leaving can't be tabbed to.
    inert={!isPresent}
    initial={collapsed}
    animate={expanded}
    exit={collapsed}
    transition={transition.disclosure}
    style={{ overflow: 'hidden' }}
    onKeyDown={panelKeyDown}
  >
    <div className="sticker-picker">
      <div className="surface-header"><strong>Những chiếc sticker của bạn</strong><Button variant="ghost" onClick={onClose} aria-label="Đóng sticker"><Icon name="close" size={18} /></Button></div>
      <motion.div className="sticker-grid" layoutScroll>
        <AnimatePresence mode="popLayout" initial>
          {stickers.map((s, index) => {
            const delay = cascade.current ? 0.1 + Math.min(index, 9) * stagger.stack : 0;
            const isArmed = armed?.id === s.id;
            return <motion.div
              className={'sticker-item' + (isArmed ? ' is-armed' : '')}
              data-sticker-id={s.id}
              key={s.id}
              layout="position"
              initial={{ opacity: 0, transform: popFrom }}
              animate={{ opacity: 1, transform: restScale, transition: { transform: { ...spring.pop, delay }, opacity: { ...transition.fade, delay } } }}
              exit={{ opacity: 0, transform: popFrom, transition: transition.popOut }}
              transition={{ layout: spring.reflow }}
            >
              <motion.button
                className="sticker-send"
                disabled={busy}
                onClick={() => onSend(s.data)}
                onPointerDown={e => startHold(e, s.id)}
                onPointerMove={moveHold}
                onPointerUp={cancelHold}
                onPointerCancel={cancelHold}
                onPointerLeave={cancelHold}
                onContextMenu={e => openMenu(e, s.id)}
                onKeyDown={e => keyDown(e, s.id)}
                aria-label="Gửi sticker"
                aria-keyshortcuts="Delete"
                initial={{ transform: restScale }}
                whileTap={busy ? undefined : { transform: pressed }}
                transition={spring.press}
              ><img src={s.data} alt="Sticker đã lưu" draggable={false} /></motion.button>
              <AnimatePresence>
                {isArmed && <motion.div
                  className="sticker-delete-wrap"
                  initial={{ opacity: 0, transform: barFrom }}
                  animate={{ opacity: 1, transform: 'translateY(0) scale(1)', transition: { transform: spring.pop, opacity: transition.fade } }}
                  exit={{ opacity: 0, transition: transition.popOut }}
                >
                  <Button ref={deleteButton} variant="danger" className="sticker-delete" aria-label="Xóa sticker này" onClick={() => confirmRemove(s.id)}><Icon name="trash2" size={18} />Xóa</Button>
                </motion.div>}
              </AnimatePresence>
            </motion.div>;
          })}
        </AnimatePresence>
      </motion.div>
      <p className="visually-hidden" role="status">{armed ? 'Đã hiện nút xóa sticker. Nhấn Xóa để xóa, hoặc Esc để hủy.' : ''}</p>
      <div className="actions">
        <label className="button button-secondary"><Icon name="upload" size={16} />Tạo từ ảnh<input type="file" accept="image/*" className="visually-hidden" onChange={e => onFile(e.target.files?.[0])} /></label>
        <input className="input" aria-label="Emoji để tạo sticker" placeholder="Một emoji…" value={caption} maxLength={8} onChange={e => onCaption(e.target.value)} />
        <Button variant="secondary" onClick={onEmoji}>Tạo</Button>
      </div>
      <p className="hint">Tối đa 24 sticker, lưu trên thiết bị này. Nhấn giữ một sticker để xóa.</p>
    </div>
  </motion.div>;
}
