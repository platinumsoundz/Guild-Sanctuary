// Legacy database column retained during the Sanctuary migration.
type SanctuaryScope = 'sanctuary';

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
  bio: string | null;
  status_message: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  theme_color: string;
  location: string | null;
  age: number | null;
  star_sign: string | null;
  belief: string | null;
  social_links: Record<string, string | null>;
  privacy: Record<string, boolean>;
  role: 'user' | 'vip' | 'moderator' | 'admin' | 'developer' | 'owner';
  status: 'active' | 'suspended' | 'banned';
  suspended_until: string | null;
  allow_direct_messages: boolean;
  allow_profile_discovery: boolean;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export type PrivateProfileVaultRow = {
  user_id: string;
  ciphertext: string;
  salt: string;
  updated_at: string;
}

export type ConversationRow = {
  id: string;
  kind: 'direct' | 'group';
  world_type: SanctuaryScope;
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
  target_type: 'post' | 'short' | 'event' | 'message' | 'comment';
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
      daily_reflections: Table<{
        id: string;
        user_id: string;
        reflection_date: string;
        title: string;
        intention: string;
        content: string;
        mood: string | null;
        prompts: unknown;
        tags: unknown;
        created_at: string;
        updated_at: string;
      }>;
      profiles: Table<ProfileRow>;
      platform_page_visibility: Table<{
        page_key: string;
        is_visible: boolean;
        updated_by: string | null;
        updated_at: string;
      }>;
      community_tips: Table<{
        stripe_event_id: string;
        checkout_session_id: string;
        tip_option: 'tip_5_usd' | 'tip_10_usd' | 'tip_25_usd';
        amount_total: number;
        currency: 'usd';
        completed_at: string;
      }>;
      token_wallets: Table<{
        user_id: string;
        balance_tokens: number;
        created_at: string;
        updated_at: string;
      }>;
      token_ledger: Table<{
        id: string;
        user_id: string;
        bundle_id: 'tokens_100' | 'tokens_600' | 'tokens_1200';
        tokens_delta: number;
        amount_total: number;
        currency: 'gbp';
        stripe_event_id: string;
        checkout_session_id: string;
        livemode: boolean;
        created_at: string;
      }>;
      token_spend_catalog: Table<{
        item_id: string; name: string; description: string; price_tokens: number; kind: string; enabled: boolean;
        created_at: string; asset_url: string | null; asset_text: string | null; effect_key: string | null; sort_order: number;
      }>;
      token_spend_ledger: Table<{
        id: string; user_id: string; item_id: string; item_name: string; tokens_delta: number; idempotency_key: string; created_at: string;
      }>;
      token_entitlements: Table<{
        user_id: string; item_id: string; granted_at: string;
      }>;
      private_profile_vault: Table<PrivateProfileVaultRow>;
      account_settings: Table<{
        user_id: string;
        preferences: Record<string, unknown>;
        updated_at: string;
      }>;
      posts: Table<{
        id: string;
        author_id: string;
        world_type: SanctuaryScope;
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
        world_type: SanctuaryScope;
        video_url: string;
        caption: string;
        state: 'visible' | 'hidden' | 'removed';
        created_at: string;
      }>;
      events: Table<{
        id: string;
        creator_id: string;
        world_type: SanctuaryScope;
        title: string;
        description: string;
        location_name: string;
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
        target_type: 'post' | 'short' | 'event' | 'comment';
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
      notifications: Table<{
        id: string;
        recipient_id: string;
        actor_id: string;
        notification_type: 'like' | 'comment';
        target_type: 'post' | 'short' | 'event';
        target_id: string;
        created_at: string;
        read_at: string | null;
      }>;
      conversations: Table<ConversationRow>;
      conversation_members: Table<ConversationMemberRow>;
      direct_conversation_pairs: Table<{
        conversation_id: string;
        first_user_id: string;
        second_user_id: string;
        world_type: SanctuaryScope;
      }>;
      messages: Table<MessageRow>;
      content_reports: Table<ContentReportRow>;
      moderation_actions: Table<{
        id: string;
        report_id: string | null;
        actor_id: string;
        target_type: 'post' | 'short' | 'event' | 'message' | 'comment' | 'user';
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
    Views: {
      event_rsvp_counts: {
        Row: { event_id: string; going_count: number };
        Relationships: [];
      };
      public_profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          bio: string | null;
          status_message: string | null;
          avatar_url: string | null;
          banner_url: string | null;
          theme_color: string;
          location: string | null;
          age: number | null;
          star_sign: string | null;
          belief: string | null;
          social_links: Record<string, string | null> | null;
          allow_direct_messages: boolean;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_sanctuary_conversation: {
        Args: {
          requested_kind: 'direct' | 'group';
          requested_member_ids: string[];
          requested_name?: string | null;
        };
        Returns: string;
      };
      create_conversation: {
        Args: {
          requested_kind: 'direct' | 'group';
          requested_world: SanctuaryScope;
          requested_member_ids: string[];
          requested_name?: string | null;
        };
        Returns: string;
      };
      submit_content_report: {
        Args: {
          requested_target_type: 'post' | 'short' | 'event' | 'message' | 'comment';
          requested_target_id: string;
          requested_reason: string;
          requested_details?: string | null;
        };
        Returns: string;
      };
      apply_moderation_action: {
        Args: {
          requested_report_id: string | null;
          requested_target_type: 'post' | 'short' | 'event' | 'message' | 'comment' | 'user';
          requested_target_id: string;
          requested_action: ModerationAction;
          requested_rationale: string;
          requested_expires_at?: string | null;
        };
        Returns: string;
      };
      get_report_target_owner: {
        Args: {
          requested_target_type: 'post' | 'short' | 'event' | 'message' | 'comment';
          requested_target_id: string;
        };
        Returns: string | null;
      };
      get_short_engagement_stats: {
        Args: { requested_short_id: string };
        Returns: {
          liked: boolean;
          likes_count: number;
          comments_count: number;
        }[];
      };
      toggle_short_like: {
        Args: { requested_short_id: string };
        Returns: {
          liked: boolean;
          likes_count: number;
          comments_count: number;
        }[];
      };
      spend_tokens: {
        Args: { requested_item_id: string; requested_idempotency_key: string };
        Returns: { balance_tokens: number; item_id: string; already_applied: boolean }[];
      };
      equip_profile_cosmetic: {
        Args: { requested_item_id: string };
        Returns: { item_id: string; kind: string }[];
      };
      clear_profile_cosmetic: {
        Args: { requested_slot: 'frame' | 'effect' | 'badge' | 'banner' };
        Returns: undefined;
      };
      is_moderator: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      set_member_role: {
        Args: { requested_user_id: string; requested_role: 'user' | 'vip' | 'moderator' | 'admin' | 'developer' | 'owner' };
        Returns: undefined;
      };
      search_members_for_admin: {
        Args: { requested_query: string };
        Returns: { id: string; username: string; display_name: string; role: 'user' | 'vip' | 'moderator' | 'admin' | 'developer' | 'owner'; status: 'active' | 'suspended' | 'banned' }[];
      };
      record_community_tip: {
        Args: {
          requested_event_id: string;
          requested_event_type: string;
          requested_session_id: string;
          requested_tip_option: 'tip_5_usd' | 'tip_10_usd' | 'tip_25_usd';
          requested_amount_total: number;
          requested_currency: string;
        };
        Returns: boolean;
      };
      record_token_bundle_purchase: {
        Args: {
          requested_event_id: string;
          requested_event_type: string;
          requested_session_id: string;
          requested_user_id: string;
          requested_bundle_id: 'tokens_100' | 'tokens_600' | 'tokens_1200';
          requested_amount_total: number;
          requested_currency: string;
          requested_livemode: boolean;
        };
        Returns: number;
      };
    };
    Enums: {
      world_type: SanctuaryScope;
      conversation_kind: 'direct' | 'group';
      content_state: 'visible' | 'hidden' | 'removed';
      report_status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
      report_target_type: 'post' | 'short' | 'event' | 'message' | 'comment';
      moderation_action_type: ModerationAction;
    };
    CompositeTypes: Record<string, never>;
  };
}
