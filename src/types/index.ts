export type WorldType = 'sanctuary' | 'guild';

export interface UserProfile {
  id: string;
  username: string;
  avatar: string | null;
  cosmeticFrames: string[];
  role: string;
}

export interface Post {
  id: string;
  authorId: string;
  worldType: WorldType;
  content: string;
  mediaUrl: string | null;
  timestamp: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
}

export interface Gifting {
  id: string;
  postId: string;
  authorId: string;
  giftType: string;
  tipAmount: number;
}

export interface LocationPreference {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  radiusPreferenceKm: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  worldType: WorldType;
  locationCoords: Coordinates;
  date: string;
}