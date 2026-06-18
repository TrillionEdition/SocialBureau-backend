const axios = require("axios");
const FifaMatch = require("../models/FifaMatchModel");
const FifaPrediction = require("../models/FifaPredictionModel");
const User = require("../models/userModel");

// Sync matches from football-data.org API
const syncFifaMatches = async () => {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY || "c9494c11e19745e09d5b6fd9f880f874";
  
  try {
    console.log("🔄 Initiating FIFA World Cup matches database sync...");
    
    const response = await axios.get(
      "https://api.football-data.org/v4/competitions/WC/matches",
      {
        headers: {
          "X-Auth-Token": apiKey,
        },
        timeout: 10000,
      }
    );

    const matches = response.data && response.data.matches;
    if (!matches || !Array.isArray(matches) || matches.length === 0) {
      throw new Error("Empty or invalid matches array returned by API");
    }

    console.log(`📥 API fetched ${matches.length} matches. Upserting to database...`);
    
    for (const item of matches) {
      // 1. Map statuses
      let localStatus = "Scheduled";
      if (["IN_PLAY", "PAUSED"].includes(item.status)) {
        localStatus = "Live";
      } else if (["FINISHED", "AWARDED"].includes(item.status)) {
        localStatus = "Completed";
      }

      // 2. Map winners
      let localWinner = null;
      if (item.score && item.score.winner) {
        if (item.score.winner === "HOME_TEAM") localWinner = "TeamA";
        else if (item.score.winner === "AWAY_TEAM") localWinner = "TeamB";
        else if (item.score.winner === "DRAW") localWinner = "Draw";
      }

      // 3. Kickoff Time formatting (HH:MM in UTC/Local depending on input date)
      const dateObj = new Date(item.utcDate);
      const hours = String(dateObj.getUTCHours()).padStart(2, '0');
      const minutes = String(dateObj.getUTCMinutes()).padStart(2, '0');
      const kickoffTimeStr = `${hours}:${minutes} UTC`;

      // 4. Upsert
      const existing = await FifaMatch.findOne({ apiMatchId: item.id });
      if (existing) {
        const wasCompleted = existing.status === "Completed";
        
        existing.status = localStatus;
        existing.winner = localWinner;
        existing.scores = {
          home: item.score?.fullTime?.home ?? existing.scores.home,
          away: item.score?.fullTime?.away ?? existing.scores.away,
        };
        existing.teamACrest = item.homeTeam?.crest || existing.teamACrest;
        existing.teamBCrest = item.awayTeam?.crest || existing.teamBCrest;
        existing.date = dateObj;
        existing.kickoffTime = kickoffTimeStr;
        existing.venue = item.venue || existing.venue;

        const updatedMatch = await existing.save();

        // If newly completed, award points
        if (localStatus === "Completed" && !wasCompleted) {
          await processPredictionPoints(updatedMatch);
        }
      } else {
        const newMatch = new FifaMatch({
          apiMatchId: item.id,
          teamA: item.homeTeam?.name || "Unknown",
          teamB: item.awayTeam?.name || "Unknown",
          teamACrest: item.homeTeam?.crest || "",
          teamBCrest: item.awayTeam?.crest || "",
          date: dateObj,
          kickoffTime: kickoffTimeStr,
          venue: item.venue || "Stadium",
          status: localStatus,
          winner: localWinner,
          scores: {
            home: item.score?.fullTime?.home ?? 0,
            away: item.score?.fullTime?.away ?? 0,
          },
        });

        const savedMatch = await newMatch.save();

        // Process points if saved in completed state
        if (localStatus === "Completed") {
          await processPredictionPoints(savedMatch);
        }
      }
    }
    
    console.log("✅ FIFA World Cup sync completed successfully!");
  } catch (error) {
    console.error("❌ API Sync Error:", error.message);
    console.log("⚠️ Falling back to checking database for mock data seed...");
    await loadMockFallbackData();
  }
};

