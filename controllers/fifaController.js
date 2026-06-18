const FifaMatch = require("../models/FifaMatchModel");
const FifaPrediction = require("../models/FifaPredictionModel");
const User = require("../models/userModel");

// 1. Get all matches (Public)
exports.getMatches = async (req, res) => {
  try {
    const matches = await FifaMatch.find().sort({ date: 1 });
    res.status(200).json(matches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// 2. Get active Hero match (Public)
exports.getHeroMatch = async (req, res) => {
  try {
    // Strategy:
    // a. Check if any match is Live right now
    let hero = await FifaMatch.findOne({ status: "Live" }).sort({ date: 1 });
    
    // b. If no live match, find the closest future scheduled match
    if (!hero) {
      hero = await FifaMatch.findOne({
        status: "Scheduled",
        date: { $gte: new Date() },
      }).sort({ date: 1 });
    }
    
    // c. If no future matches, get the most recently completed match
    if (!hero) {
      hero = await FifaMatch.findOne({ status: "Completed" }).sort({ date: -1 });
    }

    // d. Fallback: get the first match in the DB
    if (!hero) {
      hero = await FifaMatch.findOne().sort({ date: 1 });
    }

    if (!hero) {
      return res.status(404).json({ message: "No matches found in database" });
    }

    res.status(200).json(hero);
  } catch (error) {
    console.error("Error fetching hero match:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// 3. Submit a prediction (Authenticated user)
exports.submitPrediction = async (req, res) => {
  try {
    const { matchId, predictedWinner } = req.body;
    const userId = req.user.id; // From userAuthentication middleware

    if (!matchId || !predictedWinner) {
      return res.status(400).json({ message: "Match ID and Predicted Winner are required" });
    }

    if (!["TeamA", "TeamB", "Draw"].includes(predictedWinner)) {
      return res.status(400).json({ message: "Invalid predicted winner. Choose TeamA, TeamB, or Draw." });
    }

    const match = await FifaMatch.findById(matchId);
    if (!match) {
      return res.status(404).json({ message: "Match not found" });
    }

    // Enforce deadline check: Match must be scheduled and kick-off in the future
    const now = new Date();
    if (match.status !== "Scheduled" || new Date(match.date) <= now) {
      return res.status(400).json({ message: "Prediction window is closed. Match has already started or ended." });
    }

    // Create or update prediction
    const prediction = await FifaPrediction.findOneAndUpdate(
      { user: userId, match: matchId },
      { predictedWinner },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Recalculate dynamic vote counts for the match
    const teamAVotes = await FifaPrediction.countDocuments({ match: matchId, predictedWinner: "TeamA" });
    const teamBVotes = await FifaPrediction.countDocuments({ match: matchId, predictedWinner: "TeamB" });
    const drawVotes = await FifaPrediction.countDocuments({ match: matchId, predictedWinner: "Draw" });

    match.teamAVotes = teamAVotes;
    match.teamBVotes = teamBVotes;
    match.drawVotes = drawVotes;
    await match.save();

    res.status(200).json({
      message: "Prediction submitted successfully!",
      prediction,
      votes: {
        teamAVotes,
        teamBVotes,
        drawVotes,
      },
    });
  } catch (error) {
    console.error("Error submitting prediction:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// 4. Get predictions placed by current user (Authenticated user)
exports.getMyPredictions = async (req, res) => {
  try {
    const userId = req.user.id;
    const predictions = await FifaPrediction.find({ user: userId }).populate("match");
    res.status(200).json(predictions);
  } catch (error) {
    console.error("Error fetching user predictions:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// 5. Get predictions leaderboard (Public)
exports.getLeaderboard = async (req, res) => {
  try {
    // Only select users who have earned at least 1 prediction point
    const leaderboard = await User.find(
      { fifaPoints: { $gt: 0 } },
      "name email fifaPoints avatar role"
    )
      .sort({ fifaPoints: -1, name: 1 })
      .limit(50);

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// 6. Get leaderboard based on total votes cast (Public)
exports.getVotesLeaderboard = async (req, res) => {
  try {
    const leaderboard = await User.aggregate([
      {
        $lookup: {
          from: "fifapredictions",
          localField: "_id",
          foreignField: "user",
          as: "predictions"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          avatar: 1,
          role: 1,
          votesCount: { $size: "$predictions" }
        }
      },
      // Only select users who have submitted at least 1 prediction
      { $match: { votesCount: { $gt: 0 } } },
      { $sort: { votesCount: -1, name: 1 } },
      { $limit: 50 }
    ]);

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error("Error fetching votes leaderboard:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// 7. Get all predictions (Public/Admin)
exports.getAllPredictions = async (req, res) => {
  try {
    const predictions = await FifaPrediction.find({})
      .populate("user", "name email avatar role")
      .populate("match", "teamA teamB status kickoffTime date teamACrest teamBCrest scores winner stage matchNumber apiMatchId")
      .sort({ createdAt: -1 });

    res.status(200).json(predictions);
  } catch (error) {
    console.error("Error fetching all predictions:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
