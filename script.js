// ============================
// CASINO BÀI LIÊNG SCORE SYSTEM
// Phong cách bài bạc cao cấp
// Tác giả: Cư
// ============================

class CasinoScoreSystem {
    constructor() {
        this.players = {
            top: { name: '', total: 0, currentRound: 0, ranks: [] },
            right: { name: '', total: 0, currentRound: 0, ranks: [] },
            bottom: { name: '', total: 0, currentRound: 0, ranks: [] },
            left: { name: '', total: 0, currentRound: 0, ranks: [] }
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
        
        // Auto-start timer if game in progress
        if (this.roundInProgress) {
            this.startTimer();
        }
    }
    
    bindEvents() {
        // Setup modal
        document.getElementById('startGame').addEventListener('click', () => this.startGameSetup());
        
        // Timer controls
        document.getElementById('startTimer').addEventListener('click', () => this.startTimer());
        document.getElementById('pauseTimer').addEventListener('click', () => this.pauseTimer());
        document.getElementById('resetTimer').addEventListener('click', () => this.resetTimer());
        
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
        document.getElementById('quickConfirm').addEventListener('click', () => this.quickConfirmRound());
        
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
            input.addEventListener('change', (e) => this.handleManualInput(e));
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
            this.players[pos].ranks = [];
        });
        
        // Update UI
        this.positions.forEach(pos => {
            document.getElementById(`name${this.capitalize(pos)}`).textContent = names[pos];
            document.getElementById(`summary${this.capitalize(pos)}`).querySelector('.summary-name').textContent = names[pos];
        });
        
        // Update table headers
        this.positions.forEach(pos => {
            document.getElementById(`col${this.capitalize(pos)}`).textContent = names[pos];
        });
        
        // Hide setup modal
        document.getElementById('setupModal').classList.remove('active');
        
        // Start first round
        this.startNewRound();
        
        this.showNotification('🎰 Game đã bắt đầu! Chọn người nhất, nhì, ba.', 'success');
        this.saveToLocalStorage();
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
        this.resetRankIndicators();
        
        // Start timer
        this.startTimer();
        
        this.showNotification(`🎮 Ván ${this.currentRound} đã bắt đầu!`, 'info');
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
        this.updateRankIndicator(position, rank, true);
        this.updateAllDisplays();
        
        // Play sound effect
        this.playSound('select');
        
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
                
                this.updateRankIndicator(remainingPos, 4, true);
                this.updateAllDisplays();
                
