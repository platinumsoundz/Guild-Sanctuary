'use client';

import { useMemo, useState } from 'react';
import {
  createSelfDiscoveryReflection,
  createPersonalizedLearningPlan,
  SELF_DISCOVERY_QUESTIONS,
  type SelfDiscoveryAnswers,
} from '../reflection';
import styles from './SelfDiscoveryCentre.module.css';

export function SelfDiscoveryCentre() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SelfDiscoveryAnswers>({});
  const [hasFinished, setHasFinished] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [exportStatus, setExportStatus] = useState<'idle' | 'ready' | 'failed'>('idle');
  const question = SELF_DISCOVERY_QUESTIONS[step];
  const answer = answers[question.id];
  const answeredCount = Object.keys(answers).length;
  const reflection = useMemo(
    () => (hasFinished ? createSelfDiscoveryReflection(answers) : null),
    [answers, hasFinished],
  );
  const learningPlan = useMemo(
    () => (hasFinished ? createPersonalizedLearningPlan(answers) : null),
    [answers, hasFinished],
  );

  const clearFeedback = () => {
    setCopyStatus('idle');
    setExportStatus('idle');
  };

  const closeAndClear = () => {
    clearFeedback();
    setIsOpen(false);
    setAnswers({});
    setStep(0);
    setHasFinished(false);
  };

  const chooseAnswer = (value: string) => {
    clearFeedback();
    setAnswers((current) => ({ ...current, [question.id]: value }));
  };

  const copyJournalPrompt = async () => {
    if (!reflection) return;
    try {
      await navigator.clipboard.writeText(reflection.journalPrompt);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };

  const downloadReflection = () => {
    if (!reflection) return;
    try {
      const content = [
        'The Sanctuary — Personal Reflection',
        `Created on: ${new Date().toLocaleDateString()}`,
        `Answers included: ${reflection.answeredCount} of ${reflection.totalQuestions}`,
        '',
        'A pattern to consider',
        reflection.pattern,
        '',
        'One small experiment',
        reflection.practicalAction,
        '',
        'A little lesson',
        reflection.microLesson,
        '',
        'A question for your journal',
        reflection.journalPrompt,
        '',
        reflection.disclaimer,
        '',
        'This file was created on your device at your request. Store or share it only where you feel comfortable.',
      ].join('\n');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sanctuary-reflection-${new Date().toISOString().slice(0, 10)}.txt`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportStatus('ready');
    } catch {
      setExportStatus('failed');
    }
  };
  const restart = () => {
    setCopyStatus('idle');
    setExportStatus('idle');
    setStep(0);
    setAnswers({});
    setHasFinished(false);
    setIsOpen(true);
  };

  if (!isOpen) {
    return (
      <section className={styles.card} aria-labelledby="self-discovery-heading">
        <div className={styles.introIcon} aria-hidden="true">✦</div>
        <p className={styles.eyebrow}>A MOMENT FOR YOU</p>
        <span className="ai-tag">Guided self-reflection</span>
        <h2 id="self-discovery-heading">Self-discovery, at your pace</h2>
        <p className={styles.introCopy}>
          Explore what helps you recharge, make decisions, connect, and learn.
          Your reflection is a starting point for curiosity, not a label.
        </p>
        <ul className={styles.promiseList}>
          <li>Six short, optional prompts</li>
          <li>A practical idea and a small lesson</li>
          <li>No diagnosis, score, or personality ranking</li>
        </ul>
        <p className={styles.privacyNote}>
          This first version keeps answers in this page session only. They are not saved to your account or shared.
        </p>
        <button className={styles.primaryButton} type="button" onClick={() => setIsOpen(true)}>
          Begin reflection
        </button>
      </section>
    );
  }

  if (reflection) {
    return (
      <section className={styles.card} aria-labelledby="reflection-result-heading">
        <p className={styles.eyebrow}>YOUR PRIVATE REFLECTION</p>
        <span className="cosmic-badge">Personal insight · Not a diagnosis</span>
        <h2 id="reflection-result-heading">A few things to explore</h2>
        <p className={styles.progressCopy}>
          Based on {reflection.answeredCount} of {reflection.totalQuestions} answers. Take what fits and leave what does not.
        </p>
        <div className={styles.resultBlock}>
          <h3>A pattern to consider</h3>
          <p>{reflection.pattern}</p>
        </div>
        <div className={styles.resultBlock}>
          <h3>One small experiment</h3>
          <p>{reflection.practicalAction}</p>
        </div>
        <div className={styles.resultBlock}>
          <h3>A little lesson</h3>
          <p>{reflection.microLesson}</p>
        </div>
        {learningPlan && (
          <div className={styles.resultBlock} aria-labelledby="personal-learning-plan-heading">
            <p className={styles.eyebrow}>SANCTUARY INTELLIGENCE</p>
            <h3 id="personal-learning-plan-heading">A learning path to try</h3>
            <p><strong>{learningPlan.title}</strong></p>
            <p>{learningPlan.approach}</p>
            <p><strong>Start here:</strong> {learningPlan.firstStep}</p>
            <p><strong>Try this:</strong> {learningPlan.practice}</p>
            <p><strong>Reflect:</strong> {learningPlan.reflectionPrompt}</p>
            <p className={styles.disclaimer}>{learningPlan.disclaimer}</p>
          </div>
        )}
        <div className={styles.resultBlock}>
          <h3>A question for your journal</h3>
          <p>{reflection.journalPrompt}</p>
          <button className={styles.secondaryButton} type="button" onClick={() => void copyJournalPrompt()}>
            Copy journal prompt
          </button>
          <button className={styles.secondaryButton} type="button" onClick={downloadReflection}>
            Download reflection (.txt)
          </button>
          {exportStatus === 'ready' && <p role="status" className={styles.progressCopy}>Your reflection file was prepared on this device. Choose where to keep it.</p>}
          {exportStatus === 'failed' && <p role="status" className={styles.progressCopy}>The download could not be prepared. You can still copy the journal prompt.</p>}
          {copyStatus === 'copied' && <p role="status" className={styles.progressCopy}>Journal prompt copied. You choose where to save it.</p>}
          {copyStatus === 'failed' && <p role="status" className={styles.progressCopy}>Could not copy automatically. You can select and copy the prompt above.</p>}
        </div>
        <p className={styles.disclaimer}>{reflection.disclaimer}</p>
        <div className={styles.actions}>
          <button className={styles.secondaryButton} type="button" onClick={() => { clearFeedback(); setHasFinished(false); setStep(0); }}>
            Review answers
          </button>
          <button className={styles.primaryButton} type="button" onClick={restart}>
            Start again
          </button>
          <button className={styles.textButton} type="button" onClick={closeAndClear}>
            Close and clear this session
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.card} aria-labelledby="self-discovery-question-heading">
      <div className={styles.questionHeader}>
        <div>
          <p className={styles.eyebrow}>YOUR OWN PACE</p>
          <h2 id="self-discovery-question-heading">A little self-discovery</h2>
        </div>
        <button
          className={styles.textButton}
          type="button"
          onClick={closeAndClear}
        >
          Leave
        </button>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label="Question progress"
        aria-valuemin={1}
        aria-valuemax={SELF_DISCOVERY_QUESTIONS.length}
        aria-valuenow={step + 1}
      >
        <span style={{ width: `${((step + 1) / SELF_DISCOVERY_QUESTIONS.length) * 100}%` }} />
      </div>
      <p className={styles.progressCopy}>Question {step + 1} of {SELF_DISCOVERY_QUESTIONS.length} · {answeredCount} answered</p>
      <fieldset className={styles.questionFieldset}>
        <legend>{question.prompt}</legend>
        <div className={styles.options}>
          {question.options.map((option) => (
            <label className={`${styles.option} ${answer === option.value ? styles.optionSelected : ''}`} key={option.value}>
              <input
                type="radio"
                name={question.id}
                value={option.value}
                checked={answer === option.value}
                onChange={() => chooseAnswer(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className={styles.privacyNote}>
        There is no right answer. You can skip any prompt. Nothing here is saved to your account in this version.
      </p>
      <div className={styles.actions}>
        <button className={styles.secondaryButton} type="button" disabled={step === 0} onClick={() => setStep((current) => Math.max(0, current - 1))}>
          Back
        </button>
        <button className={styles.textButton} type="button" onClick={() => {
          if (step === SELF_DISCOVERY_QUESTIONS.length - 1) setHasFinished(true);
          else setStep((current) => current + 1);
        }}>
          {answer ? 'Continue' : 'Skip'}
        </button>
        {step === SELF_DISCOVERY_QUESTIONS.length - 1 ? (
          <button className={styles.primaryButton} type="button" onClick={() => setHasFinished(true)}>
            Create reflection
          </button>
        ) : (
          <button className={styles.primaryButton} type="button" onClick={() => setStep((current) => Math.min(SELF_DISCOVERY_QUESTIONS.length - 1, current + 1))}>
            Next
          </button>
        )}
      </div>
    </section>
  );
}
