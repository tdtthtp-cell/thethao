import * as XLSX from 'xlsx';
import { Team, TeamGender, Athlete } from '../types';

export interface ParsedTeamItem {
  id: string;
  name: string;
  group: string;
  gender: TeamGender;
  coachName: string;
  contactPhone: string;
  color: string;
  estimatedAthletesCount?: number;
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

export interface ParsedAthleteItem {
  id: string;
  name: string;
  jerseyNumber: number;
  teamName: string;
  teamId: string;
  group: string;
  position: string;
  dateOfBirth: string;
  phone: string;
  nationalId: string;
  status: 'approved' | 'pending';
  rawRowNumber: number;
  isValid: boolean;
  errorMessage?: string;
  rawTeamFromExcel?: string;
  matchMethod?: 'excel_column' | 'excel_sheet' | 'default_filter' | 'manual';
}

/**
 * Standardize gender string to 'male' | 'female' | 'mixed'
 */
export function normalizeGender(val: unknown, fallback: TeamGender = 'male'): TeamGender {
  if (!val) return fallback;
  const str = String(val).trim().toLowerCase();
  if (
    str === 'nữ' ||
    str === 'nu' ||
    str === 'female' ||
    str === 'f' ||
    str === 'gái' ||
    str === 'đội nữ' ||
    str.includes('nữ')
  ) {
    return 'female';
  }
  if (
    str === 'nam' ||
    str === 'male' ||
    str === 'm' ||
    str === 'trai' ||
    str === 'đội nam' ||
    str.includes('nam')
  ) {
    return 'male';
  }
  if (
    str === 'hỗn hợp' ||
    str === 'hon hop' ||
    str === 'mixed' ||
    str === 'nam nữ' ||
    str === 'nam/nữ'
  ) {
    return 'mixed';
  }
  return fallback;
}

/**
 * Map Vietnamese color names or Hex strings to standard colors
 */
export function parseTeamColor(val: unknown, fallback: string): string {
  if (!val) return fallback;
  const s = String(val).trim().toLowerCase();
  if (s.startsWith('#')) return String(val).trim();

  if (s.includes('xanh lam') || s.includes('xanh dương') || s.includes('blue') || s.includes('da trời')) {
    return '#0284c7';
  }
  if (s.includes('xanh lá') || s.includes('xanh lục') || s.includes('green')) {
    return '#16a34a';
  }
  if (s.includes('đỏ') || s.includes('do') || s.includes('red')) {
    return '#dc2626';
  }
  if (s.includes('hồng') || s.includes('hong') || s.includes('pink') || s.includes('rose')) {
    return '#e11d48';
  }
  if (s.includes('vàng') || s.includes('vang') || s.includes('yellow')) {
    return '#ca8a04';
  }
  if (s.includes('cam') || s.includes('orange')) {
    return '#ea580c';
  }
  if (s.includes('tím') || s.includes('tim') || s.includes('purple') || s.includes('violet')) {
    return '#9333ea';
  }
  if (s.includes('đen') || s.includes('den') || s.includes('black')) {
    return '#1e293b';
  }
  if (s.includes('trắng') || s.includes('trang') || s.includes('white')) {
    return '#64748b';
  }

  return fallback;
}

/**
 * 1. Download Adjusted Team List Excel Template
 * Explains clearly:
 * - "Danh Sách Đội": Names of competing teams in the tournament (10A1, 10A2, 11B1, 12C2...)
 * - "Danh Sách VĐV": Names of individual athletes belonging to each team
 */
export function downloadTeamImportTemplateExcel() {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: DanhSachDoi (Teams list) matching exact user structure: 'Tên Đội / VĐV' & 'Bảng / Khối'
  const headers = [
    'Tên Đội / VĐV',
    'Bảng / Khối',
    'Giới Tính (Nam / Nữ)',
    'GVCN / HLV Phụ Trách',
    'Số Điện Thoại Liên Hệ',
    'Màu Áo Thi Đấu',
    'Ghi Chú',
  ];

  const sampleRows: (string | number)[][] = [
    ['10A7,8', 'K10_ĐC Nam', 'Nam', 'Thầy Nguyễn Văn A', '0912345678', 'Xanh dương', 'Đội nam liên quân 10A7,8'],
    ['10A5,6', 'K10_ĐC Nam', 'Nam', 'Thầy Trần Văn B', '0987654321', 'Xanh dương', 'Đội nam liên quân 10A5,6'],
    ['10A2,3', 'K10_ĐC Nam', 'Nam', 'Thầy Lê Văn C', '0903112233', 'Xanh dương', 'Đội nam liên quân 10A2,3'],
    ['10A1,4', 'K10_ĐC Nam', 'Nam', 'Thầy Phạm Văn D', '0904223344', 'Xanh dương', 'Đội nam liên quân 10A1,4'],
    ['10A7,8', 'K10_ĐC Nữ', 'Nữ', 'Cô Hoàng Thị E', '0918556677', 'Hồng', 'Đội nữ liên quân 10A7,8'],
    ['10A5,6', 'K10_ĐC Nữ', 'Nữ', 'Cô Đặng Thị F', '0919667788', 'Hồng', 'Đội nữ liên quân 10A5,6'],
    ['10A2,3', 'K10_ĐC Nữ', 'Nữ', 'Cô Vũ Thị G', '0909778899', 'Hồng', 'Đội nữ liên quân 10A2,3'],
    ['10A1,4', 'K10_ĐC Nữ', 'Nữ', 'Cô Bùi Thị H', '0908889900', 'Hồng', 'Đội nữ liên quân 10A1,4'],
    ['11B3,4', 'K11_ĐC Nam', 'Nam', 'Thầy Ngô Văn K', '0933112244', 'Xanh lá', 'Đội nam liên quân 11B3,4'],
    ['11B1,2', 'K11_ĐC Nam', 'Nam', 'Thầy Mai Văn L', '0933556688', 'Xanh lá', 'Đội nam liên quân 11B1,2'],
    ['12C1,3,7', 'K12_ĐC Nam', 'Nam', 'Thầy Bồ Công Lâm', '0911223344', 'Cam', 'Đội nam liên quân 12C1,3,7'],
    ['12C2,5', 'K12_ĐC Nam', 'Nam', 'Cô Trần Thị Thu Hồng', '0922334455', 'Đỏ', 'Đội nam liên quân 12C2,5'],
  ];

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  wsData['!cols'] = [
    { wch: 22 }, // Tên Đội / VĐV
    { wch: 18 }, // Bảng / Khối
    { wch: 20 }, // Giới Tính
    { wch: 26 }, // GVCN / HLV
    { wch: 20 }, // Số Điện Thoại
    { wch: 18 }, // Màu Áo
    { wch: 30 }, // Ghi Chú
  ];

  XLSX.utils.book_append_sheet(wb, wsData, 'DanhSachDoi');

  // 2. Sheet: DanhSachVDV_Doi_10A1 (Illustrating Athletes belonging to Team)
  const athleteHeaders = [
    'STT',
    'Họ Và Tên Vận Động Viên',
    'Số Áo',
    'Đội / Lớp',
    'Vị Trí Thi Đấu',
    'Ngày Sinh (YYYY-MM-DD)',
    'Số Điện Thoại Liên Lạc',
    'Số CCCD / Mã Định Danh',
    'Ghi Chú',
  ];

  const sampleAthleteRows: (string | number)[][] = [
    [1, 'Nguyễn Văn Hoàng', 10, '10A1,4', 'Tiền đạo / Chủ công', '2010-05-15', '0912000001', '079201001234', 'Đội trưởng'],
    [2, 'Trần Quốc Bảo', 1, '10A1,4', 'Thủ môn', '2010-08-20', '0912000002', '079201001235', 'Thủ môn chính'],
    [3, 'Lê Tuấn Kiệt', 7, '10A1,4', 'Tiền vệ cánh', '2010-03-10', '0912000003', '079201001236', 'Cầu thủ'],
    [4, 'Phạm Minh Đức', 4, '10A1,4', 'Trung vệ', '2010-11-25', '0912000004', '079201001237', 'Cầu thủ'],
    [5, 'Võ Gia Huy', 9, '10A1,4', 'Tiền đạo cắm', '2010-07-12', '0912000005', '079201001238', 'Cầu thủ'],
    [6, 'Đặng Hoàng Long', 8, '10A1,4', 'Tiền vệ trung tâm', '2010-09-05', '0912000006', '079201001239', 'Cầu thủ'],
    [7, 'Bùi Quốc Anh', 2, '10A1,4', 'Hậu vệ phải', '2010-01-18', '0912000007', '079201001240', 'Cầu thủ'],
    [8, 'Huỳnh Tấn Tài', 3, '10A1,4', 'Hậu vệ trái', '2010-12-02', '0912000008', '079201001241', 'Cầu thủ'],
  ];

  const wsAthletes = XLSX.utils.aoa_to_sheet([athleteHeaders, ...sampleAthleteRows]);
  wsAthletes['!cols'] = [
    { wch: 6 },  // STT
    { wch: 26 }, // Họ tên VĐV
    { wch: 10 }, // Số áo
    { wch: 14 }, // Đội / Lớp
    { wch: 22 }, // Vị trí
    { wch: 22 }, // Ngày sinh
    { wch: 20 }, // Số ĐT
    { wch: 24 }, // CCCD
    { wch: 20 }, // Ghi chú
  ];
  XLSX.utils.book_append_sheet(wb, wsAthletes, 'DanhSachVDV_Doi_10A1,4');

  // 3. Sheet: HuongDan
  const guideRows: (string | number)[][] = [
    ['HƯỚNG DẪN CẤU TRÚC DANH SÁCH ĐỘI & DANH SÁCH VẬN ĐỘNG VIÊN'],
    [],
    ['1. CẤU TRÚC DANH SÁCH ĐỘI (Sheet: DanhSachDoi):'],
    ['• Cột "Tên Đội / VĐV":', 'Bắt buộc. Nhập tên đội thi đấu, ví dụ: 10A7,8; 10A5,6; 10A2,3; 10A1,4 hoặc 10A1, 10A2...'],
    ['• Cột "Bảng / Khối":', 'Bắt buộc. Nhập khối hoặc bảng (Ví dụ: K10_ĐC Nam, K10_ĐC Nữ, K11_ĐC Nam, Khối 10, Bảng A...). Hệ thống tự động tạo bộ lọc và gom nhóm theo cột này.'],
    ['• Cột "Giới Tính (Nam / Nữ)":', 'Tùy chọn. Nếu trong tên Bảng/Khối đã có Nam hoặc Nữ (như K10_ĐC Nam), hệ thống sẽ tự động nhận diện giới tính.'],
    ['• Các cột phụ:', 'GVCN/HLV Phụ Trách, Số Điện Thoại, Màu Áo Thi Đấu, Ghi Chú có thể điền hoặc để trống.'],
    [],
    ['2. PHÂN BIỆT RÕ 2 KHÁI NIỆM TRONG GIẢI ĐẤU:'],
    ['• DANH SÁCH ĐỘI (Sheet: DanhSachDoi):', 'Tên của các đội tham gia thi đấu trong toàn giải (10A7,8; 10A5,6; 12C1,3,7...). Dùng để lọc theo khối/bảng, bốc thăm và tính điểm bảng xếp hạng.'],
    ['• DANH SÁCH VẬN ĐỘNG VIÊN (Sheet: DanhSachVDV):', 'Tên của các vận động viên cụ thể trong 1 đội bóng (Nguyễn Văn Hoàng #10, Trần Quốc Bảo #1...). Dùng để quản lý nhân sự, bảo mật CCCD và ghi bàn thắng.'],
    [],
    ['3. CÁCH TẢI LÊN ỨNG DỤNG:'],
    ['• Bước 1:', 'Bạn điền danh sách các đội bóng của giải vào Sheet "DanhSachDoi", sau đó lưu file lại.'],
    ['• Bước 2:', 'Vào trang "Danh Sách Đội" trên ứng dụng -> Bấm "Nhập Đội Excel" -> Chọn file này.'],
    ['• Bước 3:', 'Kiểm tra bảng xem trước và bấm "Xác Nhận Nhập Đội" để lưu toàn bộ lên hệ thống.'],
  ];

  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 32 }, { wch: 95 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'HuongDan');

