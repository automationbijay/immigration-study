import React, { useEffect, useState } from 'react';

const ScoreDisplay = ({ targetScore }) => {
    const [displayScore, setDisplayScore] = useState(0);

    useEffect(() => {
        if (displayScore === targetScore) return;
        
        const duration = 500;
        const stepTime = Math.abs(Math.floor(duration / (targetScore - displayScore)));
        
        const timer = setInterval(() => {
            setDisplayScore(prev => {
                if (prev < targetScore) return prev + 1;
                if (prev > targetScore) return prev - 1;
                clearInterval(timer);
                return prev;
            });
        }, stepTime || 50);

        return () => clearInterval(timer);
    }, [targetScore]);

    const isEligible = displayScore >= 65;

    return (
        <div className="score-display glass-panel">
            <div className="score-label">Total Points</div>
            <div className="score-value">{displayScore}</div>
            <div className={`score-status ${isEligible ? 'success' : ''}`}>
                {isEligible ? 'Eligible (65+ Points)' : `Insufficient (Need ${65 - displayScore} more)`}
            </div>
        </div>
    );
};

export default ScoreDisplay;