// Award points to users who predicted the winner correctly
const processPredictionPoints = async (match) => {
  try {
    console.log(`🎯 Evaluating prediction points for match: ${match.teamA} VS ${match.teamB} (Winner: ${match.winner})`);
    
    const predictions = await FifaPrediction.find({ match: match._id, processed: false });
    
    if (predictions.length === 0) {
      console.log(`ℹ️ No unprocessed predictions found for match ${match._id}`);
      return;
    }

    for (const pred of predictions) {
      const correct = pred.predictedWinner === match.winner;
      
      pred.isCorrect = correct;
      pred.processed = true;
      await pred.save();

      if (correct) {
        // Increment the points and fifaPoints fields inside User document
        await User.findByIdAndUpdate(pred.user, { $inc: { points: 1, fifaPoints: 1 } });
        console.log(`🎖️ Awarded +1 point to User ID ${pred.user}`);
      }
    }
    
    console.log(`Processed points for ${predictions.length} predictions.`);
  } catch (err) {
    console.error("❌ Error running point processing:", err);
  }
};

// Fallback seed data in case API fails or returns rate-limits
const loadMockFallbackData = async () => {
  try {
    const count = await FifaMatch.countDocuments();
    if (count > 0) {
      console.log("ℹ️ Database already contains match records. Mock seeding skipped.");
      return;
    }

    console.log("🌱 Database is empty. Seeding mock World Cup fixtures for offline testing...");

    const mockCrests = {
      GER: "https://crests.football-data.org/germany.png",
      BRA: "https://crests.football-data.org/brazil.png",
      USA: "https://crests.football-data.org/usa.png",
      ENG: "https://crests.football-data.org/england.png",
      ARG: "https://crests.football-data.org/argentina.png",
      FRA: "https://crests.football-data.org/france.png",
      ESP: "https://crests.football-data.org/spain.png",
      JPN: "https://crests.football-data.org/japan.png",
    };

    const mockMatches = [
      {
        apiMatchId: 900001,
        teamA: "Germany",
        teamB: "Brazil",
        teamACrest: mockCrests.GER,
        teamBCrest: mockCrests.BRA,
        date: new Date(Date.now() - 3600000 * 3), // Started 3 hours ago
        kickoffTime: "11:00 UTC",
        venue: "MetLife Stadium, NJ",
        status: "Completed",
        winner: "TeamA",
        scores: { home: 2, away: 1 },
      },
      {
        apiMatchId: 900002,
        teamA: "USA",
        teamB: "England",
        teamACrest: mockCrests.USA,
        teamBCrest: mockCrests.ENG,
        date: new Date(), // Starting now (Live)
        kickoffTime: "14:00 UTC",
        venue: "SoFi Stadium, CA",
        status: "Live",
        winner: null,
        scores: { home: 0, away: 0 },
      },
      {
        apiMatchId: 900003,
        teamA: "Spain",
        teamB: "Japan",
        teamACrest: mockCrests.ESP,
        teamBCrest: mockCrests.JPN,
        date: new Date(Date.now() + 3600000 * 5), // Starts in 5 hours
        kickoffTime: "19:00 UTC",
        venue: "Azteca Stadium, Mexico City",
        status: "Scheduled",
        winner: null,
        scores: { home: 0, away: 0 },
      },
      {
        apiMatchId: 900004,
        teamA: "Argentina",
        teamB: "France",
        teamACrest: mockCrests.ARG,
        teamBCrest: mockCrests.FRA,
        date: new Date(Date.now() + 86400000 * 1), // Starts tomorrow
        kickoffTime: "20:00 UTC",
        venue: "BC Place, Vancouver",
        status: "Scheduled",
        winner: null,
        scores: { home: 0, away: 0 },
      },
    ];

    await FifaMatch.insertMany(mockMatches);
    console.log("✅ Seeded 4 mock World Cup matches successfully!");
  } catch (err) {
    console.error("❌ Seeding fallback mock data failed:", err);
  }
};

module.exports = {
  syncFifaMatches,
  processPredictionPoints,
};
