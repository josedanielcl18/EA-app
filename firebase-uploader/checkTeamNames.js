/**
 * Check Firestore team names against TheSportsDB API canonical names.
 * Reports any mismatches so you can fix them at the source.
 *
 * Usage:
 *   node checkTeamNames.js               # Pull from Firestore, save cache, check all
 *   node checkTeamNames.js --cache        # Use cached teams (skip Firestore read)
 *   node checkTeamNames.js --resume       # Resume from last saved progress
 *   node checkTeamNames.js --cache --resume
 *   node checkTeamNames.js --reset        # Clear progress and start fresh
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// node-fetch v3 is ESM-only — resolve it once at startup
const fetchPromise = import('node-fetch').then(mod => mod.default);

const SERVICE_ACCOUNT_KEY_PATH = './serviceAccountKey.json';
const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);

const THESPORTSDB_API_KEY = '123';
const THESPORTSDB_BASE_URL = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}`;
const REQUEST_DELAY_MS = 2200;  // ~27 req/min to stay under free-tier rate limit
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;
const CACHE_FILE = path.join(__dirname, 'teams_cache.json');
const PROGRESS_FILE = path.join(__dirname, 'teams_progress.json');

// Parse CLI args
const args = process.argv.slice(2);
const useCache = args.includes('--cache');
const useResume = args.includes('--resume');
const useReset = args.includes('--reset');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}
const db = admin.firestore();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Load saved progress, if any.
 */
function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
    }
    return { checkedIds: [], results: { matches: [], mismatches: [], notFound: [] } };
}

/**
 * Save progress to disk so we can resume later.
 */
function saveProgress(checkedIds, results) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ checkedIds, results }, null, 2));
}

/**
 * Fetch and classify a single team name against the API.
 * Retries on 429 (rate limit) with exponential backoff.
 */
async function checkSingleTeam(team, results, fetch) {
    const name = team.name;
    if (!name) {
        results.notFound.push({ id: team.id, firestoreName: '(no name field)', apiName: null });
        return;
    }

    const url = `${THESPORTSDB_BASE_URL}/searchteams.php?t=${encodeURIComponent(name)}`;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(url);

            if (response.status === 429) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
                process.stdout.write('⏳');
                await sleep(delay);
                continue;
            }

            if (!response.ok) {
                results.notFound.push({ id: team.id, firestoreName: name, apiName: `HTTP ${response.status}` });
                return;
            }

            const data = await response.json();
            if (!data.teams || data.teams.length === 0) {
                results.notFound.push({ id: team.id, firestoreName: name, apiName: null });
                return;
            }

            // Find the first Soccer, non-academy team
            const soccerTeam = data.teams.find(
                t => t.strSport === 'Soccer' && !t.strTeam.toLowerCase().includes('academy')
            );

            if (!soccerTeam) {
                results.notFound.push({ id: team.id, firestoreName: name, apiName: '(no soccer team in results)' });
                return;
            }

            if (soccerTeam.strTeam === name) {
                results.matches.push({ id: team.id, name });
                process.stdout.write('.');
            } else {
                results.mismatches.push({
                    id: team.id,
                    firestoreName: name,
                    apiName: soccerTeam.strTeam
                });
                process.stdout.write('X');
            }
            return;
        } catch (err) {
            if (attempt === MAX_RETRIES) {
                results.notFound.push({ id: team.id, firestoreName: name, apiName: `Error: ${err.message}` });
                process.stdout.write('!');
            } else {
                await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
            }
        }
    }
}

async function checkTeamNames() {
    const fetch = await fetchPromise;

    let teams;

    if (useCache && fs.existsSync(CACHE_FILE)) {
        console.log(`Loading teams from cache: ${CACHE_FILE}\n`);
        teams = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } else {
        console.log('Fetching all teams from Firestore...\n');
        const snapshot = await db.collection('teams').get();
        teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Save to local cache
        fs.writeFileSync(CACHE_FILE, JSON.stringify(teams, null, 2));
        console.log(`Saved ${teams.length} teams to ${CACHE_FILE}\n`);
    }

    // Deduplicate by team name — skip teams whose name was already checked
    const seen = new Set();
    const uniqueTeams = [];
    const skipped = [];
    for (const team of teams) {
        if (team.name && seen.has(team.name)) {
            skipped.push(team);
        } else {
            if (team.name) seen.add(team.name);
            uniqueTeams.push(team);
        }
    }

    // Load or reset progress
    let progress;
    if (useReset) {
        progress = { checkedIds: [], results: { matches: [], mismatches: [], notFound: [] } };
        if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);
        console.log('Progress reset.\n');
    } else if (useResume) {
        progress = loadProgress();
        console.log(`Resuming — ${progress.checkedIds.length} teams already checked.\n`);
    } else {
        progress = { checkedIds: [], results: { matches: [], mismatches: [], notFound: [] } };
    }

    const checkedSet = new Set(progress.checkedIds);
    const remaining = uniqueTeams.filter(t => !checkedSet.has(t.id));

    console.log(`Found ${teams.length} teams (${uniqueTeams.length} unique, ${skipped.length} duplicates skipped).`);
    console.log(`${remaining.length} teams remaining to check.\n`);

    const results = progress.results;
    const checkedIds = [...progress.checkedIds];

    // Process sequentially with delay to respect free-tier rate limit
    for (let i = 0; i < remaining.length; i++) {
        const team = remaining[i];
        process.stdout.write(`[${i + 1}/${remaining.length}] ${team.name || '(no name)'}: `);
        await checkSingleTeam(team, results, fetch);
        process.stdout.write('\n');

        checkedIds.push(team.id);
        saveProgress(checkedIds, results);

        // Delay before next request (skip after last one)
        if (i < remaining.length - 1) {
            await sleep(REQUEST_DELAY_MS);
        }
    }

    // Clean up progress file on completion
    if (fs.existsSync(PROGRESS_FILE)) fs.unlinkSync(PROGRESS_FILE);

    console.log('\n');

    // --- Report ---
    const { matches, mismatches, notFound } = results;
    console.log(`=== RESULTS ===`);
    console.log(`✓ Matching: ${matches.length}`);
    console.log(`✗ Mismatches: ${mismatches.length}`);
    console.log(`? Not found: ${notFound.length}\n`);

    if (mismatches.length > 0) {
        console.log('--- MISMATCHES (Firestore name → API name) ---');
        mismatches.forEach(m => {
            console.log(`  ${m.id}: "${m.firestoreName}" → "${m.apiName}"`);
        });
        console.log('');
    }

    if (notFound.length > 0) {
        console.log('--- NOT FOUND ON API ---');
        notFound.forEach(n => {
            console.log(`  ${n.id}: "${n.firestoreName}" (${n.apiName || 'no results'})`);
        });
        console.log('');
    }

    process.exit(0);
}

checkTeamNames().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
