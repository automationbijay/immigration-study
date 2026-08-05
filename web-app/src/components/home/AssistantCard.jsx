import React from 'react';
import { Mic, Sparkles } from 'lucide-react';

const SAMPLE_PROMPTS = [
  'Which visa should I go for first?',
  'How do I get from 60 to 65 points?',
  'What does regional nomination involve?',
];

/**
 * Entry point for the voice assistant. The surface is real so the home screen
 * reads correctly, but nothing is wired to a model yet — the button is
 * explicitly disabled rather than failing silently when pressed.
 */
export default function AssistantCard() {
  return (
    <div className="assistant-card">
      <div className="assistant-head">
        <span className="assistant-icon">
          <Sparkles size={20} aria-hidden="true" />
        </span>
        <div className="assistant-headings">
          <div className="assistant-title-row">
            <h3>Ask about your pathway</h3>
            <span className="assistant-badge">Coming soon</span>
          </div>
          <p>Talk it through instead of reading forms.</p>
        </div>
      </div>

      <ul className="assistant-prompts">
        {SAMPLE_PROMPTS.map((prompt) => (
          <li key={prompt}>&ldquo;{prompt}&rdquo;</li>
        ))}
      </ul>

      <button type="button" className="assistant-mic" disabled aria-describedby="assistant-status">
        <Mic size={20} aria-hidden="true" />
        Hold to talk
      </button>
      <p id="assistant-status" className="assistant-status">
        Voice chat is not switched on yet.
      </p>
    </div>
  );
}
