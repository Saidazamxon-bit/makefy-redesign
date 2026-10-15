import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError, mediaUrl } from '../../lib/api';

const POLL_MS = 3000;

export default function AdminChatSuhbat() {
  const { uid } = useParams();
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const lastIdRef = useRef(0);
  const knownRef = useRef(new Set());
  const bottomRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const data = await api.get(`/admin/chat_poll.php?uid=${uid}&after=${lastIdRef.current}`);
      setUser(data.user);
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
    } catch (err) {
      if (!loaded) setError(err.message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    lastIdRef.current = 0;
    knownRef.current = new Set();
    setMessages([]);
    setLoaded(false);
    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => clearInterval(iv);
  }, [uid, poll]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  function handleFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setSending(true);
    setError('');
    try {
      const form = new FormData();
      form.append('uid', uid);
      form.append('matn', text.trim());
      if (file) form.append('media', file);
      const res = await api.post('/admin/chat_send.php', form);
      const m = res.message;
      if (!knownRef.current.has(m.id)) {
        knownRef.current.add(m.id);
        if (m.id > lastIdRef.current) lastIdRef.current = m.id;
        setMessages((prev) => [...prev, m]);
      }
      setText('');
      setFile(null);
      setFilePreview(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xabar yuborilmadi.');
    } finally {
      setSending(false);
    }
  }

  if (error && !loaded) return <p className="text-danger text-sm">{error}</p>;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <Link to="/admin/chat" className="w-9 h-9 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-muted">
          <i className="fa-solid fa-arrow-left" />
        </Link>
        <div>
          <div className="font-extrabold text-sm">{user?.login || '...'}</div>
          <div className="text-[11px] text-text-muted">ID: {uid} {typing && '· yozmoqda...'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
        {messages.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <div className="text-[12.5px] text-danger bg-danger-soft rounded-[var(--radius-sm)] px-3 py-2 mb-2">{error}</div>}

      {filePreview && (
        <div className="mb-2 relative inline-block">
          <img src={filePreview} alt="preview" className="h-16 rounded-[var(--radius-sm)] border border-border" />
          <button onClick={() => { setFile(null); setFilePreview(null); }} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white text-[10px] flex items-center justify-center">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-2 pt-3 border-t border-border">
        <label className="w-9 h-9 flex-shrink-0 rounded-full bg-surface-2 border border-border flex items-center justify-center text-text-muted cursor-pointer">
          <i className="fa-solid fa-paperclip" />
          <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        </label>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Javob yozing..."
          className="flex-1 px-3.5 py-2.5 rounded-full bg-surface-2 border border-border text-sm outline-none focus:border-accent"
        />
        <button disabled={sending || (!text.trim() && !file)} className="w-10 h-10 flex-shrink-0 rounded-full bg-[var(--mf-brand)] text-[var(--mf-on-brand)] disabled:opacity-50">
          <i className="fa-solid fa-paper-plane" />
        </button>
      </form>
    </div>
  );
}

function Bubble({ message: m }) {
  const mine = m.kim === 'admin';
  const media = m.media?.length ? m.media : (m.rasmlar || []).map((url) => ({ type: 'image', url }));
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[78%] rounded-[var(--radius-md)] px-3.5 py-2.5 ${mine ? 'bg-[var(--mf-brand)] text-[var(--mf-on-brand)]' : 'bg-surface-2 border border-border'}`}>
        {m.matn && <div className="text-sm whitespace-pre-wrap break-words">{m.matn}</div>}
        {media.length > 0 && (
          <div className="mt-1.5 space-y-1.5">
            {media.map((img, i) => (
              <img key={i} loading="lazy" decoding="async" src={mediaUrl(img.url)} alt="" className="rounded-[var(--radius-sm)] max-w-full" />
            ))}
          </div>
        )}
        <div className={`text-[10px] mt-1 text-right ${mine ? 'opacity-80' : 'text-text-dim'}`}>{m.vaqt}</div>
      </div>
    </div>
  );
}
