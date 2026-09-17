import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import EmptyState from '../components/common/EmptyState'

// Ported from the original's #view-chat (~line 1597) and its
// getChatStore/saveChatStore/renderChatList/renderChatMessages/
// sendChatMessage functions (~lines 1719-1905 in
// _reference/original_index.html). Entirely local: channels are a fixed
// array and messages persist to localStorage only -- no backend calls, per
// PHASE2_CONTINUE.md item 2.

const CHAT_KEY = 'scms_chat_v42'

interface ChatChannel {
  id: string
  name: string
  subtitle: string
  icon: string
  theme: string
}

// Same 4 channels, same order, as the original CHAT_CHANNELS.
const CHAT_CHANNELS: ChatChannel[] = [
  { id: 'general', name: 'Council General', subtitle: 'Council channel', icon: 'fa-users', theme: 'team' },
  { id: 'leadership', name: 'Leadership', subtitle: 'Executive coordination', icon: 'fa-crown', theme: '' },
  { id: 'events', name: 'Events Desk', subtitle: 'Events & activities', icon: 'fa-calendar-check', theme: 'green' },
  { id: 'welfare', name: 'Student Welfare', subtitle: 'Welfare & grievances', icon: 'fa-shield-heart', theme: 'green' }
]

interface ChatMessage {
  sender: string
  text: string
  time: string
  mine: boolean
}

type ChatStore = Record<string, ChatMessage[]>

// Ported from the original's initials() (~line 2632). Exported because the
// Teams workspace uses the same helper for member avatars -- the original
// declared it once globally and both views shared it.
export function initials(name = ''): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0])
    .join('')
    .toUpperCase()
}

function getChatStore(): ChatStore {
  try {
    return JSON.parse(localStorage.getItem(CHAT_KEY) || '{}') || {}
  } catch {
    return {}
  }
}
function saveChatStore(store: ChatStore) {
  localStorage.setItem(CHAT_KEY, JSON.stringify(store))
}

// Same lazy-seed behavior as the original getChatMessages(): the first time
// a channel is opened it gets a welcome message written into the store.
function getChatMessages(id: string): ChatMessage[] {
  const store = getChatStore()
  if (!store[id]) {
    store[id] = [
      {
        sender: 'Council System',
        text: 'Welcome to Council Connect. Use this channel for coordination updates.',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        mine: false
      }
    ]
    saveChatStore(store)
  }
  return store[id]
}