  XLSX.writeFile(wb, `Mau_Danh_Sach_Doi_Thi_Dau.xlsx`);
}

/**
 * 2. Download Athlete List Template Excel (Specific for a team's roster)
 */
export function downloadAthleteImportTemplateExcel(teamName = '10A1') {
  const wb = XLSX.utils.book_new();

  const headers = [
    'STT',
    'Họ Và Tên Vận Động Viên',
    'Số Áo',
    'Đội / Lớp',
    'Vị Trí Thi Đấu',
    'Ngày Sinh (YYYY-MM-DD)',
    'Số Điện Thoại Liên Lạc',
    'Số CCCD / Mã Định Danh',
    'Ghi Chú',
  ];

  const sampleRows: (string | number)[][] = [
    [1, 'Nguyễn Văn Hoàng', 10, teamName, 'Tiền đạo / Chủ công', '2010-05-15', '0912000001', '079201001234', 'Đội trưởng'],
    [2, 'Trần Quốc Bảo', 1, teamName, 'Thủ môn', '2010-08-20', '0912000002', '079201001235', 'Thủ môn chính'],
    [3, 'Lê Tuấn Kiệt', 7, teamName, 'Tiền vệ cánh', '2010-03-10', '0912000003', '079201001236', 'Cầu thủ'],
    [4, 'Phạm Minh Đức', 4, teamName, 'Trung vệ', '2010-11-25', '0912000004', '079201001237', 'Cầu thủ'],
    [5, 'Võ Gia Huy', 9, teamName, 'Tiền đạo cắm', '2010-07-12', '0912000005', '079201001238', 'Cầu thủ'],
    [6, 'Đặng Hoàng Long', 8, teamName, 'Tiền vệ trung tâm', '2010-09-05', '0912000006', '079201001239', 'Cầu thủ'],
    [7, 'Bùi Quốc Anh', 2, teamName, 'Hậu vệ phải', '2010-01-18', '0912000007', '079201001240', 'Cầu thủ'],
    [8, 'Huỳnh Tấn Tài', 3, teamName, 'Hậu vệ trái', '2010-12-02', '0912000008', '079201001241', 'Cầu thủ'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 26 },
    { wch: 10 },
    { wch: 14 },
    { wch: 22 },
    { wch: 22 },
    { wch: 20 },
    { wch: 24 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, `DanhSachVDV_${teamName}`);

  XLSX.writeFile(wb, `Mau_Danh_Sach_VDV_${teamName}.xlsx`);
}

/**
 * 3. Parse Teams From Uploaded Excel file (.xlsx, .xls, .csv)
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
    if (
      lowerSheetName.includes('huongdan') ||
      lowerSheetName.includes('hướng dẫn') ||
      lowerSheetName.includes('readme') ||
      lowerSheetName.includes('vdv') ||
      lowerSheetName.includes('vận động viên')
    ) {
      return;
    }

    // Infer sheet default gender if sheet title has "nam" or "nữ"
    let sheetDefaultGender: TeamGender = 'male';
    if (
      lowerSheetName.includes('nữ') ||
      lowerSheetName.includes('nu') ||
      lowerSheetName.includes('female') ||
      lowerSheetName.includes('gái')
    ) {
      sheetDefaultGender = 'female';
    } else if (
      lowerSheetName.includes('nam') ||
      lowerSheetName.includes('male') ||
      lowerSheetName.includes('trai')
    ) {
      sheetDefaultGender = 'male';
    } else if (lowerSheetName.includes('hỗn hợp') || lowerSheetName.includes('mixed')) {
      sheetDefaultGender = 'mixed';
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    // Convert sheet to array of rows
    const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });
    if (rawRows.length === 0) return;

    // Locate header row
    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      const tempMap: Record<string, number> = {};
      row.forEach((cell, colIdx) => {
        const str = String(cell).trim().toLowerCase();
        if (
          str.includes('tên đội') ||
          str.includes('ten doi') ||
          str.includes('tên lớp') ||
          str.includes('ten lop') ||
          str.includes('đội / vđv') ||
          str.includes('doi / vdv') ||
          str === 'đội' ||
          str === 'doi' ||
          str === 'lớp' ||
          str === 'lop' ||
          str === 'team' ||
          str === 'team name' ||
          str === 'tên đội / vđv'
        ) {
          tempMap['name'] = colIdx;
        } else if (
          str.includes('khối') ||
          str.includes('khoi') ||
          str.includes('bảng') ||
          str.includes('bang') ||
          str === 'group' ||
          str === 'stage' ||
          str.includes('bảng / khối') ||
          str.includes('bang / khoi')
        ) {
          tempMap['group'] = colIdx;
        } else if (
          str.includes('giới tính') ||
          str.includes('gioi tinh') ||
          str.includes('nam/nữ') ||
          str.includes('nam / nu') ||
          str.includes('gender') ||
          str.includes('phân loại') ||
          str.includes('phan loai')
        ) {
          tempMap['gender'] = colIdx;
        } else if (
          str.includes('giáo viên') ||
          str.includes('giao vien') ||
          str.includes('gvcn') ||
          str.includes('hlv') ||
          str.includes('huấn luyện viên') ||
          str.includes('coach') ||
          str.includes('phụ trách')
        ) {
          tempMap['coach'] = colIdx;
        } else if (
          str.includes('số điện thoại') ||
          str.includes('so dien thoai') ||
          str.includes('sđt') ||
          str.includes('sdt') ||
          str.includes('phone') ||
          str.includes('điện thoại')
        ) {
          tempMap['phone'] = colIdx;
        } else if (
          str.includes('số lượng vđv') ||
          str.includes('so luong') ||
          str.includes('thành viên')
        ) {
          tempMap['count'] = colIdx;
        } else if (
          str.includes('màu áo') ||
          str.includes('mau ao') ||
          str.includes('màu sắc') ||
          str.includes('mau sac') ||
          str.includes('color')
        ) {
          tempMap['color'] = colIdx;
        }
      });

      if (tempMap['name'] !== undefined) {
        headerRowIdx = r;
        colMap = tempMap;
        break;
      }
    }

    // Default fallback columns if no explicit header matched
    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      const firstRowLen = rawRows[0]?.length || 0;
      if (firstRowLen <= 2) {
        colMap = { name: 0, group: 1 };
      } else {
        colMap = {
          name: 1,
          group: 2,
          gender: 3,
          coach: 4,
          phone: 5,
          color: 6,
        };
      }
    }

    // Parse data rows
    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const rawName = colMap['name'] !== undefined ? String(row[colMap['name']] || '').trim() : '';
      if (!rawName) continue; // Skip empty rows

      // Infer group
      let rawGroup = colMap['group'] !== undefined ? String(row[colMap['group']] || '').trim() : '';
      if (!rawGroup) {
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
        const lowerRaw = `${rawName} ${rawGroup}`.toLowerCase();
        if (
          lowerRaw.includes('đc nữ') ||
          lowerRaw.includes('_nữ') ||
          lowerRaw.includes('- nữ') ||
          lowerRaw.includes('(nữ)') ||
          lowerRaw.includes(' nữ')
        ) {
          gender = 'female';
        } else if (
          lowerRaw.includes('đc nam') ||
          lowerRaw.includes('_nam') ||
          lowerRaw.includes('- nam') ||
          lowerRaw.includes('(nam)') ||
          lowerRaw.includes(' nam')
        ) {
          gender = 'male';
        }
      }

      const rawCoach = colMap['coach'] !== undefined ? String(row[colMap['coach']] || '').trim() : '';
      const rawPhone = colMap['phone'] !== undefined ? String(row[colMap['phone']] || '').trim() : '';
      const rawCount = colMap['count'] !== undefined ? Number(row[colMap['count']]) || undefined : undefined;
      const rawColorCell = colMap['color'] !== undefined ? String(row[colMap['color']] || '').trim() : '';

      const defaultColor = gender === 'female' ? '#e11d48' : '#0284c7';
      const color = parseTeamColor(rawColorCell, defaultColor);

      foundGroupsSet.add(rawGroup);

      parsedTeams.push({
        id: `T_IMP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${parsedTeams.length + 1}`,
        name: rawName,
        group: rawGroup,
        gender,
        coachName: rawCoach || 'Giáo viên phụ trách',
        contactPhone: rawPhone,
        color,
        estimatedAthletesCount: rawCount,
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

/**
 * Normalize team/class name for fuzzy comparison (e.g. "Lớp 10A1, 4" -> "10a1,4")
 */
export function normalizeTeamKey(s: string): string {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .replace(/^(lớp|lop|đội|doi|clb|team|chi đoàn|chi doan)\s+/i, '')
    .replace(/\s*([,\/\-_&])\s*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract tokens representing class numbers (e.g. "10a1,4" -> ["10a1", "10a4"])
 */
export function extractClassTokens(s: string): string[] {
  const norm = normalizeTeamKey(s);
  if (!norm) return [];
  const tokens = norm.match(/\d+[a-z]\d+/g);
  return tokens && tokens.length > 0 ? tokens : [norm];
}

export interface MatchedTeamResult {
  team?: Team;
  method: 'excel_column' | 'excel_sheet' | 'default_filter' | 'manual';
  rawTeamFromExcel: string;
}

/**
 * Robustly matches an athlete row to a Team by:
 * 1. "Đội / Lớp" column in Excel (exact, normalized, token/partial match)
 * 2. Sheet name (if row team column is empty or specifies only sheet)
 * 3. Default team / pre-selected filter from user's current view
 */
export function matchTeamForAthlete(
  rawTeam: string,
  rawGroup: string,
  sheetName: string,
  teams: Team[],
  defaultTeam?: Team
): MatchedTeamResult {
  const cleanRawTeam = (rawTeam || '').trim();
  const cleanRawGroup = (rawGroup || '').trim();

  // 1. If column has an explicit team/class name in the row:
  if (cleanRawTeam) {
    const normCandidate = normalizeTeamKey(cleanRawTeam);
    const normGroup = cleanRawGroup.toLowerCase();

    // 1a. Direct ID or Name match
    const directMatch = teams.find(
      (t) => t.id === cleanRawTeam || t.name.toLowerCase() === cleanRawTeam.toLowerCase()
    );
    if (directMatch) {
      return { team: directMatch, method: 'excel_column', rawTeamFromExcel: cleanRawTeam };
    }

    // 1b. Normalized Name match (e.g. "10A7, 8" -> "10A7,8", "12C9, 12C11" -> "12C9,12C11")
    const normMatches = teams.filter((t) => normalizeTeamKey(t.name) === normCandidate);
    if (normMatches.length === 1) {
      return { team: normMatches[0], method: 'excel_column', rawTeamFromExcel: cleanRawTeam };
    }
    if (normMatches.length > 1) {
      const groupMatch = normMatches.find(
        (t) => normGroup && (t.group.toLowerCase().includes(normGroup) || normGroup.includes(t.group.toLowerCase()))
      );
      return { team: groupMatch || normMatches[0], method: 'excel_column', rawTeamFromExcel: cleanRawTeam };
    }

    // 1c. Substring / Class tokens match (e.g. "10A1" in "10A1,4")
    const candidateTokens = extractClassTokens(cleanRawTeam);
    const tokenMatches = teams.filter((t) => {
      const teamTokens = extractClassTokens(t.name);
      return candidateTokens.some((tok) => teamTokens.includes(tok));
    });
    if (tokenMatches.length === 1) {
      return { team: tokenMatches[0], method: 'excel_column', rawTeamFromExcel: cleanRawTeam };
    }
    if (tokenMatches.length > 1) {
      const groupMatch = tokenMatches.find(
        (t) => normGroup && (t.group.toLowerCase().includes(normGroup) || normGroup.includes(t.group.toLowerCase()))
      );
      return { team: groupMatch || tokenMatches[0], method: 'excel_column', rawTeamFromExcel: cleanRawTeam };
    }

    // 1d. Explicit team mentioned in row but not in teams yet:
    // CRITICAL: DO NOT overwrite with defaultTeam! Preserves class name from file
    return { team: undefined, method: 'excel_column', rawTeamFromExcel: cleanRawTeam };
  }

  // 2. If row team column is empty or unparseable, check sheet name (e.g. sheet "10A1", "10A2"):
  if (sheetName) {
    const cleanSheet = sheetName.replace(/^(danhsachvdv|danh sách vđv|vdv|roster|danhsach|danh sách)_?/i, '').trim();
    if (cleanSheet && !cleanSheet.toLowerCase().includes('huongdan') && !cleanSheet.toLowerCase().includes('hướng dẫn')) {
      const normSheet = normalizeTeamKey(cleanSheet);
      const sheetDirectMatch = teams.find(
        (t) => t.id === cleanSheet || t.name.toLowerCase() === cleanSheet.toLowerCase() || normalizeTeamKey(t.name) === normSheet
      );
      if (sheetDirectMatch) {
        return { team: sheetDirectMatch, method: 'excel_sheet', rawTeamFromExcel: cleanSheet };
      }
      const sheetTokens = extractClassTokens(cleanSheet);
      const tokenMatches = teams.filter((t) => {
        const teamTokens = extractClassTokens(t.name);
        return sheetTokens.some((tok) => teamTokens.includes(tok));
      });
      if (tokenMatches.length > 0) {
        return { team: tokenMatches[0], method: 'excel_sheet', rawTeamFromExcel: cleanSheet };
      }
      if (/^\d+[a-zA-Z]/.test(cleanSheet)) {
        return { team: undefined, method: 'excel_sheet', rawTeamFromExcel: cleanSheet };
      }
    }
  }

  // 3. Fallback to defaultTeam or preselected filter:
  if (defaultTeam) {
    return { team: defaultTeam, method: 'default_filter', rawTeamFromExcel: defaultTeam.name };
  }

  return { team: undefined, method: 'manual', rawTeamFromExcel: '' };
}

/**
 * Format Excel serial dates (e.g. 40250) or date strings to YYYY-MM-DD
 */
export function formatExcelDate(val: unknown): string {
  if (!val) return '2010-01-01';
  if (typeof val === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const y = parsed.y.toString().padStart(4, '0');
        const m = parsed.m.toString().padStart(2, '0');
        const d = parsed.d.toString().padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // fallback
    }
  }
  const s = String(val).trim();
  // Check if birth year only (e.g. 2008, 2009, 2010)
  if (/^(19\d\d|20\d\d)$/.test(s)) {
    return `${s}-01-01`;
  }
  // Check if DD/MM/YYYY or DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = dmy[1].padStart(2, '0');
    const m = dmy[2].padStart(2, '0');
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }
  // Check if YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return s;
  }
  return s || '2010-01-01';
}

