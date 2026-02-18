// populateFirestoreFromAPI.js (conceptually, though filename is still uploadLogos.js)
const admin = require('firebase-admin');
//const fetch = require('node-fetch'); // Import node-fetch for API calls
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));


// --- Configuration ---
// IMPORTANT: Replace with the actual path to your downloaded service account key
const SERVICE_ACCOUNT_KEY_PATH = './serviceAccountKey.json'; // Ensure this matches your file name
const serviceAccount = require(SERVICE_ACCOUNT_KEY_PATH);

// TheSportsDB API Configuration
const THESPORTSDB_API_KEY = '123'; // Your free API key from TheSportsDB
//const THESPORTSDB_API_KEY = '3'; // Your free API key from TheSportsDB
const THESPORTSDB_BASE_URL = `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_API_KEY}`;

// Firestore Collection Names
const TEAMS_COLLECTION_NAME = 'teams';
const NATIONAL_LEAGUES_COLLECTION_NAME = 'nationalLeagues';

// --- Helper function to introduce a delay ---
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Data for National Leagues (matching Firestore collection 'nationalLeagues') ---
const nationalLeaguesData = [
    { id: "premier_league", name: "Premier League", country: "England", priority: 1 },
    { id: "la_liga", name: "La Liga", country: "Spain", priority: 1 },
    { id: "serie_a", name: "Serie A", country: "Italy", priority: 2 },
    { id: "bundesliga", name: "Bundesliga", country: "Germany", priority: 2 },
    { id: "ligue_1", name: "Ligue 1", country: "France", priority: 2 },
    { id: "international_teams", name: "International National Teams", country: "World", priority: 3 },
    { id: "other_european_clubs", name: "Other European Clubs", country: "Europe", priority: 4 },
];

