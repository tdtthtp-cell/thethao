import * as XLSX from 'xlsx';
import { Athlete, Match, StandingItem, Team, TournamentConfig } from '../types';
import { encryptFullDataPackage, decryptFullDataPackage } from './crypto';

/**
 * Export full tournament workbook to Excel (.xlsx)
 */
export function exportTournamentToExcel(
  config: TournamentConfig,
  _teams: Team[],
  athletes: Athlete[],
  matches: Match[],
  standingsByGroup: Record<string, StandingItem[]>
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Bảng Xếp Hạng
  const standingsRows: (string | number)[][] = [
    ['BẢNG XẾP HẠNG GIẢI THI ĐẤU THỂ THAO'],
    [`Đơn vị: ${config.schoolName} - ${config.deptName}`],
    [`Giải đấu: ${config.tournamentName}`],
    [`Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`],
    [],
    ['Khối/Bảng', 'Hạng', 'Tên Đội', 'Số Trận', 'Thắng', 'Hòa', 'Thua', 'Điểm Số (T/B)', 'Hiệu Số', 'Tổng Điểm', 'Phong Độ'],
  ];

  Object.entries(standingsByGroup).forEach(([groupName, items]) => {
    items.forEach((item, idx) => {
      standingsRows.push([
        groupName,
        idx + 1,
        item.team.name,
        item.played,
        item.won,
        item.drawn,
        item.lost,
        `${item.ptsFor} / ${item.ptsAgainst}`,
        item.ptsFor - item.ptsAgainst,
        item.points,
        item.form.join('-') || 'Chưa đấu',
      ]);
    });
    standingsRows.push([]);
  });

  const wsStandings = XLSX.utils.aoa_to_sheet(standingsRows);
  XLSX.utils.book_append_sheet(wb, wsStandings, 'BangXepHang');

  // 2. Sheet: Danh Sách Vận Động Viên
  const athleteRows: (string | number)[][] = [
    ['DANH SÁCH VẬN ĐỘNG VIÊN ĐĂNG KÝ'],
    ['STT', 'Họ Và Tên', 'Đội / Lớp', 'Khối / Bảng', 'Số Áo', 'Vị Trí', 'Ngày Sinh', 'Trạng Thái Hồ Sơ', 'Điểm/Bàn Thắng', 'Thẻ Vàng', 'Thẻ Đỏ', 'MVP'],
  ];

  athletes.forEach((ath, idx) => {
    athleteRows.push([
      idx + 1,
      ath.name,
      ath.teamName,
      ath.group,
      ath.jerseyNumber,
      ath.position,
      ath.dateOfBirth,
      ath.status === 'approved' ? 'Đã duyệt' : ath.status === 'pending' ? 'Chờ duyệt' : 'Cần bổ sung',
      ath.goalsOrPoints,
      ath.yellowCards,
      ath.redCards,
      ath.mvpCount,
    ]);
  });

  const wsAthletes = XLSX.utils.aoa_to_sheet(athleteRows);
  XLSX.utils.book_append_sheet(wb, wsAthletes, 'DanhSachVDV');

  // 3. Sheet: Lịch Thi Đấu & Kết Quả
  const matchRows: (string | number)[][] = [
    ['LỊCH THI ĐẤU VÀ KẾT QUẢ'],
    ['Mã Trận', 'Bảng/Khối', 'Sân Đấu', 'Thời Gian', 'Đội Nhà', 'Tỉ Số', 'Đội Khách', 'Trạng Thái', 'Chi Tiết Set / Bàn Thắng'],
  ];

  matches.forEach((m) => {
    const isFootball = config.activeSportId === 'football';
    let scoreDisplay = '';
    let details = '';

    if (isFootball) {
      scoreDisplay = `${m.scores.set1.home} - ${m.scores.set1.away}`;
      if (m.scores.pen.played) {
        scoreDisplay += ` (Pen: ${m.scores.pen.home}-${m.scores.pen.away})`;
      }
      details = `Hiệp chính: ${m.scores.set1.home}-${m.scores.set1.away}`;
    } else {
      let hWins = 0, aWins = 0;
      const sets: string[] = [];
      for (let s = 1; s <= (config.matchSetsRule || 3); s++) {
        const sc = m.scores[`set${s}` as keyof typeof m.scores] as { home: number; away: number };
        if (sc && (sc.home > 0 || sc.away > 0)) {
          sets.push(`S${s}:${sc.home}-${sc.away}`);
          if (sc.home > sc.away) hWins++;
          else if (sc.away > sc.home) aWins++;
        }
      }
      scoreDisplay = `${hWins} - ${aWins}`;
      details = sets.join(', ') || 'Chưa diễn ra';
    }

    matchRows.push([
      m.code,
      m.stage,
      m.pitch,
      `${m.date} ${m.time}`,
      m.home.name,
      scoreDisplay,
      m.away.name,
      m.status === 'FINISHED' ? 'Đã kết thúc' : m.status === 'LIVE' ? 'Đang thi đấu' : 'Sắp diễn ra',
      details,
    ]);
  });

  const wsMatches = XLSX.utils.aoa_to_sheet(matchRows);
  XLSX.utils.book_append_sheet(wb, wsMatches, 'LichThiDau');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `BaoCao_GiaiDau_${dateStr}.xlsx`);
}

