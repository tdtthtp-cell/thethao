import * as XLSX from 'xlsx';
import { Match, Sport, Team, TournamentConfig, VenueConfig } from '../types';
import { getVenueForGroup } from './venueService';

export interface ParsedMatchItem {
  id: string;
  code: string;
  date: string;
  time: string;
  stage: string;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId?: string;
  awayTeamId?: string;
  isHomeTeamExisting: boolean;
  isAwayTeamExisting: boolean;
  pitch: string;
  refereeName: string;
  secretaryName: string;
  notes: string;
  sportId: string;
  categoryId?: string;
  categoryName?: string;
  rawRowNumber: number;
  isValid: boolean;
  errorMessage?: string;
}

export interface ParseMatchesResult {
  matches: ParsedMatchItem[];
  allFoundGroups: string[];
  newTeamNamesToCreate: string[];
  stats: {
    totalParsed: number;
    validCount: number;
    invalidCount: number;
    existingTeamsCount: number;
    newTeamsCount: number;
  };
}

/**
 * Standardize various date formats (DD/MM/YYYY, YYYY-MM-DD, Excel Serial Date) to 'YYYY-MM-DD'
 */
export function normalizeExcelDate(val: unknown, fallbackDate?: string): string {
  const defaultFallback = fallbackDate || new Date().toISOString().slice(0, 10);
  if (val === undefined || val === null || val === '') return defaultFallback;

  // If already a Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().slice(0, 10);
  }

  // If Excel numeric serial date (e.g. 45610)
  if (typeof val === 'number') {
    try {
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj && dateObj.y && dateObj.m && dateObj.d) {
        const yyyy = dateObj.y.toString().padStart(4, '0');
        const mm = dateObj.m.toString().padStart(2, '0');
        const dd = dateObj.d.toString().padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      }
    } catch {
      // ignore
    }
  }

  const str = String(val).trim();
  if (!str) return defaultFallback;

  // Format DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    const yyyy = dmyMatch[3];
    return `${yyyy}-${mm}-${dd}`;
  }

  // Format YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (ymdMatch) {
    const yyyy = ymdMatch[1];
    const mm = ymdMatch[2].padStart(2, '0');
    const dd = ymdMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return defaultFallback;
}

/**
 * Standardize time string or Excel fractional time to 'HH:mm'
 */
