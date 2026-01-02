// ============================
// TIẾN LÊN SCORE SYSTEM
// Minimalist Version
// Tác giả: Cư
// ============================

class ScoreSystem {
    constructor() {
        this.players = {
            top: { name: '', total: 0, currentRound: 0 },
            right: { name: '', total: 0, currentRound: 0 },
            bottom: { name: '', total: 0, currentRound: 0 },
            left: { name: '', total: 0, currentRound: 0 }
        };
        
        this.gameHistory = [];
        this.currentRound = 1;
        this.roundInProgress = false;
        this.selectedRanks = [];
        this.timer = { seconds: 0, interval: null, running: false };
        
        this.rankPoints = { 1: 3, 2: 2, 3: 1, 4: 0 };
        this.positions = ['top', 'right', 'bottom', 'left'];
        
        this.init();
    }
    
    init() {
        this.loadFromLocalStorage();
        this.bindEvents();
        this.updateAllDisplays();
    }
    
    bindEvents() {
        // Setup
        document.getElementById('startGame').addEventListener('click', () => this.startGameSetup());
        
        // Player chips click
        this.positions.forEach(pos => {
            const chip = document.querySelector(`.player-chip[data-position="${pos}"]`);
            chip.addEventListener('click', () => this.selectPlayer(pos));
            chip.addEventListener('dblclick', () => this.deselectPlayer(pos));
        });
        
        // Action buttons
        document.getElementById('startRound').addEventListener('click', () => this.startNewRound());
        document.getElementById('undoRound').addEventListener('click', () => this.undoLastRound());
        document.getElementById('showHistory').addEventListener('click', () => this.toggleHistoryPanel());
        document.getElementById('resetGame').addEventListener('click', () => this.resetGame());
        
        // Panel toggle
        document.getElementById('togglePanel').addEventListener('click', () => this.toggleHistoryPanel());
        
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => this.hideConfirmModal());
        document.getElementById('confirmSave').addEventListener('click', () => this.saveRound());
        document.getElementById('cancelConfirm').addEventListener('click', () => this.hideConfirmModal());
        document.getElementById('autoFillBtn').addEventListener('click', () => this.autoFillScores());
        
        // Modal input change
        document.querySelectorAll('.score-input-modal').forEach(input => {
            input.addEventListener('input', (e) => this.handleManualInput(e));
        });
        
