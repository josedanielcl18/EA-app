/**
 * Admin Panel Module
 * 
 * Handles all admin-related functionality:
 * - Admin form initialization and DOM references
 * - Fixture search integration with TheSportsDB
 * - Game addition to Firestore
 * - Form submission and validation
 * 
 * Usage:
 *   import { initializeAdminPanel } from './admin-panel.js';
 *   await initializeAdminPanel(db, auth, ADMIN_UID);
 */

// Admin DOM References
let adminGameFormSection;
let adminHomeTeamInput;
let adminAwayTeamInput;
let adminLeagueSelect;
let adminKickOffTimeInput;
let adminStatusSelect;
let adminFechaInput;
let adminHomeScoreInput;
let adminAwayScoreInput;
let addGameButton;
let fixtureMessageDiv;
let gameMessageDiv;
let searchFixturesButton;
let fixtureSearchHome;
let fixtureSearchAway;
let fixtureResults;
let fixtureList;
let adminThesportsdbEventId;

// Database references (passed in during initialization)
let db;
let addDocFunction;
let collectionFunction;
let getDocsFunction;
let queryFunction;
let whereFunction;
let docFunction;
let updateDocFunction;

// Update Results DOM References
let updateResultsButton;
let updateResultsLog;
let updateResultsMessage;

/**
 * Initialize admin panel by getting all DOM references
 * @param {object} database - Firestore database instance
 * @param {function} addDoc - Firestore addDoc function
 * @param {function} collection - Firestore collection function
 * @param {object} extraFunctions - Additional Firestore functions for update results
 * @param {function} extraFunctions.getDocs
 * @param {function} extraFunctions.query
 * @param {function} extraFunctions.where
 * @param {function} extraFunctions.doc
 * @param {function} extraFunctions.updateDoc
 */
export function initializeAdminPanel(database, addDoc, collection, extraFunctions = {}) {
    db = database;
    addDocFunction = addDoc;
    collectionFunction = collection;
    getDocsFunction = extraFunctions.getDocs;
    queryFunction = extraFunctions.query;
    whereFunction = extraFunctions.where;
    docFunction = extraFunctions.doc;
    updateDocFunction = extraFunctions.updateDoc;
    
    // Debug logging
    console.log("Admin panel initialized with:");
    console.log("  db:", db ? "✓" : "✗");
    console.log("  addDocFunction:", addDocFunction ? "✓" : "✗");
    console.log("  collectionFunction:", collectionFunction ? "✓" : "✗");
    console.log("  getDocsFunction:", getDocsFunction ? "✓" : "✗");
    console.log("  updateDocFunction:", updateDocFunction ? "✓" : "✗");
    
    // Get all admin form references
    adminGameFormSection = document.getElementById('admin-game-form-section');
    adminHomeTeamInput = document.getElementById('adminHomeTeam');
    adminAwayTeamInput = document.getElementById('adminAwayTeam');
    adminLeagueSelect = document.getElementById('adminLeague');
    adminKickOffTimeInput = document.getElementById('adminKickOffTime');
    adminStatusSelect = document.getElementById('adminStatus');
    adminFechaInput = document.getElementById('adminFecha');
    adminHomeScoreInput = document.getElementById('adminHomeScore');
    adminAwayScoreInput = document.getElementById('adminAwayScore');
    addGameButton = document.getElementById('addGameButton');
    fixtureMessageDiv = document.getElementById('fixtureMessage');
    gameMessageDiv = document.getElementById('gameMessage');
    
    // Get fixture search references
    searchFixturesButton = document.getElementById('searchFixturesButton');
    fixtureSearchHome = document.getElementById('fixtureSearchHome');
    fixtureSearchAway = document.getElementById('fixtureSearchAway');
    fixtureResults = document.getElementById('fixtureResults');
    fixtureList = document.getElementById('fixtureList');
    adminThesportsdbEventId = document.getElementById('adminThesportsdbEventId');
    
    // Get update results references
    updateResultsButton = document.getElementById('updateResultsButton');
    updateResultsLog = document.getElementById('updateResultsLog');
    updateResultsMessage = document.getElementById('updateResultsMessage');
    
    // Attach event listeners
    if (searchFixturesButton) {
        searchFixturesButton.addEventListener('click', handleFixtureSearch);
    }
    if (addGameButton) {
        addGameButton.addEventListener('click', handleAdminGameAdd);
    }
    if (updateResultsButton) {
        updateResultsButton.addEventListener('click', handleUpdateResults);
    }
}

