import * as XLSX from 'xlsx';
import { Team, TeamGender } from '../types';

export interface ParsedTeamItem {
  id: string;
  name: string;
  group: string;
  gender: TeamGender;
  coachName: string;
  contactPhone: string;
  color: string;
  rawRowNumber: number;
  isValid: boolean;
  errorMessage?: string;
}

export interface ParseTeamsResult {
  teams: ParsedTeamItem[];
  allFoundGroups: string[];
  newGroups: string[];
  stats: {
    total: number;
    maleCount: number;
    femaleCount: number;
    mixedCount: number;
    byGroup: Record<string, { total: number; male: number; female: number; mixed: number }>;
  };
}

/**
 * Standardize gender string to 'male' | 'female' | 'mixed'
 */
export function normalizeGender(val: unknown, fallback: TeamGender = 'male'): TeamGender {
  if (!val) return fallback;
  const str = String(val).trim().toLowerCase();
  if (str === 'nữ' || str === 'nu' || str === 'female' || str === 'f' || str === 'gái' || str === 'đội nữ') {
    return 'female';
  }
  if (str === 'nam' || str === 'male' || str === 'm' || str === 'trai' || str === 'đội nam') {
    return 'male';
  }
  if (str === 'hỗn hợp' || str === 'hon hop' || str === 'mixed' || str === 'nam nữ' || str === 'nam/nữ') {
    return 'mixed';
  }
  return fallback;
}

/**
 * Download sample Excel template for importing teams with gender and group categorization
 */
export function downloadTeamImportTemplateExcel() {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: DanhSachDoi (Data template)
  const headers = [
    'STT',
    'Tên Đội (Lớp)',
    'Khối / Bảng',
    'Giới Tính (Nam/Nữ)',
    'Giáo Viên / HLV Phụ Trách',
    'Số Điện Thoại',
    'Màu Áo (Mã Hex hoặc Tên Màu)',
    'Ghi Chú',
  ];

  const sampleRows: (string | number)[][] = [
    [1, '10A1', 'Khối 10', 'Nam', 'Thầy Trần Văn Nam', '0912345678', '#0284c7', 'Đội bóng nam lớp 10A1'],
    [2, '10A1', 'Khối 10', 'Nữ', 'Cô Lê Thị Hoa', '0987654321', '#e11d48', 'Đội bóng nữ lớp 10A1'],
    [3, '10A2', 'Khối 10', 'Nam', 'Thầy Nguyễn Văn B', '0903112233', '#0284c7', 'Đội bóng nam lớp 10A2'],
    [4, '10A2', 'Khối 10', 'Nữ', 'Cô Phạm Thị C', '0904223344', '#e11d48', 'Đội bóng nữ lớp 10A2'],
    [5, '11B1', 'Khối 11', 'Nam', 'Thầy Hoàng Văn D', '0918556677', '#16a34a', 'Đội bóng nam lớp 11B1'],
    [6, '11B1', 'Khối 11', 'Nữ', 'Cô Đặng Thị E', '0919667788', '#db2777', 'Đội bóng nữ lớp 11B1'],
    [7, '11B2', 'Khối 11', 'Nam', 'Thầy Vũ Văn F', '0909778899', '#16a34a', 'Đội bóng nam lớp 11B2'],
    [8, '11B2', 'Khối 11', 'Nữ', 'Cô Bùi Thị G', '0908889900', '#db2777', 'Đội bóng nữ lớp 11B2'],
    [9, '12C1', 'Khối 12', 'Nam', 'Thầy Ngô Văn H', '0933112244', '#ea580c', 'Đội bóng nam lớp 12C1'],
    [10, '12C1', 'Khối 12', 'Nữ', 'Cô Mai Thị K', '0933556688', '#ca8a04', 'Đội bóng nữ lớp 12C1'],
  ];

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  wsData['!cols'] = [
    { wch: 6 },  // STT
    { wch: 18 }, // Tên Đội
    { wch: 16 }, // Khối / Bảng
    { wch: 20 }, // Giới tính
    { wch: 26 }, // HLV
    { wch: 16 }, // SĐT
    { wch: 20 }, // Màu áo
    { wch: 30 }, // Ghi chú
  ];

  XLSX.utils.book_append_sheet(wb, wsData, 'DanhSachDoi');

  // 2. Sheet: HuongDan (Instructions)
  const guideRows: (string | number)[][] = [
    ['HƯỚNG DẪN NHẬP DANH SÁCH ĐỘI BÓNG TỪ FILE EXCEL'],
    [],
    ['1. CỘT "TÊN ĐỘI (LỚP)":', 'Bắt buộc. Nhập tên đội thi đấu, ví dụ: 10A1, 10A2, 11B1, 12C2,5...'],
    ['2. CỘT "KHỐI / BẢNG":', 'Nhập tên Khối hoặc Bảng đấu (ví dụ: Khối 10, Khối 11, Bảng A, Bảng B...). Hệ thống sẽ tự động phân loại lịch đấu theo bảng này.'],
    ['3. CỘT "GIỚI TÍNH":', 'Rất quan trọng! Nhập "Nam" hoặc "Nữ" (hoặc "Hỗn hợp"). Nếu trong cùng 1 lớp có cả đội nam và đội nữ, hãy tạo 2 dòng riêng biệt với cùng tên lớp nhưng khác giới tính.'],
    ['4. CỘT "GIÁO VIÊN / HLV":', 'Không bắt buộc. Ghi họ tên giáo viên chủ nhiệm hoặc HLV phụ trách đội.'],
    ['5. CỘT "SỐ ĐIỆN THOẠI":', 'Không bắt buộc. Nhập số điện thoại liên lạc của giáo viên/đội trưởng.'],
    ['6. CỘT "MÀU ÁO":', 'Tùy chọn. Nhập mã màu Hex (#0284c7, #e11d48...) hoặc tên màu. Nếu để trống, hệ thống sẽ tự động gán màu xanh cho Đội Nam và màu hồng cho Đội Nữ.'],
    [],
    ['LƯU Ý THÊM:', 'Bạn cũng có thể chia thành nhiều Sheet (ví dụ Sheet "Đội Nam" và Sheet "Đội Nữ"), hệ thống sẽ tự động đọc toàn bộ các Sheet và phân loại chính xác.'],
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 28 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'HuongDan');

  XLSX.writeFile(wb, `Mau_Nhap_Danh_Sach_Doi_Nam_Nu.xlsx`);
}

