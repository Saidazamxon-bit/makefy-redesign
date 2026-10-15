import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';

export default function AdminChat() {
  const [chats, setChats] = useState(null);
  const [error, setError] = useState('');
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  function load(id) {
    api
      .get(`/admin/chat_list.php${id ? `?search_id=${id}` : ''}`)
      .then((d) => {
        setChats(d.chats);
        setSearchResult(d.searchResult);
      })
      .catch((err) => setError(err.message));
  }
  useEffect(() => load(), []);

  function handleSearch(e) {
    e.preventDefault();
    load(searchId.trim());
  }

  if (error && !chats) return <p className="text-danger text-sm">{error}</p>;

  return (
    <div>
      <h2 className="font-extrabold text-lg mb-4">Chat</h2>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Telegram ID bo'yicha qidirish"
          className="flex-1 px-3 py-2.5 rounded-[var(--radius-sm)] bg-surface-2 border border-border text-sm outline-none focus:border-accent"
        />
        <button className="px-4 rounded-[var(--radius-sm)] bg-accent text-accent-text font-bold text-sm">
          <i className="fa-solid fa-magnifying-glass" />
        </button>
      </form>

      {searchResult && (
        <Link
          to={`/admin/chat/${searchResult.user_id}`}
          className="flex items-center gap-3 bg-accent-soft border border-accent rounded-[var(--radius-md)] px-3.5 py-3 mb-4"
        >
          <div className="w-9 h-9 rounded-full bg-surface flex items-center justify-center font-bold text-accent">
            {searchResult.login?.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-bold text-sm">{searchResult.login}</div>
            <div className="text-[11.5px] text-text-muted">ID: {searchResult.user_id} · yangi suhbat boshlash</div>
          </div>
          <i className="fa-solid fa-chevron-right text-text-dim text-xs" />
        </Link>
      )}

      {!chats ? (
        <div className="h-40 rounded-[var(--radius-md)] bg-surface-2 animate-pulse" />
      ) : chats.length === 0 ? (
        <p className="text-center text-sm text-text-muted py-6">Hozircha suhbat yo'q</p>
      ) : (
        <div className="space-y-2">
          {chats.map((c) => (
            <Link
              key={c.user_id}
              to={`/admin/chat/${c.user_id}`}
              className="flex items-center gap-3 bg-surface border border-border rounded-[var(--radius-md)] px-3.5 py-3"
            >
              <div className="w-9 h-9 rounded-full bg-surface-3 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {c.login?.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{c.login} <span className="text-text-dim font-normal">#{c.user_id}</span></div>
                <div className="text-[12px] text-text-muted truncate">{c.lastMessage}</div>
              </div>
              {c.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-accent text-accent-text text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {c.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