/**
 * Show/hide admin form section
 * @param {boolean} show - Whether to show the form
 */
export function toggleAdminForm(show) {
    if (adminGameFormSection) {
        adminGameFormSection.style.display = show ? 'block' : 'none';
    }
    // Clear any error messages when showing the form
    if (show) {
        if (fixtureMessageDiv) fixtureMessageDiv.textContent = '';
        if (gameMessageDiv) gameMessageDiv.textContent = '';
    }
}

/**
 * Handle admin game addition
 */
export async function handleAdminGameAdd() {
    gameMessageDiv.textContent = 'Adding game...';
    gameMessageDiv.style.color = 'orange';
    addGameButton.disabled = true;

    const homeTeam = adminHomeTeamInput.value.trim();
    const awayTeam = adminAwayTeamInput.value.trim();
    const league = adminLeagueSelect.value;
    const kickOffTimeStr = adminKickOffTimeInput.value;
    const status = adminStatusSelect.value;
    const fecha = adminFechaInput.value.trim();
    const homeScore = adminHomeScoreInput.value ? parseInt(adminHomeScoreInput.value, 10) : null;
    const awayScore = adminAwayScoreInput.value ? parseInt(adminAwayScoreInput.value, 10) : null;
    const thesportsdbEventId = adminThesportsdbEventId.value || null;

    // Basic validation
    if (!homeTeam || !awayTeam || !league || !kickOffTimeStr || !status) {
        gameMessageDiv.textContent = 'Please fill in all required fields (Teams, League, Kick-off Time, Status).';
        gameMessageDiv.style.color = 'red';
        addGameButton.disabled = false;
        return;
    }
    if (!fecha) {
        gameMessageDiv.textContent = '⚠️ Please enter the Fecha (Game Week) - e.g., GW1, GW2, etc.';
        gameMessageDiv.style.color = 'orange';
        addGameButton.disabled = false;
        return;
    }
    if (homeTeam === awayTeam) {
        gameMessageDiv.textContent = 'Home Team and Away Team cannot be the same.';
        gameMessageDiv.style.color = 'red';
        addGameButton.disabled = false;
        return;
    }

    try {
        const kickOffTime = new Date(kickOffTimeStr);
        if (isNaN(kickOffTime.getTime())) {
            gameMessageDiv.textContent = 'Invalid Kick-off Time.';
            gameMessageDiv.style.color = 'red';
            addGameButton.disabled = false;
            return;
        }

        const gameData = {
            HomeTeam: homeTeam,
            AwayTeam: awayTeam,
            KickOffTime: kickOffTime.toISOString(),
            League: league,
            Status: status,
            Fecha: fecha,
        };

        // Add thesportsdbEventId if available
        if (thesportsdbEventId) {
            gameData.thesportsdbEventId = thesportsdbEventId;
        }

        if (status === 'finished' || status === 'live') {
            gameData.HomeScore = homeScore;
            gameData.AwayScore = awayScore;
        } else {
            gameData.HomeScore = null;
            gameData.AwayScore = null;
        }

        // Use the Firestore functions passed during initialization
        console.log("Before adding game - checking functions:");
        console.log("  addDocFunction:", addDocFunction ? "✓" : "✗");
        console.log("  collectionFunction:", collectionFunction ? "✓" : "✗");
        console.log("  db:", db ? "✓" : "✗");
        
        if (!addDocFunction || !collectionFunction) {
            throw new Error("Firestore functions not initialized. This is a bug in the initialization code.");
        }
        
        await addDocFunction(collectionFunction(db, 'games'), gameData);
        gameMessageDiv.textContent = 'Game added successfully!';
        gameMessageDiv.style.color = 'green';

        // Clear form for next entry
        clearAdminForm();
        
        // Notify parent that data was updated
        window.dispatchEvent(new Event('adminGameAdded'));

    } catch (error) {
        console.error("Error adding game: ", error);
        gameMessageDiv.textContent = `Error adding game: ${error.message}`;
        gameMessageDiv.style.color = 'red';
    } finally {
        addGameButton.disabled = false;
    }
}

