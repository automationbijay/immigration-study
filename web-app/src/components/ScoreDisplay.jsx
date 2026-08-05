import React, { useEffect, useRef, useState } from 'react';
import { ELIGIBILITY_THRESHOLD, isEligible } from '../lib/points';

const DURATION_MS = 500;
const MAX_SCORE = 120; // Cap for the visual ring
const RADIUS = 60;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ScoreDisplay = ({ targetScore }) => {
    const [displayScore, setDisplayScore] = useState(0);
    // Holds the rendered value so the animation can read its own starting point
    // without making `displayScore` a dependency (which would restart the
    // tween on every frame).
    const renderedRef = useRef(0);

    useEffect(() => {
        const from = renderedRef.current;
        const delta = targetScore - from;
        if (delta === 0) return;

        let frame;
        let startedAt;

        const tick = (now) => {
            if (startedAt === undefined) startedAt = now;
            const progress = Math.min((now - startedAt) / DURATION_MS, 1);
            const value = Math.round(from + delta * progress);
            renderedRef.current = value;
            setDisplayScore(value);
            if (progress < 1) frame = requestAnimationFrame(tick);
        };

        frame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frame);
    }, [targetScore]);

    const eligible = isEligible(displayScore);
    const progressOffset =
        CIRCUMFERENCE - (Math.min(displayScore, MAX_SCORE) / MAX_SCORE) * CIRCUMFERENCE;

    return (
        <div className="score-display glass-panel">
            <div className="score-label">Total Points</div>

            <div className="score-ring-container">
                <svg className="score-ring" width="160" height="160" aria-hidden="true">
                    <circle className="score-ring-bg" cx="80" cy="80" r={RADIUS} strokeWidth="12" />
                    <circle
                        className={`score-ring-progress ${eligible ? 'eligible' : ''}`}
                        cx="80" cy="80" r={RADIUS}
                        strokeWidth="12"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={progressOffset}
                    />
                </svg>
                <div className="score-value-wrapper">
                    <div className="score-value">{displayScore}</div>
                </div>
            </div>

            <div className={`score-status ${eligible ? 'success' : ''}`}>
                {eligible
                    ? `Eligible (${ELIGIBILITY_THRESHOLD}+ Points)`
                    : `Need ${ELIGIBILITY_THRESHOLD - displayScore} more pts`}
            </div>
        </div>
    );
};

export default ScoreDisplay;
