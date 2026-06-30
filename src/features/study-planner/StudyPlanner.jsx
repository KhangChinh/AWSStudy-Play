import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { chatbubblesOutline, listOutline, helpCircleOutline, settingsOutline, closeOutline, saveOutline } from 'ionicons/icons';
import { toast } from 'react-toastify';
import ChatTab from './tabs/ChatTab';
import PlanTab from './tabs/PlanTab';
import QuizTab from './tabs/QuizTab';
import { loadStudySettings, saveStudySettings } from '../../services/studyPlannerService';
import './StudyPlanner.scss';

const StudyPlanner = () => {
  const { t } = useTranslation();

  const TABS = [
    { id: 'chat', label: t('study.ai_chat'), icon: chatbubblesOutline },
    { id: 'plan', label: t('study.plan'), icon: listOutline },
    { id: 'quiz', label: t('study.quiz'), icon: helpCircleOutline },
  ];

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
    const settings = await loadStudySettings();
    if (settings) {
      setSettings(settings);
    }
  };

  const handleSaveSettings = async () => {
    const res = await saveStudySettings(settings);
    if (res?.success) {
      toast.success(t('study.save_success'));
      setShowSettings(false);
    } else {
      toast.error(t('study.save_error'));
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
              <h3>{t('study.ai_settings')}</h3>
              <button className="sp-close-btn" onClick={() => setShowSettings(false)}>
                <IonIcon icon={closeOutline} />
              </button>
            </div>
            
            <div className="sp-settings-body">
              <div className="sp-form-group">
                <label>{t('study.ai_provider')}</label>
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
                  <label>{t('study.api_key')}</label>
                  <input
                    type="password"
                    placeholder={t('study.api_key_placeholder')}
                    value={settings.geminiKey}
                    onChange={(e) => setSettings({ ...settings, geminiKey: e.target.value })}
                  />
                  <small className="sp-hint">{t('study.api_key_hint')}</small>
                </div>
              )}
            </div>

            <div className="sp-settings-footer">
              <button className="sp-btn-cancel" onClick={() => setShowSettings(false)}>
                {t('common.cancel')}
              </button>
              <button className="sp-btn-save" onClick={handleSaveSettings}>
                <IonIcon icon={saveOutline} /> {t('study.save_settings')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlanner;