/**
 * Handle fixture search from TheSportsDB
 */
export async function handleFixtureSearch() {
    const homeTeam = fixtureSearchHome.value.trim();
    const awayTeam = fixtureSearchAway.value.trim();

    if (!homeTeam || !awayTeam) {
        fixtureMessageDiv.textContent = 'Please enter both home and away team names';
        fixtureMessageDiv.style.color = 'red';
        return;
    }

    try {
        fixtureMessageDiv.textContent = 'Searching fixtures...';
        fixtureMessageDiv.style.color = 'blue';
        fixtureList.innerHTML = '';

        // Dynamically import the fixture search module
        const { searchFixture } = await import('../firebase-uploader/src/fetchFixtures.js');
        const fixtures = await searchFixture(homeTeam, awayTeam);

        if (!fixtures || fixtures.length === 0) {
            fixtureMessageDiv.textContent = 'No fixtures found for this match';
            fixtureMessageDiv.style.color = 'orange';
            fixtureResults.style.display = 'none';
            return;
        }

        // Display fixtures
        fixtureList.innerHTML = '';
        fixtures.forEach((fixture, index) => {
            const fixtureButton = document.createElement('button');
            fixtureButton.type = 'button';
            fixtureButton.className = 'list-group-item list-group-item-action';
            fixtureButton.innerHTML = `
                <div class="text-center">
                    <strong>${fixture.HomeTeam} vs ${fixture.AwayTeam}</strong><br>
                    <small>${new Date(fixture.KickOffTime).toLocaleString()}</small><br>
                    <small class="text-muted">${fixture.League}</small>
                </div>
            `;
            fixtureButton.addEventListener('click', () => selectFixture(fixture));
            fixtureList.appendChild(fixtureButton);
        });

        fixtureResults.style.display = 'block';
        fixtureMessageDiv.textContent = `Found ${fixtures.length} fixture(s)`;
        fixtureMessageDiv.style.color = 'green';

    } catch (error) {
        console.error('Error searching fixtures:', error);
        fixtureMessageDiv.textContent = `Error searching fixtures: ${error.message}`;
        fixtureMessageDiv.style.color = 'red';
        fixtureResults.style.display = 'none';
    }
}

/**
 * Select a fixture and populate the form
 * @param {object} fixture - Fixture object from searchFixture
 */