export function normalizeExcelTime(val: unknown, fallbackTime: string = '08:00'): string {
  if (val === undefined || val === null || val === '') return fallbackTime;

  // If Excel fractional day (e.g. 0.3541666666666667 for 08:30)
  if (typeof val === 'number') {
    if (val >= 0 && val < 1) {
      const totalMinutes = Math.round(val * 24 * 60);
      const hours = Math.floor(totalMinutes / 60) % 24;
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    // If integer hour (e.g. 8 or 14)
    if (val >= 0 && val <= 24) {
      return `${Math.floor(val).toString().padStart(2, '0')}:00`;
    }
  }

  const str = String(val).trim();
  if (!str) return fallbackTime;

  // Format HH:mm or HH:mm:ss or H:mm
  const timeMatch = str.match(/^(\d{1,2})[:hH](\d{2})(?:[:]\d{2})?$/);
  if (timeMatch) {
    const hh = Math.min(23, Math.max(0, parseInt(timeMatch[1], 10)))
      .toString()
      .padStart(2, '0');
    const mm = Math.min(59, Math.max(0, parseInt(timeMatch[2], 10)))
      .toString()
      .padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // Format just hour "8" or "8h" or "14h"
  const hourMatch = str.match(/^(\d{1,2})[hH]?$/);
  if (hourMatch) {
    const hh = Math.min(23, Math.max(0, parseInt(hourMatch[1], 10)))
      .toString()
      .padStart(2, '0');
    return `${hh}:00`;
  }

  return fallbackTime;
}

/**
 * Determine column indexes based on row header strings
 */
function findMatchColumnIndexes(headerRow: any[]) {
  const normHeaders = headerRow.map((cell) =>
    String(cell || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
  );

  const findIdx = (keywords: string[]) => {
    return normHeaders.findIndex((h) => keywords.some((kw) => h === kw || h.includes(kw)));
  };

  const codeIdx = findIdx(['mã trận', 'mã', 'trận', 'stt', 'code', 'trận số', 'mã số']);
  const dateIdx = findIdx(['ngày', 'ngày đấu', 'ngày thi đấu', 'date']);
  const timeIdx = findIdx(['giờ', 'giờ đấu', 'thời gian', 'time', 'giờ thi đấu']);
  const stageIdx = findIdx(['bảng', 'bảng đấu', 'khối', 'vòng', 'vòng đấu', 'giai đoạn', 'stage', 'group']);
  const homeIdx = findIdx(['đội 1', 'đội nhà', 'đội a', 'home', 'lớp 1', 'đội thứ nhất', 'đội']);
  const awayIdx = findIdx(['đội 2', 'đội khách', 'đội b', 'away', 'lớp 2', 'đội thứ hai']);
  const pitchIdx = findIdx(['sân', 'sân đấu', 'sân thi đấu', 'địa điểm', 'pitch', 'court', 'venue']);
  const refereeIdx = findIdx(['trọng tài', 'trọng tài chính', 'referee']);
  const secretaryIdx = findIdx(['thư ký', 'thư ký bàn', 'secretary']);
  const notesIdx = findIdx(['ghi chú', 'nội dung', 'notes', 'chú thích']);

  return {
    codeIdx,
    dateIdx,
    timeIdx,
    stageIdx,
    homeIdx,
    awayIdx,
    pitchIdx,
    refereeIdx,
    secretaryIdx,
    notesIdx,
  };
}

/**
 * Core parsing logic for 2D array of cells
 */
export function parseMatchMatrix(
  rows: any[][],
  context: {
    currentSportId: string;
    activeCategoryId?: string;
    activeCategoryName?: string;
    existingTeams: Team[];
    customGroups: string[];
    venues?: VenueConfig[];
    defaultReferee?: string;
    defaultSecretary?: string;
  }
): ParseMatchesResult {
  if (!rows || rows.length === 0) {
    return {
      matches: [],
      allFoundGroups: [],
      newTeamNamesToCreate: [],
      stats: { totalParsed: 0, validCount: 0, invalidCount: 0, existingTeamsCount: 0, newTeamsCount: 0 },
    };
  }

  // Map existing teams for fast lookup by name (case-insensitive)
  const teamByName = new Map<string, Team>();
  context.existingTeams.forEach((t) => {
    if (t.name) teamByName.set(t.name.trim().toLowerCase(), t);
  });

  // Find header row: row containing both team 1 and team 2 or match code
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i] || [];
    const textJoined = row.map((c) => String(c || '').toLowerCase()).join(' ');
    if (
      (textJoined.includes('đội 1') && textJoined.includes('đội 2')) ||
      (textJoined.includes('đội a') && textJoined.includes('đội b')) ||
      (textJoined.includes('ngày') && textJoined.includes('đội')) ||
      (textJoined.includes('mã trận') && textJoined.includes('bảng'))
    ) {
      headerRowIndex = i;
      break;
    }
  }

  let colMap = {
    codeIdx: 0,
    dateIdx: 1,
    timeIdx: 2,
    stageIdx: 3,
    homeIdx: 4,
    awayIdx: 5,
    pitchIdx: 6,
    refereeIdx: 7,
    secretaryIdx: 8,
    notesIdx: 9,
  };

  const startDataRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;
  if (headerRowIndex >= 0) {
    colMap = findMatchColumnIndexes(rows[headerRowIndex]);
  }

  // Fallback defaults if indexes not found
  if (colMap.homeIdx === -1) colMap.homeIdx = 3;
  if (colMap.awayIdx === -1) colMap.awayIdx = 4;
  if (colMap.stageIdx === -1) colMap.stageIdx = 2;
  if (colMap.dateIdx === -1) colMap.dateIdx = 0;
  if (colMap.timeIdx === -1) colMap.timeIdx = 1;

  const parsedMatches: ParsedMatchItem[] = [];
  const foundGroupsSet = new Set<string>();
  const newTeamNamesSet = new Set<string>();

  for (let r = startDataRow; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    const rawHome = colMap.homeIdx >= 0 && row[colMap.homeIdx] !== undefined ? String(row[colMap.homeIdx]).trim() : '';
    const rawAway = colMap.awayIdx >= 0 && row[colMap.awayIdx] !== undefined ? String(row[colMap.awayIdx]).trim() : '';

    // Ignore completely empty rows or title rows
    if (!rawHome && !rawAway) continue;
    if (rawHome.toLowerCase().includes('đội 1') || rawHome.toLowerCase().includes('đội a')) continue;

    const rawCode = colMap.codeIdx >= 0 && row[colMap.codeIdx] !== undefined ? String(row[colMap.codeIdx]).trim() : '';
    const rawDate = colMap.dateIdx >= 0 ? row[colMap.dateIdx] : '';
    const rawTime = colMap.timeIdx >= 0 ? row[colMap.timeIdx] : '';
    const rawStage = colMap.stageIdx >= 0 && row[colMap.stageIdx] !== undefined ? String(row[colMap.stageIdx]).trim() : '';
    const rawPitch = colMap.pitchIdx >= 0 && row[colMap.pitchIdx] !== undefined ? String(row[colMap.pitchIdx]).trim() : '';
    const rawReferee = colMap.refereeIdx >= 0 && row[colMap.refereeIdx] !== undefined ? String(row[colMap.refereeIdx]).trim() : '';
    const rawSecretary = colMap.secretaryIdx >= 0 && row[colMap.secretaryIdx] !== undefined ? String(row[colMap.secretaryIdx]).trim() : '';
    const rawNotes = colMap.notesIdx >= 0 && row[colMap.notesIdx] !== undefined ? String(row[colMap.notesIdx]).trim() : '';

    const cleanCode = rawCode || `Trận ${(parsedMatches.length + 1).toString().padStart(2, '0')}`;
    const cleanDate = normalizeExcelDate(rawDate);
    const cleanTime = normalizeExcelTime(rawTime);
    const cleanStage = rawStage || context.customGroups[0] || 'Khối 10';

    if (cleanStage) {
      foundGroupsSet.add(cleanStage);
    }

    // Determine venue / court
    let cleanPitch = rawPitch;
    if (!cleanPitch) {
      const venueCode = getVenueForGroup(cleanStage);
      cleanPitch = venueCode === 'main' ? 'Sân 1 (Điểm chính)' : 'Sân 1 (Phân hiệu)';
    }

    // Check existing home / away teams
    const homeTeamFound = teamByName.get(rawHome.toLowerCase());
    const awayTeamFound = teamByName.get(rawAway.toLowerCase());

    const isHomeTeamExisting = !!homeTeamFound;
    const isAwayTeamExisting = !!awayTeamFound;

    if (rawHome && !isHomeTeamExisting) {
      newTeamNamesSet.add(rawHome);
    }
    if (rawAway && !isAwayTeamExisting) {
      newTeamNamesSet.add(rawAway);
    }

    let isValid = true;
    let errorMessage = '';

    if (!rawHome || !rawAway) {
      isValid = false;
      errorMessage = 'Thiếu tên một trong hai đội thi đấu';
    } else if (rawHome.toLowerCase() === rawAway.toLowerCase()) {
      isValid = false;
      errorMessage = 'Tên hai đội thi đấu trùng nhau';
    }

    parsedMatches.push({
      id: 'M_IMP_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) + '_' + r,
      code: cleanCode,
      date: cleanDate,
      time: cleanTime,
      stage: cleanStage,
      homeTeamName: rawHome,
      awayTeamName: rawAway,
      homeTeamId: homeTeamFound?.id,
      awayTeamId: awayTeamFound?.id,
      isHomeTeamExisting,
      isAwayTeamExisting,
      pitch: cleanPitch,
      refereeName: rawReferee || context.defaultReferee || 'Ban trọng tài',
      secretaryName: rawSecretary || context.defaultSecretary || 'Ban thư ký',
      notes: rawNotes,
      sportId: context.currentSportId,
      categoryId: context.activeCategoryId && context.activeCategoryId !== 'ALL' ? context.activeCategoryId : undefined,
      categoryName: context.activeCategoryName,
      rawRowNumber: r + 1,
      isValid,
      errorMessage,
    });
  }

  const validCount = parsedMatches.filter((m) => m.isValid).length;

  return {
    matches: parsedMatches,
    allFoundGroups: Array.from(foundGroupsSet),
    newTeamNamesToCreate: Array.from(newTeamNamesSet),
    stats: {
      totalParsed: parsedMatches.length,
      validCount,
      invalidCount: parsedMatches.length - validCount,
      existingTeamsCount: parsedMatches.filter((m) => m.isHomeTeamExisting && m.isAwayTeamExisting).length,
      newTeamsCount: newTeamNamesSet.size,
    },
  };
}

/**
 * Parse an Excel (.xlsx, .xls, .csv) file
 */
export async function parseMatchesFromExcel(
  file: File,
  context: {
    currentSportId: string;
    activeCategoryId?: string;
    activeCategoryName?: string;
    existingTeams: Team[];
    customGroups: string[];
    venues?: VenueConfig[];
    defaultReferee?: string;
    defaultSecretary?: string;
  }
): Promise<ParseMatchesResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

  // Priority sheet: 'LichThiDau' or 'Lịch thi đấu' or first sheet
  let targetSheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const lower = name.toLowerCase();
    if (lower.includes('lich') || lower.includes('lịch') || lower.includes('schedule') || lower.includes('tran')) {
      targetSheetName = name;
      break;
    }
  }

  const sheet = workbook.Sheets[targetSheetName];
  if (!sheet) {
    throw new Error('Không tìm thấy bảng tính trong file Excel.');
  }

  const rawRows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
  return parseMatchMatrix(rawRows, context);
}