                // Auto-show confirm modal
                setTimeout(() => {
                    this.showNotification('✅ Đã chọn đủ 4 hạng!', 'success');
                    this.showConfirmModal();
                }, 800);
            }
        } else {
            this.showNotification(`🎯 Chọn ${this.getRankName(rank)}: ${this.players[position].name}`, 'success');
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
        this.updateRankIndicator(position, removedRank, false);
        
        // Reassign ranks to remaining selected players
        this.selectedRanks.sort((a, b) => a.rank - b.rank);
        this.selectedRanks.forEach((selection, index) => {
            const newRank = index + 1;
            selection.rank = newRank;
            selection.points = this.rankPoints[newRank];
            this.players[selection.position].currentRound = selection.points;
            
            // Update rank indicator
            this.updateRankIndicator(selection.position, newRank, true);
        });
        
        this.updateAllDisplays();
        this.showNotification(`🔄 Đã hủy chọn: ${this.players[position].name}`, 'info');
    }
    
    quickConfirmRound() {
        if (this.selectedRanks.length !== 4) {
            this.showNotification('⚠️ Vui lòng chọn đủ 3 hạng đầu tiên!', 'warning');
            return;
        }
        
        this.showConfirmModal();
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
                document.getElementById(`expected${this.capitalize(pos)}`).textContent = 
                    `Mặc định: ${selection.points} (${this.getRankName(selection.rank)})`;
            } else {
                inputElement.value = 0;
                document.getElementById(`expected${this.capitalize(pos)}`).textContent = 'Mặc định: 0';
            }
        });
        
        document.getElementById('confirmModal').classList.add('active');
        this.playSound('modalOpen');
    }
    
    hideConfirmModal() {
        document.getElementById('confirmModal').classList.remove('active');
        this.playSound('modalClose');
    }
    
    handleManualInput(event) {
        const position = event.target.dataset.position;
        const value = parseInt(event.target.value) || 0;
        
        // Limit value to reasonable range
        if (value < -100) event.target.value = -100;
        if (value > 100) event.target.value = 100;
        
        // Update in-memory
        this.players[position].currentRound = parseInt(event.target.value) || 0;
        
        // Update expected text
        const selection = this.selectedRanks.find(s => s.position === position);
        if (selection) {
            const currentValue = parseInt(event.target.value) || 0;
            if (currentValue === selection.points) {
                document.getElementById(`expected${this.capitalize(position)}`).textContent = 
                    `Mặc định: ${selection.points} (${this.getRankName(selection.rank)})`;
            } else {
                document.getElementById(`expected${this.capitalize(position)}`).textContent = 
                    `Đã thay đổi: ${currentValue}`;
            }
        }
    }
    
    autoFillScores() {
        // Auto-fill based on selected ranks
        this.selectedRanks.forEach(selection => {
            const input = document.querySelector(`.score-input-modal[data-position="${selection.position}"]`);
            input.value = selection.points;
            this.players[selection.position].currentRound = selection.points;
            
            document.getElementById(`expected${this.capitalize(selection.position)}`).textContent = 
                `Mặc định: ${selection.points} (${this.getRankName(selection.rank)})`;
        });
        
        this.showNotification('✨ Đã điền điểm tự động theo hạng!', 'success');
        this.playSound('autoFill');
    }
    
    saveRound() {
        // Get scores from inputs
        const inputs = document.querySelectorAll('.score-input-modal');
        let isValid = true;
        
        // Validate inputs
        inputs.forEach(input => {
            const value = parseInt(input.value);
            if (isNaN(value)) {
                isValid = false;
                input.style.borderColor = '#e74c3c';
            } else {
                input.style.borderColor = '#FFD700';
            }
        });
        
        if (!isValid) {
            this.showNotification('❌ Vui lòng nhập điểm hợp lệ cho tất cả người chơi!', 'error');
            return;
        }
        
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
            timestamp: new Date().toLocaleString('vi-VN'),
            duration: this.formatTime(this.timer.seconds),
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
        this.pauseTimer();
        
        // Update UI
        this.updateAllDisplays();
        this.hideConfirmModal();
        this.addHistoryRow(roundData);
        
        this.showNotification(`✅ Ván ${roundData.round} đã lưu thành công!`, 'success');
        this.playSound('save');
        this.saveToLocalStorage();
    }
    
    undoLastRound() {
        if (this.gameHistory.length === 0) {
            this.showNotification('⚠️ Không có ván nào để hoàn tác!', 'warning');
            return;
        }
        
        if (!confirm('Bạn có chắc chắn muốn hoàn tác ván vừa rồi?')) return;
        
        const lastRound = this.gameHistory[0];
        
        // Subtract scores
        this.positions.forEach(pos => {
            this.players[pos].total -= lastRound.scores[pos];
            this.players[pos].ranks.pop();
        });
        
        // Remove from history
        this.gameHistory.shift();
        this.currentRound--;
        
        // Update UI
        this.updateAllDisplays();
        this.removeHistoryRow(0);
        
        this.showNotification('↩️ Đã hoàn tác ván trước!', 'info');
        this.playSound('undo');
        this.saveToLocalStorage();
    }
    
    resetGame() {
        if (!confirm('⚠️ CẢNH BÁO: Bạn có chắc chắn muốn xóa tất cả dữ liệu?\nHành động này không thể hoàn tác!')) return;
        
        this.positions.forEach(pos => {
            this.players[pos] = { name: '', total: 0, currentRound: 0, ranks: [] };
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
        
        this.showNotification('🗑️ Đã xóa tất cả dữ liệu!', 'info');
        this.playSound('reset');
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
            return `${hours}h${minutes.toString().padStart(2, '0')}m`;
        } else if (minutes > 0) {
            return `${minutes}m${secs.toString().padStart(2, '0')}s`;
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
    
    updateRankIndicator(position, rank, active) {
        const indicator = document.querySelector(`.player-spot[data-position="${position}"] .rank-indicator[data-rank="${rank}"]`);
        if (indicator) {
            if (active) {
                indicator.classList.add('active');
                indicator.style.animation = 'pulse 1s infinite';
            } else {
                indicator.classList.remove('active');
                indicator.style.animation = 'none';
            }
        }
    }
    
    resetRankIndicators() {
        document.querySelectorAll('.rank-indicator').forEach(indicator => {
            indicator.classList.remove('active');
            indicator.style.animation = 'none';
        });
        
        document.querySelectorAll('.player-chip').forEach(chip => {
            chip.classList.remove('selected');
        });
    }
    
    // ============================
    // HISTORY PANEL
    // ============================
    
    toggleHistoryPanel() {
        const panel = document.getElementById('scorePanel');
        const toggleBtn = document.getElementById('togglePanel');
        
        panel.classList.toggle('open');
        
        if (panel.classList.contains('open')) {
            toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            toggleBtn.style.transform = 'rotate(180deg)';
            this.playSound('panelOpen');
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            toggleBtn.style.transform = 'rotate(0deg)';
            this.playSound('panelClose');
        }
    }
    
    addHistoryRow(roundData) {
        const tbody = document.getElementById('historyBody');
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td><strong>${roundData.round}</strong></td>
            <td>${roundData.timestamp}<br><small>${roundData.duration}</small></td>
            <td class="score-cell ${roundData.ranks.top === 1 ? 'first' : roundData.ranks.top === 2 ? 'second' : roundData.ranks.top === 3 ? 'third' : ''}">
                ${roundData.scores.top}
            </td>
            <td class="score-cell ${roundData.ranks.right === 1 ? 'first' : roundData.ranks.right === 2 ? 'second' : roundData.ranks.right === 3 ? 'third' : ''}">
                ${roundData.scores.right}
            </td>
            <td class="score-cell ${roundData.ranks.bottom === 1 ? 'first' : roundData.ranks.bottom === 2 ? 'second' : roundData.ranks.bottom === 3 ? 'third' : ''}">
                ${roundData.scores.bottom}
            </td>
            <td class="score-cell ${roundData.ranks.left === 1 ? 'first' : roundData.ranks.left === 2 ? 'second' : roundData.ranks.left === 3 ? 'third' : ''}">
                ${roundData.scores.left}
            </td>
            <td>
                <button class="delete-round" data-round="${roundData.round}">
                    <i class="fas fa-trash"></i> Xóa
                </button>
            </td>
        `;
        
        tbody.insertBefore(row, tbody.firstChild);
        
        // Add event listener to delete button
        row.querySelector('.delete-round').addEventListener('click', (e) => {
            const roundToDelete = parseInt(e.target.closest('.delete-round').dataset.round);
            this.deleteRound(roundToDelete);
        });
        
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
    
    deleteRound(roundNumber) {
        const roundIndex = this.gameHistory.findIndex(r => r.round === roundNumber);
        if (roundIndex === -1) return;
        
        if (!confirm(`Xóa ván ${roundNumber}?`)) return;
        
        // Subtract scores
        const round = this.gameHistory[roundIndex];
        this.positions.forEach(pos => {
            this.players[pos].total -= round.scores[pos];
        });
        
        // Remove from history
        this.gameHistory.splice(roundIndex, 1);
        
        // Update UI
        this.updateAllDisplays();
        this.removeHistoryRow(roundIndex);
        
        this.showNotification(`🗑️ Đã xóa ván ${roundNumber}!`, 'info');
        this.playSound('delete');
        this.saveToLocalStorage();
    }
    
    // ============================
    // NOTIFICATION SYSTEM
    // ============================
    
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        const colors = {
            success: 'linear-gradient(45deg, #2ecc71, #27ae60)',
            error: 'linear-gradient(45deg, #e74c3c, #c0392b)',
            warning: 'linear-gradient(45deg, #f39c12, #e67e22)',
            info: 'linear-gradient(45deg, #3498db, #2980b9)'
        };
        
        notification.innerHTML = `
            <i class="${icons[type]}"></i>
            <span>${message}</span>
        `;
        
        notification.style.background = colors[type] || colors.info;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // ============================
    // SOUND EFFECTS
    // ============================
    
    playSound(type) {
        // In a real implementation, you would play actual audio files
        // For now, we'll just simulate with console log
        const sounds = {
            select: '🔔',
            modalOpen: '🎵',
            modalClose: '🔇',
            save: '💾',
            undo: '↩️',
            reset: '🗑️',
            autoFill: '✨',
            panelOpen: '📊',
            panelClose: '📥',
            delete: '🗑️'
        };
        
        console.log(sounds[type] || '🔊');
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
        
        localStorage.setItem('casinoScoreData', JSON.stringify(data));
    }
    
    loadFromLocalStorage() {
        const saved = localStorage.getItem('casinoScoreData');
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
                    document.getElementById(`name${this.capitalize(pos)}`).textContent = this.players[pos].name;
                    document.getElementById(`summary${this.capitalize(pos)}`).querySelector('.summary-name').textContent = this.players[pos].name;
                    document.getElementById(`col${this.capitalize(pos)}`).textContent = this.players[pos].name;
                }
            });
            
            // Load history table
            this.gameHistory.forEach(round => this.addHistoryRow(round));
            
            // Update timer display
            this.updateTimerDisplay();
            
            // If round was in progress, restore selections
            if (this.roundInProgress) {
                this.selectedRanks.forEach(selection => {
                    this.updateRankIndicator(selection.position, selection.rank, true);
                    document.querySelector(`.player-chip[data-position="${selection.position}"]`).classList.add('selected');
                });
            }
            
        } catch (error) {
            console.error('Error loading saved data:', error);
            localStorage.removeItem('casinoScoreData');
        }
    }
    
    // ============================
    // UTILITY FUNCTIONS
    // ============================
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    getRankName(rank) {
        const names = { 1: 'NHẤT', 2: 'NHÌ', 3: 'BA', 4: 'BÉT' };
        return names[rank] || '';
    }
}

// Initialize the game when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.casinoGame = new CasinoScoreSystem();
});