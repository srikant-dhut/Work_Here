require('dotenv').config();
const mongoose = require("mongoose");
const { User } = require("../model/userModel");
const { hashGenerate } = require("../helper/passwordHash");

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: "admin@workhere.com" });

        if (existingAdmin) {
            console.log("Admin user already exists!");
            console.log("Email: admin@workhere.com");
            console.log("Password: admin123");
            return;
        }

        // Create admin user
        const adminData = {
            name: "Admin User",
            email: "admin@workhere.com",
            phone: "1234567890",
            password: await hashGenerate("admin123"),
            role: "admin",
            is_verified: true,
            city: "Admin City",
            state: "Admin State",
            country: "Admin Country"
        };

        const admin = await User.create(adminData);
        console.log("Admin user created successfully!");
        console.log("Email: admin@workhere.com");
        console.log("Password: admin123");

    } catch (error) {
        console.error("Error creating admin:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
        process.exit();
    }
};

createAdmin();