export default function Chat() {
  const { user } = useAuth()
  const showToast = useToast()
  const [activeId, setActiveId] = useState('general')
  const [search, setSearch] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(() => getChatMessages('general'))
  const [draft, setDraft] = useState('')
  const [storeVersion, setStoreVersion] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)

  const activeChannel = CHAT_CHANNELS.find((c) => c.id === activeId) || CHAT_CHANNELS[0]

  useEffect(() => {
    setMessages(getChatMessages(activeId))
  }, [activeId, storeVersion])

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }, [draft])

  const channelPreviews = useMemo(() => {
    // Re-derive on storeVersion change so the sidebar preview/time updates
    // after a send, same as the original re-running renderChatList().
    return CHAT_CHANNELS.map((c) => {
      const msgs = getChatMessages(c.id)
      const last = msgs[msgs.length - 1]
      return { channel: c, last }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeVersion])

  const filteredChannels = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return channelPreviews
    return channelPreviews.filter(({ channel: c }) => c.name.toLowerCase().includes(q) || c.subtitle.toLowerCase().includes(q))
  }, [channelPreviews, search])

  const sendMessage = () => {
    const text = draft.trim()
    if (!text) return
    const store = getChatStore()
    const arr = store[activeId] || []
    arr.push({
      sender: user?.name || 'You',
      text,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      mine: true
    })
    store[activeId] = arr
    saveChatStore(store)
    setDraft('')
    setStoreVersion((v) => v + 1)
  }

  const clearActiveChat = () => {
    if (!confirm('Clear messages in this channel?')) return
    const store = getChatStore()
    delete store[activeId]
    saveChatStore(store)
    setStoreVersion((v) => v + 1)
    showToast('Chat cleared.')
  }

  return (
    <div id="view-chat" className="view-section">
      <div className="section-header" style={{ marginBottom: '1rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-comments" style={{ color: 'var(--accent-blue)' }} /> Council Connect
          </h2>
          <p>Private council conversations and team channels for Siddhant College.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '.72rem', color: 'var(--text-muted)' }}>
          <span className="scms-live-dot" /> Chat ready
        </div>
      </div>

      <div className="chat-shell">
        <aside className="chat-sidebar">
          <div className="chat-side-head">
            <div className="chat-brand">
              <div>
                <h3>Messages</h3>
                <small>Student Council 2026–27</small>
              </div>
              <div className="chat-avatar" style={{ width: 38, height: 38, borderRadius: 12 }}>
                <i className="fa-solid fa-users" />
              </div>
            </div>
          </div>
          <div className="chat-search">
            <i className="fa-solid fa-magnifying-glass" />
            <input id="chat-search-input" placeholder="Search chats..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div id="chat-list" className="chat-list">
            {filteredChannels.length ? (
              filteredChannels.map(({ channel: c, last }) => (
                <div key={c.id} className={`chat-item${activeId === c.id ? ' active' : ''}`} onClick={() => setActiveId(c.id)}>
                  <div className={`chat-avatar ${c.theme || ''}`}>
                    <i className={`fa-solid ${c.icon}`} />
                  </div>
                  <div className="chat-item-main">
                    <div className="chat-item-top">
                      <strong>{c.name}</strong>
                      <span className="chat-time">{last?.time || ''}</span>
                    </div>
                    <div className="chat-preview">{last?.text || 'No messages'}</div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState icon="fa-comments" title="No channels" text="Try another search." />
            )}
          </div>
        </aside>

        <section className="chat-main">
          <div className="chat-head">
            <div className="chat-head-left">
              <div id="chat-head-avatar" className="chat-avatar team">
                <i className={`fa-solid ${activeChannel.icon}`} />
              </div>
              <div className="chat-head-title">
                <h3 id="chat-head-title">{activeChannel.name}</h3>
                <p id="chat-head-subtitle">
                  <span className="scms-live-dot" style={{ width: 7, height: 7, marginRight: 5 }} /> {activeChannel.subtitle}
                </p>
              </div>
            </div>
            <div className="chat-head-actions">
              <button className="chat-icon-btn" title="Search messages" onClick={() => document.getElementById('chat-search-input')?.focus()}>
                <i className="fa-solid fa-magnifying-glass" />
              </button>
              <button className="chat-icon-btn" title="Clear this chat" onClick={clearActiveChat}>
                <i className="fa-solid fa-broom" />
              </button>
            </div>
          </div>

          <div id="chat-messages" className="chat-messages" ref={messagesRef}>
            <div className="chat-day">Today</div>
            {messages.map((m, i) => (
              <div key={i} className={`chat-row${m.mine ? ' mine' : ''}`}>
                <div className="chat-mini-avatar">{initials(m.sender || 'U')}</div>
                <div className="chat-bubble-wrap">
                  {!m.mine && <div className="chat-sender">{m.sender}</div>}
                  <div className="chat-bubble">
                    {m.text.split('\n').map((line, j, arr) => (
                      <span key={j}>
                        {line}
                        {j < arr.length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  <div className="chat-meta">{m.time || ''}</div>
                </div>
              </div>
            ))}
          </div>
          <div id="chat-typing" className="chat-typing" style={{ padding: '0 22px' }}>
            <span>Someone is typing</span>{' '}
            <span className="typing-dots">
              <span />
              <span />
              <span />
            </span>
          </div>
          <div className="chat-composer">
            <div className="chat-compose-box">
              <textarea
                ref={textareaRef}
                id="chat-input"
                rows={1}
                maxLength={1000}
                placeholder="Write a message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
              />
              <button className="chat-send" onClick={sendMessage} title="Send message">
                <i className="fa-solid fa-paper-plane" />
              </button>
            </div>
            <div className="chat-compose-tools">
              <span>Enter to send · Shift + Enter for a new line</span>
              <span id="chat-counter">{draft.length} / 1000</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
