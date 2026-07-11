import React, { useState } from 'react';
import { IonIcon } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { chatbubblesOutline, listOutline, helpCircleOutline } from 'ionicons/icons';
import ChatTab from './tabs/ChatTab';
import PlanTab from './tabs/PlanTab';
import QuizTab from './tabs/QuizTab';
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
    </div>
  );
};

export default StudyPlanner;
