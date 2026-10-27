/**
 * Universal Default User Avatar
 * Clean, modern, gender-neutral profile avatar for all students, trainers, and staff.
 */
export const DEFAULT_AVATAR = '/default-avatar.svg';

/**
 * Returns the universal default avatar icon for everyone.
 * Prevents unwanted gendered or random third-party caricature images.
 */
export const getUserAvatar = (_avatarUrl?: string | null): string => {
  return DEFAULT_AVATAR;
};
