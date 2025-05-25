import connectDb from '@librechat/backend/lib/db/connectDb';
import { User } from '@librechat/backend/models';

/**
 * Delete all agents for a specific user
 * @param userEmail - User email to filter agents
 */
export default async function cleanupAgents(userEmail: string): Promise<number> {
  try {
    console.log(`🤖: Cleaning up agents for user: ${userEmail}`);
    const db = await connectDb();
    console.log('🤖:  ✅  Connected to Database');

    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      console.log(`🤖:  ⚠️  No user found with email: ${userEmail}`);
      return 0;
    }

    // Access the agents collection directly
    const agentsCollection = db.connection.collection('agents');
    const result = await agentsCollection.deleteMany({ author: user._id });

    console.log(`🤖:  ✅  Deleted ${result.deletedCount} agents for user ${userEmail}`);

    await db.connection.close();
    return result.deletedCount;
  } catch (error) {
    console.error('Error cleaning up agents:', error);
    return 0;
  }
}
