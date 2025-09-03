const mongoose = require("mongoose");
const Joi = require("joi");

const userSchemaValidation = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email({
    minDomainSegments: 2,
    tlds: { allow: ["com", "net"] },
  }),
  phone: Joi.string()
    .length(10)
    .pattern(/[6-9]{1}[0-9]{9}/)
    .required(),
  password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9@]{3,30}$")),
  role: Joi.string().required(),
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "client", "freelancer"],
      default: "client",
    },
    city: {
      type: String,
      default: ""
    },
    state: {
      type: String,
      default: ""
    },
    country: {
      type: String,
      default: ""
    },
    profilePic: {
      type: String,
      default: ""
    },
    skills: {
      type: [String],
      default: []
    },
    experienceLevel: {
      type: String,
      enum: ["entry", "intermediate", "expert"],
      default: "intermediate"
    },
    hourlyRate: {
      type: Number,
      default: 0
    },
    bio: {
      type: String,
      default: ""
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = { User, userSchemaValidation };

