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
  role: 'member' | 'moderator' | 'admin';
  status: 'active' | 'suspended' | 'banned';
  suspended_until: string | null;
  allow_direct_messages: boolean;
  allow_profile_discovery: boolean;
  visibility: 'public' | 'private';
  equipped_frame: string | null;
  equipped_effect: string | null;
  equipped_badge: string | null;
  equipped_banner: string | null;
  purchase_age_verified_at: string | null;
  deletion_requested_at: string | null;
  deletion_purge_after: string | null;
  created_at: string;
  updated_at: string;
}

export type PublicProfileRow = {
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
  allow_direct_messages: boolean;
  equipped_frame: string | null;
  equipped_effect: string | null;
  equipped_badge: string | null;
  equipped_banner: string | null;
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

export type EventRow = {
  id: string;
  creator_id: string;
  world_type: SanctuaryScope;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  starts_at: string;
  ends_at: string | null;
  state: 'visible' | 'hidden' | 'removed';
  created_at: string;
};

export type EventRsvpRow = {
  id: string;
  event_id: string;
  user_id: string;
  status: 'going' | 'interested' | 'cancelled';
  created_at: string;
  updated_at: string;
};

export type SocialLikeRow = {
  id: string;
  target_type: 'post' | 'short' | 'event';
  target_id: string;
  user_id: string;
  created_at: string;
};

export type SocialCommentRow = {
  id: string;
  target_type: 'post' | 'short' | 'event';
  target_id: string;
  author_id: string;
  body: string;
  state: 'visible' | 'hidden' | 'removed';
  hidden_for_deletion: boolean;
  created_at: string;
};

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

export type ModerationAppealRow = {
  id: string;
  user_id: string;
  report_id: string | null;
  action_id: string | null;
  message: string;
  status: 'open' | 'reviewing' | 'resolved' | 'denied';
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type ModerationNoteRow = {
  id: string;
  author_id: string;
  subject_user_id: string;
  body: string;
  created_at: string;
};

export type TokenPurchaseReviewRow = {
  id: string;
  user_id: string;
  checkout_session_id: string;
  refund_event_id: string | null;
  reason: 'spent_tokens' | 'partial_refund' | 'partial_dispute' | 'dispute_won' | 'unmatched';
  shortfall_tokens: number;
  status: 'open' | 'resolved' | 'dismissed';
  notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
};

export type AccountDeletionRequestRow = {
  user_id: string;
  requested_at: string;
  purge_after: string;
  prior_visibility: 'public' | 'private';
  prior_allow_profile_discovery: boolean;
  prior_status: 'active' | 'suspended' | 'banned';
  prior_suspended_until: string | null;
  cancelled_at: string | null;
  purge_attempted_at: string | null;
  created_at: string;
};

export type MemberTermsAcceptance = {
  terms_version: string;
  accepted_at: string;
};

export type AdminMemberOverview = {
  profile: ProfileRow;
  balance_tokens: number;
  ledger: {
    id: string;
    bundle_id: string;
    tokens_delta: number;
    amount_total: number;
    created_at: string;
  }[];
  spends: {
    id: string;
    item_id: string;
    item_name: string;
    tokens_delta: number;
    created_at: string;
  }[];
  notes: ModerationNoteRow[];
  appeals: ModerationAppealRow[];
  purchase_reviews: TokenPurchaseReviewRow[];
  moderation_actions: {
    id: string;
    action: ModerationAction;
    rationale: string;
    expires_at: string | null;
    created_at: string;
  }[];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow>;
      terms_acceptances: Table<{
        id: string;
        user_id: string;
        terms_version: string;
        accepted_at: string;
      }, { user_id: string; terms_version: string }, never>;
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
        bundle_id: 'tokens_100' | 'tokens_600' | 'tokens_1200' | 'signup_bonus';
        tokens_delta: number;
        amount_total: number;
        currency: 'gbp';
        stripe_event_id: string;
        checkout_session_id: string;
        livemode: boolean;
        created_at: string;
      }>;
      token_spend_catalog: Table<{
        item_id: string;
        name: string;
        description: string;
        price_tokens: number;
        kind: 'profile_frame' | 'profile_effect' | 'profile_badge' | 'profile_banner' | 'chat_item' | 'gift' | 'vip' | 'promotion';
        enabled: boolean;
        asset_url: string | null;
        asset_text: string | null;
        effect_key: string | null;
        sort_order: number;
        created_at: string;
      }>;
      token_spend_ledger: Table<{
        id: string;
        user_id: string;
        item_id: string;
        item_name: string;
        tokens_delta: number;
        idempotency_key: string;
        created_at: string;
      }>;
      token_entitlements: Table<{
        user_id: string;
        item_id: string;
        granted_at: string;
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
        hidden_for_deletion: boolean;
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
        hidden_for_deletion: boolean;
        created_at: string;
      }>;
      events: Table<{
        id: string;
        creator_id: string;
        world_type: SanctuaryScope;
        title: string;
        description: string;
        latitude: number;
        longitude: number;
        starts_at: string;
        ends_at: string | null;
        state: 'visible' | 'hidden' | 'removed';
        hidden_for_deletion: boolean;
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
        world_type: SanctuaryScope;
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
      account_deletion_requests: Table<AccountDeletionRequestRow>;
      token_refund_events: Table<{
        id: string;
        stripe_event_id: string;
        stripe_event_type: string;
        checkout_session_id: string;
        user_id: string;
        reason: 'refund' | 'dispute';
        purchased_tokens: number;
        clawed_back_tokens: number;
        shortfall_tokens: number;
        review_required: boolean;
        created_at: string;
      }>;
      token_purchase_reviews: Table<TokenPurchaseReviewRow>;
      moderation_appeals: Table<ModerationAppealRow>;
      moderation_notes: Table<ModerationNoteRow>;
    };
    Views: {
      public_profiles: {
        Row: PublicProfileRow;
        Relationships: [];
      };
      event_rsvp_counts: {
        Row: {
          event_id: string;
          going_count: number;
        };
        Relationships: [];
      };
      social_like_counts: {
        Row: {
          target_type: 'post' | 'short' | 'event';
          target_id: string;
          like_count: number;
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
      is_moderator: {
        Args: Record<string, never>;
        Returns: boolean;
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
      spend_tokens: {
        Args: {
          requested_item_id: string;
          requested_idempotency_key: string;
        };
        Returns: {
          balance_tokens: number;
          item_id: string;
          already_applied: boolean;
        }[];
      };
      equip_profile_cosmetic: {
        Args: {
          requested_item_id: string;
        };
        Returns: {
          item_id: string;
          kind: string;
        }[];
      };
      clear_profile_cosmetic: {
        Args: {
          requested_slot: 'frame' | 'effect' | 'badge' | 'banner';
        };
        Returns: undefined;
      };
      confirm_token_purchase_age: {
        Args: { requested_date_of_birth: string };
        Returns: string;
      };
      record_token_refund: {
        Args: {
          requested_event_id: string;
          requested_event_type: string;
          requested_checkout_session_id: string;
          requested_reason: 'refund' | 'dispute';
          requested_is_full: boolean;
        };
        Returns: {
          matched: boolean;
          clawed_back_tokens: number;
          shortfall_tokens: number;
          review_required: boolean;
        }[];
      };
      request_account_deletion: {
        Args: Record<string, never>;
        Returns: string;
      };
      cancel_account_deletion: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      purge_due_account_deletions: {
        Args: { requested_limit?: number };
        Returns: {
          user_id: string;
          requested_at: string;
        }[];
      };
      admin_search_members: {
        Args: { requested_query: string; requested_limit?: number };
        Returns: {
          id: string;
          username: string;
          display_name: string;
          role: 'member' | 'moderator' | 'admin';
          status: 'active' | 'suspended' | 'banned';
          suspended_until: string | null;
          balance_tokens: number;
          created_at: string;
        }[];
      };
      admin_member_overview: {
        Args: { requested_user_id: string };
        Returns: AdminMemberOverview;
      };
      admin_set_member_role: {
        Args: { requested_user_id: string; requested_role: 'member' | 'moderator' | 'admin' };
        Returns: undefined;
      };
      admin_add_member_note: {
        Args: { requested_user_id: string; requested_body: string };
        Returns: string;
      };
      admin_list_audit_events: {
        Args: { requested_limit?: number; requested_offset?: number };
        Returns: {
          id: number;
          actor_id: string | null;
          actor_username: string | null;
          event_type: string;
          subject_type: string;
          subject_id: string | null;
          details: Record<string, unknown>;
          created_at: string;
        }[];
      };
      admin_list_terms_acceptances: {
        Args: { requested_user_id: string };
        Returns: {
          terms_version: string;
          accepted_at: string;
        }[];
      };
      submit_moderation_appeal: {
        Args: { requested_report_id: string | null; requested_message: string };
        Returns: string;
      };
      admin_list_appeals: {
        Args: { requested_status?: 'open' | 'reviewing' | 'resolved' | 'denied' | null };
        Returns: {
          id: string;
          user_id: string;
          username: string;
          display_name: string;
          report_id: string | null;
          action_id: string | null;
          message: string;
          status: 'open' | 'reviewing' | 'resolved' | 'denied';
          resolution_notes: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        }[];
      };
      admin_resolve_appeal: {
        Args: {
          requested_appeal_id: string;
          requested_status: 'reviewing' | 'resolved' | 'denied';
          requested_notes: string;
        };
        Returns: undefined;
      };
      admin_list_purchase_reviews: {
        Args: { requested_status?: 'open' | 'resolved' | 'dismissed' | null };
        Returns: TokenPurchaseReviewRow[];
      };
      admin_resolve_purchase_review: {
        Args: {
          requested_review_id: string;
          requested_status: 'resolved' | 'dismissed';
          requested_notes: string;
        };
        Returns: undefined;
      };
      fetch_my_moderation_appeals: {
        Args: Record<string, never>;
        Returns: ModerationAppealRow[];
      };
    };
    Enums: {
      world_type: SanctuaryScope;
      conversation_kind: 'direct' | 'group';
      content_state: 'visible' | 'hidden' | 'removed';
      report_status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
      report_target_type: 'post' | 'short' | 'event' | 'message';
      moderation_action_type: ModerationAction;
    };
    CompositeTypes: Record<string, never>;
  };
}
