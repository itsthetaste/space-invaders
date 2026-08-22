/**
 * Space Invaders - Leaderboard System
 * Uses localStorage to persist high scores
 */

class Leaderboard {
    constructor() {
        this.storageKey = 'space_invaders_scores';
        this.maxScores = 10;
    }

    /**
     * Get all scores from storage
     */
    getScores() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Add a new score if it qualifies
     */
    addScore(name, score, level) {
        const scores = this.getScores();
        const newEntry = {
            name: name || 'Anonymous',
            score: score,
            level: level,
            date: new Date().toLocaleDateString()
        };

        scores.push(newEntry);
        scores.sort((a, b) => b.score - a.score);
        scores.splice(this.maxScores); // Keep top 10

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(scores));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }

        return scores;
    }

    /**
     * Check if score qualifies for leaderboard
     */
    qualifies(score) {
        const scores = this.getScores();
        if (scores.length < this.maxScores) return true;
        return score > scores[scores.length - 1].score;
    }

    /**
     * Render the leaderboard to HTML
     */
    render() {
        const scores = this.getScores();
        const container = document.getElementById('leaderboard-list');
        
        if (!container) return '';

        if (scores.length === 0) {
            container.innerHTML = '<div class="leaderboard-item"><p style="color: var(--text-secondary); text-align: center; width: 100%; padding: 40px;">No scores yet! Be the first!</p></div>';
            return '';
        }

        const medals = ['🥇', '🥈', '🥉'];
        
        container.innerHTML = scores.map((entry, index) => `
            <div class="leaderboard-item">
                <span class="leaderboard-rank">${medals[index] || (index + 1)}</span>
                <span class="leaderboard-name">${this.escapeHtml(entry.name)}</span>
                <span class="leaderboard-score">${entry.score.toLocaleString()}</span>
                <span class="leaderboard-level">Lvl ${entry.level}</span>
            </div>
        `).join('');

        return container.innerHTML;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Get top score
     */
    getTopScore() {
        const scores = this.getScores();
        return scores.length > 0 ? scores[0].score : 0;
    }

    /**
     * Clear all scores (for testing)
     */
    clear() {
        localStorage.removeItem(this.storageKey);
    }
}

// Export as singleton
const leaderboard = new Leaderboard();
window.leaderboard = leaderboard;
