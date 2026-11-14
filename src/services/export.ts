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

export interface MatchMinutesPointsResult {
  homeTournamentPts: number;
  awayTournamentPts: number;
  homeSetsWon: number;
  awaySetsWon: number;
  homeTotalScore: number;
  awayTotalScore: number;
  noteText: string;
  winnerName: string;
  loserName: string;
}

/**
 * Compute official tournament points (3, 2, 1, 0) and explanatory note
 * according to sport rules:
 * - Win 2-0 / 3-0 / 3-1: 3 pts, Loser: 0 pts
 * - Win 2-1 / 3-2: 2 pts, Loser: 1 pt
 * - Football regulation win: 3 pts (loser 0)
 * - Football penalty win: 2 pts (loser 1)
 * - Football draw: 1 pt each
 * - Unplayed / 0-0: 0 pts each
 */
export function calculateMatchMinutesPoints(
  match: Match,
  config: TournamentConfig
): MatchMinutesPointsResult {
  const isFootball = config.activeSportId === 'football';

  if (isFootball) {
    const s1 = match.scores.set1;
    const pen = match.scores.pen;
    let homePts = 0;
    let awayPts = 0;
    let winnerName = '';
    let loserName = '';

    const hasPlayed =
      match.status === 'FINISHED' ||
      match.status === 'LIVE' ||
      s1.home > 0 ||
      s1.away > 0 ||
      pen?.played;

    if (!hasPlayed) {
      homePts = 0;
      awayPts = 0;
    } else if (s1.home > s1.away) {
      homePts = 3;
      awayPts = 0;
      winnerName = match.home.name;
      loserName = match.away.name;
    } else if (s1.away > s1.home) {
      homePts = 0;
      awayPts = 3;
      winnerName = match.away.name;
      loserName = match.home.name;
    } else {
      // Hòa hiệp chính
      if (pen?.played) {
        if (pen.home > pen.away) {
          homePts = 2;
          awayPts = 1;
          winnerName = `${match.home.name} (Thắng pen)`;
          loserName = match.away.name;
        } else if (pen.away > pen.home) {
          homePts = 1;
          awayPts = 2;
          winnerName = `${match.away.name} (Thắng pen)`;
          loserName = match.home.name;
        } else {
          homePts = 1;
          awayPts = 1;
        }
      } else {
        homePts = 1;
        awayPts = 1;
      }
    }

    const penInfo = pen?.played ? ` (Luân lưu Pen: ${pen.home} - ${pen.away})` : '';
    const noteText = `* Ghi chú: Tổng điểm các set (số bàn thắng): ${match.home.name}: ${s1.home} bàn; ${match.away.name}: ${s1.away} bàn${penInfo}.`;

    return {
      homeTournamentPts: homePts,
      awayTournamentPts: awayPts,
      homeSetsWon: s1.home,
      awaySetsWon: s1.away,
      homeTotalScore: s1.home,
      awayTotalScore: s1.away,
      noteText,
      winnerName,
      loserName,
    };
  }

  // Set-based sports (Bóng chuyền, Cầu lông, Bóng bàn)
  let homeSetsWon = 0;
  let awaySetsWon = 0;
  let homeTotalPts = 0;
  let awayTotalPts = 0;

  for (let s = 1; s <= 5; s++) {
    const sc = match.scores[`set${s}` as keyof typeof match.scores] as
      | { home: number; away: number }
      | undefined;
    if (sc) {
      homeTotalPts += sc.home;
      awayTotalPts += sc.away;
      if (sc.home > sc.away) homeSetsWon++;
      else if (sc.away > sc.home) awaySetsWon++;
    }
  }

  let homeTournamentPts = 0;
  let awayTournamentPts = 0;
  let winnerName = '';
  let loserName = '';

  const hasScore =
    homeTotalPts > 0 ||
    awayTotalPts > 0 ||
    homeSetsWon > 0 ||
    awaySetsWon > 0 ||
    match.status === 'FINISHED';

  if (!hasScore) {
    homeTournamentPts = 0;
    awayTournamentPts = 0;
  } else if (homeSetsWon > awaySetsWon) {
    winnerName = match.home.name;
    loserName = match.away.name;
    // Điều lệ chuẩn: Thắng 2-0 / 3-0 / 3-1: 3 điểm, thua 0 điểm.
    // Thắng 2-1 / 3-2: 2 điểm, thua 1 điểm.
    if (awaySetsWon === 0 || homeSetsWon - awaySetsWon >= 2) {
      homeTournamentPts = 3;
      awayTournamentPts = 0;
    } else {
      homeTournamentPts = 2;
      awayTournamentPts = 1;
    }
  } else if (awaySetsWon > homeSetsWon) {
    winnerName = match.away.name;
    loserName = match.home.name;
    if (homeSetsWon === 0 || awaySetsWon - homeSetsWon >= 2) {
      awayTournamentPts = 3;
      homeTournamentPts = 0;
    } else {
      awayTournamentPts = 2;
      homeTournamentPts = 1;
    }
  } else {
    // Tỉ số set hòa (nếu có trận giao hữu hoặc chưa phân thắng bại)
    if (match.status === 'FINISHED' && (homeTotalPts > 0 || awayTotalPts > 0)) {
      if (homeTotalPts > awayTotalPts) {
        winnerName = match.home.name;
        loserName = match.away.name;
        homeTournamentPts = 2;
        awayTournamentPts = 1;
      } else if (awayTotalPts > homeTotalPts) {
        winnerName = match.away.name;
        loserName = match.home.name;
        awayTournamentPts = 2;
        homeTournamentPts = 1;
      } else {
        homeTournamentPts = 1;
        awayTournamentPts = 1;
      }
    } else {
      homeTournamentPts = 0;
      awayTournamentPts = 0;
    }
  }

  const noteText = `* Ghi chú: Tổng điểm các set (số bàn thắng): ${match.home.name}: ${homeTotalPts} điểm; ${match.away.name}: ${awayTotalPts} điểm (Tỉ số set: ${homeSetsWon} - ${awaySetsWon}).`;

  return {
    homeTournamentPts,
    awayTournamentPts,
    homeSetsWon,
    awaySetsWon,
    homeTotalScore: homeTotalPts,
    awayTotalScore: awayTotalPts,
    noteText,
    winnerName,
    loserName,
  };
}

