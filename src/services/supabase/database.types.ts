import type { WorldType } from '@/types';

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  role: 'member' | 'moderator' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  suspended_until: string | null;
  allow_direct_messages: boolean;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export type ConversationRow = {
  id: string;
  kind: 'direct' | 'group';
  world_type: WorldType;
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type ConversationMemberRow = {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
}

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  state: 'visible' | 'hidden' | 'removed';
  sent_at: string;
  read_at: string | null;
}

export type ContentReportRow = {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'short' | 'event' | 'message';
  target_id: string;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type ModerationAction = 'warn' | 'hide' | 'remove' | 'restore' | 'suspend' | 'ban';

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      account_settings: Table<{
        user_id: string;
        preferences: Record<string, unknown>;
        updated_at: string;
      }>;
      posts: Table<{
        id: string;
        author_id: string;
        world_type: WorldType;
        content: string;
        media_url: string | null;
        media_type: 'image' | 'audio' | 'video' | null;
        story_tag: string | null;
        state: 'visible' | 'hidden' | 'removed';
        created_at: string;
        updated_at: string;
      }>;
      short_videos: Table<{
        id: string;
        author_id: string;
        world_type: WorldType;
        video_url: string;
        caption: string;
        state: 'visible' | 'hidden' | 'removed';
        created_at: string;
      }>;
      events: Table<{
        id: string;
        creator_id: string;
        world_type: WorldType;
        title: string;
        description: string;
        latitude: number;
        longitude: number;
        starts_at: string;
        ends_at: string | null;
        state: 'visible' | 'hidden' | 'removed';
        created_at: string;
      }>;
      event_rsvps: Table<{
        id: string;
        event_id: string;
        user_id: string;
        status: 'going' | 'interested' | 'cancelled';
        created_at: string;
        updated_at: string;
      }>;
      social_likes: Table<{
        id: string;
        target_type: 'post' | 'short' | 'event';
        target_id: string;
        user_id: string;
        created_at: string;
      }>;
      social_comments: Table<{
        id: string;
        target_type: 'post' | 'short' | 'event';
        target_id: string;
        author_id: string;
        body: string;
        state: 'visible' | 'hidden' | 'removed';
        created_at: string;
      }>;
      conversations: Table<ConversationRow>;
      conversation_members: Table<ConversationMemberRow>;
      direct_conversation_pairs: Table<{
        conversation_id: string;
        first_user_id: string;
        second_user_id: string;
        world_type: WorldType;
      }>;
      messages: Table<MessageRow>;
      content_reports: Table<ContentReportRow>;
      moderation_actions: Table<{
        id: string;
        report_id: string | null;
        actor_id: string;
        target_type: 'post' | 'short' | 'event' | 'message' | 'user';
        target_id: string;
        action: ModerationAction;
        rationale: string;
        expires_at: string | null;
        created_at: string;
      }>;
      audit_events: Table<{
        id: number;
        actor_id: string | null;
        event_type: string;
        subject_type: string;
        subject_id: string | null;
        details: Record<string, unknown>;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      create_conversation: {
        Args: {
          requested_kind: 'direct' | 'group';
          requested_world: WorldType;
          requested_member_ids: string[];
          requested_name?: string | null;
        };
        Returns: string;
      };
      submit_content_report: {
        Args: {
          requested_target_type: 'post' | 'short' | 'event' | 'message';
          requested_target_id: string;
          requested_reason: string;
          requested_details?: string | null;
        };
        Returns: string;
      };
      apply_moderation_action: {
        Args: {
          requested_report_id: string | null;
          requested_target_type: 'post' | 'short' | 'event' | 'message' | 'user';
          requested_target_id: string;
          requested_action: ModerationAction;
          requested_rationale: string;
          requested_expires_at?: string | null;
        };
        Returns: string;
      };
      get_report_target_owner: {
        Args: {
          requested_target_type: 'post' | 'short' | 'event' | 'message';
          requested_target_id: string;
        };
        Returns: string | null;
      };
      is_moderator: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      world_type: WorldType;
      conversation_kind: 'direct' | 'group';
      content_state: 'visible' | 'hidden' | 'removed';
      report_status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
      report_target_type: 'post' | 'short' | 'event' | 'message';
      moderation_action_type: ModerationAction;
    };
    CompositeTypes: Record<string, never>;
  };
}
