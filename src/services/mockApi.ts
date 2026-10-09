import type { WorldType } from '@/types';
import type { Message, Post, Profile, User } from '@/types/database';

const mockDelay = () => new Promise<void>((resolve) => setTimeout(resolve, 80));

const posts: Post[] = [
  {
    id: 'post-demo-sanctuary',
    authorId: 'user-demo-1',
    worldType: 'sanctuary',
    content: 'A quiet moment can change the shape of a whole day.',
    mediaUrl: null,
      mediaType: null,
      storyTag: null,
    createdAt: '2026-10-08T09:00:00.000Z',
    updatedAt: '2026-10-08T09:00:00.000Z',
  },
  {
    id: 'post-demo-guild',
    authorId: 'user-demo-1',
    worldType: 'guild',
    content: 'Looking for a few more people for tonight’s co-op run.',
    mediaUrl: null,
      mediaType: null,
      storyTag: null,
    createdAt: '2026-10-08T10:30:00.000Z',
    updatedAt: '2026-10-08T10:30:00.000Z',
  },
];

const users: User[] = [];
const profiles: Profile[] = [];
const messages: Message[] = [];
let nextId = 1;

export interface CreateUserInput {
  email: string;
  username: string;
  displayName?: string;
}

export interface SendChatMessageInput {
  conversationId: string;
  senderId: string;
  body: string;
}

export async function fetchFeed(worldType: WorldType): Promise<Post[]> {
  await mockDelay();
  return posts.filter((post) => post.worldType === worldType);
}

export async function createUser(input: CreateUserInput): Promise<{ user: User; profile: Profile }> {
  await mockDelay();
  const timestamp = new Date().toISOString();
  const userId = `user-mock-${nextId++}`;
  const user: User = {
    id: userId,
    email: input.email,
    emailVerified: false,
    twoFactorEnabled: false,
    status: 'active',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const profile: Profile = {
    id: `profile-mock-${nextId++}`,
    userId,
    username: input.username,
    displayName: input.displayName ?? input.username,
    bio: null,
    statusMessage: null,
    avatarUrl: null,
    bannerUrl: null,
    themeColor: '#52765c',
    location: null,
    age: null,
    starSign: null,
    belief: null,
    privacy: { bio: true, location: false, age: false, starSign: false, belief: false, socialLinks: false, allowDirectMessages: true },
    socialLinks: { facebook: null, x: null, youtube: null, xbox: null, playstation: null, steam: null, epicGames: null, reddit: null },
    visibility: 'public',
    role: 'member',
  };

  users.push(user);
  profiles.push(profile);

  return { user, profile };
}

export async function toggleWorld(currentWorld: WorldType): Promise<WorldType> {
  await mockDelay();
  return currentWorld === 'sanctuary' ? 'guild' : 'sanctuary';
}

export async function sendChatMessage(input: SendChatMessageInput): Promise<Message> {
  await mockDelay();
  const message: Message = {
    id: `message-mock-${nextId++}`,
    conversationId: input.conversationId,
    senderId: input.senderId,
    body: input.body,
    sentAt: new Date().toISOString(),
    readAt: null,
  };

  messages.push(message);
  return message;
}