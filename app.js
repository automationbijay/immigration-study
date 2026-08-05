document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('points-form');
    const scoreValue = document.getElementById('total-score');
    const scoreStatus = document.getElementById('score-status');

    // Get input elements
    const inputs = form.querySelectorAll('select, input[type="checkbox"]');

    const calculatePoints = () => {
        let total = 0;
        let workExperienceTotal = 0;

        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                if (input.checked) {
                    total += parseInt(input.value) || 0;
                }
            } else {
                const val = parseInt(input.value) || 0;
                
                // Cap work experience at 20 points
                if (input.name === 'overseas-exp' || input.name === 'aus-exp') {
                    workExperienceTotal += val;
                } else {
                    total += val;
                }
            }
        });

        // Apply work experience cap
        if (workExperienceTotal > 20) {
            workExperienceTotal = 20;
        }
        
        total += workExperienceTotal;

        // Animate score update
        animateScore(parseInt(scoreValue.innerText) || 0, total);
        
        // Update status
        if (total >= 65) {
            scoreStatus.innerText = 'Eligible (65+ Points)';
            scoreStatus.classList.add('success');
        } else {
            scoreStatus.innerText = `Insufficient (Need ${65 - total} more)`;
            scoreStatus.classList.remove('success');
        }
    };

    let animationTimer = null;

    const animateScore = (start, end) => {
        if (start === end) {
            scoreValue.innerText = end;
            return;
        }
        const duration = 500;
        const stepTime = Math.abs(Math.floor(duration / (end - start)));
        
        if (animationTimer) {
            clearInterval(animationTimer);
        }
        
        let current = start;
        animationTimer = setInterval(() => {
            if (start < end) {
                current += 1;
            } else {
                current -= 1;
            }
            scoreValue.innerText = current;
            if (current === end) {
                clearInterval(animationTimer);
                animationTimer = null;
            }
        }, stepTime);
    };

    // Attach event listeners
    inputs.forEach(input => {
        input.addEventListener('change', calculatePoints);
    });

    // Initial calculation
    calculatePoints();
});
