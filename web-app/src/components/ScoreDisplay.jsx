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
    const maxScore = 120; // Cap for the visual ring
    const radius = 60;
    const circumference = 2 * Math.PI * radius;
    // Calculate how much to offset the stroke based on the score (0 score = full offset, 120 score = 0 offset)
    const progressOffset = circumference - (Math.min(displayScore, maxScore) / maxScore) * circumference;

    return (
        <div className="score-display glass-panel">
            <div className="score-label">Total Points</div>
            
            <div className="score-ring-container">
                <svg className="score-ring" width="160" height="160">
                    <circle 
                        className="score-ring-bg" 
                        cx="80" cy="80" r={radius} 
                        strokeWidth="12" 
                    />
                    <circle 
                        className={`score-ring-progress ${isEligible ? 'eligible' : ''}`} 
                        cx="80" cy="80" r={radius} 
                        strokeWidth="12"
                        strokeDasharray={circumference}
                        strokeDashoffset={progressOffset}
                    />
                </svg>
                <div className="score-value-wrapper">
                    <div className="score-value">{displayScore}</div>
                </div>
            </div>

            <div className={`score-status ${isEligible ? 'success' : ''}`}>
                {isEligible ? 'Eligible (65+ Points)' : `Need ${65 - displayScore} more pts`}
            </div>
        </div>
    );
};

export default ScoreDisplay;
