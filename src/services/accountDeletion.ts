import { assertLocalAccountDeletion, deleteLocalAccount } from '@/modules/auth';
import { removeUserEventData } from '@/modules/events';
import { removeUserFeedData } from '@/modules/feeds';
import { removeUserConversationData } from '@/modules/messages';
import { removeAccountSettings } from '@/modules/settings';
import { removeUserShortData } from '@/modules/shorts';

export function deleteDemoAccount(userId: string, emailConfirmation: string, phrase: string, twoFactorCode: string): void {
  assertLocalAccountDeletion(userId, emailConfirmation, phrase, twoFactorCode);
  removeAccountSettings(userId);
  deleteLocalAccount(userId, emailConfirmation, phrase, twoFactorCode);
  removeUserFeedData(userId);
  removeUserEventData(userId);
  removeUserConversationData(userId);
  removeUserShortData(userId);
}
