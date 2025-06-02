import connectDb from '@librechat/backend/lib/db/connectDb';
import { User, deleteConvos, deleteMessages } from '@librechat/backend/models';

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

export async function cleanupChats(
  userEmail: string,
): Promise<{ conversations: number; messages: number }> {
  try {
    console.log(`🤖: Cleaning up chats for user: ${userEmail}`);
    const db = await connectDb();
    console.log('🤖:  ✅  Connected to Database');

    const user = await User.findOne({ email: userEmail }).lean();
    if (!user) {
      console.log(`🤖:  ⚠️  No user found with email: ${userEmail}`);
      return { conversations: 0, messages: 0 };
    }

    // Delete all conversations and associated messages
    const { deletedCount: conversationCount, messages: messageCount } = await deleteConvos(
      user._id,
      {},
    );
    console.log(
      `🤖:  ✅  Deleted ${conversationCount} conversations and ${messageCount.deletedCount} messages`,
    );

    // Delete any orphaned messages
    const { deletedCount: orphanedMessages } = await deleteMessages({ user: user._id });
    const totalMessages = messageCount.deletedCount + orphanedMessages;
    if (orphanedMessages > 0) {
      console.log(`🤖:  ✅  Deleted ${orphanedMessages} orphaned messages`);
    }

    console.log(
      `🤖:  ✅  Total cleanup for ${userEmail}: ${conversationCount} conversations, ${totalMessages} messages`,
    );

    await db.connection.close();
    return { conversations: conversationCount, messages: totalMessages };
  } catch (error) {
    console.error('Error cleaning up chats:', error);
    return { conversations: 0, messages: 0 };
  }
}