/**
 * Parse teams from uploaded Excel file (.xlsx, .xls, .csv)
 */
export async function parseTeamsFromExcel(
  file: File,
  existingGroups: string[] = ['Khối 10', 'Khối 11', 'Khối 12']
): Promise<ParseTeamsResult> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });

  const parsedTeams: ParsedTeamItem[] = [];
  const foundGroupsSet = new Set<string>();

  // Process all sheets in the workbook (ignoring instruction sheets like 'HuongDan')
  wb.SheetNames.forEach((sheetName) => {
    const lowerSheetName = sheetName.trim().toLowerCase();
    if (lowerSheetName.includes('huongdan') || lowerSheetName.includes('hướng dẫn') || lowerSheetName.includes('readme')) {
      return;
    }

    // Infer sheet default gender if sheet title has "nam" or "nữ"
    let sheetDefaultGender: TeamGender = 'male';
    if (lowerSheetName.includes('nữ') || lowerSheetName.includes('nu') || lowerSheetName.includes('female') || lowerSheetName.includes('gái')) {
      sheetDefaultGender = 'female';
    } else if (lowerSheetName.includes('nam') || lowerSheetName.includes('male') || lowerSheetName.includes('trai')) {
      sheetDefaultGender = 'male';
    } else if (lowerSheetName.includes('hỗn hợp') || lowerSheetName.includes('mixed')) {
      sheetDefaultGender = 'mixed';
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Convert sheet to array of rows
    const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });
    if (rawRows.length === 0) return;

    // Locate header row (look for 'tên đội' or 'lớp' or 'đội' or 'team')
    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      const tempMap: Record<string, number> = {};
      row.forEach((cell, colIdx) => {
        const str = String(cell).trim().toLowerCase();
        if (str.includes('tên đội') || str.includes('ten doi') || str.includes('tên lớp') || str.includes('ten lop') || str === 'đội' || str === 'doi' || str === 'lớp' || str === 'lop' || str === 'team' || str === 'team name') {
          tempMap['name'] = colIdx;
        } else if (str.includes('khối') || str.includes('khoi') || str.includes('bảng') || str.includes('bang') || str === 'group' || str === 'stage') {
          tempMap['group'] = colIdx;
        } else if (str.includes('giới tính') || str.includes('gioi tinh') || str.includes('nam/nữ') || str.includes('nam / nu') || str.includes('gender') || str.includes('phân loại') || str.includes('phan loai')) {
          tempMap['gender'] = colIdx;
        } else if (str.includes('giáo viên') || str.includes('giao vien') || str.includes('hlv') || str.includes('huấn luyện viên') || str.includes('coach') || str.includes('phụ trách')) {
          tempMap['coach'] = colIdx;
        } else if (str.includes('số điện thoại') || str.includes('so dien thoai') || str.includes('sđt') || str.includes('sdt') || str.includes('phone') || str.includes('điện thoại')) {
          tempMap['phone'] = colIdx;
        } else if (str.includes('màu áo') || str.includes('mau ao') || str.includes('màu sắc') || str.includes('mau sac') || str.includes('color')) {
          tempMap['color'] = colIdx;
        }
      });

      if (tempMap['name'] !== undefined) {
        headerRowIdx = r;
        colMap = tempMap;
        break;
      }
    }

    // If no header found, assume standard column positions: Col 1: Tên đội, Col 2: Khối/Bảng, Col 3: Giới tính
    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      colMap = {
        name: 1,
        group: 2,
        gender: 3,
        coach: 4,
        phone: 5,
        color: 6,
      };
    }

    // Parse data rows
    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawName = colMap['name'] !== undefined ? String(row[colMap['name']] || '').trim() : '';
      if (!rawName) continue; // Skip empty team name rows

      // Infer group
      let rawGroup = colMap['group'] !== undefined ? String(row[colMap['group']] || '').trim() : '';
      if (!rawGroup) {
        // Try to infer from team name (e.g. 10A1 -> Khối 10, 11B2 -> Khối 11, 12C3 -> Khối 12)
        const matchGrade = rawName.match(/^(10|11|12)/);
        if (matchGrade) {
          rawGroup = `Khối ${matchGrade[1]}`;
        } else {
          rawGroup = existingGroups[0] || 'Khối 10';
        }
      }

      // Infer gender
      let rawGenderCell = colMap['gender'] !== undefined ? String(row[colMap['gender']] || '').trim() : '';
      let gender: TeamGender = sheetDefaultGender;

      if (rawGenderCell) {
        gender = normalizeGender(rawGenderCell, sheetDefaultGender);
      } else {
        // Check if team name or group contains (Nam) or (Nữ)
        const lowerRaw = `${rawName} ${rawGroup}`.toLowerCase();
        if (lowerRaw.includes('(nữ)') || lowerRaw.includes('- nữ') || lowerRaw.includes(' nữ')) {
          gender = 'female';
        } else if (lowerRaw.includes('(nam)') || lowerRaw.includes('- nam') || lowerRaw.includes(' nam')) {
          gender = 'male';
        }
      }

      // Clean team name if it had (Nam) or (Nữ) appended
      let cleanName = rawName;
      // Keep name clean but distinct if user wants e.g. "10A1"

      const rawCoach = colMap['coach'] !== undefined ? String(row[colMap['coach']] || '').trim() : '';
      const rawPhone = colMap['phone'] !== undefined ? String(row[colMap['phone']] || '').trim() : '';
      let rawColor = colMap['color'] !== undefined ? String(row[colMap['color']] || '').trim() : '';

      // Set default color based on gender if not provided
      if (!rawColor || !rawColor.startsWith('#')) {
        if (gender === 'female') {
          rawColor = '#e11d48'; // Rose
        } else if (gender === 'male') {
          rawColor = '#0284c7'; // Sky blue
        } else {
          rawColor = '#7c3aed'; // Purple
        }
      }

      foundGroupsSet.add(rawGroup);

      parsedTeams.push({
        id: `T_IMP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${parsedTeams.length + 1}`,
        name: cleanName,
        group: rawGroup,
        gender,
        coachName: rawCoach || 'Giáo viên phụ trách',
        contactPhone: rawPhone,
        color: rawColor,
        rawRowNumber: r + 1,
        isValid: true,
      });
    }
  });

  // Calculate statistics
  const allFoundGroups = Array.from(foundGroupsSet);
  const newGroups = allFoundGroups.filter((g) => !existingGroups.includes(g));

  const stats = {
    total: parsedTeams.length,
    maleCount: parsedTeams.filter((t) => t.gender === 'male').length,
    femaleCount: parsedTeams.filter((t) => t.gender === 'female').length,
    mixedCount: parsedTeams.filter((t) => t.gender === 'mixed').length,
    byGroup: {} as Record<string, { total: number; male: number; female: number; mixed: number }>,
  };

  allFoundGroups.forEach((g) => {
    const inGroup = parsedTeams.filter((t) => t.group === g);
    stats.byGroup[g] = {
      total: inGroup.length,
      male: inGroup.filter((t) => t.gender === 'male').length,
      female: inGroup.filter((t) => t.gender === 'female').length,
      mixed: inGroup.filter((t) => t.gender === 'mixed').length,
    };
  });

  return {
    teams: parsedTeams,
    allFoundGroups,
    newGroups,
    stats,
  };
}
