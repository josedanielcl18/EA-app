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

/**
 * Initialize admin panel by getting all DOM references
 * @param {object} database - Firestore database instance
 * @param {function} addDoc - Firestore addDoc function
 * @param {function} collection - Firestore collection function
 */
export function initializeAdminPanel(database, addDoc, collection) {
    db = database;
    addDocFunction = addDoc;
    collectionFunction = collection;
    
    // Debug logging
    console.log("Admin panel initialized with:");
    console.log("  db:", db ? "✓" : "✗");
    console.log("  addDocFunction:", addDocFunction ? "✓" : "✗");
    console.log("  collectionFunction:", collectionFunction ? "✓" : "✗");
    
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
    
    // Attach event listeners
    if (searchFixturesButton) {
        searchFixturesButton.addEventListener('click', handleFixtureSearch);
    }
    if (addGameButton) {
        addGameButton.addEventListener('click', handleAdminGameAdd);
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