/**
 * Generate official administrative match minutes Word (.doc)
 */
export function exportMatchMinutesToWord(match: Match, config: TournamentConfig) {
  const isFootball = config.activeSportId === 'football';

  // Referee & Secretary names with sensible fallbacks
  const refereeName = match.refereeName || config.referee || 'Bồ Công Lâm';
  const secretaryName = match.secretaryName || config.secretary || 'Trần Thị Thu Hồng';

  const calc = calculateMatchMinutesPoints(match, config);
  const homeResultDisplay = `${calc.homeTournamentPts} điểm`;
  const awayResultDisplay = `${calc.awayTournamentPts} điểm`;
  const winnerName = calc.winnerName;
  const loserName = calc.loserName;

  // Table header & rows layout matching user image
  let tableHeaderColsHtml = '';
  let homeColsHtml = '';
  let awayColsHtml = '';

  if (isFootball) {
    tableHeaderColsHtml = `
      <th style="border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; width: 32%;">Đội thi đấu</th>
      <th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center; width: 18%;">Hiệp chính</th>
      <th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center; width: 18%;">Luân lưu (Pen)</th>
      <th style="border: 1px solid #cbd5e1; padding: 10px 12px; text-align: center; width: 32%;">Kết quả chung cuộc</th>
    `;
    homeColsHtml = `
      <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold; text-align: left;">${match.home.name}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center;">${match.scores.set1.home}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center;">${match.scores.pen?.played ? match.scores.pen.home : '-'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold; text-align: center;">${homeResultDisplay}</td>
    `;
    awayColsHtml = `
      <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold; text-align: left;">${match.away.name}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center;">${match.scores.set1.away}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center;">${match.scores.pen?.played ? match.scores.pen.away : '-'}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold; text-align: center;">${awayResultDisplay}</td>
    `;
  } else {
    tableHeaderColsHtml = `
      <th style="border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; width: 30%;">Đội thi đấu</th>
      <th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center; width: 14%;">Set 1</th>
      <th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center; width: 14%;">Set 2</th>
      <th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center; width: 14%;">Set 3</th>
      <th style="border: 1px solid #cbd5e1; padding: 10px 12px; text-align: center; width: 28%;">Kết quả chung cuộc</th>
    `;
    homeColsHtml = `
      <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold; text-align: left;">${match.home.name}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center;">${match.scores.set1.home}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center;">${match.scores.set2.home}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center;">${match.scores.set3.home}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold; text-align: center;">${homeResultDisplay}</td>
    `;
    awayColsHtml = `
      <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold; text-align: left;">${match.away.name}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center;">${match.scores.set1.away}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center;">${match.scores.set2.away}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: center;">${match.scores.set3.away}</td>
      <td style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold; text-align: center;">${awayResultDisplay}</td>
    `;
  }

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Biên Bản Thi Đấu</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.4; color: black; margin: 20px; }
        table { width: 100%; border-collapse: collapse; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
      </style>
    </head>
    <body>
      <table style="width: 100%; border: none; margin-bottom: 16px; border-collapse: collapse;">
        <tr>
          <td style="width: 48%; text-align: center; vertical-align: top; border: none; padding: 0;">
            <p style="margin: 0; font-size: 11pt; text-transform: uppercase;">${config.schoolName || 'TRƯỜNG THPT HUỲNH TẤN PHÁT'}</p>
            <p style="margin: 3px 0 0 0; font-size: 11pt; font-weight: bold; text-transform: uppercase;">
              <u>${config.deptName || 'BAN TỔ CHỨC HỘI THAO'}</u>
            </p>
          </td>
          <td style="width: 52%; text-align: center; vertical-align: top; border: none; padding: 0;">
            <p style="margin: 0; font-weight: bold; font-size: 11pt; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p style="margin: 3px 0 0 0; font-weight: bold; font-size: 11pt;">
              <u>Độc lập - Tự do - Hạnh phúc</u>
            </p>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin: 18px 0 16px 0;">
        <h2 style="margin: 0; font-size: 16pt; font-weight: bold; text-transform: uppercase;">BIÊN BẢN THI ĐẤU THỂ THAO</h2>
        <p style="margin: 4px 0; font-style: italic; font-size: 11pt;">Giải đấu: ${config.tournamentName}</p>
        <p style="margin: 4px 0; font-weight: bold; color: #1e3a8a; font-size: 13pt;">${match.code}: ${match.home.name} — ${match.away.name} (${match.stage})</p>
      </div>

      <table style="width: 100%; border: none; margin: 16px 0 10px 0; font-size: 12pt; border-collapse: collapse;">
        <tr>
          <td style="width: 50%; vertical-align: top; border: none; padding: 2px 0;">
            <p style="margin: 3px 0;"><strong>Thời gian:</strong> ${match.time} ngày ${match.date || new Date().toISOString().slice(0, 10)}</p>
            <p style="margin: 3px 0;"><strong>Sân thi đấu:</strong> ${match.pitch}</p>
          </td>
          <td style="width: 50%; vertical-align: top; border: none; padding: 2px 0;">
            <p style="margin: 3px 0;"><strong>Trọng tài chính:</strong> ${refereeName}</p>
            <p style="margin: 3px 0;"><strong>Thư ký bàn:</strong> ${secretaryName}</p>
          </td>
        </tr>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin: 12px 0 6px 0; font-size: 12pt; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background-color: #f0f4f8; font-weight: bold;">
            ${tableHeaderColsHtml}
          </tr>
        </thead>
        <tbody>
          <tr>
            ${homeColsHtml}
          </tr>
          <tr>
            ${awayColsHtml}
          </tr>
        </tbody>
      </table>

      <p style="margin: 6px 0 16px 0; font-style: italic; font-size: 10.5pt; color: #334155;">
        ${calc.noteText}
      </p>

      <div style="margin: 16px 0 20px 0; font-size: 12pt; line-height: 1.6;">
        <p style="margin: 0 0 2px 0; font-weight: bold;">Kết luận:</p>
        <p style="margin: 2px 0;">
          Đội thắng cuộc: <strong style="color: #15803d;">${winnerName ? winnerName : '(Chờ kết thúc trận)'}</strong>
        </p>
        <p style="margin: 2px 0;">
          Đội thua cuộc: <strong style="color: #b91c1c;">${loserName ? loserName : '(Xác định sau khi kết thúc trận)'}</strong>
        </p>
        <p style="margin: 6px 0 0 0; font-style: italic; font-size: 11pt; color: #334155;">
          Biên bản thi đấu kết thúc vào cùng ngày. Các bên đã đọc, xác nhận kết quả chính xác và nhất trí ký tên dưới đây.
        </p>
      </div>

      <table style="width: 100%; margin-top: 30px; text-align: center; font-size: 11pt; border: none; border-collapse: collapse;">
        <tr>
          <td style="width: 33%; vertical-align: top; text-align: center; border: none; padding: 0 4px;">
            <p style="margin: 0; font-weight: bold; text-transform: uppercase;">TRỌNG TÀI CHÍNH</p>
            <p style="margin: 3px 0 0 0; font-style: italic; font-size: 10.5pt; color: #475569;">(Ký và ghi rõ họ tên)</p>
            <div style="height: 65px;"></div>
            <p style="margin: 0; font-weight: bold;">${refereeName}</p>
          </td>
          <td style="width: 33%; vertical-align: top; text-align: center; border: none; padding: 0 4px;">
            <p style="margin: 0; font-weight: bold; text-transform: uppercase;">THƯ KÝ BÀN</p>
            <p style="margin: 3px 0 0 0; font-style: italic; font-size: 10.5pt; color: #475569;">(Ký và ghi rõ họ tên)</p>
            <div style="height: 65px;"></div>
            <p style="margin: 0; font-weight: bold;">${secretaryName}</p>
          </td>
          <td style="width: 34%; vertical-align: top; text-align: center; border: none; padding: 0 4px;">
            <p style="margin: 0; font-weight: bold; text-transform: uppercase;">ĐẠI DIỆN ĐỘI BÓNG</p>
            <p style="margin: 2px 0 0 0; font-weight: bold; font-size: 10.5pt; color: #b91c1c;">
              ${loserName ? `(Đội ${loserName} - Đội thua)` : '(Tên đội thua xác định sau trận)'}
            </p>
            <p style="margin: 2px 0 0 0; font-style: italic; font-size: 10.5pt; color: #475569;">(Ký và ghi rõ họ tên)</p>
            <div style="height: 65px;"></div>
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
 * Export Standings to Word (.doc)
 */
export function exportStandingsToWord(
  config: TournamentConfig,
  standingsByGroup: Record<string, StandingItem[]>,
  selectedGroup?: string
) {
  const groupsToExport =
    selectedGroup && selectedGroup !== 'ALL'
      ? { [selectedGroup]: standingsByGroup[selectedGroup] || [] }
      : standingsByGroup;

  let tablesHtml = '';

  Object.entries(groupsToExport).forEach(([groupName, items]) => {
    let rowsHtml = '';
    items.forEach((item, idx) => {
      rowsHtml += `
        <tr>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid black; padding: 6px; font-weight: bold; text-align: left;">${item.team.name}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${groupName}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${item.played}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${item.won}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${item.drawn}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${item.lost}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${item.ptsFor} - ${item.ptsAgainst}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${item.ptsFor - item.ptsAgainst > 0 ? '+' : ''}${item.ptsFor - item.ptsAgainst}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; color: #1e40af;">${item.points}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${idx === 0 ? 'Nhất bảng' : idx === 1 ? 'Nhì bảng' : idx === 2 ? 'Ba bảng' : ''}</td>
        </tr>
      `;
    });

    tablesHtml += `
      <h3 style="margin-top: 20px; margin-bottom: 6px; font-size: 13pt; color: #1e3a8a; text-transform: uppercase;">
        BẢNG THI ĐẤU: ${groupName}
      </h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <th style="border: 1px solid black; padding: 6px; width: 45px;">Hạng</th>
            <th style="border: 1px solid black; padding: 6px; text-align: left;">Tên Đội (Lớp)</th>
            <th style="border: 1px solid black; padding: 6px; width: 80px;">Bảng/Khối</th>
            <th style="border: 1px solid black; padding: 6px; width: 50px;">Số Trận</th>
            <th style="border: 1px solid black; padding: 6px; width: 45px;">Thắng</th>
            <th style="border: 1px solid black; padding: 6px; width: 45px;">Hòa</th>
            <th style="border: 1px solid black; padding: 6px; width: 45px;">Thua</th>
            <th style="border: 1px solid black; padding: 6px; width: 75px;">Điểm Số</th>
            <th style="border: 1px solid black; padding: 6px; width: 65px;">Hiệu Số</th>
            <th style="border: 1px solid black; padding: 6px; width: 65px;">Tổng Điểm</th>
            <th style="border: 1px solid black; padding: 6px; width: 85px;">Ghi Chú</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 10px;">Chưa có dữ liệu</td></tr>'}
        </tbody>
      </table>
    `;
  });

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Bảng Xếp Hạng Thi Đấu</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.35; color: black; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid black; padding: 6px 8px; font-size: 11pt; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .font-bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
      </style>
    </head>
    <body>
      <table style="width: 100%; border: none; margin-bottom: 15px;">
        <tr>
          <td style="width: 45%; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0;">${config.schoolName}</p>
            <p style="margin: 2px 0; font-weight: bold;">${config.deptName}</p>
            <p style="margin: 0;">***</p>
          </td>
          <td style="width: 55%; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p style="margin: 2px 0; font-style: italic;">Độc lập - Tự do - Hạnh phúc</p>
            <p style="margin: 0;">---------------</p>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin: 20px 0 15px 0;">
        <h2 style="margin: 0; font-size: 15pt; font-weight: bold; text-transform: uppercase;">BẢNG XẾP HẠNG GIẢI THI ĐẤU THỂ THAO</h2>
        <p style="margin: 4px 0; font-weight: bold; color: #1e3a8a;">${config.tournamentName}</p>
        <p style="margin: 2px 0; font-size: 11pt; font-style: italic;">Thời điểm lập bảng: Ngày ${new Date().toLocaleDateString('vi-VN')}</p>
      </div>

      ${tablesHtml}

      <table style="width: 100%; margin-top: 30px; text-align: center; border: none;">
        <tr>
          <td style="width: 33%; font-weight: bold; border: none;">
            TỔ TRƯỞNG CHUYÊN MÔN<br><br><br><br>
            <span style="font-weight: normal;">(Ký, ghi rõ họ tên)</span>
          </td>
          <td style="width: 33%; font-weight: bold; border: none;">
            TRỌNG TÀI CHÍNH<br><br><br><br>
            <span style="font-weight: normal;">${config.referee}</span>
          </td>
          <td style="width: 33%; font-weight: bold; border: none;">
            TRƯỞNG BAN TỔ CHỨC<br><br><br><br>
            <span style="font-weight: normal;">${config.organizer}</span>
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
  a.download = `BangXepHang_${new Date().toISOString().slice(0, 10)}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export Match Schedule and Results to Word (.doc)
 */
export function exportScheduleToWord(
  config: TournamentConfig,
  matches: Match[],
  selectedStage?: string
) {
  const targetMatches =
    selectedStage && selectedStage !== 'ALL'
      ? matches.filter((m) => m.stage === selectedStage)
      : matches;

  let rowsHtml = '';
  targetMatches.forEach((m, idx) => {
    let scoreText = '-';
    if (m.status === 'FINISHED' || m.status === 'LIVE') {
      const isFootball = config.activeSportId === 'football';
      if (isFootball) {
        scoreText = `${m.scores.set1.home} - ${m.scores.set1.away}`;
        if (m.scores.pen.played) scoreText += ` (Pen: ${m.scores.pen.home}-${m.scores.pen.away})`;
      } else {
        let hW = 0, aW = 0;
        for (let s = 1; s <= (config.matchSetsRule || 3); s++) {
          const sc = m.scores[`set${s}` as keyof typeof m.scores] as { home: number; away: number };
          if (sc && (sc.home > 0 || sc.away > 0)) {
            if (sc.home > sc.away) hW++;
            else if (sc.away > sc.home) aW++;
          }
        }
        scoreText = `${hW} - ${aW}`;
      }
    }

    const statusText =
      m.status === 'FINISHED'
        ? 'Đã kết thúc'
        : m.status === 'LIVE'
        ? 'Đang thi đấu'
        : 'Chưa thi đấu';

    rowsHtml += `
      <tr>
        <td style="border: 1px solid black; padding: 6px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold;">${m.code}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: center;">${m.stage}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: center;">${m.date || ''}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: center;">${m.time}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: center;">${m.pitch}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: right; font-weight: bold;">${m.home.name}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; background-color: #f8fafc; color: #1e3a8a;">${scoreText}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: left; font-weight: bold;">${m.away.name}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: center;">${statusText}</td>
        <td style="border: 1px solid black; padding: 6px; text-align: center; font-size: 10pt;">${m.refereeName || config.referee}</td>
      </tr>
    `;
  });

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Lịch Thi Đấu & Kết Quả</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.35; color: black; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid black; padding: 6px; font-size: 10.5pt; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
      </style>
    </head>
    <body>
      <table style="width: 100%; border: none; margin-bottom: 15px;">
        <tr>
          <td style="width: 45%; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0;">${config.schoolName}</p>
            <p style="margin: 2px 0; font-weight: bold;">${config.deptName}</p>
            <p style="margin: 0;">***</p>
          </td>
          <td style="width: 55%; text-align: center; vertical-align: top; border: none;">
            <p style="margin: 0; font-weight: bold;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
            <p style="margin: 2px 0; font-style: italic;">Độc lập - Tự do - Hạnh phúc</p>
            <p style="margin: 0;">---------------</p>
          </td>
        </tr>
      </table>

      <div style="text-align: center; margin: 20px 0 15px 0;">
        <h2 style="margin: 0; font-size: 15pt; font-weight: bold; text-transform: uppercase;">LỊCH THI ĐẤU VÀ KẾT QUẢ GIẢI THỂ THAO</h2>
        <p style="margin: 4px 0; font-weight: bold; color: #1e3a8a;">${config.tournamentName}</p>
        <p style="margin: 2px 0; font-size: 11pt; font-style: italic;">Ngày xuất văn bản: ${new Date().toLocaleDateString('vi-VN')}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f1f5f9; font-weight: bold;">
            <th style="border: 1px solid black; padding: 6px; width: 35px;">STT</th>
            <th style="border: 1px solid black; padding: 6px; width: 65px;">Mã Trận</th>
            <th style="border: 1px solid black; padding: 6px; width: 75px;">Vòng/Bảng</th>
            <th style="border: 1px solid black; padding: 6px; width: 75px;">Ngày</th>
            <th style="border: 1px solid black; padding: 6px; width: 55px;">Giờ</th>
            <th style="border: 1px solid black; padding: 6px; width: 70px;">Sân</th>
            <th style="border: 1px solid black; padding: 6px; text-align: right;">Đội 1 (Nhà)</th>
            <th style="border: 1px solid black; padding: 6px; width: 65px;">Tỉ Số</th>
            <th style="border: 1px solid black; padding: 6px; text-align: left;">Đội 2 (Khách)</th>
            <th style="border: 1px solid black; padding: 6px; width: 85px;">Trạng Thái</th>
            <th style="border: 1px solid black; padding: 6px; width: 90px;">Trọng Tài</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml || '<tr><td colspan="11" style="text-align: center; padding: 10px;">Chưa có trận đấu nào</td></tr>'}
        </tbody>
      </table>

      <table style="width: 100%; margin-top: 30px; text-align: center; border: none;">
        <tr>
          <td style="width: 33%; font-weight: bold; border: none;">
            THƯ KÝ BÀN<br><br><br><br>
            <span style="font-weight: normal;">${config.secretary}</span>
          </td>
          <td style="width: 33%; font-weight: bold; border: none;">
            TRỌNG TÀI CHÍNH<br><br><br><br>
            <span style="font-weight: normal;">${config.referee}</span>
          </td>
          <td style="width: 33%; font-weight: bold; border: none;">
            TRƯỞNG BAN TỔ CHỨC<br><br><br><br>
            <span style="font-weight: normal;">${config.organizer}</span>
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
  a.download = `LichThiDau_${new Date().toISOString().slice(0, 10)}.doc`;
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

/**
 * Sanitize Excel sheet name (max 31 chars, no invalid characters: \ / ? * : [ ])
 */
function sanitizeSheetName(raw: string, fallback = 'Sheet'): string {
  const cleaned = (raw || fallback).replace(/[\\/?*:[\]]/g, '_').trim();
  return (cleaned || fallback).slice(0, 31);
}

/**
 * Export athlete roster of a single team directly to an Excel (.xlsx) file
 */
export function exportTeamAthletesToExcel(
  team: Team,
  allAthletes: Athlete[],
  config?: TournamentConfig
) {
  const wb = XLSX.utils.book_new();

  const teamAthletes = allAthletes
    .filter(
      (a) =>
        a.teamId === team.id ||
        a.teamName.trim().toLowerCase() === team.name.trim().toLowerCase()
    )
    .sort((a, b) => (a.jerseyNumber || 0) - (b.jerseyNumber || 0));

  const headers = [
    'STT',
    'Họ Và Tên Vận Động Viên',
    'Số Áo',
    'Đội / Lớp',
    'Bảng / Khối',
    'Vị Trí Thi Đấu',
    'Ngày Sinh (YYYY-MM-DD)',
    'Trạng Thái Hồ Sơ',
    'Điểm / Bàn Thắng',
    'Thẻ Vàng',
    'Thẻ Đỏ',
    'MVP',
    'Ghi Chú',
  ];

  const rows: (string | number)[][] = teamAthletes.map((ath, idx) => [
    idx + 1,
    ath.name,
    ath.jerseyNumber,
    team.name,
    team.group || ath.group || '',
    ath.position || 'Vận động viên',
    ath.dateOfBirth || '',
    ath.status === 'approved'
      ? 'Đã duyệt'
      : ath.status === 'pending'
      ? 'Chờ duyệt'
      : 'Cần bổ sung',
    ath.goalsOrPoints || 0,
    ath.yellowCards || 0,
    ath.redCards || 0,
    ath.mvpCount || 0,
    ath.isCaptain ? 'Đội trưởng' : '',
  ]);

  const wsRoster = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  wsRoster['!cols'] = [
    { wch: 6 },  // STT
    { wch: 28 }, // Họ Và Tên
    { wch: 10 }, // Số Áo
    { wch: 16 }, // Đội / Lớp
    { wch: 18 }, // Bảng / Khối
    { wch: 22 }, // Vị Trí
    { wch: 20 }, // Ngày Sinh
    { wch: 16 }, // Trạng Thái
    { wch: 16 }, // Điểm/Bàn
    { wch: 10 }, // Thẻ Vàng
    { wch: 10 }, // Thẻ Đỏ
    { wch: 8 },  // MVP
    { wch: 18 }, // Ghi Chú
  ];

  const sheetName = sanitizeSheetName(`VDV_${team.name}`, 'DanhSachVDV');
  XLSX.utils.book_append_sheet(wb, wsRoster, sheetName);

  // Sheet 2: Thông tin chi tiết đội bóng
  const infoRows: (string | number)[][] = [
    ['THÔNG TIN ĐỘI THI ĐẤU & DANH SÁCH VẬN ĐỘNG VIÊN'],
    ['Đơn vị tổ chức:', config ? `${config.schoolName} - ${config.deptName}` : 'Ban Tổ Chức Hội Thao'],
    ['Giải đấu:', config?.tournamentName || 'Hội Thao Học Sinh'],
    ['Tên Đội / Lớp:', team.name],
    ['Bảng / Khối:', team.group],
    [
      'Giới tính:',
      team.gender === 'female' ? 'Nữ' : team.gender === 'mixed' ? 'Hỗn hợp' : 'Nam',
    ],
    ['GVCN / HLV phụ trách:', team.coachName || 'Chưa cập nhật'],
    ['Tổng số VĐV đăng ký:', teamAthletes.length],
    ['Ngày xuất danh sách:', new Date().toLocaleDateString('vi-VN')],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
  wsInfo['!cols'] = [{ wch: 26 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsInfo, 'ThongTinDoi');

  const safeFileName = team.name.replace(/[^a-zA-Z0-9_\u00C0-\u1EF9,-]/g, '_');
  XLSX.writeFile(wb, `DanhSach_VDV_Doi_${safeFileName}.xlsx`);
}

/**
 * Export athlete rosters of all teams into a multi-sheet Excel workbook
 * (1 summary sheet + 1 dedicated sheet per team)
 */
export function exportAllTeamsAthletesToExcel(
  teams: Team[],
  allAthletes: Athlete[],
  config?: TournamentConfig
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Tổng hợp tất cả VĐV
  const summaryHeaders = [
    'STT',
    'Họ Và Tên Vận Động Viên',
    'Số Áo',
    'Đội / Lớp',
    'Bảng / Khối',
    'Vị Trí Thi Đấu',
    'Ngày Sinh (YYYY-MM-DD)',
    'Trạng Thái Hồ Sơ',
    'Điểm / Bàn Thắng',
    'Ghi Chú',
  ];

  const sortedAthletes = [...allAthletes].sort((a, b) => {
    const teamCmp = (a.teamName || '').localeCompare(b.teamName || '');
    if (teamCmp !== 0) return teamCmp;
    return (a.jerseyNumber || 0) - (b.jerseyNumber || 0);
  });

  const summaryRows: (string | number)[][] = sortedAthletes.map((ath, idx) => [
    idx + 1,
    ath.name,
    ath.jerseyNumber,
    ath.teamName,
    ath.group,
    ath.position || 'Vận động viên',
    ath.dateOfBirth || '',
    ath.status === 'approved'
      ? 'Đã duyệt'
      : ath.status === 'pending'
      ? 'Chờ duyệt'
      : 'Cần bổ sung',
    ath.goalsOrPoints || 0,
    ath.isCaptain ? 'Đội trưởng' : '',
  ]);

  const wsSummary = XLSX.utils.aoa_to_sheet([
    [config?.tournamentName || 'DANH SÁCH VẬN ĐỘNG VIÊN CÁC ĐỘI'],
    [
      `Đơn vị: ${config?.schoolName || ''} - ${config?.deptName || ''} | Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`,
    ],
    [],
    summaryHeaders,
    ...summaryRows,
  ]);
  wsSummary['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'TongHop_VDV');

  // 2. Tạo từng Sheet riêng cho mỗi đội
  const usedSheetNames = new Set<string>(['TongHop_VDV']);

  teams.forEach((team, tIdx) => {
    const teamAthletes = allAthletes
      .filter(
        (a) =>
          a.teamId === team.id ||
          a.teamName.trim().toLowerCase() === team.name.trim().toLowerCase()
      )
      .sort((a, b) => (a.jerseyNumber || 0) - (b.jerseyNumber || 0));

    const headers = [
      'STT',
      'Họ Và Tên Vận Động Viên',
      'Số Áo',
      'Đội / Lớp',
      'Bảng / Khối',
      'Vị Trí Thi Đấu',
      'Ngày Sinh (YYYY-MM-DD)',
      'Trạng Thái Hồ Sơ',
      'Điểm / Bàn Thắng',
      'Ghi Chú',
    ];

    const rows: (string | number)[][] = teamAthletes.map((ath, idx) => [
      idx + 1,
      ath.name,
      ath.jerseyNumber,
      team.name,
      team.group || ath.group || '',
      ath.position || 'Vận động viên',
      ath.dateOfBirth || '',
      ath.status === 'approved'
        ? 'Đã duyệt'
        : ath.status === 'pending'
        ? 'Chờ duyệt'
        : 'Cần bổ sung',
      ath.goalsOrPoints || 0,
      ath.isCaptain ? 'Đội trưởng' : '',
    ]);

    const wsTeam = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    wsTeam['!cols'] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 10 },
      { wch: 16 },
      { wch: 18 },
      { wch: 22 },
      { wch: 20 },
      { wch: 16 },
      { wch: 16 },
      { wch: 18 },
    ];

    let candidateName = sanitizeSheetName(`${team.name}_${team.group}`, `Doi_${tIdx + 1}`);
    if (usedSheetNames.has(candidateName)) {
      candidateName = sanitizeSheetName(`${tIdx + 1}_${team.name}`, `Doi_${tIdx + 1}`);
    }
    usedSheetNames.add(candidateName);
    XLSX.utils.book_append_sheet(wb, wsTeam, candidateName);
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `DanhSach_VDV_TheoTungDoi_${dateStr}.xlsx`);
}

