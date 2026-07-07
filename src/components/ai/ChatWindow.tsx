import {

  useCallback,

  useEffect,

  useMemo,

  useRef,

  useState,

  type FormEvent,

  type KeyboardEvent,

} from "react";

import type { ConciergeKnowledge } from "../../services/ai/cmsKnowledge";

import { readGuestProfile, suggestInputChips } from "../../services/ai/personality";

import { getVisibleMessages, isMessageStreaming } from "../../services/conversation";

import type { ChatMessage } from "../../services/conversation";

import type { CheffyChatView } from "./CheffyContext";

import { ChatHome } from "./ChatHome";

import { ConversationEmptyState } from "./ConversationEmptyState";

import { DynamicTypingIndicator } from "./DynamicTypingIndicator";

import { MessageBubble } from "./MessageBubble";

import { QuickActionChips } from "./QuickActionChips";

import { useAutoScroll } from "./hooks/useAutoScroll";



type ChatWindowProps = {

  chatView: CheffyChatView;

  messages: ChatMessage[];

  isThinking: boolean;

  isBusy: boolean;

  knowledge: ConciergeKnowledge | null;

  onSend: (text: string) => void;

  onClose: () => void;

  onGoHome: () => void;

  onContinue: () => void;

  onNewChat: () => void;

  onClear: () => void;

  onNavigate: (path: string) => void;

  onSwitchLocation?: (locationId: string) => void;

};



function userMessageBefore(messages: ChatMessage[], assistantId: string): string {

  const idx = messages.findIndex((m) => m.id === assistantId);

  if (idx <= 0) return "";

  for (let i = idx - 1; i >= 0; i -= 1) {

    if (messages[i].role === "user") return messages[i].content;

  }

  return "";

}



function latestUserMessage(messages: ChatMessage[]): string {

  for (let i = messages.length - 1; i >= 0; i -= 1) {

    if (messages[i].role === "user") return messages[i].content;

  }

  return "";

}



