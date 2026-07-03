import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import {
  trashOutline, openOutline, checkmarkCircleOutline, createOutline,
} from 'ionicons/icons';
import { toast } from 'react-toastify';
import { loadStudyPlans, saveStudyPlan, deleteStudyPlan } from '../../../services/studyPlannerService';

const PlanTab = ({ highlightPlanId, onStartQuiz }) => {
  const [plans, setPlans] = useState([]);
  const [activePlanId, setActivePlanId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  // Auto-select plan when created from ChatTab
  useEffect(() => {
    if (highlightPlanId) {
      setActivePlanId(highlightPlanId);
      loadPlans();
    }
  }, [highlightPlanId]);

  const loadPlans = async () => {
    const data = await loadStudyPlans();
    setPlans(data);
    if (!activePlanId && data.length > 0) {
      setActivePlanId(highlightPlanId || data[0].id);
    }
    setLoading(false);
  };

  const deletePlan = async (e, planId) => {
    e.stopPropagation();
    await deleteStudyPlan(planId);
    setPlans(prev => prev.filter(p => p.id !== planId));
    if (activePlanId === planId) {
      setActivePlanId(null);
    }
    toast.info('Đã xóa kế hoạch');
  };

  const togglePhaseComplete = async (phaseId) => {
    const plan = plans.find(p => p.id === activePlanId);
    if (!plan) return;

    const updatedPhases = plan.phases.map(phase =>
      phase.id === phaseId ? { ...phase, completed: !phase.completed } : phase
    );
    const updatedPlan = { ...plan, phases: updatedPhases };

    await saveStudyPlan(updatedPlan);
    setPlans(prev => prev.map(p => p.id === activePlanId ? updatedPlan : p));
  };

  const handleQuizClick = (phase) => {
    const plan = plans.find(p => p.id === activePlanId);
    if (!plan) return;
    onStartQuiz?.({
      planId: activePlanId,
      phaseId: phase.id,
      phase,
      planTitle: plan.title,
    });
  };

  const activePlan = plans.find(p => p.id === activePlanId);

  if (loading) {
    return (
      <div className="sp-plans">
        <div className="sp-loading"><div className="sp-spinner" /><p>Đang tải...</p></div>
      </div>
    );
  }

  return (
    <div className="sp-plans">
      {/* Sidebar */}
      <div className="sp-plans-sidebar">
        <div className="sp-sidebar-title">Kế hoạch của bạn</div>
        <div className="sp-plans-list">
          {plans.length === 0 && (
            <div className="sp-sidebar-empty">Chưa có kế hoạch nào. Hãy trò chuyện với AI để tạo!</div>
          )}
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`sp-plan-item ${activePlanId === plan.id ? 'active' : ''}`}
              onClick={() => setActivePlanId(plan.id)}
            >
              <div className="sp-plan-item-title">{plan.title}</div>
              <div className="sp-plan-item-date">
                {new Date(plan.createdAt).toLocaleDateString('vi-VN')}
              </div>
              <button className="sp-delete-btn" onClick={(e) => deletePlan(e, plan.id)}>
                <IonIcon icon={trashOutline} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="sp-plans-main">
        {!activePlan ? (
          <div className="sp-empty">
            <IonIcon icon={createOutline} className="sp-empty-icon" />
            <h3>Chưa có kế hoạch</h3>
            <p>Trò chuyện với AI ở tab Chat để tạo kế hoạch học tập đầu tiên.</p>
          </div>
        ) : (
          <div className="sp-plan-detail">
            <div className="sp-plan-header">
              <h2>{activePlan.title}</h2>
              {activePlan.description && <p className="sp-plan-desc">{activePlan.description}</p>}
              <div className="sp-plan-progress">
                {activePlan.phases.filter(p => p.completed).length}/{activePlan.phases.length} giai đoạn hoàn thành
              </div>
            </div>

            <div className="sp-plan-table-wrap">
              <table className="sp-plan-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Giai đoạn</th>
                    <th>Thời gian</th>
                    <th>Mô tả</th>
                    <th>Chủ đề</th>
                    <th>Tài nguyên</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {activePlan.phases.map((phase) => (
                    <tr key={phase.id} className={`sp-phase-row ${phase.completed ? 'completed' : ''}`}>
                      <td className="sp-phase-num">{phase.id}</td>
                      <td className="sp-phase-name">{phase.name}</td>
                      <td className="sp-phase-duration">{phase.duration}</td>
                      <td className="sp-phase-desc">{phase.description}</td>
                      <td className="sp-phase-topics">
                        <div className="sp-topics">
                          {(phase.topics || []).map((topic, i) => (
                            <span key={i} className="sp-topic-chip">{topic}</span>
                          ))}
                        </div>
                      </td>
                      <td className="sp-phase-resources">
                        <div className="sp-resources">
                          {(phase.resources || []).map((res, i) => (
                            <a
                              key={i}
                              className="sp-resource-chip"
                              href={res.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={res.url}
                            >
                              <IonIcon icon={openOutline} />
                              {res.name || res.url}
                            </a>
                          ))}
                        </div>
                      </td>
                      <td className="sp-check-cell">
                        {!phase.completed ? (
                          <button
                            className="sp-check-btn"
                            onClick={() => togglePhaseComplete(phase.id)}
                            title="Đánh dấu hoàn thành"
                          >
                            ☐
                          </button>
                        ) : (
                          <button
                            className="sp-quiz-trigger"
                            onClick={() => handleQuizClick(phase)}
                            title="Tạo bài kiểm tra"
                          >
                            <IonIcon icon={checkmarkCircleOutline} /> Kiểm tra
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanTab;
