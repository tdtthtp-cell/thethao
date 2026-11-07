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

  // 1. Sheet: DanhSachDoi (Teams list)
  const headers = [
    'STT',
    'Tên Đội Thi Đấu (Lớp)',
    'Khối / Bảng Đấu',
    'Giới Tính (Nam / Nữ)',
    'GVCN / HLV Phụ Trách',
    'Số Điện Thoại Liên Hệ',
    'Số Lượng VĐV Dự Kiến',
    'Màu Áo Thi Đấu',
    'Ghi Chú',
  ];

  const sampleRows: (string | number)[][] = [
    [1, '10A1', 'Khối 10', 'Nam', 'Thầy Trần Văn Nam', '0912345678', 12, 'Xanh dương', 'Đội bóng nam lớp 10A1'],
    [2, '10A1', 'Khối 10', 'Nữ', 'Cô Lê Thị Hoa', '0987654321', 10, 'Hồng', 'Đội bóng nữ lớp 10A1'],
    [3, '10A2', 'Khối 10', 'Nam', 'Thầy Nguyễn Văn B', '0903112233', 12, 'Xanh dương', 'Đội bóng nam lớp 10A2'],
    [4, '10A2', 'Khối 10', 'Nữ', 'Cô Phạm Thị C', '0904223344', 10, 'Hồng', 'Đội bóng nữ lớp 10A2'],
    [5, '11B1', 'Khối 11', 'Nam', 'Thầy Hoàng Văn D', '0918556677', 12, 'Xanh lá', 'Đội bóng nam lớp 11B1'],
    [6, '11B1', 'Khối 11', 'Nữ', 'Cô Đặng Thị E', '0919667788', 10, 'Đỏ', 'Đội bóng nữ lớp 11B1'],
    [7, '11B2', 'Khối 11', 'Nam', 'Thầy Vũ Văn F', '0909778899', 12, 'Xanh lá', 'Đội bóng nam lớp 11B2'],
    [8, '11B2', 'Khối 11', 'Nữ', 'Cô Bùi Thị G', '0908889900', 10, 'Đỏ', 'Đội bóng nữ lớp 11B2'],
    [9, '12C1', 'Khối 12', 'Nam', 'Thầy Ngô Văn H', '0933112244', 12, 'Cam', 'Đội bóng nam lớp 12C1'],
    [10, '12C1', 'Khối 12', 'Nữ', 'Cô Mai Thị K', '0933556688', 10, 'Vàng', 'Đội bóng nữ lớp 12C1'],
  ];

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  wsData['!cols'] = [
    { wch: 6 },  // STT
    { wch: 22 }, // Tên Đội Thi Đấu
    { wch: 16 }, // Khối / Bảng Đấu
    { wch: 20 }, // Giới Tính
    { wch: 26 }, // GVCN / HLV
    { wch: 18 }, // Số Điện Thoại
    { wch: 20 }, // Số Lượng VĐV
    { wch: 18 }, // Màu Áo
    { wch: 30 }, // Ghi Chú
  ];

  XLSX.utils.book_append_sheet(wb, wsData, 'DanhSachDoi');

  // 2. Sheet: DanhSachVDV_Doi_10A1 (Illustrating Athletes belonging to Team 10A1)
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
    [1, 'Nguyễn Văn Hoàng', 10, '10A1', 'Tiền đạo / Chủ công', '2010-05-15', '0912000001', '079201001234', 'Đội trưởng'],
    [2, 'Trần Quốc Bảo', 1, '10A1', 'Thủ môn', '2010-08-20', '0912000002', '079201001235', 'Thủ môn chính'],
    [3, 'Lê Tuấn Kiệt', 7, '10A1', 'Tiền vệ cánh', '2010-03-10', '0912000003', '079201001236', 'Cầu thủ'],
    [4, 'Phạm Minh Đức', 4, '10A1', 'Trung vệ', '2010-11-25', '0912000004', '079201001237', 'Cầu thủ'],
    [5, 'Võ Gia Huy', 9, '10A1', 'Tiền đạo cắm', '2010-07-12', '0912000005', '079201001238', 'Cầu thủ'],
    [6, 'Đặng Hoàng Long', 8, '10A1', 'Tiền vệ trung tâm', '2010-09-05', '0912000006', '079201001239', 'Cầu thủ'],
    [7, 'Bùi Quốc Anh', 2, '10A1', 'Hậu vệ phải', '2010-01-18', '0912000007', '079201001240', 'Cầu thủ'],
    [8, 'Huỳnh Tấn Tài', 3, '10A1', 'Hậu vệ trái', '2010-12-02', '0912000008', '079201001241', 'Cầu thủ'],
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
  XLSX.utils.book_append_sheet(wb, wsAthletes, 'DanhSachVDV_Doi_10A1');

  // 3. Sheet: HuongDan
  const guideRows: (string | number)[][] = [
    ['HƯỚNG DẪN CẤU TRÚC DANH SÁCH ĐỘI & DANH SÁCH VẬN ĐỘNG VIÊN'],
    [],
    ['1. PHÂN BIỆT RÕ 2 KHÁI NIỆM TRONG GIẢI ĐẤU:'],
    ['• DANH SÁCH ĐỘI (Sheet: DanhSachDoi):', 'Tên của các đội tham gia thi đấu trong toàn giải (Ví dụ: 10A1, 10A2, 11B1, 12C1...). Dùng để xếp lịch thi đấu, chia bảng và hiển thị bảng xếp hạng.'],
    ['• DANH SÁCH VẬN ĐỘNG VIÊN (Sheet: DanhSachVDV_Doi_10A1):', 'Tên của các vận động viên cụ thể trong 1 đội bóng (Ví dụ: Đội 10A1 gồm 12 vận động viên, mỗi bạn có số áo, vị trí, CCCD). Dùng để quản lý nhân sự, bảo mật CCCD và ghi bàn thắng.'],
    [],
    ['2. HƯỚNG DẪN ĐIỀN CÁC CỘT TRONG SHEET "DanhSachDoi":'],
    ['• Cột "Tên Đội Thi Đấu (Lớp)":', 'Bắt buộc. Nhập tên đội thi đấu, ví dụ: 10A1, 10A2, 11B1, 12C2...'],
    ['• Cột "Khối / Bảng Đấu":', 'Nhập khối hoặc bảng (Khối 10, Khối 11, Bảng A, Bảng B...). Lịch thi đấu và bảng xếp hạng sẽ được tự động phân nhóm theo cột này.'],
    ['• Cột "Giới Tính":', 'Điền "Nam" hoặc "Nữ". Nếu trong một lớp có cả đội nam và đội nữ, hãy tạo 2 dòng riêng biệt với tên lớp đó.'],
    ['• Cột "GVCN / HLV Phụ Trách":', 'Họ tên thầy cô phụ trách hoặc huấn luyện viên đội.'],
    ['• Cột "Số Lượng VĐV Dự Kiến":', 'Số lượng vận động viên đăng ký của đội (ví dụ: 10, 12, 15).'],
    ['• Cột "Màu Áo Thi Đấu":', 'Có thể điền tên màu tiếng Việt (Xanh dương, Hồng, Đỏ, Xanh lá, Cam, Vàng, Tím, Trắng) hoặc mã màu Hex.'],
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
          str === 'đội' ||
          str === 'doi' ||
          str === 'lớp' ||
          str === 'lop' ||
          str === 'team' ||
          str === 'team name'
        ) {
          tempMap['name'] = colIdx;
        } else if (
          str.includes('khối') ||
          str.includes('khoi') ||
          str.includes('bảng') ||
          str.includes('bang') ||
          str === 'group' ||
          str === 'stage'
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
          str.includes('số lượng') ||
          str.includes('so luong') ||
          str.includes('vđv') ||
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
      colMap = {
        name: 1,
        group: 2,
        gender: 3,
        coach: 4,
        phone: 5,
        count: 6,
        color: 7,
      };
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
        if (lowerRaw.includes('(nữ)') || lowerRaw.includes('- nữ') || lowerRaw.includes(' nữ')) {
          gender = 'female';
        } else if (lowerRaw.includes('(nam)') || lowerRaw.includes('- nam') || lowerRaw.includes(' nam')) {
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
 * 4. Parse Athletes From Uploaded Excel file (.xlsx, .xls, .csv)
 */
export async function parseAthletesFromExcel(
  file: File,
  teams: Team[]
): Promise<ParsedAthleteItem[]> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });

  const parsedAthletes: ParsedAthleteItem[] = [];

  wb.SheetNames.forEach((sheetName) => {
    const lower = sheetName.trim().toLowerCase();
    if (lower.includes('huongdan') || lower.includes('hướng dẫn')) return;

    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const rawRows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, { header: 1, defval: '' });
    if (rawRows.length === 0) return;

    // Find header row for athletes
    let headerRowIdx = -1;
    let colMap: Record<string, number> = {};

    for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;

      const tempMap: Record<string, number> = {};
      row.forEach((cell, colIdx) => {
        const str = String(cell).trim().toLowerCase();
        if (str.includes('họ và tên') || str.includes('ho va ten') || str.includes('họ tên') || str === 'vđv' || str === 'vdv' || str === 'tên' || str === 'name') {
          tempMap['name'] = colIdx;
        } else if (str.includes('số áo') || str.includes('so ao') || str === 'áo' || str === 'jersey') {
          tempMap['jersey'] = colIdx;
        } else if (str.includes('đội') || str.includes('doi') || str.includes('lớp') || str.includes('lop') || str === 'team') {
          tempMap['team'] = colIdx;
        } else if (str.includes('vị trí') || str.includes('vi tri') || str === 'position') {
          tempMap['position'] = colIdx;
        } else if (str.includes('ngày sinh') || str.includes('ngay sinh') || str.includes('dob') || str.includes('năm sinh')) {
          tempMap['dob'] = colIdx;
        } else if (str.includes('điện thoại') || str.includes('sđt') || str.includes('sdt') || str.includes('phone')) {
          tempMap['phone'] = colIdx;
        } else if (str.includes('cccd') || str.includes('cmnd') || str.includes('định danh') || str.includes('id')) {
          tempMap['nationalId'] = colIdx;
        }
      });

      if (tempMap['name'] !== undefined) {
        headerRowIdx = r;
        colMap = tempMap;
        break;
      }
    }

    if (headerRowIdx === -1) {
      headerRowIdx = 0;
      colMap = {
        name: 1,
        jersey: 2,
        team: 3,
        position: 4,
        dob: 5,
        phone: 6,
        nationalId: 7,
      };
    }

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      const name = colMap['name'] !== undefined ? String(row[colMap['name']] || '').trim() : '';
      if (!name) continue;

      const rawJersey = colMap['jersey'] !== undefined ? Number(row[colMap['jersey']]) || (parsedAthletes.length + 1) : 10;
      const rawTeamName = colMap['team'] !== undefined ? String(row[colMap['team']] || '').trim() : '';
      const position = colMap['position'] !== undefined ? String(row[colMap['position']] || '').trim() || 'Vận động viên' : 'Vận động viên';
      const dob = colMap['dob'] !== undefined ? String(row[colMap['dob']] || '').trim() || '2010-01-01' : '2010-01-01';
      const phone = colMap['phone'] !== undefined ? String(row[colMap['phone']] || '').trim() : '';
      const nationalId = colMap['nationalId'] !== undefined ? String(row[colMap['nationalId']] || '').trim() : '';

      // Match team
      let matchedTeam = teams.find(
        (t) => t.name.toLowerCase() === rawTeamName.toLowerCase() || t.id === rawTeamName
      );
      if (!matchedTeam && teams.length > 0) {
        matchedTeam = teams[0];
      }

      parsedAthletes.push({
        id: `A_IMP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${parsedAthletes.length + 1}`,
        name,
        jerseyNumber: rawJersey,
        teamName: matchedTeam ? matchedTeam.name : rawTeamName || 'Đội 10A1',
        teamId: matchedTeam ? matchedTeam.id : 'T_DEFAULT',
        group: matchedTeam ? matchedTeam.group : 'Khối 10',
        position,
        dateOfBirth: dob,
        phone,
        nationalId,
        status: 'approved',
        rawRowNumber: r + 1,
        isValid: true,
      });
    }
  });

  return parsedAthletes;
}
