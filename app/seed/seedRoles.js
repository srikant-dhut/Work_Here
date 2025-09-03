require('dotenv').config();
const mongoose = require("mongoose");
const Role = require("../model/RolesBasedModel");

const roles = [
    {
        name: "admin",
        permissions: [
            "create_record",
            "read_record",
            "update_record",
            "delete_record",
            "admin_record"
        ]
    },
    {
        name: "client",
        permissions: ["create_record", "read_record", "update_record", "delete_record"]
    },
    {
        name: "freelancer",
        permissions: ["read_record"]
    }
];

const seedRoles = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL)
        console.log("Connected to MongoDB");

        for (const role of roles) {
            await Role.updateOne(
                { name: role.name },
                { $set: { permissions: role.permissions } },
                { upsert: true }
            );
            console.log(`Role '${role.name}' seeded/updated`);
        }

        console.log("Roles seeding completed");
    } catch (error) {
        console.error("Error seeding roles:", error.message);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
        process.exit();
    }
};

seedRoles();