/**
 * Parse raw pasted clipboard text (TSV or CSV)
 */
export function parseMatchesFromPastedText(
  pastedText: string,
  context: {
    currentSportId: string;
    activeCategoryId?: string;
    activeCategoryName?: string;
    existingTeams: Team[];
    customGroups: string[];
    venues?: VenueConfig[];
    defaultReferee?: string;
    defaultSecretary?: string;
  }
): ParseMatchesResult {
  const lines = pastedText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows: any[][] = lines.map((line) => {
    if (line.includes('\t')) {
      return line.split('\t').map((c) => c.trim());
    }
    // comma separated
    return line.split(',').map((c) => c.trim());
  });

  return parseMatchMatrix(rows, context);
}

/**
 * Convert parsed items into clean Match objects
 */
export function buildMatchesFromParsed(
  parsedItems: ParsedMatchItem[],
  createdTeamsMap: Map<string, Team>,
  existingTeams: Team[]
): Match[] {
  const existingMap = new Map<string, Team>();
  existingTeams.forEach((t) => existingMap.set(t.name.trim().toLowerCase(), t));

  return parsedItems.map((item, idx) => {
    // Resolve home team
    let homeTeam = existingMap.get(item.homeTeamName.toLowerCase());
    if (!homeTeam) {
      homeTeam = createdTeamsMap.get(item.homeTeamName.toLowerCase());
    }
    if (!homeTeam) {
      homeTeam = {
        id: 'T_' + Date.now() + '_H_' + idx,
        name: item.homeTeamName,
        group: item.stage,
        gender: 'male',
      };
    }

    // Resolve away team
    let awayTeam = existingMap.get(item.awayTeamName.toLowerCase());
    if (!awayTeam) {
      awayTeam = createdTeamsMap.get(item.awayTeamName.toLowerCase());
    }
    if (!awayTeam) {
      awayTeam = {
        id: 'T_' + Date.now() + '_A_' + idx,
        name: item.awayTeamName,
        group: item.stage,
        gender: 'male',
      };
    }

    const match: Match = {
      id: item.id || 'M_' + Date.now() + '_' + idx,
      sportId: item.sportId,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      code: item.code || `Trận ${(idx + 1).toString().padStart(2, '0')}`,
      stage: item.stage,
      pitch: item.pitch,
      date: item.date,
      time: item.time,
      home: homeTeam,
      away: awayTeam,
      status: 'UPCOMING',
      timer: { running: false, elapsedSeconds: 0, currentSet: 1 },
      scores: {
        set1: { home: 0, away: 0 },
        set2: { home: 0, away: 0 },
        set3: { home: 0, away: 0 },
        set4: { home: 0, away: 0 },
        set5: { home: 0, away: 0 },
        pen: { home: 0, away: 0, played: false },
      },
      events: [],
      refereeName: item.refereeName,
      secretaryName: item.secretaryName,
      notes: item.notes || `Nhập từ file Excel (${item.stage})`,
    };

    return match;
  });
}

