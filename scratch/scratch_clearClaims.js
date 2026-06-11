const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017/socialbureau";
console.log("Connecting to:", uri.replace(/:[^:]*@/, ":****@"));

mongoose.connect(uri)
  .then(async () => {
    console.log("Connected to MongoDB.");
    try {
      const collections = await mongoose.connection.db.collections();
      const hasCollection = collections.some(col => col.collectionName === 'lotteryclaims');
      if (hasCollection) {
        await mongoose.connection.db.dropCollection('lotteryclaims');
        console.log("Successfully dropped 'lotteryclaims' collection.");
      } else {
        console.log("Collection 'lotteryclaims' does not exist.");
      }
    } catch (e) {
      console.error("Error dropping collection:", e);
    } finally {
      await mongoose.disconnect();
      console.log("Disconnected from MongoDB.");
    }
  })
  .catch(err => console.error(err));