export function selectFixture(fixture) {
    adminHomeTeamInput.value = fixture.HomeTeam;
    adminAwayTeamInput.value = fixture.AwayTeam;
    adminLeagueSelect.value = fixture.League;
    
    // Convert ISO string to datetime-local format
    const date = new Date(fixture.KickOffTime);
    const localDateTime = date.toISOString().slice(0, 16);
    adminKickOffTimeInput.value = localDateTime;
    
    adminThesportsdbEventId.value = fixture.thesportsdbEventId;
    
    // Hide results
    fixtureResults.style.display = 'none';
    fixtureMessageDiv.textContent = `Fixture selected: ${fixture.HomeTeam} vs ${fixture.AwayTeam}`;
    fixtureMessageDiv.style.color = 'green';
    
    // Scroll to form section
    const fixtureSearchSection = document.querySelector('.fixture-search-section');
    if (fixtureSearchSection) {
        fixtureSearchSection.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * Handle "Update All Results" — queries Firestore for pending games with
 * a thesportsdbEventId, checks the API for final scores, and updates Firestore.
 * 
 * This is the same logic that the GitHub Actions cron job will replicate
 * server-side using firebase-admin + the same TheSportsDB endpoint.
 */
export async function handleUpdateResults() {
    if (!getDocsFunction || !queryFunction || !whereFunction || !docFunction || !updateDocFunction) {
        console.error('Firestore query/update functions not initialized');
        if (updateResultsMessage) {
            updateResultsMessage.textContent = 'Error: Firestore functions not initialized.';
            updateResultsMessage.className = 'mt-2 text-center text-danger';
        }
        return;
    }

    updateResultsButton.disabled = true;
    updateResultsButton.textContent = 'Checking results...';
    updateResultsMessage.textContent = '';
    updateResultsMessage.className = 'mt-2 text-center';
    updateResultsLog.innerHTML = '';

    const addLogEntry = (message, type = 'info') => {
        const colors = { info: '#6c757d', success: '#198754', warning: '#ffc107', error: '#dc3545', skip: '#0dcaf0' };
        const entry = document.createElement('div');
        entry.style.cssText = `padding: 4px 8px; font-size: 0.85rem; color: ${colors[type] || colors.info}; border-left: 3px solid ${colors[type] || colors.info}; margin-bottom: 4px; background: #f8f9fa;`;
        entry.textContent = message;
        updateResultsLog.appendChild(entry);
        updateResultsLog.scrollTop = updateResultsLog.scrollHeight;
    };

    try {
        // 1. Query games that are still upcoming (finished games are never touched)
        addLogEntry('Querying Firestore for upcoming games...');
        const gamesRef = collectionFunction(db, 'games');
        const q = queryFunction(gamesRef, whereFunction('Status', '==', 'upcoming'));
        const snapshot = await getDocsFunction(q);

        if (snapshot.empty) {
            addLogEntry('No upcoming games found.', 'warning');
            updateResultsMessage.textContent = 'No upcoming games to check.';
            updateResultsMessage.className = 'mt-2 text-center text-warning';
            return;
        }

        // 2. Filter to games that have a thesportsdbEventId and kick-off is in the past
        const now = new Date();
        const pendingGames = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const eventId = data.thesportsdbEventId;
            const kickOff = data.KickOffTime ? new Date(data.KickOffTime) : null;

            if (!eventId) {
                addLogEntry(`⏭️ ${data.HomeTeam} vs ${data.AwayTeam} — no event ID, skipping`, 'skip');
                return;
            }
            if (kickOff && kickOff > now) {
                addLogEntry(`⏭️ ${data.HomeTeam} vs ${data.AwayTeam} — hasn't kicked off yet`, 'skip');
                return;
            }

            pendingGames.push({ id: docSnap.id, ...data });
        });

        if (pendingGames.length === 0) {
            addLogEntry('All pending games either lack event IDs or haven\'t kicked off.', 'warning');
            updateResultsMessage.textContent = 'No games ready for result updates.';
            updateResultsMessage.className = 'mt-2 text-center text-warning';
            return;
        }

        addLogEntry(`Found ${pendingGames.length} game(s) to check...`);

        // 3. Look up each event via TheSportsDB API
        const { lookupEventById } = await import('../firebase-uploader/src/fetchFixtures.js');

        let updatedCount = 0;
        let notFinishedCount = 0;
        let errorCount = 0;

        for (const game of pendingGames) {
            const label = `${game.HomeTeam} vs ${game.AwayTeam}`;
            addLogEntry(`🔍 Checking: ${label} (event ${game.thesportsdbEventId})...`);

            const result = await lookupEventById(game.thesportsdbEventId);

            if (!result) {
                addLogEntry(`❌ ${label} — API lookup failed`, 'error');
                errorCount++;
                continue;
            }

            if (!result.isFinished) {
                addLogEntry(`⏳ ${label} — not finished yet (status: ${result.status || 'unknown'})`, 'warning');
                notFinishedCount++;
                continue;
            }

            // 4. Update Firestore with the final score
            const gameRef = docFunction(db, 'games', game.id);
            await updateDocFunction(gameRef, {
                HomeScore: result.homeScore,
                AwayScore: result.awayScore,
                Status: 'finished',
            });

            addLogEntry(`✅ ${label} — updated: ${result.homeScore}-${result.awayScore}`, 'success');
            updatedCount++;
        }

        // 5. Summary
        const summary = `Done! Updated: ${updatedCount} | Not finished: ${notFinishedCount} | Errors: ${errorCount}`;
        addLogEntry(summary, updatedCount > 0 ? 'success' : 'info');
        updateResultsMessage.textContent = summary;
        updateResultsMessage.className = `mt-2 text-center ${updatedCount > 0 ? 'text-success' : 'text-info'}`;

        // Notify parent that data was updated (so game lists refresh)
        if (updatedCount > 0) {
            window.dispatchEvent(new Event('adminGameAdded'));
        }

    } catch (error) {
        console.error('Error updating results:', error);
        addLogEntry(`Fatal error: ${error.message}`, 'error');
        updateResultsMessage.textContent = `Error: ${error.message}`;
        updateResultsMessage.className = 'mt-2 text-center text-danger';
    } finally {
        updateResultsButton.disabled = false;
        updateResultsButton.textContent = '🔄 Update All Results';
    }
}

