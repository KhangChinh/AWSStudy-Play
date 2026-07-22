import React, { useState, useEffect } from 'react';
import { IonIcon } from '@ionic/react';
import {
  trashOutline, chevronBackOutline, chevronForwardOutline,
  checkmarkCircleOutline, closeCircleOutline, trophyOutline,
  helpCircleOutline,
} from 'ionicons/icons';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { loadQuizHistory, saveQuizResult, deleteQuizResult } from '../../../services/studyPlannerService';
import { submitQuizReward } from '../../../services/questService';
import { ingestServerData } from '../../../services/syncService';

const QuizTab = ({ quizRequest, onClearRequest }) => {
  const { t, i18n } = useTranslation();
  const [quizzes, setQuizzes] = useState([]);
  const [activeQuizId, setActiveQuizId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quizMeta, setQuizMeta] = useState(null); // { planTitle, phaseName }

  useEffect(() => {
    loadQuizzes();
  }, []);

  // Handle quiz request from PlanTab
  useEffect(() => {
    if (quizRequest) {
      handleGenerateQuiz(quizRequest);
      onClearRequest?.();
    }
  }, [quizRequest]);

  const loadQuizzes = async () => {
    const data = await loadQuizHistory();
    setQuizzes(data);
    setLoading(false);
  };

  const handleGenerateQuiz = async (request) => {
    setGenerating(true);
    setActiveQuizId(null);
    setQuestions([]);
    setUserAnswers({});
    setSubmitted(false);
    setCurrentQ(0);
    setQuizMeta({ planTitle: request.planTitle, phaseName: request.phase.name });

    try {
      const result = await window.api.invoke('study:generateQuiz', {
        phase: request.phase,
        planTitle: request.planTitle,
      });

      if (result?.success && result.questions?.length > 0) {
        const quizId = `quiz_${Date.now()}`;
        setActiveQuizId(quizId);
        setQuestions(result.questions);
      } else {
        toast.error(result?.error || t('study.quiz_create_failed'));
      }
    } catch (err) {
      toast.error(t('study.quiz_create_error', { message: err.message }));
    }
    setGenerating(false);
  };

  const selectQuiz = (quiz) => {
    setActiveQuizId(quiz.id);
    setQuestions(quiz.questions || []);
    setUserAnswers(quiz.userAnswers || {});
    setSubmitted(true);
    setCurrentQ(0);
    setQuizMeta({ planTitle: quiz.planTitle, phaseName: quiz.phaseName });
  };

  const deleteQuiz = async (e, quizId) => {
    e.stopPropagation();
    await deleteQuizResult(quizId);
    setQuizzes(prev => prev.filter(q => q.id !== quizId));
    if (activeQuizId === quizId) {
      setActiveQuizId(null);
      setQuestions([]);
      setUserAnswers({});
      setSubmitted(false);
    }
  };

  const handleAnswer = (questionId, answer) => {
    if (submitted) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (Object.keys(userAnswers).length < questions.length) {
      toast.warning(t('study.answer_all_questions'));
      return;
    }
    setSubmitted(true);
    setCurrentQ(0);

    // Calculate score
    let correct = 0;
    for (const q of questions) {
      if (userAnswers[q.id] === q.correctAnswer) correct++;
    }

    const quizResult = {
      id: activeQuizId,
      planTitle: quizMeta?.planTitle || '',
      phaseName: quizMeta?.phaseName || '',
      questions,
      userAnswers,
      score: correct,
      total: questions.length,
      createdAt: Date.now(),
    };

    await saveQuizResult(quizResult);
    setQuizzes(prev => [quizResult, ...prev.filter(q => q.id !== activeQuizId)]);

    // Call API for rewards
    const rewardResult = await submitQuizReward(correct, questions.length);
    if (rewardResult && rewardResult.success) {
      if (rewardResult.profile || rewardResult.daily) {
        ingestServerData({
          profile: rewardResult.profile,
          daily: rewardResult.daily
        });
      }
    }

  };

  const currentQuestion = questions[currentQ];
  const score = submitted || (quizMeta && quizzes.find(q => q.id === activeQuizId)?.score !== undefined)
    ? questions.reduce((acc, q) => acc + (userAnswers[q.id] === q.correctAnswer ? 1 : 0), 0)
    : null;

  return (
    <div className="sp-quiz">
      {/* Sidebar */}
      <div className="sp-quiz-sidebar">
        <div className="sp-sidebar-title">{t('study.quiz_history')}</div>
        <div className="sp-quiz-list">
          {quizzes.length === 0 && !generating && (
            <div className="sp-sidebar-empty">{t('study.no_quizzes')}</div>
          )}
          {quizzes.map(quiz => (
            <div
              key={quiz.id}
              className={`sp-quiz-item ${activeQuizId === quiz.id ? 'active' : ''}`}
              onClick={() => selectQuiz(quiz)}
            >
              <div className="sp-quiz-item-info">
                <div className="sp-quiz-item-title">{quiz.phaseName}</div>
                <div className="sp-quiz-item-date">
                  {new Date(quiz.createdAt).toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                </div>
              </div>
              <div className="sp-quiz-item-score">
                <span className={`sp-score-badge ${quiz.score >= quiz.total * 0.7 ? 'good' : 'low'}`}>
                  {quiz.score}/{quiz.total}
                </span>
              </div>
              <button className="sp-delete-btn" onClick={(e) => deleteQuiz(e, quiz.id)}>
                <IonIcon icon={trashOutline} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="sp-quiz-main">
        {generating && (
          <div className="sp-loading">
            <div className="sp-spinner" />
            <p>{t('study.generating_quiz')}</p>
          </div>
        )}

        {!generating && questions.length === 0 && (
          <div className="sp-empty">
            <IonIcon icon={helpCircleOutline} className="sp-empty-icon" />
            <h3>{t('study.knowledge_check')}</h3>
            <p>{t('study.knowledge_check_desc')}</p>
          </div>
        )}

        {!generating && questions.length > 0 && currentQuestion && (
          <div className="sp-quiz-active">
            <div className="sp-quiz-header">
              <h3>{quizMeta?.phaseName}</h3>
              <span className="sp-quiz-counter">{t('study.question_counter', { current: currentQ + 1, total: questions.length })}</span>
            </div>

            {submitted && score !== null && (
              <div className="sp-quiz-score-banner">
                <IonIcon icon={trophyOutline} className="sp-trophy" style={{ color: '#fbbf24', marginRight: '8px' }} />
                <span>{t('study.your_score')}: <strong>{score}/{questions.length}</strong></span>
              </div>
            )}

            <div className="sp-quiz-progress-bar">
              <div
                className="sp-quiz-progress-fill"
                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              />
            </div>

            <div className="sp-quiz-question">
              {currentQuestion.question}
            </div>

            <div className="sp-quiz-options">
              {currentQuestion.options.map((option, idx) => {
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                const isSelected = userAnswers[currentQuestion.id] === letter;
                const isCorrectAnswer = currentQuestion.correctAnswer === letter;
                
                let optionClass = '';
                if (submitted) {
                  if (isCorrectAnswer) optionClass = 'correct';
                  else if (isSelected && !isCorrectAnswer) optionClass = 'wrong';
                } else {
                  if (isSelected) optionClass = 'selected';
                }

                return (
                  <button
                    key={idx}
                    className={`sp-option ${optionClass} ${submitted ? 'disabled' : ''}`}
                    onClick={() => handleAnswer(currentQuestion.id, letter)}
                    disabled={submitted}
                  >
                    <span className="sp-option-letter">{letter}</span>
                    <span className="sp-option-label">{option.replace(/^[A-D]\.\s*/, '')}</span>
                    {submitted && isCorrectAnswer && <IonIcon icon={checkmarkCircleOutline} className="sp-option-marker" />}
                    {submitted && isSelected && !isCorrectAnswer && <IonIcon icon={closeCircleOutline} className="sp-option-marker" />}
                  </button>
                );
              })}
            </div>

            <div className="sp-quiz-nav">
              <button
                className="sp-quiz-nav-btn"
                disabled={currentQ === 0}
                onClick={() => setCurrentQ(prev => prev - 1)}
              >
                <IonIcon icon={chevronBackOutline} /> {t('study.previous')}
              </button>
              <span className="sp-quiz-page-info">{currentQ + 1} / {questions.length}</span>
              {currentQ < questions.length - 1 ? (
                <button
                  className="sp-quiz-nav-btn"
                  onClick={() => setCurrentQ(prev => prev + 1)}
                >
                  {t('study.next')} <IonIcon icon={chevronForwardOutline} />
                </button>
              ) : (
                !submitted && (
                  <button
                    className="sp-quiz-submit"
                    onClick={handleSubmit}
                  >
                    <IonIcon icon={checkmarkCircleOutline} /> {t('study.complete')}
                  </button>
                )
              )}
            </div>
          </div>
        )}

        {/* The sp-quiz-results view has been removed as per user request to show results in the interactive block */}
      </div>
    </div>
  );
};

export default QuizTab;
