import { useEffect, useRef, useState } from "react";
import { Check, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type Screen = "compose" | "chat";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [reply, setReply] = useState("");
  const [chatText, setChatText] = useState("");
  const [screen, setScreen] = useState<Screen>("compose");
  const [chatLocked, setChatLocked] = useState(true);
  const [cooldownRunning, setCooldownRunning] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [chatSendCount, setChatSendCount] = useState(0);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const connection = trpc.telegram.status.useQuery(undefined, { refetchOnWindowFocus: true });
  const initialSend = trpc.telegram.send.useMutation();
  const chatSend = trpc.telegram.send.useMutation();
  const isConfigured = connection.data?.configured === true;
  const outgoingMessage = `Messaggio: ${question.trim()}\nRisposta: ${reply.trim()}`;
  const initialCharacterCount = Array.from(`${question.trim()}${reply.trim()}`).length;
  const hasBothFields = question.trim().length > 0 && reply.trim().length > 0;
  const initialTooLong = Array.from(outgoingMessage).length > 4096;
  const showMissingField = (question.length > 0 || reply.length > 0) && !hasBothFields;
  const chatMessage = chatText.trim();
  const chatCharacterCount = Array.from(chatMessage).length;
  const chatTooLong = chatCharacterCount > 4096;
  const nextCooldownSeconds = chatSendCount === 0 ? 60 : chatSendCount === 1 ? 120 : 160;

  useEffect(() => {
    if (!cooldownRunning) return;
    if (cooldownRemaining <= 0) {
      setCooldownRunning(false);
      setChatLocked(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setCooldownRemaining((remaining) => Math.max(remaining - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [cooldownRunning, cooldownRemaining]);

  useEffect(() => {
    if (screen === "chat" && !chatLocked && !cooldownRunning) {
      chatInputRef.current?.focus();
    }
  }, [screen, chatLocked, cooldownRunning]);

  function handleInitialSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasBothFields || initialTooLong || initialSend.isPending || !isConfigured) return;

    initialSend.mutate(
      { message: outgoingMessage },
      {
        onSuccess: () => {
          setQuestion("");
          setReply("");
          setChatText("");
          setChatSendCount(0);
          setCooldownRemaining(0);
          setCooldownRunning(false);
          setChatLocked(true);
          setScreen("chat");
        },
      },
    );
  }

  function handleChatSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!chatMessage || chatTooLong || chatSend.isPending || chatLocked || cooldownRunning || !isConfigured) return;

    chatSend.mutate(
      { message: chatMessage },
      {
        onSuccess: () => {
          setChatText("");
          setChatSendCount((count) => count + 1);
          setCooldownRemaining(0);
          setCooldownRunning(false);
          setChatLocked(true);
        },
      },
    );
  }

  if (screen === "chat") {
    return (
      <main className="demo-chat-page">
        <header className="demo-chat-header">
          <a className="demo-chat-brand" href="/" aria-label="Demo">demo</a>
          <span className="demo-chat-status">
            <span className={`support-status-dot ${isConfigured ? "" : "is-offline"}`} />
            {isConfigured ? "Telegram channel active" : "Telegram not configured"}
          </span>
        </header>

        <section className="demo-chat-main" aria-labelledby="demo-chat-title">
          <article className="demo-chat-card">
            <h1 id="demo-chat-title">Demo123</h1>
            <hr />
            <p className="demo-chat-description">Chiedi ai tuoi amici di Telegram cosa c'è di nuovo.</p>
            <p className="demo-chat-explainer">Il testo che invii verrà inoltrato alla chat Telegram configurata.</p>

            <form className="demo-chat-form" onSubmit={handleChatSubmit} noValidate>
              {connection.data?.configured === false && (
                <p className="form-feedback feedback-setup" role="status">Telegram is not configured yet, so sending is disabled.</p>
              )}
              {connection.isError && (
                <p className="form-feedback feedback-error" role="status">Could not verify the Telegram connection. Please reload the page.</p>
              )}
              <label className="demo-chat-label" htmlFor="telegram-chat">Telegram chat</label>
              <textarea
                ref={chatInputRef}
                id="telegram-chat"
                name="telegram-chat"
                value={chatText}
                disabled={chatLocked || cooldownRunning || chatSend.isPending}
                onChange={(event) => {
                  setChatText(event.target.value);
                  chatSend.reset();
                }}
                placeholder="Scrivi quello che vuoi chiedere…"
                rows={4}
                maxLength={4096}
                aria-describedby="telegram-chat-help telegram-chat-counter"
                required
              />
              <span id="telegram-chat-help" className="demo-chat-help">Il testo parte solo quando premi “Send to Telegram”.</span>
              <span id="telegram-chat-counter" className={chatTooLong ? "demo-chat-counter is-error" : "demo-chat-counter"}>{chatCharacterCount}/4096</span>
              {chatLocked ? (
                <button
                  className="demo-chat-more"
                  type="button"
                  disabled={cooldownRunning}
                  onClick={() => {
                    if (cooldownRunning) return;
                    setCooldownRemaining(nextCooldownSeconds);
                    setCooldownRunning(true);
                  }}
                >
                  {cooldownRunning ? `Puoi scrivere tra ${cooldownRemaining} secondi` : `Digita altro per chattare · attesa ${nextCooldownSeconds} secondi`}
                </button>
              ) : (
                <p className="demo-chat-ready" role="status">Puoi scrivere adesso.</p>
              )}

              {chatSend.isSuccess && (
                <p className="form-feedback feedback-success" role="status"><Check size={16} aria-hidden="true" /> Messaggio inviato a Telegram.</p>
              )}
              {chatSend.error && (
                <p className="form-feedback feedback-error" role="alert">Invio non riuscito. Riprova tra poco.</p>
              )}
              {chatTooLong && (
                <p className="form-feedback feedback-error" role="alert">Il testo deve contenere al massimo 4096 caratteri.</p>
              )}

              <Button className="demo-chat-submit" type="submit" disabled={!chatMessage || chatTooLong || chatLocked || cooldownRunning || chatSend.isPending || !isConfigured}>
                {chatSend.isPending ? (
                  <><span className="loading-spinner" aria-hidden="true" /> Invio in corso…</>
                ) : !isConfigured ? (
                  <>Invio non disponibile <LockKeyhole size={14} aria-hidden="true" /></>
                ) : (
                  <>Send to Telegram <Send size={15} aria-hidden="true" /></>
                )}
              </Button>
            </form>

            <p className="demo-chat-disclaimer"><LockKeyhole size={13} aria-hidden="true" /> Demo a senso unico: i messaggi arrivano su Telegram, le risposte non vengono mostrate qui.</p>
          </article>
        </section>
        <footer className="demo-chat-footer">Demo · Telegram</footer>
      </main>
    );
  }

  return (
    <main className="support-page">
      <header className="support-header">
        <a className="support-brand" href="/" aria-label="Demo, home">
          <span className="support-brand-mark" aria-hidden="true">D</span>
          <span>demo</span>
        </a>
        <span className="support-status">
          <span className={`support-status-dot ${isConfigured ? "" : "is-offline"}`} />
          {connection.isLoading ? "Checking…" : isConfigured ? "Telegram channel active" : "Telegram not configured"}
        </span>
      </header>

      <section className="support-stage" aria-labelledby="support-title">
        <article className="support-card">
          <div className="support-intro">
            <p className="support-eyebrow">DEMO</p>
            <h1 id="support-title">This is just a test.<br />Everything you write is sent to Telegram.</h1>
            <p className="support-description">Write both texts below. They will be sent together when you press the button.</p>
          </div>

          <div className="support-notice" role="note">
            <ShieldCheck size={17} aria-hidden="true" />
            <p><strong>Demo form only</strong><span>Do not enter passwords, verification codes, payment details, or other sensitive information.</span></p>
          </div>

          <form className="support-form" onSubmit={handleInitialSubmit} noValidate>
            {connection.data?.configured === false && (
              <p className="form-feedback feedback-setup" role="status">Telegram is not configured yet, so sending is disabled.</p>
            )}
            {connection.isError && (
              <p className="form-feedback feedback-error" role="status">Could not verify the Telegram connection. Please reload the page in a moment.</p>
            )}

            <textarea
              className="chat-field"
              id="question"
              name="question"
              aria-label="First text"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                initialSend.reset();
              }}
              placeholder="Ciao amico, come stai?"
              rows={2}
              maxLength={4096}
              aria-describedby="message-help"
              aria-invalid={showMissingField && !question.trim()}
              required
            />

            <textarea
              className="chat-field"
              id="reply"
              name="reply"
              aria-label="Second text"
              value={reply}
              onChange={(event) => {
                setReply(event.target.value);
                initialSend.reset();
              }}
              placeholder="Io sto bene, non ti devi preoccupare."
              rows={2}
              maxLength={4096}
              aria-describedby="message-help"
              aria-invalid={showMissingField && !reply.trim()}
              required
            />

            <div className="support-field-meta">
              <span id="message-help">Both texts are sent only after you press the button.</span>
              <span className={initialTooLong ? "support-counter is-error" : "support-counter"}>{initialCharacterCount}/4096</span>
            </div>

            {showMissingField && (
              <p className="form-feedback feedback-error" role="alert">Complete both texts before sending.</p>
            )}
            {initialTooLong && (
              <p className="form-feedback feedback-error" role="alert">The combined text must be 4096 characters or fewer.</p>
            )}
            {initialSend.error && (
              <p className="form-feedback feedback-error" role="alert">Text not sent. Please try again in a moment.</p>
            )}

            <Button className="support-submit" type="submit" disabled={!hasBothFields || initialTooLong || initialSend.isPending || !isConfigured}>
              {initialSend.isPending ? (
                <><span className="loading-spinner" aria-hidden="true" /> Sending…</>
              ) : !isConfigured ? (
                <>Sending unavailable <LockKeyhole size={14} aria-hidden="true" /></>
              ) : (
                <>Send to Telegram <Send size={15} aria-hidden="true" /></>
              )}
            </Button>
          </form>

          <p className="support-footnote"><LockKeyhole size={13} aria-hidden="true" /> Only these two text fields are sent to the configured chat.</p>
        </article>
      </section>

      <footer className="support-footer"><span>Demo page</span><span>No passwords or account details are requested.</span></footer>
    </main>
  );
}
