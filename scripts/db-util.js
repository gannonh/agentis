#!/usr/bin/env node

/**
 * Database Utility CLI for LibreChat Development
 *
 * Interactive tool for managing users and organizations during development.
 * Provides safe cleanup operations with confirmation prompts.
 *
 * Usage:
 *   ./db-util.js delete-user
 *   ./db-util.js --help
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import process from "process";
import readline from "readline";

// Set up paths to LibreChat API directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const API_DIR = join(__dirname, "..", "LibreChat", "api");

// Set up environment variables for LibreChat
if (!process.env.MONGO_URI) {
  // Default MongoDB connection for development - using Agentis database
  process.env.MONGO_URI =
    "mongodb://admin:password@localhost:27017/Agentis?authSource=admin";
}

// Set required Better Auth environment variables for CLI usage
if (!process.env.DOMAIN_CLIENT) {
  process.env.DOMAIN_CLIENT = "localhost:3090";
}
if (!process.env.DOMAIN_SERVER) {
  process.env.DOMAIN_SERVER = "localhost:3080";
}
if (!process.env.BETTER_AUTH_SECRET) {
  process.env.BETTER_AUTH_SECRET = "cli-secret-key-for-development-only";
}

// Change to API directory for proper relative imports within LibreChat modules
process.chdir(API_DIR);

// Import LibreChat modules using absolute paths
const connectDb = (await import(join(API_DIR, "lib", "db", "connectDb.js")))
  .default;
const User = (await import(join(API_DIR, "models", "User.js"))).default;
const { getAuth } = await import(join(API_DIR, "auth.js"));
const { logger } = await import(join(API_DIR, "config", "index.js"));

// Note: Better Auth API methods (auth.api.*) are not available in CLI context
// because the auth instance is initialized asynchronously after MongoDB connection.
// We use direct database queries for Better Auth collections instead.

// Import mongoose from LibreChat's node_modules
const mongoose = (
  await import(join(API_DIR, "..", "node_modules", "mongoose", "index.js"))
).default;

// Colors for better CLI output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bright: "\x1b[1m",
  reset: "\x1b[0m",
};

// Create readline interface for interactive prompts
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Promisified readline question
 */
function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
${colors.cyan}${colors.bright}LibreChat Database Utility CLI${colors.reset}

${colors.yellow}Commands:${colors.reset}
  delete-user      Interactive user deletion with optional organization cleanup
  help, --help     Show this help message

${colors.yellow}Examples:${colors.reset}
  ./db-util.js delete-user
  node db-util.js delete-user

${colors.yellow}Features:${colors.reset}
  - Interactive email-based user lookup
  - Shows user and organization information before deletion
  - Optional organization deletion with member count warnings
  - Safe confirmation prompts at each step
  - COMPLETE cleanup of ALL user data from 17+ collections:
    • User profile, conversations, messages, files
    • Presets, assistants, agents, actions
    • Shared links, tags, balances, API keys
    • Provider accounts, sessions, memberships, invitations
    • Connected accounts, projects, transactions

