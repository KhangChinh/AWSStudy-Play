import React, { useState, useEffect, useRef, useCallback } from 'react';
import { IonIcon } from '@ionic/react';
import {
  addOutline, sendOutline, trashOutline, rocketOutline, chatbubbleEllipsesOutline,
} from 'ionicons/icons';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { loadChatSessions, saveChatSession, deleteChatSession, saveStudyPlan } from '../../../services/studyPlannerService';

const ChatTab = ({ onPlanCreated }) => {
  const { t, i18n } = useTranslation();
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [collectedInfo, setCollectedInfo] = useState({});
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const messagesEndRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    const data = await loadChatSessions();
    setChatSessions(data);
  };

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startNewChat = () => {
    const id = `chat_${Date.now()}`;
    const newSession = {
      id,
      title: t('study.new_chat'),
      messages: [],
      collectedInfo: {},
      readyToGenerate: false,
      createdAt: Date.now(),
    };
    setChatSessions(prev => [newSession, ...prev]);
    setActiveChatId(id);
    setMessages([]);
    setCollectedInfo({});
    setReadyToGenerate(false);
  };

  const selectChat = (chatId) => {
    setActiveChatId(chatId);
    const session = chatSessions.find(c => c.id === chatId);
    if (session) {
      setMessages(session.messages || []);
      setCollectedInfo(session.collectedInfo || {});
      setReadyToGenerate(session.readyToGenerate || false);
    }
  };

  const deleteChat = async (e, chatId) => {
    e.stopPropagation();
    await deleteChatSession(chatId);
    setChatSessions(prev => prev.filter(c => c.id !== chatId));
    if (activeChatId === chatId) {
      setActiveChatId(null);
      setMessages([]);
      setCollectedInfo({});
      setReadyToGenerate(false);
    }
  };

  const saveCurrentChat = useCallback(async (msgs, info, ready) => {
    if (!activeChatId || !window.api?.invoke) return;
    const session = chatSessions.find(c => c.id === activeChatId) || {};
    // Tự động đặt title từ tin nhắn đầu tiên
    let title = session.title || t('study.new_chat');
    if (msgs.length > 0 && title === t('study.new_chat')) {
      title = msgs[0].content.substring(0, 40) + (msgs[0].content.length > 40 ? '...' : '');
    }
    const updated = {
      ...session,
      id: activeChatId,
      title,
      messages: msgs,
      collectedInfo: info,
      readyToGenerate: ready,
      createdAt: session.createdAt || Date.now(),
    };
    await saveChatSession(updated);
    setChatSessions(prev => {
      const idx = prev.findIndex(c => c.id === activeChatId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });
  }, [activeChatId, chatSessions]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    if (!activeChatId) {
      startNewChat();
      // Wait for state update, then send
      setTimeout(() => handleSendWithContent(input.trim()), 100);
      return;
    }
    await handleSendWithContent(input.trim());
  };

  const handleSendWithContent = async (content) => {
    const userMsg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      // Prepare messages for AI (only role + content)
      const aiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      const result = await window.api.invoke('study:chat', { messages: aiMessages });

      if (result?.success) {
        const assistantMsg = { role: 'assistant', content: result.reply };
        const updatedMessages = [...newMessages, assistantMsg];
        setMessages(updatedMessages);

        // Merge collected info
        const mergedInfo = { ...collectedInfo };
        if (result.collectedInfo) {
          for (const [key, val] of Object.entries(result.collectedInfo)) {
            if (val && val !== '') mergedInfo[key] = val;
          }
        }
        setCollectedInfo(mergedInfo);
        setReadyToGenerate(result.readyToGenerate || false);

        // Save to store
        await saveCurrentChat(updatedMessages, mergedInfo, result.readyToGenerate || false);
      } else {
        toast.error(result?.error || t('study.ai_no_response'));
      }
    } catch (err) {
      toast.error(t('study.ai_connection_error', { message: err.message }));
    }
    setSending(false);
  };

  const handleGeneratePlan = async () => {
    if (generating) return;
    setGenerating(true);

    try {
      const result = await window.api.invoke('study:generatePlan', { collectedInfo });
      if (result?.success && result.plan) {
        const planId = `plan_${Date.now()}`;
        const plan = {
          id: planId,
          ...result.plan,
          fromChatId: activeChatId,
          createdAt: Date.now(),
        };
        // Use service function so Redux is updated → PlanTab sees the plan immediately
        await saveStudyPlan(plan);
        toast.success(t('study.plan_created'));
        onPlanCreated?.(planId);
      } else {
        toast.error(result?.error || t('study.plan_create_failed'));
      }
    } catch (err) {
      toast.error(t('study.plan_create_error', { message: err.message }));
    }
    setGenerating(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="sp-chat">
      {/* Sidebar */}
      <div className="sp-chat-sidebar">
        <button className="sp-new-chat-btn" onClick={startNewChat}>
          <IonIcon icon={addOutline} /> {t('study.new_chat')}
        </button>
        <div className="sp-chat-list">
          {chatSessions.map(session => (
            <div
              key={session.id}
              className={`sp-chat-item ${activeChatId === session.id ? 'active' : ''}`}
              onClick={() => selectChat(session.id)}
            >
              <div className="sp-chat-item-title">{session.title}</div>
              <div className="sp-chat-item-date">
                {new Date(session.createdAt).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
              </div>
              <button className="sp-chat-delete" onClick={(e) => deleteChat(e, session.id)}>
                <IonIcon icon={trashOutline} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="sp-chat-main">
        {!activeChatId ? (
          <div className="sp-empty">
            <IonIcon icon={chatbubbleEllipsesOutline} className="sp-empty-icon" />
            <h3>{t('study.ai_study_assistant')}</h3>
            <p>{t('study.ai_study_assistant_desc')}</p>
            <button className="sp-start-btn" onClick={startNewChat}>{t('study.start_chat')}</button>
          </div>
        ) : (
          <>
            <div className="sp-messages">
              {messages.length === 0 && (
                <div className="sp-msg assistant">
                  <div className="sp-msg-content">
                    {t('study.chat_welcome')}
                  </div>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`sp-msg ${msg.role}`}>
                  <div className="sp-msg-content">{msg.content}</div>
                </div>
              ))}
              {sending && (
                <div className="sp-msg assistant">
                  <div className="sp-msg-content sp-typing">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {readyToGenerate && (
              <button
                className="sp-generate-btn"
                onClick={handleGeneratePlan}
                disabled={generating}
              >
                {generating ? (
                  <><span className="sp-spin" /> {t('study.generating_plan')}</>
                ) : (
                  <><IonIcon icon={rocketOutline} /> {t('study.generate_study_plan')}</>
                )}
              </button>
            )}

            <div className="sp-input-area">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={t('study.message_placeholder')}
                rows={1}
                disabled={sending}
              />
              <button
                className="sp-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                <IonIcon icon={sendOutline} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatTab;