/**
 * Generate official administrative match minutes Word (.doc)
 */
export function exportMatchMinutesToWord(match: Match, config: TournamentConfig) {
  const isFootball = config.activeSportId === 'football';
  const sportNames: Record<string, string> = {
    volleyball: 'BÓNG CHUYỀN',
    football: 'BÓNG ĐÁ',
    badminton: 'CẦU LÔNG',
    tabletennis: 'BÓNG BÀN',
  };

  let scoreDetailsHtml = '';
  let finalResultHome = '';
  let finalResultAway = '';
  let winner = 'HÒA';

  if (isFootball) {
    const s1 = match.scores.set1;
    scoreDetailsHtml = `
      <tr>
        <td style="border: 1px solid black; padding: 8px;"><strong>${match.home.name}</strong></td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;">${s1.home}</td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;">${match.scores.pen.played ? match.scores.pen.home : '-'}</td>
      </tr>
      <tr>
        <td style="border: 1px solid black; padding: 8px;"><strong>${match.away.name}</strong></td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;">${s1.away}</td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;">${match.scores.pen.played ? match.scores.pen.away : '-'}</td>
      </tr>
    `;
    if (s1.home > s1.away) winner = match.home.name;
    else if (s1.away > s1.home) winner = match.away.name;
    else if (match.scores.pen.played) {
      if (match.scores.pen.home > match.scores.pen.away) winner = `${match.home.name} (Thắng luân lưu)`;
      else if (match.scores.pen.away > match.scores.pen.home) winner = `${match.away.name} (Thắng luân lưu)`;
    }
  } else {
    let hSets = 0, aSets = 0, hPts = 0, aPts = 0;
    const setCols: string[] = [];
    for (let s = 1; s <= (config.matchSetsRule || 3); s++) {
      const sc = match.scores[`set${s}` as keyof typeof match.scores] as { home: number; away: number };
      if (sc) {
        hPts += sc.home;
        aPts += sc.away;
        if (sc.home > sc.away) hSets++;
        else if (sc.away > sc.home) aSets++;
        setCols.push(`Set ${s}: ${sc.home} - ${sc.away}`);
      }
    }

    finalResultHome = `${hSets} Set (${hPts} điểm)`;
    finalResultAway = `${aSets} Set (${aPts} điểm)`;
    if (hSets > aSets) winner = match.home.name;
    else if (aSets > hSets) winner = match.away.name;

    scoreDetailsHtml = `
      <tr>
        <td style="border: 1px solid black; padding: 8px;"><strong>${match.home.name}</strong></td>
        <td style="border: 1px solid black; padding: 8px;">${setCols.map(s => s.split(':')[1]?.split('-')[0]?.trim()).join(' | ')}</td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;"><strong>${finalResultHome}</strong></td>
      </tr>
      <tr>
        <td style="border: 1px solid black; padding: 8px;"><strong>${match.away.name}</strong></td>
        <td style="border: 1px solid black; padding: 8px;">${setCols.map(s => s.split(':')[1]?.split('-')[1]?.trim()).join(' | ')}</td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;"><strong>${finalResultAway}</strong></td>
      </tr>
    `;
  }

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Biên Bản Thi Đấu</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.4; color: black; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
      </style>
    </head>
    <body>
      <table style="width: 100%; margin-bottom: 20px;">
        <tr>
          <td style="width: 45%; text-align: center; vertical-align: top;">
            <p style="margin: 0;">${config.schoolName}</p>
            <p style="margin: 2px 0; font-weight: bold;">${config.deptName}</p>
            <p style="margin: 0;">***</p>
          </td>
          <td style="width: 55%; text-align: center; vertical-align: top;">
            <p style="margin: 0; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p style="margin: 2px 0; font-style: italic;">Độc lập - Tự do - Hạnh phúc</p>
            <p style="margin: 0;">---------------</p>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin: 25px 0;">
        <h2 style="margin: 0; font-size: 16pt; font-weight: bold; text-transform: uppercase;">BIÊN BẢN THI ĐẤU THỂ THAO</h2>
        <p style="margin: 4px 0; font-style: italic;">Giải đấu: ${config.tournamentName}</p>
        <p style="margin: 6px 0; font-weight: bold; color: #1e3a8a;">${match.code}: ${match.home.name} - ${match.away.name}</p>
      </div>

      <p><strong>1. Môn thi đấu:</strong> ${sportNames[config.activeSportId || 'volleyball'] || (config.activeSportId || 'BÓNG CHUYỀN').toUpperCase()}</p>
      <p><strong>2. Thời gian:</strong> ${match.time} ngày ${match.date || new Date().toLocaleDateString('vi-VN')}</p>
      <p><strong>3. Địa điểm thi đấu:</strong> ${match.pitch}</p>
      <p><strong>4. Ban tổ chức & Cán bộ điều hành:</strong></p>
      <ul style="margin-top: 4px;">
        <li>Trưởng Ban Tổ Chức: ${config.organizer}</li>
        <li>Trọng tài chính: ${match.refereeName || config.referee}</li>
        <li>Thư ký bàn: ${match.secretaryName || config.secretary}</li>
      </ul>

      <p><strong>5. Kết quả thi đấu:</strong></p>
      <table>
        <thead>
          <tr style="background-color: #f1f5f9;">
            <th style="border: 1px solid black; padding: 8px;">Đội / Đơn Vị</th>
            <th style="border: 1px solid black; padding: 8px;">Chi Tiết Điểm / Tỉ Số</th>
            <th style="border: 1px solid black; padding: 8px;">Kết Quả</th>
          </tr>
        </thead>
        <tbody>
          ${scoreDetailsHtml}
        </tbody>
      </table>

      <p><strong>6. Kết luận:</strong> Đội thắng cuộc: <strong style="text-transform: uppercase; color: #15803d;">${winner}</strong></p>
      <p style="font-style: italic;">Biên bản thi đấu kết thúc vào lúc ..... giờ ..... cùng ngày. Các bên đã đọc và hoàn toàn nhất trí ký tên.</p>

      <table style="width: 100%; margin-top: 40px; text-align: center;">
        <tr>
          <td style="width: 33%; font-weight: bold;">
            TRƯỞNG BAN TỔ CHỨC<br><br><br><br>
            <span style="font-weight: normal;">${config.organizer}</span>
          </td>
          <td style="width: 33%; font-weight: bold;">
            TRỌNG TÀI CHÍNH<br><br><br><br>
            <span style="font-weight: normal;">${match.refereeName || config.referee}</span>
          </td>
          <td style="width: 33%; font-weight: bold;">
            THƯ KÝ BÀN<br><br><br><br>
            <span style="font-weight: normal;">${match.secretaryName || config.secretary}</span>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `BienBan_${match.code.replace(/\s+/g, '_')}_${match.home.name}_vs_${match.away.name}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export full tournament state into unencrypted JSON
 */
export function exportTournamentBackupJSON(data: unknown) {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Backup_GiaiDau_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export password-protected encrypted backup package using AES-256
 */
export async function exportEncryptedBackupPackage(data: unknown, password: string) {
  const encryptedPayload = await encryptFullDataPackage(data, password);
  const blob = new Blob([encryptedPayload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Backup_Mahoa_AES256_${new Date().toISOString().slice(0, 10)}.enc.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import encrypted backup package using password
 */
export async function importEncryptedBackupPackage(fileContent: string, password: string): Promise<unknown> {
  return await decryptFullDataPackage(fileContent, password);
}
