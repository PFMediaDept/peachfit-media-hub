import { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const GREEN = '#37CA37';
const CARD = '#141414';
const BORDER = '#2A2A2A';
const WHITE = '#FFFFFF';

const TOUR_STEPS = [
  {
    title: 'Welcome to the PeachFit Media Hub',
    body: 'This is your department command center. Everything you need -- tasks, calendar, pipeline, SOPs -- lives here. Let me show you around.',
    route: '/dashboard',
    highlight: null,
    position: 'center',
  },
  {
    title: 'Your Dashboard',
    body: 'This is your home base. You\'ll see your task count, upcoming deadlines, pipeline health, and active SOB campaigns at a glance. Check here every morning.',
    route: '/dashboard',
    highlight: null,
    position: 'center',
  },
  {
    title: 'My Tasks',
    body: 'Everything assigned to you shows up here -- tasks, subtasks, editor assignments. This is your daily to-do list. Check it first thing every morning and before your EOD.',
    route: '/my-tasks',
    highlight: null,
    position: 'center',
  },
  {
    title: 'Content Calendar',
    body: 'See what\'s publishing and when across all branches. Color-coded by status. You can filter by branch, content type, and view by month or week. SOB posts show their CTA keyword in the title.',
    route: '/calendar',
    highlight: null,
    position: 'center',
  },
  {
    title: 'Pipeline Board',
    body: 'This is where content moves through production. Each branch has its own pipeline with custom statuses. Drag tasks between columns to update their status. Click any task for the full detail view.',
    route: null,
    highlight: null,
    position: 'center',
    note: 'You\'ll find your branch pipeline in the sidebar under "My Branches".',
  },
  {
    title: 'Task Detail View',
    body: 'When you click any task, you\'ll see everything: status, assignee, priority, due date, subtasks with color-coded checklists, comments, file attachments, and links. Update your subtasks as you complete them.',
    route: null,
    highlight: null,
    position: 'center',
  },
  {
    title: 'Notifications',
    body: 'The bell icon in the top right shows your notifications. You\'ll also get a Slack DM anytime you\'re assigned to a task, subtask, or editor role. Don\'t miss assignments.',
    route: null,
    highlight: null,
    position: 'center',
  },
  {
    title: 'SOPs & Training',
    body: 'Each branch has its own SOPs and training materials with Loom videos embedded inline. If you don\'t know how to do something, check your branch\'s SOPs first.',
    route: null,
    highlight: null,
    position: 'center',
    note: 'Find SOPs under your branch in the sidebar.',
  },
  {
    title: 'Department Standards',
    body: 'Communication rules, SLAs, brand specs, and quick links are all accessible from the sidebar. These are non-negotiable. Review them and know them.',
    route: '/standards',
    highlight: null,
    position: 'center',
  },
  {
    title: 'You\'re All Set',
    body: 'That\'s the Hub. Your daily workflow: check Dashboard and My Tasks every morning, update your subtasks as you work, post your EOD at end of day. If you have questions, ask in Slack. Welcome to the team.',
    route: '/dashboard',
    highlight: null,
    position: 'center',
  },
];

export default function WelcomeTour() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    const key = `pf-tour-done-${profile.id}`;
    const done = localStorage.getItem(key);
    if (!done) {
      setVisible(true);
    }
  }, [profile]);

  function next() {
    if (step >= TOUR_STEPS.length - 1) {
      complete();
      return;
    }
    const nextStep = step + 1;
    setStep(nextStep);
    if (TOUR_STEPS[nextStep].route && location.pathname !== TOUR_STEPS[nextStep].route) {
      navigate(TOUR_STEPS[nextStep].route);
    }
  }

  function prev() {
    if (step <= 0) return;
    const prevStep = step - 1;
    setStep(prevStep);
    if (TOUR_STEPS[prevStep].route && location.pathname !== TOUR_STEPS[prevStep].route) {
      navigate(TOUR_STEPS[prevStep].route);
    }
  }

  function complete() {
    const key = `pf-tour-done-${profile?.id}`;
    localStorage.setItem(key, 'true');
    setVisible(false);
    navigate('/dashboard');
  }

  function skip() {
    complete();
  }

  if (!visible || dismissed) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Progress bar */}
        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }} />
        </div>

        {/* Step counter */}
        <div style={styles.stepCounter}>
          {step + 1} of {TOUR_STEPS.length}
        </div>

        {/* Content */}
        <div style={styles.content}>
          <h2 style={styles.title}>{current.title}</h2>
          <p style={styles.body}>{current.body}</p>
          {current.note && (
            <div style={styles.note}>
              <span style={{ marginRight: 6 }}>💡</span>
              {current.note}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={skip} style={styles.skipBtn}>
            {isLast ? '' : 'Skip tour'}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button onClick={prev} style={styles.backBtn}>Back</button>
            )}
            <button onClick={next} style={styles.nextBtn}>
              {isLast ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Outfit, Arial, sans-serif',
  },
  modal: {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    width: '90%',
    maxWidth: 520,
    boxShadow: '0 24px 64px rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  progressBar: {
    height: 3,
    background: BORDER,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    background: GREEN,
    transition: 'width 0.3s ease',
    borderRadius: 3,
  },
  stepCounter: {
    padding: '12px 24px 0',
    fontSize: 11,
    color: '#6B7280',
    fontWeight: 600,
  },
  content: {
    padding: '16px 24px 20px',
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: WHITE,
    margin: '0 0 10px',
    lineHeight: 1.3,
  },
  body: {
    fontSize: 14,
    color: '#D1D5DB',
    margin: '0 0 12px',
    lineHeight: 1.6,
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    background: 'rgba(55, 202, 55, 0.08)',
    border: `1px solid rgba(55, 202, 55, 0.2)`,
    borderRadius: 8,
    padding: '10px 12px',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px 20px',
    borderTop: `1px solid ${BORDER}`,
  },
  skipBtn: {
    background: 'transparent',
    border: 'none',
    color: '#6B7280',
    fontSize: 12,
    cursor: 'pointer',
    padding: '6px 0',
  },
  backBtn: {
    background: 'transparent',
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    color: '#9CA3AF',
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  nextBtn: {
    background: GREEN,
    border: 'none',
    borderRadius: 8,
    color: '#000',
    padding: '8px 20px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  },
};