${colors.red}⚠️  Warning: This tool permanently deletes data. Use only in development!${colors.reset}
`);
}

/**
 * Find user by email address
 */
async function findUserByEmail(email) {
  try {
    // Debug: Show what database and collection we're querying
    const dbName = User.db.name;
    const collectionName = User.collection.name;
    console.log(
      `${colors.cyan}🔍 Searching in database: ${colors.white}${dbName}${colors.reset}, collection: ${colors.white}${collectionName}${colors.reset}`
    );

    const user = await User.findOne({ email }).lean();

    // Debug: Show total user count in collection
    const totalUsers = await User.countDocuments();
    console.log(
      `${colors.cyan}📊 Total users in collection: ${colors.white}${totalUsers}${colors.reset}`
    );

    return user;
  } catch (error) {
    logger.error("Error finding user by email:", error);
    throw error;
  }
}

/**
 * Get organization information using Better Auth
 */
async function getOrganizationInfo(organizationId) {
  try {
    // Query database directly since Better Auth API might not be available in CLI context
    const db = mongoose.connection.db;
    
    // Get organization details
    const orgCollection = db.collection("organization");
    const organization = await orgCollection.findOne({ id: organizationId });

    if (!organization) {
      return null;
    }

    // Get member count and details
    const memberCollection = db.collection("member");
    const members = await memberCollection.find({ organizationId }).toArray();

    return {
      ...organization,
      memberCount: members?.length || 0,
      members: members || [],
    };
  } catch (error) {
    logger.error("Error getting organization info:", error);
    return null;
  }
}

/**
 * Delete user and all associated data
 */
async function deleteUserCompletely(userId, email) {
  try {
    const db = mongoose.connection.db;

    console.log(
      `${colors.cyan}🗑️  Deleting user data from all collections...${colors.reset}`
    );

    console.log(
      `${colors.cyan}🔍 Deleting user with ID: ${colors.white}${userId}${colors.reset} and email: ${colors.white}${email}${colors.reset}`
    );

    // LibreChat collections that reference users
    const collectionsToClean = [
      {
        name: "user",
        field: "_id",
        value: userId,
        description: "User profile",
      },
      {
        name: "conversations",
        field: "user",
        value: userId,
        description: "User conversations",
      },
      {
        name: "messages",
        field: "user",
        value: userId,
        description: "User messages",
      },
      {
        name: "files",
        field: "user",
        value: userId,
        description: "User files",
      },
      {
        name: "presets",
        field: "user",
        value: userId,
        description: "User presets",
      },
      {
        name: "assistants",
        field: "user",
        value: userId,
        description: "User assistants",
      },
      {
        name: "agents",
        field: "user",
        value: userId,
        description: "User agents",
      },
      {
        name: "actions",
        field: "user",
        value: userId,
        description: "User actions",
      },
      {
        name: "sharedlinks",
        field: "user",
        value: userId,
        description: "User shared links",
      },
      {
        name: "conversationtags",
        field: "user",
        value: userId,
        description: "User conversation tags",
      },
      {
        name: "balances",
        field: "user",
        value: userId,
        description: "User balances",
      },
      {
        name: "keys",
        field: "user",
        value: userId,
        description: "User API keys",
      },
      {
        name: "tokens",
        field: "user",
        value: userId,
        description: "User tokens",
      },
      {
        name: "composioconnectedaccounts",
        field: "user",
        value: userId,
        description: "User connected accounts",
      },
      {
        name: "projects",
        field: "user",
        value: userId,
        description: "User projects",
      },
      {
        name: "transactions",
        field: "user",
        value: userId,
        description: "User transactions",
      },
    ];

    let totalDeleted = 0;

    // Delete from LibreChat collections
    for (const collectionInfo of collectionsToClean) {
      try {
        const collection = db.collection(collectionInfo.name);
        const query = { [collectionInfo.field]: collectionInfo.value };

        // For _id field, convert string to ObjectId if needed
        if (
          collectionInfo.field === "_id" &&
          typeof collectionInfo.value === "string"
        ) {
          query[collectionInfo.field] = new mongoose.Types.ObjectId(
            collectionInfo.value
          );
        }

        console.log(
          `${colors.cyan}🔍 Querying ${collectionInfo.name} with:${colors.reset}`,
          JSON.stringify(query)
        );

        // Check if records exist before deletion
        const existingCount = await collection.countDocuments(query);
        console.log(
          `${colors.cyan}📊 Found ${existingCount} records in ${collectionInfo.name}${colors.reset}`
        );

        const result = await collection.deleteMany(query);

        if (result.deletedCount > 0) {
          console.log(
            `${colors.green}✅ ${collectionInfo.description}: ${result.deletedCount} records deleted${colors.reset}`
          );
          totalDeleted += result.deletedCount;
        } else if (existingCount > 0) {
          console.log(
            `${colors.red}❌ ${collectionInfo.description}: Found ${existingCount} records but deleted 0${colors.reset}`
          );
        }
      } catch (error) {
        // Collection might not exist, which is fine
        if (!error.message.includes("does not exist")) {
          console.log(
            `${colors.yellow}⚠️  ${collectionInfo.description}: ${error.message}${colors.reset}`
          );
        }
      }
    }

    // Better Auth collections cleanup
    console.log(
      `\n${colors.cyan}🔐 Cleaning up Better Auth collections...${colors.reset}`
    );

    // Helper to safely create ObjectId queries
    const createUserQueries = (id) => {
      const queries = [];
      // Better Auth stores userId as ObjectId
      if (typeof id === "string") {
        try {
          queries.push({ userId: new mongoose.Types.ObjectId(id) });
        } catch (e) {
          console.log(
            `${colors.yellow}⚠️  Could not convert ${id} to ObjectId: ${e.message}${colors.reset}`
          );
        }
      } else {
        // id is already an ObjectId
        queries.push({ userId: id });
      }
      return queries;
    };

    const betterAuthCollections = [
      {
        name: "account",
        queries: createUserQueries(userId),
        description: "User provider accounts",
      },
      {
        name: "session",
        queries: createUserQueries(userId),
        description: "User sessions",
      },
      {
        name: "member",
        queries: createUserQueries(userId),
        description: "Organization memberships",
      },
      {
        name: "invitation",
        queries: [
          ...(typeof userId === "string"
            ? [{ inviterId: new mongoose.Types.ObjectId(userId) }]
            : [{ inviterId: userId }]),
          { email: email },
        ],
        description: "User invitations",
      },
    ];

    for (const collectionInfo of betterAuthCollections) {
      try {
        const collection = db.collection(collectionInfo.name);
        let collectionTotal = 0;

        for (const query of collectionInfo.queries) {
          console.log(
            `${colors.cyan}🔍 Querying ${collectionInfo.name} with:${colors.reset}`,
            JSON.stringify(query)
          );

          const existingCount = await collection.countDocuments(query);
          console.log(
            `${colors.cyan}📊 Found ${existingCount} records in ${collectionInfo.name} for this query${colors.reset}`
          );

          const result = await collection.deleteMany(query);
          console.log(
            `${colors.cyan}🗑️ Deleted ${result.deletedCount} records from ${collectionInfo.name}${colors.reset}`
          );
          collectionTotal += result.deletedCount;
        }

        if (collectionTotal > 0) {
          console.log(
            `${colors.green}✅ ${collectionInfo.description}: ${collectionTotal} records deleted${colors.reset}`
          );
          totalDeleted += collectionTotal;
        }
      } catch (error) {
        if (!error.message.includes("does not exist")) {
          console.log(
            `${colors.yellow}⚠️  ${collectionInfo.description}: ${error.message}${colors.reset}`
          );
        }
      }
    }

    console.log(
      `\n${colors.green}${colors.bright}🎯 Total records deleted: ${totalDeleted}${colors.reset}`
    );

    if (totalDeleted === 0) {
      console.log(
        `${colors.yellow}⚠️  No user data found to delete${colors.reset}`
      );
    }

    return true;
  } catch (error) {
    logger.error("Error deleting user:", error);
    throw error;
  }
}

/**
 * Delete organization and all associated data
 */
async function deleteOrganizationCompletely(organizationId) {
  try {
    // Use direct database access since Better Auth API is not available in CLI context
    const db = mongoose.connection.db;
    
    // Delete organization
    const orgCollection = db.collection("organization");
    const orgResult = await orgCollection.deleteOne({ id: organizationId });

    // Delete all members
    const memberCollection = db.collection("member");
    const memberResult = await memberCollection.deleteMany({
      organizationId,
    });

    // Delete all invitations
    const invitationCollection = db.collection("invitation");
    const invitationResult = await invitationCollection.deleteMany({
      organizationId,
    });

    console.log(
      `${colors.green}✅ Deleted organization and ${memberResult.deletedCount} members, ${invitationResult.deletedCount} invitations${colors.reset}`
    );
    return true;
  } catch (error) {
    logger.error("Organization deletion failed:", error);
    console.log(
      `${colors.red}❌ Failed to delete organization: ${error.message}${colors.reset}`
    );
    throw error;
  }
}

/**
 * Interactive user deletion flow
 */
async function interactiveDeleteUser() {
  try {
    console.log(
      `\n${colors.cyan}${colors.bright}🗑️  Interactive User Deletion${colors.reset}`
    );
    console.log(
      `${colors.yellow}This will permanently delete user data. Use only in development!${colors.reset}\n`
    );

    // Step 1: Get email address
    const email = await question("Enter user email address: ");

    if (!email || !email.includes("@")) {
      console.log(`${colors.red}❌ Invalid email address${colors.reset}`);
      return;
    }

    console.log(`\n${colors.cyan}🔍 Looking up user...${colors.reset}`);

    // Step 2: Find user
    const user = await findUserByEmail(email);

    if (!user) {
      console.log(
        `${colors.red}❌ User not found with email: ${email}${colors.reset}`
      );

      // Debug: Show some sample users to help troubleshoot
      try {
        const sampleUsers = await User.find({})
          .select("email name createdAt")
          .limit(5)
          .lean();
        if (sampleUsers.length > 0) {
          console.log(
            `\n${colors.yellow}📝 Sample users in database:${colors.reset}`
          );
          sampleUsers.forEach((u, index) => {
            console.log(
              `   ${index + 1}. ${colors.white}${u.email}${colors.reset} (${
                u.name || "No name"
              }) - ${
                u.createdAt
                  ? new Date(u.createdAt).toLocaleDateString()
                  : "No date"
              }`
            );
          });
        } else {
          console.log(
            `${colors.yellow}⚠️  No users found in the database${colors.reset}`
          );
        }
      } catch (debugError) {
        console.log(
          `${colors.yellow}⚠️  Could not retrieve sample users: ${debugError.message}${colors.reset}`
        );
      }
      return;
    }

    // Step 3: Display user information
    console.log(`\n${colors.green}👤 User found:${colors.reset}`);
    console.log(`   Email: ${colors.white}${user.email}${colors.reset}`);
    console.log(`   Name: ${colors.white}${user.name || "N/A"}${colors.reset}`);
    console.log(`   ID: ${colors.white}${user._id}${colors.reset}`);
    console.log(
      `   Created: ${colors.white}${
        user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"
      }${colors.reset}`
    );

    // Get provider information from Account collection
    let providerInfo = "N/A";
    try {
      const db = mongoose.connection.db;
      const accountCollection = db.collection("account");
      // Better Auth stores userId as ObjectId
      const accounts = await accountCollection
        .find({ userId: user._id })
        .toArray();
      if (accounts.length > 0) {
        const providers = accounts.map((acc) => acc.providerId).join(", ");
        providerInfo = providers;
      }
    } catch (error) {
      // If we can't get provider info, just show N/A
    }

    console.log(`   Provider: ${colors.white}${providerInfo}${colors.reset}`);
    console.log(`   Role: ${colors.white}${user.role || "N/A"}${colors.reset}`);

    let organizationInfo = null;
    let shouldDeleteOrg = false;

    // Step 4: Check for organization membership in Better Auth member collection
    console.log(
      `\n${colors.cyan}🏢 Checking organization membership...${colors.reset}`
    );

    try {
      const db = mongoose.connection.db;
      const memberCollection = db.collection("member");

      // Check if user is a member of any organization
      // Better Auth stores userId as ObjectId, not string
      const membership = await memberCollection.findOne({
        userId: user._id,
      });

      if (membership) {
        // Convert organizationId to string for Better Auth API
        const orgIdString = membership.organizationId.toString();
        console.log(
          `${colors.cyan}📋 Found membership record for organization: ${orgIdString}${colors.reset}`
        );
        organizationInfo = await getOrganizationInfo(orgIdString);
      } else {
        console.log(
          `${colors.cyan}📋 No organization membership found in member collection${colors.reset}`
        );
      }
    } catch (error) {
      console.log(
        `${colors.yellow}⚠️  Error checking organization membership: ${error.message}${colors.reset}`
      );
    }

    if (organizationInfo) {
      console.log(`\n${colors.blue}🏢 Organization Details:${colors.reset}`);
      console.log(
        `   Name: ${colors.white}${organizationInfo.name}${colors.reset}`
      );
      console.log(
        `   ID: ${colors.white}${organizationInfo.id}${colors.reset}`
      );
      console.log(
        `   Slug: ${colors.white}${organizationInfo.slug}${colors.reset}`
      );
      console.log(
        `   Members: ${colors.white}${organizationInfo.memberCount}${colors.reset}`
      );
      console.log(
        `   Created: ${colors.white}${
          organizationInfo.createdAt
            ? new Date(organizationInfo.createdAt).toLocaleDateString()
            : "N/A"
        }${colors.reset}`
      );

      // Step 5: Ask about organization deletion
      if (organizationInfo.memberCount <= 1) {
        console.log(
          `\n${colors.yellow}⚠️  This user is the only member of the organization.${colors.reset}`
        );
        const deleteOrgAnswer = await question(
          `Delete organization "${organizationInfo.name}" as well? (y/N): `
        );
        shouldDeleteOrg =
          deleteOrgAnswer.toLowerCase() === "y" ||
          deleteOrgAnswer.toLowerCase() === "yes";
      } else {
        console.log(
          `\n${colors.yellow}⚠️  This organization has ${organizationInfo.memberCount} members.${colors.reset}`
        );
        console.log(
          `${colors.red}Deleting the organization will affect all members!${colors.reset}`
        );
        const deleteOrgAnswer = await question(
          `Are you sure you want to delete organization "${organizationInfo.name}"? (y/N): `
        );
        shouldDeleteOrg =
          deleteOrgAnswer.toLowerCase() === "y" ||
          deleteOrgAnswer.toLowerCase() === "yes";
      }
    } else {
      console.log(
        `\n${colors.cyan}ℹ️  User is not a member of any organization${colors.reset}`
      );
    }

    // Step 6: Final confirmation
    console.log(`\n${colors.magenta}📋 Deletion Summary:${colors.reset}`);
    console.log(
      `   • Delete user: ${colors.white}${user.email}${colors.reset}`
    );
    if (shouldDeleteOrg && organizationInfo) {
      console.log(
        `   • Delete organization: ${colors.white}${organizationInfo.name}${colors.reset} (${organizationInfo.memberCount} members)`
      );
    }
    console.log(
      `\n${colors.red}⚠️  This action cannot be undone!${colors.reset}`
    );

    const finalConfirm = await question(`\nProceed with deletion? (y/N): `);

    if (
      finalConfirm.toLowerCase() !== "y" &&
      finalConfirm.toLowerCase() !== "yes"
    ) {
      console.log(`${colors.yellow}❌ Deletion cancelled${colors.reset}`);
      return;
    }

    // Step 7: Perform deletions
    console.log(`\n${colors.cyan}🗑️  Deleting user data...${colors.reset}`);

    await deleteUserCompletely(user._id.toString(), user.email);

    if (shouldDeleteOrg && organizationInfo) {
      console.log(
        `\n${colors.cyan}🗑️  Deleting organization...${colors.reset}`
      );
      await deleteOrganizationCompletely(organizationInfo.id);
    }

    console.log(
      `\n${colors.green}${colors.bright}✅ Deletion completed successfully!${colors.reset}`
    );
  } catch (error) {
    console.error(
      `\n${colors.red}❌ Error during deletion:${colors.reset}`,
      error.message
    );
    logger.error("User deletion error:", error);
  }
}

/**
 * Main CLI handler
 */
async function main() {
  const command = process.argv[2];

  if (
    !command ||
    command === "help" ||
    command === "--help" ||
    command === "-h"
  ) {
    showHelp();
    rl.close();
    return;
  }

  try {
    // Connect to database
    console.log(`${colors.cyan}🔌 Connecting to database...${colors.reset}`);
    await connectDb();
    console.log(`${colors.green}✅ Connected to database${colors.reset}`);

    switch (command) {
      case "delete-user":
        await interactiveDeleteUser();
        break;
      default:
        console.log(
          `${colors.red}❌ Unknown command: ${command}${colors.reset}`
        );
        showHelp();
        break;
    }
  } catch (error) {
    console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error.message);
    logger.error("CLI fatal error:", error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Handle cleanup on exit
process.on("SIGINT", () => {
  console.log(`\n${colors.yellow}👋 Goodbye!${colors.reset}`);
  rl.close();
  process.exit(0);
});

// Run the CLI
main().catch((error) => {
  console.error(`${colors.red}❌ Unhandled error:${colors.reset}`, error);
  rl.close();
  process.exit(1);
});
