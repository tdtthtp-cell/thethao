import { VenueConfig, Team } from '../types';
import { DEFAULT_VENUES } from './initialData';

/**
 * Determine the venue for a group name based on the tournament rule:
 * - Groups starting with K10, K11, K12 -> 'main' (Điểm chính)
 * - Groups starting with Khối 10, Khối 11, Khối 12 -> 'branch' (Phân hiệu)
 */
export function getVenueForGroup(groupName: string): 'main' | 'branch' {
  if (!groupName) return 'main';
  const trimmed = groupName.trim();
  const upper = trimmed.toUpperCase();

  // "các bảng đấu có ký tự đầu K10, K11, K12 sẽ thi đấu điểm chính"
  if (upper.startsWith('K10') || upper.startsWith('K11') || upper.startsWith('K12')) {
    return 'main';
  }

  // "Khối 10, Khối 11, Khối 12 sẽ thi đấu ở phân hiệu"
  if (
    trimmed.startsWith('Khối 10') ||
    trimmed.startsWith('Khối 11') ||
    trimmed.startsWith('Khối 12') ||
    trimmed.startsWith('Khoi 10') ||
    trimmed.startsWith('Khoi 11') ||
    trimmed.startsWith('Khoi 12') ||
    upper.startsWith('PH')
  ) {
    return 'branch';
  }

  return 'main';
}

/**
 * Get display info for a venue
 */
export function getVenueInfo(venueIdOrGroup: string, venues: VenueConfig[] = DEFAULT_VENUES) {
  const venueId =
    venueIdOrGroup === 'main' || venueIdOrGroup === 'branch'
      ? venueIdOrGroup
      : getVenueForGroup(venueIdOrGroup);

  const found = venues?.find((v) => v.id === venueId);
  if (venueId === 'branch') {
    return {
      id: 'branch',
      name: found?.name || 'Phân hiệu',
      code: found?.code || 'PH',
      badgeColor:
        'text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
      tagColor: '#d97706',
      icon: '🏫',
      description: found?.description || 'Khối 10, Khối 11, Khối 12 thi đấu tại Phân hiệu',
    };
  }

  return {
    id: 'main',
    name: found?.name || 'Điểm chính',
    code: found?.code || 'ĐC',
    badgeColor:
      'text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800',
    tagColor: '#4f46e5',
    icon: '📍',
    description: found?.description || 'Bảng K10, K11, K12 thi đấu tại Điểm chính',
  };
}

/**
 * Sort a list of group names so that Điểm chính (K10, K11, K12) comes first,
 * followed by Phân hiệu (Khối 10, Khối 11, Khối 12).
 */
export function sortGroupsByVenue(groups: string[]): string[] {
  return [...groups].sort((a, b) => {
    const venueA = getVenueForGroup(a);
    const venueB = getVenueForGroup(b);

    if (venueA !== venueB) {
      // 'main' comes before 'branch'
      return venueA === 'main' ? -1 : 1;
    }

    // Within same venue, natural sort
    return a.localeCompare(b, 'vi', { numeric: true });
  });
}

/**
 * Sort teams by venue order: Điểm chính (K10, K11, K12) first, then Phân hiệu
 */
export function sortTeamsByVenue(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    const venueA = getVenueForGroup(a.group);
    const venueB = getVenueForGroup(b.group);

    if (venueA !== venueB) {
      return venueA === 'main' ? -1 : 1;
    }

    // Within same venue, sort by group then name
    if (a.group !== b.group) {
      return a.group.localeCompare(b.group, 'vi', { numeric: true });
    }
    return a.name.localeCompare(b.name, 'vi', { numeric: true });
  });
}
