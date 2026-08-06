import React, { useEffect, useRef, useState } from 'react';
import { ELIGIBILITY_THRESHOLD, isEligible } from '../lib/points';
import FloatingScoreCard from './FloatingScoreCard';

const DURATION_MS = 500;

/**
 * The count-up is driven by requestAnimationFrame, so CSS cannot switch it
 * off — the preference has to be read here too.
 */
function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

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

        if (prefersReducedMotion()) {
            renderedRef.current = targetScore;
            setDisplayScore(targetScore);
            return;
        }

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

    return (
        <FloatingScoreCard
            title="Estimated Total Points"
            subtitle={eligible ? `Eligible (${ELIGIBILITY_THRESHOLD}+ Points)` : `Need ${ELIGIBILITY_THRESHOLD - displayScore} more pts`}
            score={displayScore}
            maxWidth="900px"
        />
    );
};

export default ScoreDisplay;
