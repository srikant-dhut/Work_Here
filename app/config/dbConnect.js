const mongoose = require("mongoose");

const dbCon = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Db Connection success");
  } catch (error) {
    console.log("Db connection error ", error);
  }
};

module.exports = dbCon;