        // Enter key to start game
        document.querySelectorAll('.setup-input-group input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.startGameSetup();
            });
        });
    }
    
    // ============================
    // GAME SETUP
    // ============================
    
    startGameSetup() {
        const names = {
            top: document.getElementById('setupTop').value.trim() || 'TRÊN',
            right: document.getElementById('setupRight').value.trim() || 'PHẢI',
            bottom: document.getElementById('setupBottom').value.trim() || 'DƯỚI',
            left: document.getElementById('setupLeft').value.trim() || 'TRÁI'
        };
        
        // Set player names
        this.positions.forEach(pos => {
            this.players[pos].name = names[pos];
            this.players[pos].total = 0;
            this.players[pos].currentRound = 0;
        });
        
        // Update UI
        this.positions.forEach(pos => {
            const shortName = this.truncateName(names[pos], 6);
            document.getElementById(`name${this.capitalize(pos)}`).textContent = shortName;
            document.querySelector(`#summary${this.capitalize(pos)} .summary-name`).textContent = shortName;
            document.getElementById(`col${this.capitalize(pos)}`).textContent = shortName;
        });
        
        // Hide setup modal
        document.getElementById('setupModal').classList.remove('active');
        
        // Start timer
        this.startTimer();
        
        // Start first round
        this.startNewRound();
        
        this.showNotification('🎮 Game đã bắt đầu!', 'success');
        this.saveToLocalStorage();
    }
    
    truncateName(name, maxLength) {
        if (name.length <= maxLength) return name;
        return name.substring(0, maxLength - 1) + '…';
    }
    
    // ============================
    // ROUND MANAGEMENT
    // ============================
    
    startNewRound() {
        if (this.roundInProgress) {
            this.showNotification('⚠️ Ván hiện tại chưa kết thúc!', 'warning');
            return;
        }
        
        this.roundInProgress = true;
        this.selectedRanks = [];
        
        // Reset current round points
        this.positions.forEach(pos => {
            this.players[pos].currentRound = 0;
        });
        
        // Update UI
        this.updateAllDisplays();
        
        this.showNotification(`🎯 Ván ${this.currentRound} đã bắt đầu!`, 'info');
    }
    
    selectPlayer(position) {
        if (!this.roundInProgress) {
            this.showNotification('⚠️ Vui lòng bắt đầu ván mới trước!', 'warning');
            return;
        }
        
        const playerChip = document.querySelector(`.player-chip[data-position="${position}"]`);
        
        // If already selected, deselect
        if (playerChip.classList.contains('selected')) {
            this.deselectPlayer(position);
            return;
        }
        
        // Check if can select more ranks
        if (this.selectedRanks.length >= 3) {
            this.showNotification('⚠️ Đã chọn đủ 3 hạng!', 'warning');
            return;
        }
        
        // Determine rank
        const rank = this.selectedRanks.length + 1;
        const points = this.rankPoints[rank];
        
        // Add to selected ranks
        this.selectedRanks.push({ position, rank, points });
        
        // Update player's current round score
        this.players[position].currentRound = points;
        
        // Update UI
        playerChip.classList.add('selected');
        this.updateAllDisplays();
        
        // Check if ready for confirmation
        if (this.selectedRanks.length === 3) {
            // Auto-select the last player as 4th rank
            const remainingPos = this.positions.find(pos => 
                !this.selectedRanks.some(s => s.position === pos)
            );
            
            if (remainingPos) {
                this.players[remainingPos].currentRound = this.rankPoints[4];
                this.selectedRanks.push({ 
                    position: remainingPos, 
                    rank: 4, 
                    points: this.rankPoints[4] 
                });
                
                this.updateAllDisplays();
                
                // Auto-show confirm modal
                setTimeout(() => this.showConfirmModal(), 500);
            }
        }
    }
    
    deselectPlayer(position) {
        if (!this.roundInProgress) return;
        
        const playerIndex = this.selectedRanks.findIndex(s => s.position === position);
        if (playerIndex === -1) return;
        
        // Remove from selected ranks
        const removedRank = this.selectedRanks[playerIndex].rank;
        this.selectedRanks.splice(playerIndex, 1);
        
        // Reset player's current round score
        this.players[position].currentRound = 0;
        
        // Update UI
        document.querySelector(`.player-chip[data-position="${position}"]`).classList.remove('selected');
        
        // Reassign ranks to remaining selected players
        this.selectedRanks.sort((a, b) => a.rank - b.rank);
        this.selectedRanks.forEach((selection, index) => {
            const newRank = index + 1;
            selection.rank = newRank;
            selection.points = this.rankPoints[newRank];
            this.players[selection.position].currentRound = selection.points;
        });
        
        this.updateAllDisplays();
    }
    
    showConfirmModal() {
        if (!this.roundInProgress) return;
        
        // Update modal with current selections
        this.positions.forEach(pos => {
            const player = this.players[pos];
            const selection = this.selectedRanks.find(s => s.position === pos);
            
            document.getElementById(`reviewName${this.capitalize(pos)}`).textContent = player.name;
            
            const inputElement = document.querySelector(`.score-input-modal[data-position="${pos}"]`);
            if (selection) {
                inputElement.value = selection.points;
            } else {
                inputElement.value = 0;
            }
        });
        
        document.getElementById('confirmModal').classList.add('active');
    }
    
    hideConfirmModal() {
        document.getElementById('confirmModal').classList.remove('active');
    }
    
    handleManualInput(event) {
        const position = event.target.dataset.position;
        const value = parseInt(event.target.value) || 0;
        
        // Limit value to reasonable range
        if (value < -100) event.target.value = -100;
        if (value > 100) event.target.value = 100;
        
        // Update in-memory
        this.players[position].currentRound = parseInt(event.target.value) || 0;
    }
    
    autoFillScores() {
        // Auto-fill based on selected ranks
        this.selectedRanks.forEach(selection => {
            const input = document.querySelector(`.score-input-modal[data-position="${selection.position}"]`);
            input.value = selection.points;
            this.players[selection.position].currentRound = selection.points;
        });
        
        this.showNotification('✨ Đã điền điểm tự động!', 'success');
    }
    
    saveRound() {
        // Get scores from inputs
        const inputs = document.querySelectorAll('.score-input-modal');
        
        // Calculate totals from modal inputs
        inputs.forEach(input => {
            const position = input.dataset.position;
            const points = parseInt(input.value) || 0;
            
            this.players[position].total += points;
            this.players[position].currentRound = points;
        });
        
        // Add to history
        const roundData = {
            round: this.currentRound,
            duration: this.formatTime(this.getRoundDuration()),
            scores: {},
            ranks: {}
        };
        
        this.positions.forEach(pos => {
            roundData.scores[pos] = this.players[pos].currentRound;
            const selection = this.selectedRanks.find(s => s.position === pos);
            roundData.ranks[pos] = selection ? selection.rank : 4;
        });
        
        this.gameHistory.unshift(roundData);
        this.currentRound++;
        
        // Reset for next round
        this.roundInProgress = false;
        this.selectedRanks = [];
        
        // Update UI
        this.updateAllDisplays();
        this.hideConfirmModal();
        this.addHistoryRow(roundData);
        
        this.showNotification(`✅ Ván ${roundData.round} đã lưu!`, 'success');
        this.saveToLocalStorage();
    }
    
    getRoundDuration() {
        // Simple duration - 30 seconds per round for demo
        // In real app, you'd track actual time
        return 30;
    }
    
    undoLastRound() {
        if (this.gameHistory.length === 0) {
            this.showNotification('⚠️ Không có ván nào để hoàn tác!', 'warning');
            return;
        }
        
        if (!confirm('Hoàn tác ván vừa rồi?')) return;
        
        const lastRound = this.gameHistory[0];
        
        // Subtract scores
        this.positions.forEach(pos => {
            this.players[pos].total -= lastRound.scores[pos];
        });
        
        // Remove from history
        this.gameHistory.shift();
        this.currentRound--;
        
        // Update UI
        this.updateAllDisplays();
        this.removeHistoryRow(0);
        
        this.showNotification('↩️ Đã hoàn tác!', 'info');
        this.saveToLocalStorage();
    }
    
    resetGame() {
        if (!confirm('⚠️ XÓA TẤT CẢ DỮ LIỆU?\nHành động này không thể hoàn tác!')) return;
        
        this.positions.forEach(pos => {
            this.players[pos] = { name: '', total: 0, currentRound: 0 };
        });
        
        this.gameHistory = [];
        this.currentRound = 1;
        this.roundInProgress = false;
        this.selectedRanks = [];
        this.resetTimer();
        
        // Clear UI
        this.updateAllDisplays();
        document.getElementById('historyBody').innerHTML = '';
        this.updateTotals();
        
        // Show setup modal
        document.getElementById('setupModal').classList.add('active');
        
        this.showNotification('🗑️ Đã xóa tất cả!', 'info');
        localStorage.clear();
    }
    
    // ============================
    // TIMER FUNCTIONS
    // ============================
    
    startTimer() {
        if (this.timer.running) return;
        
        this.timer.running = true;
        this.timer.interval = setInterval(() => {
            this.timer.seconds++;
            this.updateTimerDisplay();
        }, 1000);
    }
    
    pauseTimer() {
        if (!this.timer.running) return;
        
        this.timer.running = false;
        clearInterval(this.timer.interval);
    }
    
    resetTimer() {
        this.pauseTimer();
        this.timer.seconds = 0;
        this.updateTimerDisplay();
    }
    
    updateTimerDisplay() {
        const hours = Math.floor(this.timer.seconds / 3600);
        const minutes = Math.floor((this.timer.seconds % 3600) / 60);
        const seconds = this.timer.seconds % 60;
        
        document.getElementById('timer').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}h${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m`;
        } else {
            return `${secs}s`;
        }
    }
    
    // ============================
    // UI UPDATES
    // ============================
    
    updateAllDisplays() {
        // Update current scores
        this.updateCurrentScores();
        
        // Update total scores
        this.positions.forEach(pos => {
            document.getElementById(`currentScore${this.capitalize(pos)}`).textContent = 
                this.players[pos].currentRound;
            
            document.querySelector(`#summary${this.capitalize(pos)} .summary-total`).textContent = 
                this.players[pos].total;
        });
        
        // Update pot total
        const potTotal = this.positions.reduce((sum, pos) => sum + this.players[pos].total, 0);
        document.getElementById('potTotal').textContent = potTotal;
        
        // Update button states
        document.getElementById('startRound').disabled = this.roundInProgress;
        document.getElementById('undoRound').disabled = this.gameHistory.length === 0;
        
        // Update history totals
        this.updateTotals();
    }
    
    updateCurrentScores() {
        this.positions.forEach(pos => {
            document.getElementById(`currentScore${this.capitalize(pos)}`).textContent = 
                this.players[pos].currentRound;
        });
    }
    
    // ============================
    // HISTORY PANEL
    // ============================
    
    toggleHistoryPanel() {
        const panel = document.getElementById('scorePanel');
        panel.classList.toggle('open');
    }
    
    addHistoryRow(roundData) {
        const tbody = document.getElementById('historyBody');
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${roundData.round}</strong></td>
            <td>${roundData.duration}</td>
            <td class="${roundData.ranks.top === 1 ? 'first' : roundData.ranks.top === 2 ? 'second' : roundData.ranks.top === 3 ? 'third' : ''}">
                ${roundData.scores.top}
            </td>
            <td class="${roundData.ranks.right === 1 ? 'first' : roundData.ranks.right === 2 ? 'second' : roundData.ranks.right === 3 ? 'third' : ''}">
                ${roundData.scores.right}
            </td>
            <td class="${roundData.ranks.bottom === 1 ? 'first' : roundData.ranks.bottom === 2 ? 'second' : roundData.ranks.bottom === 3 ? 'third' : ''}">
                ${roundData.scores.bottom}
            </td>
            <td class="${roundData.ranks.left === 1 ? 'first' : roundData.ranks.left === 2 ? 'second' : roundData.ranks.left === 3 ? 'third' : ''}">
                ${roundData.scores.left}
            </td>
        `;
        
        tbody.insertBefore(row, tbody.firstChild);
        
        // Update totals
        this.updateTotals();
    }
    
    removeHistoryRow(index) {
        const tbody = document.getElementById('historyBody');
        const row = tbody.children[index];
        if (row) {
            tbody.removeChild(row);
        }
    }
    
    updateTotals() {
        this.positions.forEach(pos => {
            document.getElementById(`total${this.capitalize(pos)}`).textContent = 
                this.players[pos].total;
        });
    }
    
    // ============================
    // NOTIFICATION SYSTEM
    // ============================
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const icons = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const colors = {
            success: 'linear-gradient(135deg, #48bb78, #38a169)',
            warning: 'linear-gradient(135deg, #ed8936, #dd6b20)',
            info: 'linear-gradient(135deg, #4299e1, #3182ce)'
        };
        
        notification.innerHTML = `
            <i class="${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        notification.style.background = colors[type] || colors.info;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 2000);
    }
    
    // ============================
    // LOCAL STORAGE
    // ============================
    
    saveToLocalStorage() {
        const data = {
            players: this.players,
            gameHistory: this.gameHistory,
            currentRound: this.currentRound,
            roundInProgress: this.roundInProgress,
            selectedRanks: this.selectedRanks,
            timer: this.timer
        };
        
        localStorage.setItem('scoreData', JSON.stringify(data));
    }
    
    loadFromLocalStorage() {
        const saved = localStorage.getItem('scoreData');
        if (!saved) return;
        
        try {
            const data = JSON.parse(saved);
            
            this.players = data.players || this.players;
            this.gameHistory = data.gameHistory || [];
            this.currentRound = data.currentRound || 1;
            this.roundInProgress = data.roundInProgress || false;
            this.selectedRanks = data.selectedRanks || [];
            this.timer = data.timer || { seconds: 0, interval: null, running: false };
            
            // Update player names in UI
            this.positions.forEach(pos => {
                if (this.players[pos].name) {
                    const shortName = this.truncateName(this.players[pos].name, 6);
                    document.getElementById(`name${this.capitalize(pos)}`).textContent = shortName;
                    document.querySelector(`#summary${this.capitalize(pos)} .summary-name`).textContent = shortName;
                    document.getElementById(`col${this.capitalize(pos)}`).textContent = shortName;
                }
            });
            
            // Load history table
            this.gameHistory.forEach(round => this.addHistoryRow(round));
            
            // Update timer display
            this.updateTimerDisplay();
            
            // If round was in progress, restore selections
            if (this.roundInProgress) {
                this.selectedRanks.forEach(selection => {
                    document.querySelector(`.player-chip[data-position="${selection.position}"]`).classList.add('selected');
                });
            }
            
            // If game was started, hide setup modal
            if (this.players.top.name) {
                document.getElementById('setupModal').classList.remove('active');
                if (this.timer.running) {
                    this.startTimer();
                }
            }
            
        } catch (error) {
            console.error('Error loading saved data:', error);
            localStorage.removeItem('scoreData');
        }
    }
    
    // ============================
    // UTILITY FUNCTIONS
    // ============================
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.scoreSystem = new ScoreSystem();
});