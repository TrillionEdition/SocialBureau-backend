const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau";
console.log("Connecting to MongoDB:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected successfully!");
    
    const TeamMember = require('./models/teamMemberModel');
    const User = require('./models/userModel');
    
    const members = await TeamMember.find({}).populate('user');
    if (members.length === 0) {
      console.error("No team members found!");
      mongoose.disconnect();
      return;
    }
    
    const member = members[0];
    if (!member.user) {
      console.error("No user associated!");
      mongoose.disconnect();
      return;
    }
    
    console.log("Testing Mongoose populate behavior on PUT simulation...");
    const userUpdate = {
      workShowcase: [
        {
          category: "TESTING",
          title: "Simulation Title",
          description: "Simulation description text here.",
          images: [],
          link: "https://sim.com"
        }
      ]
    };
    
    // Simulating PUT /admin/member/:id or PUT /me database execution:
    await User.findByIdAndUpdate(member.user._id, { $set: userUpdate }, { new: true });
    
    // Fetch and populate:
    const updatedProfile = await TeamMember.findById(member._id).populate({
      path: "user",
      select: "email name role isEmployee emp_id clickupId phone doj rate tools clients achievements coverImage idCard hobbies podcasts events innovations workShowcase"
    });
    
    console.log("updatedProfile.user is type:", typeof updatedProfile.user);
    console.log("updatedProfile.user populated values:", JSON.stringify(updatedProfile.user, null, 2));
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Connection error:", err);
  });
