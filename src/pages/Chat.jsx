import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';

const POLL_MS = 3000;
const SILENT_TEXTS = ['📷 Rasm'];

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [allowRasm, setAllowRasm] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const lastIdRef = useRef(0);
  const knownRef = useRef(new Set());
  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const data = await api.get(`/chat/poll.php?after=${lastIdRef.current}`);
      setAllowRasm(!!data.perms?.rasm);
      setTyping(!!data.typing);
      if (data.messages?.length) {
        setMessages((prev) => {
          const next = [...prev];
          for (const m of data.messages) {
            if (knownRef.current.has(m.id)) continue;
            knownRef.current.add(m.id);
            if (typeof m.id === 'number' && m.id > lastIdRef.current) lastIdRef.current = m.id;
            next.push(m);
          }
          return next;
        });
      }
      setLoaded(true);
    } catch {
      // Poll xatolarini jim o'tkazamiz — keyingi tsiklda qayta urinadi
    }
  }, []);

  useEffect(() => {
    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => clearInterval(iv);
  }, [poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function notifyTyping() {
    if (typingTimerRef.current) return;
    api.post('/chat/typing.php', {}).catch(() => {});
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null;
    }, 2000);
  }

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  }

  function clearFile() {
    setFile(null);
    setFilePreview(null);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setSending(true);
    setError('');
    try {
      const form = new FormData();
      form.append('matn', text.trim());
      if (file) form.append('media', file);
      const res = await api.post('/chat/send.php', form);
      const m = res.message;
      if (!knownRef.current.has(m.id)) {
        knownRef.current.add(m.id);
        if (m.id > lastIdRef.current) lastIdRef.current = m.id;
        setMessages((prev) => [...prev, m]);
      }
      setText('');
      clearFile();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xabar yuborilmadi.');
    } finally {
      setSending(false);
    }
  }

  async function runAction(action, id) {
    setError('');
    try {
      await api.post('/chat/action.php', { type: action, id });
      poll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Amalni bajarib bo\'lmadi.');
    }
  }

  return (
    <div className="mf-page mf-page--chat mf-page--standard flex flex-col h-[calc(100vh-56px-76px)] -mx-4">
      <div className="flex items-center gap-3 px-4 pb-3 border-b border-border">
        <div className="w-10 h-10 rounded-full bg-accent-soft text-accent flex items-center justify-center">
          <i className="fa-solid fa-user-shield" />
        </div>
        <div>
          <div className="font-extrabold text-sm">Admin</div>
          <div className="text-[11px] text-text-muted">{typing ? 'yozmoqda...' : 'MakerBot qo\'llab-quvvatlash'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {!loaded ? (
          <div className="h-full flex items-center justify-center text-text-muted text-sm">Yuklanmoqda...</div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-2 text-text-muted">
            <i className="fa-solid fa-comments text-2xl text-text-dim" />
            <p className="text-sm">Admin bilan suhbatni boshlang</p>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} onAction={runAction} />)
        )}
        {typing && (
          <div className="flex items-center gap-1.5 text-text-muted text-sm">
            <Dot /> <Dot delay="0.15s" /> <Dot delay="0.3s" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-4 mb-2 text-[12.5px] font-semibold text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2">
          {error}
        </div>
      )}

      {filePreview && (
        <div className="mx-4 mb-2 relative inline-block">
          <img src={filePreview} alt="preview" className="h-16 rounded-[var(--radius-sm)] border border-border" />
          <button
            onClick={clearFile}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white text-[10px] flex items-center justify-center"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-border">
        {allowRasm && (
          <label className="w-9 h-9 flex-shrink-0 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-muted cursor-pointer">
            <i className="fa-solid fa-paperclip" />
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        )}
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            notifyTyping();
          }}
          placeholder="Xabar yozing..."
          className="flex-1 px-3.5 py-2.5 rounded-full bg-surface-2 border border-border text-sm outline-none focus:border-accent"
        />
        <button
          disabled={sending || (!text.trim() && !file)}
          className="w-10 h-10 flex-shrink-0 rounded-full bg-[var(--mf-brand)] text-[var(--mf-on-brand)] disabled:opacity-50"
        >
          <i className="fa-solid fa-paper-plane" />
        </button>
      </form>
    </div>
  );
}

function Bubble({ message: m, onAction }) {
  const mine = m.kim === 'user';
  const showText = m.matn && !SILENT_TEXTS.includes(String(m.matn).trim());
  const media = m.media?.length ? m.media : (m.rasmlar || []).map((url) => ({ type: 'image', url }));

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-[var(--radius-md)] px-3.5 py-2.5 ${
          mine ? 'bg-[var(--mf-brand)] text-[var(--mf-on-brand)]' : 'bg-surface-2 border border-border'
        }`}
      >
        {!mine && <div className="text-[10.5px] font-bold opacity-70 mb-0.5">Admin</div>}
        {showText && <div className="text-sm whitespace-pre-wrap break-words">{m.matn}</div>}
        {media.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {media.map((img, i) => (
              <img key={i} loading="lazy" decoding="async" src={img.url} alt="" className="rounded-[var(--radius-sm)] max-w-full" />
            ))}
          </div>
        )}
        {m.actions?.buttons?.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {m.actions.buttons.map((b, i) =>
              b.url ? (
                <a
                  key={i}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-center py-1.5 rounded-[var(--radius-sm)] bg-surface text-text text-[12.5px] font-bold"
                >
                  {b.label}
                </a>
              ) : (
                <button
                  key={i}
                  onClick={() => onAction(b.action, b.id)}
                  className="py-1.5 rounded-[var(--radius-sm)] bg-surface text-text text-[12.5px] font-bold"
                >
                  {b.label}
                </button>
              )
            )}
          </div>
        )}
        <div className={`flex items-center gap-1 justify-end mt-1 text-[10px] ${mine ? 'opacity-80' : 'text-text-dim'}`}>
          <span>{m.vaqt}</span>
          {mine && (
            <i
              className={`fa-solid ${m.holat === 'read' ? 'fa-check-double' : 'fa-check'}`}
              style={{ opacity: m.holat === 'read' ? 1 : 0.6 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Dot({ delay = '0s' }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-text-dim inline-block animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
