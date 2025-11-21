/**
 * UI Helpers Module
 * Shared UI components and utilities across the EA App
 * Includes: Player history modal, leaderboard rendering, and modal management
 */

import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { calculatePoints, calculatePlayerStats, getPlayerStats } from "./calculations.js";

/**
 * Create and append player history modal to the DOM if it doesn't exist
 * Should be called once when the page loads
 */
export function createPlayerHistoryModal() {
    const existingModal = document.getElementById('player-history-modal');
    if (existingModal) return; // Modal already exists in HTML

    const modal = document.createElement('div');
    modal.id = 'player-history-modal';
    modal.className = 'player-history-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="player-history-title">Player History</h3>
                <span class="close-modal" onclick="document.getElementById('player-history-modal').style.display = 'none';">&times;</span>
            </div>
            <div class="modal-body">
                <div id="player-history-content"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePlayerHistoryModal();
        }
    });
}

/**
 * Close the player history modal
 */
export function closePlayerHistoryModal() {
    const modal = document.getElementById('player-history-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Open player history modal with predictions and stats
 * @param {string} userId - The user ID to fetch history for
 * @param {object} db - Firestore database instance
 * @param {object} userDisplayNames - Map of userId to display names
 */
export async function openPlayerHistory(userId, db, userDisplayNames) {
    const modal = document.getElementById('player-history-modal');
    if (!modal) {
        console.error('Player history modal not found. Call createPlayerHistoryModal() first.');
        return;
    }

    console.log('Opening player history for userId:', userId);

    const titleEl = document.getElementById('player-history-title');
    const contentEl = document.getElementById('player-history-content');

    const playerName = userDisplayNames[userId] || userId;
    titleEl.textContent = `${playerName} - Prediction History`;
    contentEl.innerHTML = '<p style="color: #bdbdbd;">Loading predictions...</p>';
    modal.style.display = 'block';

    try {
        // Fetch all predictions for this user
        const predictionsRef = collection(db, 'predictions');
        const predQuery = query(predictionsRef, where('userId', '==', userId));
        const predSnapshot = await getDocs(predQuery);

        const userPredictions = [];
        predSnapshot.forEach(doc => {
            userPredictions.push(doc.data());
        });

        if (userPredictions.length === 0) {
            contentEl.innerHTML = '<p style="color: #bdbdbd;">No predictions found for this player.</p>';
            return;
        }

        // Fetch game details for all predictions
        const gameIds = [...new Set(userPredictions.map(p => p.gameId))];
        const gamesArray = [];
        const gamesMap = {};

        for (let i = 0; i < gameIds.length; i += 10) {
            const batch = gameIds.slice(i, i + 10);
            const gamesQuery = query(collection(db, 'games'), where('__name__', 'in', batch));
            const gamesSnapshot = await getDocs(gamesQuery);
            gamesSnapshot.forEach(doc => {
                const gameData = {
                    id: doc.id,
                    ...doc.data(),
                    // Normalize field names for calculations module
                    status: (doc.data().Status || '').toLowerCase(),
                    homeScore: doc.data().HomeScore,
                    awayScore: doc.data().AwayScore,
                    fecha: doc.data().Fecha
                };
                gamesArray.push(gameData);
                gamesMap[doc.id] = gameData;
            });
        }

        // Normalize predictions for calculations module
        const normalizedPredictions = userPredictions.map(pred => ({
            ...pred,
            userId: userId
        }));

        // Sort predictions by game kick-off time (descending, most recent first)
        normalizedPredictions.sort((a, b) => {
            const gameA = gamesMap[a.gameId];
            const gameB = gamesMap[b.gameId];
            const timeA = gameA && gameA.KickOffTime ? new Date(gameA.KickOffTime).getTime() : -Infinity;
            const timeB = gameB && gameB.KickOffTime ? new Date(gameB.KickOffTime).getTime() : -Infinity;
            return timeB - timeA;
        });

        // Fetch ALL predictions to calculate if this user won any fechas
        const allPredictionsRef = collection(db, 'predictions');
        const allPredSnapshot = await getDocs(allPredictionsRef);
        const allPredictions = [];
        allPredSnapshot.forEach(doc => {
            const pred = doc.data();
            allPredictions.push({
                ...pred,
                status: (gamesMap[pred.gameId]?.Status || '').toLowerCase(),
                homeScore: gamesMap[pred.gameId]?.HomeScore,
                awayScore: gamesMap[pred.gameId]?.AwayScore
            });
        });

        // Use centralized calculatePlayerStats to get proper fechas won count
        const allPlayerStats = calculatePlayerStats(gamesArray, allPredictions);
        const playerStats = getPlayerStats(allPlayerStats, userId) || {
            totalPoints: 0,
            perfectScoresCount: 0,
            fechasWonCount: 0
        };

        // Build stats header with subtle styling
        let html = '<div style="margin-bottom: 20px; padding: 15px; background: linear-gradient(135deg, rgba(0, 229, 255, 0.1) 0%, rgba(118, 255, 3, 0.05) 100%); border-left: 3px solid #00e5ff; border-radius: 4px;">';
        html += '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">';
        html += '<div style="text-align: center;">';
        html += `<div style="font-size: 1.8rem; font-weight: 700; color: #76ff03;">${playerStats.totalPoints}</div>`;
        html += '<div style="font-size: 0.75rem; color: #7e8a99; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Total Points</div>';
        html += '</div>';
        html += '<div style="text-align: center;">';
        html += `<div style="font-size: 1.8rem; font-weight: 700; color: #00e5ff;">${playerStats.perfectScoresCount}</div>`;
        html += '<div style="font-size: 0.75rem; color: #7e8a99; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Perfect Scores</div>';
        html += '</div>';
        html += '<div style="text-align: center;">';
        html += `<div style="font-size: 1.8rem; font-weight: 700; color: #ffeb3b;">${playerStats.fechasWonCount}</div>`;
        html += '<div style="font-size: 0.75rem; color: #7e8a99; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">Fechas Won</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        // Build predictions list
        html += '<div style="max-height: 500px; overflow-y: auto;">';
        normalizedPredictions.forEach(pred => {
            const game = gamesMap[pred.gameId];
            if (!game) return;

            const points = calculatePoints(pred, game);
            const pointsClass = points === null ? 'pending' : points === 10 ? 'perfect' : points >= 7 ? 'high' : points >= 4 ? 'medium' : points > 0 ? 'low' : 'zero';
            const pointsDisplay = points === null ? 'N/A' : `${points}p`;

            const gameDate = new Date(game.KickOffTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            html += `
                <div class="prediction-entry">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #f0f0f0;">${game.HomeTeam} vs ${game.AwayTeam}</div>
                        <div style="font-size: 0.85rem; color: #9e9e9e; margin-top: 4px;">
                            <span>Predicted: ${pred.predictedHomeScore} - ${pred.predictedAwayScore}</span>
                            ${game.Status === 'finished' && game.HomeScore !== null ? ` | Actual: ${game.HomeScore} - ${game.AwayScore}` : ''}
                            <span style="margin-left: 8px; font-size: 0.75rem;">${gameDate}</span>
                        </div>
                        ${game.Fecha ? `<div style="font-size: 0.75rem; color: #7e8a99; margin-top: 2px;">Fecha: ${game.Fecha}</div>` : ''}
                    </div>
                    <span class="score ${pointsClass}">${pointsDisplay}</span>
                </div>
            `;
        });
        html += '</div>';

        contentEl.innerHTML = html;

    } catch (error) {
        console.error("Error loading player history: ", error);
        contentEl.innerHTML = '<p style="color: #ff6b6b;">Error loading player history. Please try again.</p>';
    }
}

/**
 * Render the overall leaderboard table
 * @param {array} sortedPlayers - Array of [userId, stats] tuples
 * @param {object} userNames - Map of userId to display names
 * @param {function} onPlayerClick - Callback when player is clicked
 * @returns {HTMLElement} - The constructed table element
 */
export function renderLeaderboardTable(sortedPlayers, userNames, onPlayerClick) {
    const table = document.createElement('table');
    table.classList.add('table', 'table-dark', 'table-striped', 'table-hover');

    let headerHtml = `
        <thead>
            <tr>
                <th scope="col">#</th>
                <th scope="col">Player</th>
                <th scope="col">Total Points</th>
                <th scope="col" class="text-center">Fechas Won</th>
                <th scope="col" class="text-center">Perfect Scores (10s)</th>
            </tr>
        </thead>
    `;

    let bodyHtml = '<tbody>';
    
    sortedPlayers.forEach(([userId, stats], index) => {
        bodyHtml += `
            <tr style="cursor: pointer;" data-user-id="${userId}" title="Click to view prediction history">
                <th scope="row">${index + 1}</th>
                <td><strong>${userNames[userId] || 'Anonymous'}</strong></td>
                <td><span class="badge badge-light badge-pill">${stats.totalPoints}</span></td>
                <td class="text-center"><span class="badge badge-info">${stats.fechasWonCount}</span></td>
                <td class="text-center"><span class="badge badge-warning">${stats.perfectScoresCount}</span></td>
            </tr>
        `;
    });
    
    bodyHtml += '</tbody>';
    
    table.innerHTML = headerHtml + bodyHtml;

    // Add click handler to table using event delegation
    table.addEventListener('click', (e) => {
        const row = e.target.closest('tr[data-user-id]');
        if (row && onPlayerClick) {
            const userId = row.getAttribute('data-user-id');
            console.log('Row clicked! UserId:', userId);
            onPlayerClick(userId);
        }
    });

    return table;
}

/**
 * Make openPlayerHistory available globally for onclick handlers
 * Call this in your HTML script to set up the global reference
 * @param {function} callback - Function to call when player is clicked
 */
export function setupPlayerClickHandlers(callback) {
    window.openPlayerHistoryGlobal = callback;
    
    // Setup event delegation for player history trigger elements
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.player-history-trigger');
        if (trigger && callback) {
            const userId = trigger.getAttribute('data-user-id');
            if (userId) {
                console.log('Player trigger clicked! UserId:', userId);
                callback(userId);
            }
        }
    });
}
