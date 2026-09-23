import { useState, useRef, useEffect } from 'react';

const STARTER_PROMPTS = [
  "What courses and skill levels do you offer?",
  "Who are your industrial partners?",
  "What software products does AdroIT develop?",
  "What services do you provide to colleges and companies?"
];

const ChatWidget = ({
  apiUrl = 'http://localhost:8000',
  title = 'AdroBot',
  subtitle = 'Online Assistant',
  greeting = 'Hello! I am AdroBot, your assistant for AdroIT Technologies. How can I help you today with our courses, training programs, or company details?'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', text: greeting }
  ]);
  const [showPills, setShowPills] = useState(true);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendQuery = async (queryText) => {
    const cleanText = queryText.trim();
    if (!cleanText || isSending) return;

    setShowPills(false);
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: 'user', text: cleanText }
    ]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch(`${apiUrl}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: cleanText })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        setIsSending(false);
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            text: errData.detail || 'Unable to generate an answer. Please try again.',
            isError: true
          }
        ]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let streamStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const payloadStr = trimmed.slice(5).trim();
          if (payloadStr === '[DONE]') continue;

          try {
            const data = JSON.parse(payloadStr);
            if (data.token) {
              if (!streamStarted) {
                streamStarted = true;
                setIsSending(false);
                setMessages((prev) => [
                  ...prev,
                  { id: assistantMessageId, role: 'assistant', text: data.token }
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, text: msg.text + data.token }
                      : msg
                  )
                );
              }
            } else if (data.error) {
              setIsSending(false);
              setMessages((prev) => [
                ...prev,
                { id: `err-${Date.now()}`, role: 'assistant', text: data.error, isError: true }
              ]);
            }
          } catch (e) {
          }
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'Connection error. Please ensure the chatbot API server is running.',
          isError: true
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendQuery(input);
  };

  const handleReset = () => {
    setMessages([{ id: 'welcome', role: 'assistant', text: greeting }]);
    setShowPills(true);
    setInput('');
  };

  return (
    <>
      <style>{`
        .adro-widget-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: #2563eb;
          color: #ffffff;
          border: none;
          cursor: pointer;
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;
        }
        .adro-widget-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 14px 28px rgba(37, 99, 235, 0.45);
        }
        .adro-widget-window {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 380px;
          max-width: calc(100vw - 32px);
          height: 560px;
          max-height: calc(100vh - 120px);
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 99998;
          transform-origin: bottom right;
          transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        .adro-bubble-anim {
          animation: adroFadeIn 0.25s ease-out forwards;
        }
        @keyframes adroFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .adro-dot-bounce {
          width: 6px;
          height: 6px;
          background: #2563eb;
          border-radius: 50%;
          animation: adroBounce 1.2s infinite ease-in-out;
        }
        .adro-dot-bounce:nth-child(2) { animation-delay: 0.2s; }
        .adro-dot-bounce:nth-child(3) { animation-delay: 0.4s; }
        @keyframes adroBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.1); opacity: 1; }
        }
        .adro-pill-btn {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          padding: 7px 12px;
          border-radius: 9999px;
          font-size: 12.5px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .adro-pill-btn:hover {
          background: #eff6ff;
          border-color: #2563eb;
          color: #2563eb;
          transform: translateY(-1px);
        }
        @media (max-width: 480px) {
          .adro-widget-window {
            width: 100vw;
            height: 100vh;
            max-width: 100vw;
            max-height: 100vh;
            bottom: 0;
            right: 0;
            border-radius: 0;
          }
          .adro-widget-btn {
            bottom: 16px;
            right: 16px;
          }
        }
      `}</style>

      <button
        type="button"
        className="adro-widget-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
        )}
      </button>

      <div
        className="adro-widget-window"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.94)',
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
      >
        <div style={{ padding: '16px 20px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.38-1 1.72V7h4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3h4V5.72c-.6-.34-1-.98-1-1.72a2 2 0 0 1 2-2m-3 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m6 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m-6.5 5a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1z" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{title}</span>
              <span style={{ fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
                {subtitle}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={handleReset}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Reset conversation"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Close"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className="adro-bubble-anim"
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  padding: '11px 15px',
                  borderRadius: '14px',
                  borderBottomLeftRadius: !isUser ? '4px' : '14px',
                  borderBottomRightRadius: isUser ? '4px' : '14px',
                  fontSize: '13.5px',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  background: isUser ? '#2563eb' : msg.isError ? '#fef2f2' : '#ffffff',
                  color: isUser ? '#ffffff' : msg.isError ? '#991b1b' : '#0f172a',
                  border: isUser ? 'none' : msg.isError ? '1px solid #fecaca' : '1px solid #e2e8f0'
                }}
              >
                {msg.text}
              </div>
            );
          })}

          {showPills && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '4px 0 8px 0' }}>
              {STARTER_PROMPTS.map((promptText) => (
                <button
                  key={promptText}
                  type="button"
                  className="adro-pill-btn"
                  onClick={() => sendQuery(promptText)}
                >
                  {promptText}
                </button>
              ))}
            </div>
          )}

          {isSending && (
            <div
              className="adro-bubble-anim"
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '12px 16px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                borderBottomLeftRadius: '4px'
              }}
            >
              <span className="adro-dot-bounce"></span>
              <span className="adro-dot-bounce"></span>
              <span className="adro-dot-bounce"></span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleFormSubmit} style={{ padding: '12px 14px', background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about our courses, programs..."
            disabled={isSending}
            style={{
              flex: 1,
              height: '42px',
              padding: '0 14px',
              fontSize: '13.5px',
              color: '#0f172a',
              background: '#f1f5f9',
              border: '1px solid transparent',
              borderRadius: '21px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              cursor: isSending || !input.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isSending || !input.trim() ? 0.45 : 1
            }}
            aria-label="Send message"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '2px' }}>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </form>
      </div>
    </>
  );
};

export default ChatWidget;
