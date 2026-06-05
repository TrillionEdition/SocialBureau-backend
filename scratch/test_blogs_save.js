const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/socialbureau';
console.log("Connecting to:", mongoURI);

const User = require('../models/userModel');
const TeamMember = require('../models/teamMemberModel');

async function test() {
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");

    // Let's find Sham Sk
    const member = await TeamMember.findOne({ slug: 'shamsk' }).populate('user');
    if (!member || !member.user) {
      console.error("Sham Sk member or user not found!");
      await mongoose.disconnect();
      return;
    }

    console.log("Sham Sk's current blogs on User model:", JSON.stringify(member.user.blogs, null, 2));

    // Let's simulate saving blogs
    const incomingBlogs = [
      {
        heading: "The Rise Of API Markeketing",
        link: "https://www.socialbureau.in/blogs/the-rise-of-api-marketing",
        image: "https://pub-dbc24446d37a40aeb1dfdd10992cd2d9.r2.dev/images/blog/05412f8b-0df8-4fae-a76d-db9c2f5916f0.png"
      },
      {
        heading: "Why Brand Architecture Matters More Than Marketing",
        link: "https://www.socialbureau.in/blogs/why-brand-architecture-matters-more-than-marketing",
        image: "https://pub-dbc24446d37a40aeb1dfdd10992cd2d9.r2.dev/images/blog/8e40c6b6-f97a-4211-8318-349a6455d4d3.png"
      },
      {
        heading: "A New Test Blog " + new Date().toLocaleTimeString(),
        link: "https://www.socialbureau.in/blogs/test-blog",
        image: ""
      }
    ];

    const userUpdate = {
      blogs: incomingBlogs
    };

    console.log("Simulating User.findByIdAndUpdate for user ID:", member.user._id);
    const updatedUser = await User.findByIdAndUpdate(member.user._id, { $set: userUpdate }, { new: true, runValidators: false });
    console.log("Updated User blogs in DB:", JSON.stringify(updatedUser.blogs, null, 2));

    // Now let's fetch again populated
    const refetchedMember = await TeamMember.findOne({ slug: 'shamsk' }).populate({
      path: 'user',
      select: 'email name role blogs'
    });
    console.log("Refetched member user blogs:", JSON.stringify(refetchedMember.user.blogs, null, 2));

    // Reset back to original 2 blogs to avoid polluting database too much
    await User.findByIdAndUpdate(member.user._id, { $set: { blogs: member.user.blogs } }, { new: true });
    console.log("Blogs reset back to original.");

    await mongoose.disconnect();
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