export function ChatWindow({

  chatView,

  messages,

  isThinking,

  isBusy,

  knowledge,

  onSend,

  onClose,

  onGoHome,

  onContinue,

  onNewChat,

  onClear,

  onNavigate,

  onSwitchLocation,

}: ChatWindowProps) {

  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);



  const visibleMessages = useMemo(() => getVisibleMessages(messages), [messages]);

  const pendingUserMessage = useMemo(() => latestUserMessage(messages), [messages]);

  const inputChips = useMemo(
    () => suggestInputChips(pendingUserMessage, readGuestProfile(), knowledge),
    [pendingUserMessage, knowledge, messages],
  );



  useAutoScroll(

    scrollRef,

    [visibleMessages, isThinking, isBusy, chatView],

    chatView === "conversation",

  );



  useEffect(() => {

    if (chatView === "conversation") {

      inputRef.current?.focus();

    }

  }, [chatView]);



  useEffect(() => {

    const handler = (e: globalThis.KeyboardEvent) => {

      if (e.key === "Escape") {

        onClose();

        return;

      }

      if (e.key === "Tab" && panelRef.current) {

        const focusables = panelRef.current.querySelectorAll<HTMLElement>(

          'button, textarea, a[href], input, [tabindex]:not([tabindex="-1"])',

        );

        if (focusables.length === 0) return;

        const first = focusables[0];

        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {

          e.preventDefault();

          last.focus();

        } else if (!e.shiftKey && document.activeElement === last) {

          e.preventDefault();

          first.focus();

        }

      }

    };

    document.addEventListener("keydown", handler);

    return () => document.removeEventListener("keydown", handler);

  }, [onClose]);



  const submit = useCallback(

    (text: string) => {

      const trimmed = text.trim();

      if (!trimmed || isBusy) return;

      onSend(trimmed);

      setInput("");

    },

    [isBusy, onSend],

  );



  const handleSubmit = (e: FormEvent) => {

    e.preventDefault();

    submit(input);

  };



  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {

    if (e.key === "Enter" && !e.shiftKey) {

      e.preventDefault();

      submit(input);

    }

  };



  const locationName = knowledge?.locationName ?? "this location";



  return (

    <div

      className="cheffy-chat"

      role="dialog"

      aria-modal="false"

      aria-label="Cheffy, your AI restaurant assistant"

      ref={panelRef}

    >

      <header className="cheffy-chat__header">

        <div className="cheffy-chat__header-left">

          {chatView === "conversation" && (

            <button

              type="button"

              className="cheffy-chat__back"

              onClick={onGoHome}

              aria-label="Back to home"

            >

              ← Home

            </button>

          )}

          <div className="cheffy-chat__id">

            <span className="cheffy-chat__avatar" aria-hidden="true">

              <img src="/cheffy/cheffy-mascot.png" alt="" />

            </span>

            <span className="cheffy-chat__titles">

              <strong>Cheffy</strong>

              <small>Your AI Restaurant Assistant</small>

              <span className="cheffy-chat__powered">Powered by Chefgaa</span>

            </span>

          </div>

        </div>

        <div className="cheffy-chat__header-right">

          <span className="cheffy-chat__location-badge" title="Current location">

            📍 {locationName}

          </span>

          <button

            type="button"

            className="cheffy-chat__close"

            onClick={onClose}

            aria-label="Close chat"

          >

            ×

          </button>

        </div>

      </header>



      {chatView === "home" ? (

        <ChatHome

          messages={messages}

          knowledge={knowledge}

          isBusy={isBusy}

          onSelectPrompt={submit}

          onContinue={onContinue}

          onNewChat={onNewChat}

          onClear={onClear}

        />

      ) : (

        <>

          <div className="cheffy-chat__scroll" ref={scrollRef}>

            {visibleMessages.length === 0 && !isThinking && (

              <ConversationEmptyState

                knowledge={knowledge}

                onSelectPrompt={submit}

                isBusy={isBusy}

              />

            )}



            {visibleMessages.map((msg) => {

              if (

                msg.role === "assistant" &&

                !msg.content &&

                (msg.status === "pending" || msg.status === "streaming")

              ) {

                return (

                  <div key={msg.id} className="cheffy-msg cheffy-msg--assistant">

                    <DynamicTypingIndicator userMessage={pendingUserMessage} />

                  </div>

                );

              }



              return (

                <MessageBubble

                  key={msg.id}

                  content={msg.content}

                  role={msg.role as "user" | "assistant"}

                  status={msg.status}

                  actions={msg.actions}

                  userMessage={

                    msg.role === "assistant" ? userMessageBefore(messages, msg.id) : undefined

                  }

                  knowledge={knowledge}

                  onNavigate={onNavigate}

                  onSwitchLocation={onSwitchLocation}

                  onFollowUp={submit}

                  isBusy={isBusy}

                />

              );

            })}



            {isThinking &&

              !visibleMessages.some(

                (m) => m.role === "assistant" && isMessageStreaming(m) && !m.content,

              ) && (

                <div className="cheffy-msg cheffy-msg--assistant">

                  <DynamicTypingIndicator userMessage={pendingUserMessage} />

                </div>

              )}

          </div>



          <QuickActionChips onSelect={submit} disabled={isBusy} chips={inputChips} />



          <form className="cheffy-chat__form" onSubmit={handleSubmit}>

            <textarea

              ref={inputRef}

              className="cheffy-chat__input"

              value={input}

              onChange={(e) => setInput(e.target.value)}

              onKeyDown={handleKeyDown}

              placeholder="Ask Cheffy about menu, offers, hours…"

              rows={1}

              aria-label="Message Cheffy"

              disabled={isBusy}

            />

            <button

              type="submit"

              className="cheffy-chat__send"

              disabled={!input.trim() || isBusy}

              aria-label="Send message"

            >

              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">

                <path

                  fill="currentColor"

                  d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a1 1 0 00-1.39 1.2l2.06 6.18a1 1 0 00.86.68l8.07.94-8.07.94a1 1 0 00-.86.68L2.01 19.2a1 1 0 001.39 1.2z"

                />

              </svg>

            </button>

          </form>

        </>

      )}

    </div>

  );

}


