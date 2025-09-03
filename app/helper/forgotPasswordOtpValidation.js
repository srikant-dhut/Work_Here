const transporter = require("../config/emailConfig");
const otpVerifyModel = require("../model/otpModel");

const sendForgotPasswordVerificationOTP = async (req, user) => {
  const otp = Math.floor(1000 + Math.random() * 9000);
  const dhut = await new otpVerifyModel({ userId: user._id, otp: otp }).save();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject: "OTP - Forgot your password",
    html: `<p>Dear ${user.name},</p>
    <p>Follow the step</p>
    <p>First Enter your email in the reset form</p>
    <p>Then enter the code below to reset your password </p>
    <h2>OTP: ${otp}</h2>
    <p>After Enter new password and confirm that password to check the enter new password</p>
    <p>Submit and reset your password</p>
    <p>This OTP is valid for 15 minutes. If you didn't request this OTP,please ignore this email.</p>`,
  });

  return otp;
};

module.exports = sendEmailVerificationOTP;
