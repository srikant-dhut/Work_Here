const bcrypt = require("bcrypt");
require("dotenv").config();

const hashGenerate = (password) => {
  try {
    const salt = 10;
    const hassPasword = bcrypt.hashSync(password, salt);
    return hassPasword;
  } catch (error) {
    console.log("hashing internal error", error);
  }
};

const verifyPassword = (password, hashPassword) => {
  try {
    return bcrypt.compare(password, hashPassword);
  } catch (error) {
    console.log("verifying internal", error);
  }
};

module.exports = { hashGenerate, verifyPassword };