/**
 * Generate and trigger download for an Excel schedule template
 */
export function downloadMatchScheduleImportTemplateExcel(
  sports: Sport[],
  config: TournamentConfig,
  teams: Team[]
) {
  const currentSport = sports.find((s) => s.id === config.activeSportId) || sports[0];
  const activeCategory = currentSport?.categories?.find((c) => c.id === config.activeCategoryId);

  // 1. Sheet "LichThiDau" (Main template with sample data)
  const todayStr = new Date().toISOString().slice(0, 10);
  const sampleScheduleData = [
    [
      'Mã trận',
      'Ngày đấu',
      'Giờ đấu',
      'Bảng / Khối',
      'Đội 1 (Đội nhà)',
      'Đội 2 (Đội khách)',
      'Địa điểm / Sân',
      'Trọng tài',
      'Thư ký',
      'Ghi chú',
    ],
    [
      'Trận 01',
      todayStr,
      '07:30',
      'Khối 10',
      teams[0]?.name || '10A1',
      teams[1]?.name || '10A2',
      'Sân 1 (Phân hiệu)',
      config.referee || 'Thầy Bồ Công Lâm',
      config.secretary || 'Cô Trần Thị Thu Hồng',
      'Vòng bảng Khối 10 Phân hiệu',
    ],
    [
      'Trận 02',
      todayStr,
      '08:30',
      'Khối 10',
      teams[2]?.name || '10A3',
      teams[3]?.name || '10A4',
      'Sân 1 (Phân hiệu)',
      config.referee || 'Thầy Bồ Công Lâm',
      config.secretary || 'Cô Trần Thị Thu Hồng',
      'Vòng bảng Khối 10 Phân hiệu',
    ],
    [
      'Trận 03',
      todayStr,
      '07:30',
      'K10',
      'K10A1',
      'K10A2',
      'Sân Điểm chính',
      'Thầy Nguyễn Văn Nam',
      'Thầy Lê Minh',
      'Vòng bảng K10 Điểm chính',
    ],
    [
      'Trận 04',
      todayStr,
      '09:30',
      'Khối 11',
      teams[4]?.name || '11B1',
      teams[5]?.name || '11B2',
      'Sân 2 (Phân hiệu)',
      config.referee || 'Thầy Bồ Công Lâm',
      config.secretary || 'Cô Trần Thị Thu Hồng',
      'Vòng bảng Khối 11',
    ],
    [
      'Trận 05',
      todayStr,
      '14:00',
      'Bán kết',
      'Nhất Bảng A',
      'Nhì Bảng B',
      'Sân Điểm chính',
      config.referee || 'Thầy Bồ Công Lâm',
      config.secretary || 'Cô Trần Thị Thu Hồng',
      'Bán kết 1',
    ],
  ];

  const wsSchedule = XLSX.utils.aoa_to_sheet(sampleScheduleData);
  wsSchedule['!cols'] = [
    { wch: 12 }, // Mã trận
    { wch: 14 }, // Ngày
    { wch: 10 }, // Giờ
    { wch: 16 }, // Bảng/Khối
    { wch: 20 }, // Đội 1
    { wch: 20 }, // Đội 2
    { wch: 24 }, // Sân/Địa điểm
    { wch: 22 }, // Trọng tài
    { wch: 22 }, // Thư ký
    { wch: 28 }, // Ghi chú
  ];

  // 2. Sheet "DanhSachDoiThamChieu" (Reference teams currently in system)
  const teamsRefData = [
    ['Tên đội / Lớp', 'Bảng / Khối', 'Địa điểm thi đấu', 'HLV / GVCN', 'Mã Đội'],
    ...teams.map((t) => [
      t.name,
      t.group,
      getVenueForGroup(t.group) === 'main' ? 'Điểm chính (K10, K11, K12)' : 'Phân hiệu (Khối 10, Khối 11, Khối 12)',
      t.coachName || 'Giáo viên phụ trách',
      t.id,
    ]),
  ];
  const wsTeamsRef = XLSX.utils.aoa_to_sheet(teamsRefData);
  wsTeamsRef['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 32 }, { wch: 24 }, { wch: 16 }];

  // 3. Sheet "HuongDan" (Instructions)
  const instructionsData = [
    ['HƯỚNG DẪN NHẬP LỊCH THI ĐẤU TỪ FILE EXCEL'],
    ['1. File Excel gồm các cột tiêu đề: Mã trận, Ngày đấu, Giờ đấu, Bảng / Khối, Đội 1, Đội 2, Địa điểm / Sân.'],
    ['2. Tên đội (Đội 1 & Đội 2) nên trùng khớp với danh sách các lớp đã tạo trong mục "Danh Sách Đội" (ví dụ: 10A1, 10A2...).'],
    ['3. Nếu file Excel có tên đội mới chưa từng tạo, hệ thống có tùy chọn tự động thêm các đội này vào giải đấu.'],
    ['4. Phân bố địa điểm thi đấu mặc định theo quy định của giải:'],
    ['   - Các bảng đấu có ký tự đầu K10, K11, K12 thi đấu tại ĐIỂM CHÍNH.'],
    ['   - Các bảng đấu có tên Khối 10, Khối 11, Khối 12 thi đấu tại PHÂN HIỆU.'],
    ['5. Định dạng ngày hỗ trợ: DD/MM/YYYY (ví dụ: 15/11/2026) hoặc YYYY-MM-DD.'],
    ['6. Định dạng giờ hỗ trợ: HH:mm (ví dụ: 07:30, 08:00, 14:15).'],
    ['7. Bạn có thể xóa các dòng ví dụ và nhập lịch thi đấu thực tế của trường trước khi tải lên.'],
  ];
  const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
  wsInstructions['!cols'] = [{ wch: 80 }];

  // Assemble workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSchedule, 'LichThiDau');
  XLSX.utils.book_append_sheet(wb, wsTeamsRef, 'DanhSachDoi');
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'HuongDan');

  const sportFileName = (currentSport?.code || 'GIAI_DAU').toLowerCase();
  const catSuffix = activeCategory ? `_${activeCategory.name.replace(/\s+/g, '_')}` : '';
  const fileName = `Mau_Nhap_Lich_Thi_Dau_${sportFileName}${catSuffix}_${config.year || new Date().getFullYear()}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