export interface ParseAthletesResult {
  athletes: ParsedAthleteItem[];
  sheetNames: string[];
  totalRowsProcessed: number;
}

/**
 * Heuristically parse raw matrix rows (from Excel or pasted text) into athletes
 */
export function parseRawAthleteRows(
  rawRows: (string | number)[][],
  sheetName: string,
  teams: Team[],
  defaultTeam?: Team
): ParsedAthleteItem[] {
  if (!rawRows || rawRows.length === 0) return [];

  // Locate header row using multi-column scoring
  let headerRowIdx = -1;
  let colMap: Record<string, number> = {};
  let highestScore = 0;

  for (let r = 0; r < Math.min(rawRows.length, 20); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    const tempMap: Record<string, number> = {};
    let score = 0;

    row.forEach((cell, colIdx) => {
      const str = String(cell).trim().toLowerCase();
      if (!str) return;

      if (
        str === 'stt' ||
        str === 'no.' ||
        str === 'no' ||
        str === 'tt' ||
        str === 'số tt' ||
        str === 'số thứ tự' ||
        str === '#'
      ) {
        tempMap['stt'] = colIdx;
        score += 1;
      } else if (
        str.includes('họ và đệm') ||
        str.includes('họ đệm') ||
        str.includes('họ và tên lót') ||
        str.includes('họ lót') ||
        str.includes('họ và chữ lót') ||
        str === 'họ' ||
        str === 'ho' ||
        str === 'last name' ||
        str === 'surname'
      ) {
        tempMap['lastName'] = colIdx;
        score += 1.5;
      } else if (
        str === 'tên' ||
        str === 'ten' ||
        str === 'tên gọi' ||
        str === 'first name'
      ) {
        tempMap['firstName'] = colIdx;
        score += 1.5;
      } else if (
        str.includes('họ và tên') ||
        str.includes('ho va ten') ||
        str.includes('họ tên') ||
        str.includes('ho ten') ||
        str.includes('họ & tên') ||
        str.includes('ho & ten') ||
        str.includes('tên vđv') ||
        str.includes('tên vận động viên') ||
        str.includes('vận động viên') ||
        str.includes('van dong vien') ||
        str.includes('vđv') ||
        str.includes('vdv') ||
        str.includes('cầu thủ') ||
        str.includes('cau thu') ||
        str.includes('học sinh') ||
        str.includes('hoc sinh') ||
        str.includes('thành viên') ||
        str.includes('thanh vien') ||
        str === 'athlete' ||
        str === 'player' ||
        str === 'full name' ||
        str === 'fullname' ||
        str === 'name' ||
        str.includes('tên')
      ) {
        tempMap['name'] = colIdx;
        score += 2;
      } else if (
        str.includes('số áo') ||
        str.includes('so ao') ||
        str.includes('áo') ||
        str.includes('jersey') ||
        str.includes('sbd') ||
        str.includes('số báo danh') ||
        str.includes('số thi đấu') ||
        str.includes('số áo đấu') ||
        str === 'số'
      ) {
        tempMap['jersey'] = colIdx;
        score += 1.5;
      } else if (
        str.includes('đội') ||
        str.includes('doi') ||
        str.includes('lớp') ||
        str.includes('lop') ||
        str.includes('chi đoàn') ||
        str.includes('đơn vị') ||
        str.includes('đội / lớp') ||
        str.includes('doi / lop') ||
        str === 'team' ||
        str === 'class'
      ) {
        tempMap['team'] = colIdx;
        score += 1.5;
      } else if (
        str.includes('bảng') ||
        str.includes('bang') ||
        str.includes('khối') ||
        str.includes('khoi') ||
        str === 'group' ||
        str === 'stage'
      ) {
        tempMap['group'] = colIdx;
        score += 1;
      } else if (
        str.includes('vị trí') ||
        str.includes('vi tri') ||
        str === 'position' ||
        str === 'vai trò' ||
        str === 'role'
      ) {
        tempMap['position'] = colIdx;
        score += 1;
      } else if (
        str.includes('ngày sinh') ||
        str.includes('ngay sinh') ||
        str.includes('năm sinh') ||
        str.includes('nam sinh') ||
        str.includes('dob') ||
        str.includes('sinh ngày') ||
        str.includes('birth')
      ) {
        tempMap['dob'] = colIdx;
        score += 1;
      } else if (
        str.includes('điện thoại') ||
        str.includes('dien thoai') ||
        str.includes('sđt') ||
        str.includes('sdt') ||
        str.includes('phone') ||
        str.includes('tel') ||
        str.includes('liên hệ') ||
        str.includes('liên lạc')
      ) {
        tempMap['phone'] = colIdx;
        score += 1;
      } else if (
        str.includes('cccd') ||
        str.includes('cmnd') ||
        str.includes('căn cước') ||
        str.includes('định danh') ||
        str.includes('dinh danh') ||
        str.includes('mã định danh') ||
        str === 'id' ||
        str === 'national id'
      ) {
        tempMap['nationalId'] = colIdx;
        score += 1;
      } else if (str.includes('ghi chú') || str.includes('ghi chu') || str === 'note' || str.includes('tình trạng')) {
        tempMap['note'] = colIdx;
        score += 0.5;
      }
    });

    const hasNameCol = tempMap['name'] !== undefined || tempMap['firstName'] !== undefined;
    if (hasNameCol && score > highestScore && score >= 1.5) {
      highestScore = score;
      headerRowIdx = r;
      colMap = tempMap;
    }
  }

  // Fallback: If no header row matched, detect column roles from row content
  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    // Check first 5 rows to see where names and numbers are
    let nameIdx = 1;
    let jerseyIdx = 2;
    let teamIdx = 3;

    for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;
      row.forEach((cell, idx) => {
        const val = String(cell).trim();
        // If string has >= 2 Vietnamese-like words without digits, it could be a name
        if (val.split(/\s+/).length >= 2 && !/\d/.test(val) && val.length >= 5 && val.length <= 40) {
          nameIdx = idx;
        } else if (/^\d{1,2}$/.test(val) && Number(val) > 0 && Number(val) < 100) {
          jerseyIdx = idx;
        } else if (/^(10|11|12)[a-zA-Z]/i.test(val)) {
          teamIdx = idx;
        }
      });
    }

    colMap = {
      name: nameIdx,
      jersey: jerseyIdx,
      team: teamIdx,
      position: 4,
      dob: 5,
      phone: 6,
      nationalId: 7,
    };
  }

  const results: ParsedAthleteItem[] = [];

  for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!Array.isArray(row) || row.length === 0) continue;

    // Extract athlete name
    let name = '';
    if (colMap['lastName'] !== undefined && colMap['firstName'] !== undefined) {
      const last = String(row[colMap['lastName']] || '').trim();
      const first = String(row[colMap['firstName']] || '').trim();
      name = `${last} ${first}`.trim();
    } else if (colMap['name'] !== undefined) {
      name = String(row[colMap['name']] || '').trim();
      if (colMap['lastName'] !== undefined) {
        const last = String(row[colMap['lastName']] || '').trim();
        if (last && !name.toLowerCase().startsWith(last.toLowerCase())) {
          name = `${last} ${name}`.trim();
        }
      }
    } else if (colMap['firstName'] !== undefined) {
      name = String(row[colMap['firstName']] || '').trim();
    }

    // Skip empty rows, header repeats, or total/footer rows
    if (
      !name ||
      name.toLowerCase() === 'họ và tên' ||
      name.toLowerCase() === 'họ tên' ||
      name.toLowerCase() === 'vận động viên' ||
      name.toLowerCase() === 'tên vận động viên' ||
      name.toLowerCase() === 'tên vđv' ||
      name.toLowerCase() === 'cầu thủ' ||
      name.toLowerCase().startsWith('tổng cộng') ||
      name.toLowerCase().startsWith('tổng số') ||
      name.toLowerCase().startsWith('danh sách')
    ) {
      continue;
    }

    // If name is just digits (like STT accidentally read), skip
    if (/^\d+$/.test(name)) continue;

    const rawJerseyVal = colMap['jersey'] !== undefined ? row[colMap['jersey']] : undefined;
    let rawJersey = NaN;
    if (rawJerseyVal !== undefined && rawJerseyVal !== null) {
      const cleanedNum = String(rawJerseyVal).replace(/[^0-9]/g, '');
      if (cleanedNum) {
        rawJersey = Number(cleanedNum);
      }
    }
    if (isNaN(rawJersey) || rawJersey <= 0) {
      rawJersey = results.length + 1;
    }

    const rawTeamName = colMap['team'] !== undefined ? String(row[colMap['team']] || '').trim() : '';
    const rawGroupName = colMap['group'] !== undefined ? String(row[colMap['group']] || '').trim() : '';
    const position = colMap['position'] !== undefined ? String(row[colMap['position']] || '').trim() || 'Vận động viên' : 'Vận động viên';

    const rawDob = colMap['dob'] !== undefined ? row[colMap['dob']] : '2010-01-01';
    const dob = formatExcelDate(rawDob);

    const phone = colMap['phone'] !== undefined ? String(row[colMap['phone']] || '').trim() : '';
    const nationalId = colMap['nationalId'] !== undefined ? String(row[colMap['nationalId']] || '').trim() : '';

    // Match team intelligently:
    const matchResult = matchTeamForAthlete(rawTeamName, rawGroupName, sheetName, teams, defaultTeam);

    let assignedTeamId = 'T_UNASSIGNED';
    let assignedTeamName = 'Đội Chưa Phân Lớp';
    let assignedGroup = 'Khối 10';

    if (matchResult.team) {
      assignedTeamId = matchResult.team.id;
      assignedTeamName = matchResult.team.name;
      assignedGroup = matchResult.team.group;
    } else if (matchResult.rawTeamFromExcel) {
      assignedTeamName = matchResult.rawTeamFromExcel;
      assignedTeamId = `T_IMP_${assignedTeamName.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const gMatch = assignedTeamName.match(/^(10|11|12)/);
      assignedGroup = rawGroupName || (gMatch ? `Khối ${gMatch[1]}` : (defaultTeam?.group || 'Khối 10'));
    } else if (defaultTeam) {
      assignedTeamId = defaultTeam.id;
      assignedTeamName = defaultTeam.name;
      assignedGroup = defaultTeam.group;
    } else if (teams.length > 0) {
      assignedTeamId = teams[0].id;
      assignedTeamName = teams[0].name;
      assignedGroup = teams[0].group;
    }

    results.push({
      id: `A_IMP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${results.length + 1}`,
      name,
      jerseyNumber: rawJersey,
      teamName: assignedTeamName,
      teamId: assignedTeamId,
      group: assignedGroup,
      position,
      dateOfBirth: dob,
      phone,
      nationalId,
      status: 'approved',
      rawRowNumber: r + 1,
      isValid: true,
      rawTeamFromExcel: rawTeamName,
      matchMethod: matchResult.method,
    });
  }

  return results;
}

/**
 * 4. Parse Athletes From Uploaded Excel file (.xlsx, .xls, .csv)
 * Identifies team either by Excel row column or by active user filter
 */
export async function parseAthletesFromExcel(
  file: File,
  teams: Team[],
  defaultTeamId?: string,
  targetSheetName?: string
): Promise<ParsedAthleteItem[]> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });

  const defaultTeam = defaultTeamId
    ? teams.find(
        (t) => t.id === defaultTeamId || t.name.toLowerCase() === defaultTeamId.toLowerCase()
      )
    : undefined;

  const parsedAthletes: ParsedAthleteItem[] = [];

  // Determine if workbook contains explicit athlete-specific sheets
  const hasExplicitAthleteSheet = wb.SheetNames.some((name) => {
    const l = name.trim().toLowerCase();
    return (
      l.includes('vdv') ||
      l.includes('vận động viên') ||
      l.includes('van dong vien') ||
      l.includes('athlete') ||
      l.includes('cầu thủ') ||
      l.includes('roster')
    );
  });

  const sheetsToProcess = targetSheetName
    ? [targetSheetName]
    : wb.SheetNames;

  sheetsToProcess.forEach((sheetName) => {
    const lower = sheetName.trim().toLowerCase();
    if (lower.includes('huongdan') || lower.includes('hướng dẫn') || lower.includes('readme')) return;

    // If file has both a teams sheet and athlete sheets, skip teams sheet when importing athletes
    if (
      !targetSheetName &&
      hasExplicitAthleteSheet &&
      (lower === 'danhsachdoi' || lower === 'danh sách đội' || lower === 'teams' || lower === 'danh_sach_doi')
    ) {
      return;
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });
    if (rawRows.length === 0) return;

    const sheetAthletes = parseRawAthleteRows(rawRows, sheetName, teams, defaultTeam);
    parsedAthletes.push(...sheetAthletes);
  });

  return parsedAthletes;
}

/**
 * Get all available sheet names from an Excel file
 */
export async function getExcelWorkbookSheets(file: File): Promise<string[]> {
  try {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    return wb.SheetNames.filter((name) => {
      const lower = name.trim().toLowerCase();
      return !lower.includes('huongdan') && !lower.includes('hướng dẫn') && !lower.includes('readme');
    });
  } catch (err) {
    console.error('Error reading sheet names:', err);
    return [];
  }
}

/**
 * 5. Parse athletes from raw clipboard text (e.g. copied directly from Excel / Google Sheets)
 */
export function parseAthletesFromClipboardText(
  text: string,
  teams: Team[],
  defaultTeamId?: string
): ParsedAthleteItem[] {
  if (!text || !text.trim()) return [];

  const defaultTeam = defaultTeamId
    ? teams.find(
        (t) => t.id === defaultTeamId || t.name.toLowerCase() === defaultTeamId.toLowerCase()
      )
    : undefined;

  const lines = text.trim().split(/\r?\n/);
  const rawRows: (string | number)[][] = lines.map((line) => {
    // Check if comma or tab separated
    if (line.includes('\t')) {
      return line.split('\t').map((c) => c.trim());
    }
    return line.split(',').map((c) => c.trim());
  });

  return parseRawAthleteRows(rawRows, 'PastedData', teams, defaultTeam);
}

