import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import { chatbubblesOutline, listOutline, helpCircleOutline, settingsOutline, closeOutline, saveOutline } from 'ionicons/icons';
import { toast } from 'react-toastify';
import ChatTab from './tabs/ChatTab';
import PlanTab from './tabs/PlanTab';
import QuizTab from './tabs/QuizTab';
import './StudyPlanner.scss';

const TABS = [
  { id: 'chat', label: 'AI Chat', icon: chatbubblesOutline },
  { id: 'plan', label: 'Kế hoạch', icon: listOutline },
  { id: 'quiz', label: 'Kiểm tra', icon: helpCircleOutline },
];

const StudyPlanner = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [switchToPlan, setSwitchToPlan] = useState(null);
  const [switchToQuiz, setSwitchToQuiz] = useState(null);

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({ aiProvider: 'ollama', geminiKey: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (window.api?.invoke) {
      const res = await window.api.invoke('study:loadSettings');
      if (res?.success && res.data) {
        setSettings(res.data);
      }
    }
  };

  const handleSaveSettings = async () => {
    if (window.api?.invoke) {
      const res = await window.api.invoke('study:saveSettings', settings);
      if (res?.success) {
        toast.success('Đã lưu cấu hình AI!');
        setShowSettings(false);
      } else {
        toast.error('Lỗi khi lưu cấu hình');
      }
    }
  };

  const handlePlanCreated = (planId) => {
    setSwitchToPlan(planId);
    setActiveTab('plan');
  };

  const handleStartQuiz = (quizRequest) => {
    setSwitchToQuiz(quizRequest);
    setActiveTab('quiz');
  };

  return (
    <div className="study-planner">
      <div className="sp-tab-bar">
        <div className="sp-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`sp-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <IonIcon icon={tab.icon} />
              {tab.label}
            </button>
          ))}
        </div>
        <button className="sp-settings-btn" onClick={() => setShowSettings(true)}>
          <IonIcon icon={settingsOutline} />
        </button>
      </div>

      <div className="sp-tab-content">
        {activeTab === 'chat' && (
          <ChatTab onPlanCreated={handlePlanCreated} />
        )}
        {activeTab === 'plan' && (
          <PlanTab highlightPlanId={switchToPlan} onStartQuiz={handleStartQuiz} />
        )}
        {activeTab === 'quiz' && (
          <QuizTab quizRequest={switchToQuiz} onClearRequest={() => setSwitchToQuiz(null)} />
        )}
      </div>

      {showSettings && (
        <div className="sp-settings-overlay">
          <div className="sp-settings-modal">
            <div className="sp-settings-header">
              <h3>Cài đặt AI</h3>
              <button className="sp-close-btn" onClick={() => setShowSettings(false)}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>
            
            <div className="sp-settings-body">
              <div className="sp-form-group">
                <label>Nhà cung cấp AI</label>
                <div className="sp-provider-toggle">
                  <button
                    className={settings.aiProvider === 'ollama' ? 'active' : ''}
                    onClick={() => setSettings({ ...settings, aiProvider: 'ollama' })}
                  >
                    Ollama (Local)
                  </button>
                  <button
                    className={settings.aiProvider === 'gemini' ? 'active' : ''}
                    onClick={() => setSettings({ ...settings, aiProvider: 'gemini' })}
                  >
                    Gemini API (Cloud)
                  </button>
                </div>
              </div>

              {settings.aiProvider === 'gemini' && (
                <div className="sp-form-group sp-fade-in">
                  <label>Gemini API Key</label>
                  <input
                    type="password"
                    placeholder="Nhập API Key của Google Gemini..."
                    value={settings.geminiKey}
                    onChange={(e) => setSettings({ ...settings, geminiKey: e.target.value })}
                  />
                  <small className="sp-hint">Lấy key miễn phí tại Google AI Studio</small>
                </div>
              )}
            </div>

            <div className="sp-settings-footer">
              <button className="sp-btn-cancel" onClick={() => setShowSettings(false)}>
                Hủy
              </button>
              <button className="sp-btn-save" onClick={handleSaveSettings}>
                <IonIcon icon={saveOutline} /> Lưu cài đặt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlanner;