/**
 * Clear the admin form
 */
function clearAdminForm() {
    adminHomeTeamInput.value = "";
    adminAwayTeamInput.value = "";
    adminLeagueSelect.value = "";
    adminStatusSelect.value = "upcoming";
    adminFechaInput.value = '';
    adminHomeScoreInput.value = "";
    adminAwayScoreInput.value = "";
    adminThesportsdbEventId.value = "";
    fixtureSearchHome.value = "";
    fixtureSearchAway.value = "";
    fixtureResults.style.display = 'none';
}

/**
 * Populate admin dropdowns from Firestore data
 * Uses global allLeagues variable from index.html
 */
export async function populateAdminDropdowns() {
    try {
        // Populate league dropdown
        if (!adminLeagueSelect) {
            console.warn('adminLeagueSelect not found - form may not be initialized yet');
            if (adminMessageDiv) {
                adminMessageDiv.textContent = 'Admin form elements not initialized.';
                adminMessageDiv.style.color = 'orange';
            }
            return;
        }

        adminLeagueSelect.innerHTML = '';
        const defaultLeagueOption = document.createElement('option');
        defaultLeagueOption.value = "";
        defaultLeagueOption.textContent = "Select league";
        defaultLeagueOption.disabled = true;
        defaultLeagueOption.selected = true;
        adminLeagueSelect.appendChild(defaultLeagueOption);

        const desiredLeagues = [
            "Premier League",
            "La Liga",
            "Bundesliga",
            "Serie A",
            "Ligue 1",
            "Champions League",
            "Europa League",
            "Conmebol",
            "World Cup",
            "Copa America",
            "Eurocopa",
            "International Friendlies"
        ];

        desiredLeagues.forEach(leagueName => {
            const option = document.createElement('option');
            option.value = leagueName;
            option.textContent = leagueName;
            adminLeagueSelect.appendChild(option);
        });

        // Set default kick-off time
        if (adminKickOffTimeInput) {
            const now = new Date();
            now.setHours(now.getHours() + 24);
            const isoString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, -8);
            adminKickOffTimeInput.value = isoString;
        }

        console.log('Admin dropdowns populated successfully');

    } catch (error) {
        console.error("Error populating admin dropdowns:", error);
        if (gameMessageDiv) {
            gameMessageDiv.textContent = `Error loading admin form data: ${error.message}`;
            gameMessageDiv.style.color = 'red';
        }
        throw error; // Re-throw so caller knows there was an error
    }
}

/**
 * Populate league dropdown (legacy - for direct use)
 * @param {array} leagues - Array of league objects or names
 */
export function populateLeagueDropdown(leagues) {
    if (!adminLeagueSelect) return;
    
    adminLeagueSelect.innerHTML = '<option value="">Select League</option>';
    if (Array.isArray(leagues)) {
        leagues.forEach(league => {
            const leagueName = typeof league === 'string' ? league : league.name || league;
            const option = document.createElement('option');
            option.value = leagueName;
            option.textContent = leagueName;
            adminLeagueSelect.appendChild(option);
        });
    }
}

/**
 * Populate team datalist for autocomplete on text inputs
 * @param {array} teams - Array of team objects or names
 */
export function populateTeamDatalist(teams) {
    console.log("populateTeamDatalist called with teams:", teams);
    
    const datalist = document.getElementById('teamNamesList');
    if (!datalist) {
        console.warn("Datalist element 'teamNamesList' not found in DOM");
        return;
    }
    
    // Clear existing options
    datalist.innerHTML = '';
    
    // Add all team names as options
    if (Array.isArray(teams) && teams.length > 0) {
        teams.forEach(team => {
            const teamName = typeof team === 'string' ? team : team.name || team;
            if (teamName) {
                const option = document.createElement('option');
                option.value = teamName;
                datalist.appendChild(option);
            }
        });
        console.log(`✓ Added ${teams.length} teams to datalist`);
    } else {
        console.warn("No teams provided to populateTeamDatalist");
    }
}