// --- Data for Teams (matching Firestore collection 'teams') ---
const teamsData = [
    // --- Premier League Teams (2024-2025 Season) ---
    // { id: "arsenal", name: "Arsenal", nationalLeagueId: "premier_league" },
    // { id: "aston_villa", name: "Aston Villa", nationalLeagueId: "premier_league" },
    // { id: "afc_bournemouth", name: "Bournemouth", nationalLeagueId: "premier_league" },
    // { id: "brentford", name: "Brentford", nationalLeagueId: "premier_league" },
    // { id: "brighton_hove_albion", name: "Brighton and Hove Albion", nationalLeagueId: "premier_league" },
    // { id: "chelsea", name: "Chelsea", nationalLeagueId: "premier_league" },
    // { id: "crystal_palace", name: "Crystal Palace", nationalLeagueId: "premier_league" },
    // { id: "everton", name: "Everton", nationalLeagueId: "premier_league" },
    // { id: "fulham", name: "Fulham", nationalLeagueId: "premier_league" },
    // { id: "ipswich_town", name: "Ipswich Town", nationalLeagueId: "premier_league" }, // Promoted
    // { id: "leicester_city", name: "Leicester City", nationalLeagueId: "premier_league" }, // Promoted
    // { id: "liverpool", name: "Liverpool", nationalLeagueId: "premier_league" },
    // { id: "manchester_city", name: "Manchester City", nationalLeagueId: "premier_league" },
    // { id: "manchester_united", name: "Manchester United", nationalLeagueId: "premier_league" },
    // { id: "newcastle_united", name: "Newcastle United", nationalLeagueId: "premier_league" },
    // { id: "nottingham_forest", name: "Nottingham Forest", nationalLeagueId: "premier_league" },
    // { id: "southampton", name: "Southampton", nationalLeagueId: "premier_league" }, // Promoted
    // { id: "tottenham_hotspur", name: "Tottenham Hotspur", nationalLeagueId: "premier_league" },
    // { id: "west_ham_united", name: "West Ham United", nationalLeagueId: "premier_league" },
    // { id: "wolverhampton_wanderers", name: "Wolverhampton Wanderers", nationalLeagueId: "premier_league" },

    // // --- La Liga Teams (2024-2025 Season) ---
    // { id: "deportivo_alaves", name: "Deportivo Alavés", nationalLeagueId: "la_liga" },
    // { id: "athletic_bilbao", name: "Athletic Bilbao", nationalLeagueId: "la_liga" },
    // { id: "atletico_madrid", name: "Atlético Madrid", nationalLeagueId: "la_liga" },
    // { id: "barcelona", name: "Barcelona", nationalLeagueId: "la_liga" },
    // { id: "real_betis", name: "Real Betis", nationalLeagueId: "la_liga" },
    // { id: "celta_vigo", name: "Celta Vigo", nationalLeagueId: "la_liga" },
    // { id: "eibar", name: "Eibar", nationalLeagueId: "la_liga" }, // Promoted
    // { id: "rcd_espanyol", name: "Espanyol", nationalLeagueId: "la_liga" }, // Promoted
    // { id: "getafe", name: "Getafe", nationalLeagueId: "la_liga" },
    // { id: "girona", name: "Girona", nationalLeagueId: "la_liga" },
    // { id: "las_palmas", name: "Las Palmas", nationalLeagueId: "la_liga" },
    // { id: "leganes", name: "Leganés", nationalLeagueId: "la_liga" }, // Promoted
    // { id: "mallorca", name: "Mallorca", nationalLeagueId: "la_liga" },
    // { id: "osasuna", name: "Osasuna", nationalLeagueId: "la_liga" },
    // { id: "rayo_vallecano", name: "Rayo Vallecano", nationalLeagueId: "la_liga" },
    // { id: "real_madrid", name: "Real Madrid", nationalLeagueId: "la_liga" },
    // { id: "real_sociedad", name: "Real Sociedad", nationalLeagueId: "la_liga" },
    // { id: "sevilla", name: "Sevilla", nationalLeagueId: "la_liga" },
    // { id: "valencia", name: "Valencia", nationalLeagueId: "la_liga" },
    // { id: "villarreal", name: "Villarreal", nationalLeagueId: "la_liga" },

    // // --- Serie A Teams (2024-2025 Season) ---
    // { id: "atalanta", name: "Atalanta", nationalLeagueId: "serie_a" },
    // { id: "bologna", name: "Bologna", nationalLeagueId: "serie_a" },
    // { id: "cagliari", name: "Cagliari", nationalLeagueId: "serie_a" },
    // { id: "como", name: "Como", nationalLeagueId: "serie_a" }, // Promoted
    // { id: "empoli", name: "Empoli", nationalLeagueId: "serie_a" },
    // { id: "fiorentina", name: "Fiorentina", nationalLeagueId: "serie_a" },
    // { id: "genoa", name: "Genoa", nationalLeagueId: "serie_a" },
    // { id: "hellas_verona", name: "Hellas Verona", nationalLeagueId: "serie_a" },
    // { id: "inter_milan", name: "Inter Milan", nationalLeagueId: "serie_a" },
    // { id: "juventus", name: "Juventus", nationalLeagueId: "serie_a" },
    // { id: "lazio", name: "Lazio", nationalLeagueId: "serie_a" },
    // { id: "lecce", name: "Lecce", nationalLeagueId: "serie_a" },
    // { id: "ac_milan", name: "AC Milan", nationalLeagueId: "serie_a" },
    // { id: "monza", name: "Monza", nationalLeagueId: "serie_a" },
    // { id: "napoli", name: "Napoli", nationalLeagueId: "serie_a" },
    // { id: "parma", name: "Parma", nationalLeagueId: "serie_a" }, // Promoted
    // { id: "roma", name: "Roma", nationalLeagueId: "serie_a" },
    // { id: "sampdoria", name: "Sampdoria", nationalLeagueId: "serie_a" }, // Promoted (assuming they win playoffs or are 3rd promoted)
    // { id: "torino", name: "Torino", nationalLeagueId: "serie_a" },
    // { id: "udinese", name: "Udinese", nationalLeagueId: "serie_a" },
    // { id: "venezia", name: "Venezia", nationalLeagueId: "serie_a" }, // Promoted (assuming they win playoffs)


    // // --- Bundesliga Teams (Top 10 from 2023-2024 Season) ---
    // { id: "bayern_munich", name: "Bayern Munich", nationalLeagueId: "bundesliga" },
    // { id: "bayer_leverkusen", name: "Bayer Leverkusen", nationalLeagueId: "bundesliga" },
    { id: "stuttgart", name: "Stuttgart", nationalLeagueId: "bundesliga" },
    // { id: "rb_leipzig", name: "RB Leipzig", nationalLeagueId: "bundesliga" },
    // { id: "borussia_dortmund", name: "Borussia Dortmund", nationalLeagueId: "bundesliga" },
    // { id: "eintracht_frankfurt", name: "Eintracht Frankfurt", nationalLeagueId: "bundesliga" },
    // { id: "tsg_hoffenheim", name: "TSG Hoffenheim", nationalLeagueId: "bundesliga" },
    // { id: "sc_freiburg", name: "SC Freiburg", nationalLeagueId: "bundesliga" },
    // { id: "fc_augsburg", name: "FC Augsburg", nationalLeagueId: "bundesliga" },
    // { id: "vfl_wolfsburg", name: "VfL Wolfsburg", nationalLeagueId: "bundesliga" },

    // // --- Ligue 1 Teams (Top 10 from 2023-2024 Season) ---
    // { id: "psg", name: "PSG", nationalLeagueId: "ligue_1" },
    // { id: "monaco", name: "Monaco", nationalLeagueId: "ligue_1" },
    // { id: "brest", name: "Brest", nationalLeagueId: "ligue_1" },
    // { id: "lille", name: "Lille", nationalLeagueId: "ligue_1" },
    // { id: "nice", name: "Nice", nationalLeagueId: "ligue_1" },
    // { id: "olympique_lyonnais", name: "Olympique Lyonnais", nationalLeagueId: "ligue_1" },
    // { id: "rc_lens", name: "RC Lens", nationalLeagueId: "ligue_1" },
    // { id: "olympique_marseille", name: "Olympique Marseille", nationalLeagueId: "ligue_1" },
    { id: "rennes", name: "Rennes", nationalLeagueId: "ligue_1" },
    { id: "stade-de-reims", name: "Stade de Reims", nationalLeagueId: "ligue_1" },

    // // --- International National Teams (already uploaded) ---
    // { id: "argentina", name: "Argentina", nationalLeagueId: "international_teams" },
    // { id: "bolivia", name: "Bolivia", nationalLeagueId: "international_teams" },
    // { id: "brazil", name: "Brazil", nationalLeagueId: "international_teams" },
    // { id: "chile", name: "Chile", nationalLeagueId: "international_teams" },
    // { id: "colombia", name: "Colombia", nationalLeagueId: "international_teams" },
    // { id: "ecuador", name: "Ecuador", nationalLeagueId: "international_teams" },
    // { id: "paraguay", name: "Paraguay", nationalLeagueId: "international_teams" },
    // { id: "peru", name: "Peru", nationalLeagueId: "international_teams" },
    // { id: "uruguay", name: "Uruguay", nationalLeagueId: "international_teams" },
    // { id: "venezuela", name: "Venezuela", nationalLeagueId: "international_teams" },
    // { id: "france", name: "France", nationalLeagueId: "international_teams" },
    // { id: "england", name: "England", nationalLeagueId: "international_teams" },
    // { id: "belgium", name: "Belgium", nationalLeagueId: "international_teams" },
    // { id: "portugal", name: "Portugal", nationalLeagueId: "international_teams" },
    // { id: "netherlands", name: "Netherlands", nationalLeagueId: "international_teams" },
    // { id: "spain", name: "Spain", nationalLeagueId: "international_teams" },
    // { id: "italy", name: "Italy", nationalLeagueId: "international_teams" },
    // { id: "croatia", name: "Croatia", nationalLeagueId: "international_teams" },
    // { id: "germany", name: "Germany", nationalLeagueId: "international_teams" },
    // { id: "usa", name: "USA", nationalLeagueId: "international_teams" },
    // { id: "mexico", name: "Mexico", nationalLeagueId: "international_teams" },
    // { id: "canada", name: "Canada", nationalLeagueId: "international_teams" },
    // { id: "japan", name: "Japan", nationalLeagueId: "international_teams" },
    // { id: "south_korea", name: "South Korea", nationalLeagueId: "international_teams" },
    // { id: "senegal", name: "Senegal", nationalLeagueId: "international_teams" },
    // { id: "morocco", name: "Morocco", nationalLeagueId: "international_teams" },
    // { id: "switzerland", name: "Switzerland", nationalLeagueId: "international_teams" },
    // { id: "denmark", name: "Denmark", nationalLeagueId: "international_teams" },
    // { id: "poland", name: "Poland", nationalLeagueId: "international_teams" },
    // { id: "serbia", name: "Serbia", nationalLeagueId: "international_teams" },
    // { id: "ghana", name: "Ghana", nationalLeagueId: "international_teams" },
    // { id: "cameroon", name: "Cameroon", nationalLeagueId: "international_teams" },
    // { id: "saudi_arabia", name: "Saudi Arabia", nationalLeagueId: "international_teams" },
    // { id: "qatar", name: "Qatar", nationalLeagueId: "international_teams" },
    // { id: "australia", name: "Australia", nationalLeagueId: "international_teams" },

    // --- 2026 World Cup: NEW qualified teams to upload ---
    // { id: "iran", name: "Iran", nationalLeagueId: "international_teams" },
    // { id: "uzbekistan", name: "Uzbekistan", nationalLeagueId: "international_teams" },
    // { id: "jordan", name: "Jordan", nationalLeagueId: "international_teams" },
    // { id: "new-zealand", name: "New Zealand", nationalLeagueId: "international_teams" },
    // { id: "tunisia", name: "Tunisia", nationalLeagueId: "international_teams" },
    // { id: "egypt", name: "Egypt", nationalLeagueId: "international_teams" },
    // { id: "algeria", name: "Algeria", nationalLeagueId: "international_teams" },
    // { id: "cape-verde", name: "Cape Verde", nationalLeagueId: "international_teams" },
    // { id: "south-africa", name: "South Africa", nationalLeagueId: "international_teams" },
    // { id: "ivory-coast", name: "Ivory Coast", nationalLeagueId: "international_teams" },
    // { id: "panama", name: "Panama", nationalLeagueId: "international_teams" },
    // { id: "haiti", name: "Haiti", nationalLeagueId: "international_teams" },
    // { id: "curacao", name: "Curacao", nationalLeagueId: "international_teams" },
    // { id: "scotland", name: "Scotland", nationalLeagueId: "international_teams" },
    // { id: "norway", name: "Norway", nationalLeagueId: "international_teams" },
    // { id: "austria", name: "Austria", nationalLeagueId: "international_teams" },

    // --- 2026 World Cup: Playoff teams (UEFA second round + inter-confederation) ---
    // UEFA playoffs
    // { id: "italy", name: "Italy", nationalLeagueId: "international_teams" },
    // { id: "denmark", name: "Denmark", nationalLeagueId: "international_teams" },
    // { id: "poland", name: "Poland", nationalLeagueId: "international_teams" },
    // { id: "wales", name: "Wales", nationalLeagueId: "international_teams" },
    // { id: "bosnia-herzegovina", name: "Bosnia-Herzegovina", nationalLeagueId: "international_teams" },
    // { id: "ukraine", name: "Ukraine", nationalLeagueId: "international_teams" },
    // { id: "sweden", name: "Sweden", nationalLeagueId: "international_teams" },
    // { id: "albania", name: "Albania", nationalLeagueId: "international_teams" },
    // { id: "slovakia", name: "Slovakia", nationalLeagueId: "international_teams" },
    // { id: "kosovo", name: "Kosovo", nationalLeagueId: "international_teams" },
    // { id: "turkey", name: "Turkey", nationalLeagueId: "international_teams" },
    // { id: "romania", name: "Romania", nationalLeagueId: "international_teams" },
    // { id: "czech-republic", name: "Czech Republic", nationalLeagueId: "international_teams" },
    // { id: "ireland", name: "Ireland", nationalLeagueId: "international_teams" },
    // { id: "north-macedonia", name: "North Macedonia", nationalLeagueId: "international_teams" },
    // { id: "n.ireland", name: "N.Ireland", nationalLeagueId: "international_teams" },
    // Inter-confederation playoffs
    // { id: "dr-congo", name: "DR Congo", nationalLeagueId: "international_teams" },
    // { id: "new-caledonia", name: "New Caledonia", nationalLeagueId: "international_teams" },
    // { id: "jamaica", name: "Jamaica", nationalLeagueId: "international_teams" },
    // { id: "iraq", name: "Iraq", nationalLeagueId: "international_teams" },
    // { id: "bolivia", name: "Bolivia", nationalLeagueId: "international_teams" },
    // { id: "suriname", name: "Suriname", nationalLeagueId: "international_teams" },

    // // --- Other European Clubs ---
    // { id: "benfica", name: "Benfica", nationalLeagueId: "other_european_clubs" },
    // { id: "porto", name: "Porto", nationalLeagueId: "other_european_clubs" },
    // { id: "sporting_lisbon", name: "Sporting CP", nationalLeagueId: "other_european_clubs" },
    // { id: "red_bull_salzburg", name: "Red Bull Salzburg", nationalLeagueId: "other_european_clubs" },
    // { id: "ajax", name: "Ajax", nationalLeagueId: "other_european_clubs" },
    // { id: "psv", name: "PSV", nationalLeagueId: "other_european_clubs" },
    // { id: "feyenoord", name: "Feyenoord", nationalLeagueId: "other_european_clubs" },
    // { id: "az_alkmaar", name: "AZ Alkmaar", nationalLeagueId: "other_european_clubs" },
    // { id: "rangers", name: "Rangers", nationalLeagueId: "other_european_clubs" },
    // { id: "celtic", name: "Celtic", nationalLeagueId: "other_european_clubs" },
    // { id: "olympiacos", name: "Olympiacos", nationalLeagueId: "other_european_clubs" },
    // { id: "panathinaikos", name: "Panathinaikos", nationalLeagueId: "other_european_clubs" },
    // { id: "dinamo_zagreb", name: "Dinamo Zagreb", nationalLeagueId: "other_european_clubs" },
    // { id: "shakhtar_donetsk", name: "Shakhtar Donetsk", nationalLeagueId: "other_european_clubs" },
    // { id: "al_ahly_sc", name: "Al Ahly SC", nationalLeagueId: "other_european_clubs" },
    // { id: "al_hilal", name: "Al Hilal", nationalLeagueId: "other_european_clubs" },
    // { id: "inter_miami", name: "Inter Miami", nationalLeagueId: "other_european_clubs" },
    // { id: "fluminense", name: "Fluminense", nationalLeagueId: "other_european_clubs" },
    // { id: "palmeiras", name: "Palmeiras", nationalLeagueId: "other_european_clubs" },
    // { id: "boca_juniors", name: "Boca Juniors", nationalLeagueId: "other_european_clubs" },
    // { id: "river_plate", name: "River Plate", nationalLeagueId: "other_european_clubs" },
    // { id: "flamengo", name: "Flamengo", nationalLeagueId: "other_european_clubs" },
    // { id: "botafogo", name: "Botafogo", nationalLeagueId: "other_european_clubs" },
    // { id: "monterrey", name: "Monterrey", nationalLeagueId: "other_european_clubs" },
    // { id: "pachuca", name: "Pachuca", nationalLeagueId: "other_european_clubs" },
    // { id: "ldu-quito", name: "LDU Quito", nationalLeagueId: "other_european_clubs" },
    // { id: "independiente-del-valle", name: "Independiente del Valle", nationalLeagueId: "other_european_clubs" },
    // { id: "once-caldas", name: "Once Caldas", nationalLeagueId: "other_european_clubs" },
    // { id: "são-paulo", name: "São Paulo", nationalLeagueId: "other_european_clubs" },
    // { id: "estudiantes-de-la-plata", name: "Estudiantes de La Plata", nationalLeagueId: "other_european_clubs" },
    // { id: "lanús", name: "Lanús", nationalLeagueId: "other_european_clubs" },
    // { id: "vélez-sarsfield", name: "Vélez Sarsfield", nationalLeagueId: "other_european_clubs" },
    // { id: "racing-club", name: "Racing Club", nationalLeagueId: "other_european_clubs" },
    // { id: "galatasaray", name: "Galatasaray", nationalLeagueId: "other_european_clubs" },
    // { id: "bodøglimt", name: "Bodø/Glimt", nationalLeagueId: "other_european_clubs" },
    // { id: "club-brugge", name: "Club Brugge", nationalLeagueId: "other_european_clubs" } 
];

