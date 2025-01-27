import { Message, ChannelType } from 'discord.js';
import { initUserData, updateUserData, getCachedConfig } from '../services/firebase';
import { reportCoins } from '../services/reward';
import { createLibraryEntry, LibraryVisibility } from '../services/library';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

export async function handleMessage(message: Message): Promise<void> {
  if (message.author.bot) return;

  const user = { id: message.author.id, username: message.author.username };
  await updateMessageCount(user, message.channelId);

  if (message.channel.isThread() && message.channel.parent?.type === ChannelType.GuildForum) {
    const forumId = message.channel.parent.id;
    const config = getCachedConfig();
    
    if (config.rewards.forums.allowedForums?.includes(forumId)) {
      await Promise.all([
        reportCoins(user, config.rewards.forums.coins, 'participación en foro'),
        handleForumPost(message)
      ]);
    }
  }
}

async function handleForumPost(message: Message): Promise<void> {
  if (!message.channel.isThread()) return;
  
  const startMessage = await message.channel.fetchStarterMessage();
  if (message.id !== startMessage?.id) return;

  const title = message.channel.name;
  const description = message.content;
  const imageUrl = message.attachments.first()?.url || null;

  try {
    await createLibraryEntry({
      title,
      description,
      folderTitle: message.channel.parent?.name || 'Foros',
      visibility: LibraryVisibility.GENERAL,
      imageUrl
    });
    console.log(`[Library] Created entry for forum post: ${title}`);
  } catch (error) {
    console.error('[Library] Error creating entry:', error);
  }
}

async function updateMessageCount(user: { id: string, username: string }, channelId: string): Promise<void> {
  const userData = await initUserData(user.id);
  const config = getCachedConfig();

  if (!userData.specialChannelCounts) {
    userData.specialChannelCounts = {};
  }
  if (config.rewards.specialChannels.channels?.includes(channelId)) {
    const currentCount = (userData.specialChannelCounts[channelId] || 0) + 1;
    
    if (currentCount >= config.rewards.specialChannels.amount) {
      await Promise.all([
        reportCoins(user, config.rewards.specialChannels.coins, `actividad en canal especial`),
        updateUserData(user.id, {
          specialChannelCounts: {
            ...userData.specialChannelCounts,
            [channelId]: 0
          }
        })
      ]);
    } else {
      await updateUserData(user.id, {
        specialChannelCounts: {
          ...userData.specialChannelCounts,
          [channelId]: currentCount
        }
      });
    }
    return;
  }

  if (!config.rewards.messages.excludedChannels?.includes(channelId)) {
    const newMessageCount = (userData.messages || 0) + 1;
    if (newMessageCount >= config.rewards.messages.amount) {
      await Promise.all([
        reportCoins(user, config.rewards.messages.coins, 'actividad en chat'),
        updateUserData(user.id, { messages: 0 })
      ]);
    } else {
      await updateUserData(user.id, { messages: newMessageCount });
    }
  }
}