// --- Initialize Firebase Admin SDK ---
try {
    admin.initializeApp({
        credential: admin.credential.cert(SERVICE_ACCOUNT_KEY_PATH),
    });
    console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error.message);
    console.error("Please check SERVICE_ACCOUNT_KEY_PATH in your script.");
    process.exit(1); // Exit if initialization fails
}

const db = admin.firestore();

async function getTeamInfoFromAPI(teamName) {
  const url = `${THESPORTSDB_BASE_URL}/searchteams.php?t=${encodeURIComponent(teamName)}`;
  console.log(`Requesting URL: ${url}`); // <--- Add this line to debug the URL being sent
  const response = await fetch(url);
  const data = await response.json();
  //console.log('Raw API data for', teamName, ':', data);
  if (data.teams && data.teams.length > 0) {
    return data.teams[0]; // Take the first match
  }
  return null;
}


async function uploadLogosToFirestore() {
  for (const team of teamsData) {
    try {
      console.log(`Fetching data for: ${team.name}`);
      const teamInfo = await getTeamInfoFromAPI(team.name);
      if (!teamInfo) {
        console.warn(`No data found for ${team.name}`);
        continue;
      }

      // Check strBadge first, then strLogo
      const logoUrl = teamInfo.strBadge || teamInfo.strLogo;

      if (!logoUrl) {
        console.warn(`No logo found for ${team.name}`);
        continue;
      }

      // Firestore document reference
      const teamRef = db.collection('teams').doc(team.id);

      // Upload to Firestore
      await teamRef.set(
        {
          name: team.name,
          nationalLeagueId: team.nationalLeagueId,
          logoUrl: logoUrl,
        },
        { merge: true }
      );

      console.log(`Uploaded logo for ${team.name}`);
      await sleep(1000); // Rate limit to avoid hitting API limits
    } catch (error) {
      console.error(`Error processing ${team.name}:`, error.message);
    }
  }
  console.log('All logos uploaded.');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

uploadLogosToFirestore();



