/**
 * Parse một chuỗi mô tả khoảng thời gian tương đối → tổng số phút.
 *
 * Hỗ trợ:
 *   - Số trần: "30" → 30 phút
 *   - Đơn vị rút gọn: "30p", "30m", "2h", "1d"
 *   - Đơn vị tiếng Việt: "30phút" / "2giờ" / "1ngày" (có dấu hoặc không)
 *   - Compound: "2h30p", "1d12h", "1ngày2giờ30phút"
 *   - Cho phép có khoảng trắng: "2h 30p", "30 phút"
 *
 * Trả `null` khi input rỗng, không parse được, hoặc tổng ≤ 0.
 */
export function parseDurationMinutes(input: string | null | undefined): number | null {
  if (!input) return null;

  const normalized = input
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/phút/g, "phut")
    .replace(/ngày/g, "ngay")
    .replace(/giờ/g, "gio");

  if (!normalized) return null;

  // Bare integer → phút
  if (/^\d+$/.test(normalized)) {
    const value = Number(normalized);
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  const tokenRe = /(\d+)(phut|ngay|gio|p|m|h|d)/g;
  let total = 0;
  let lastIndex = 0;

  for (const match of normalized.matchAll(tokenRe)) {
    if (match.index !== lastIndex) {
      return null;
    }
    lastIndex = (match.index ?? 0) + match[0].length;

    const value = Number(match[1]);
    if (!Number.isInteger(value) || value < 0) {
      return null;
    }

    const multiplier = unitToMinutes(match[2]);
    if (multiplier === null) return null;

    total += value * multiplier;
  }

  if (lastIndex !== normalized.length) {
    return null;
  }

  return total > 0 ? total : null;
}

function unitToMinutes(unit: string): number | null {
  switch (unit) {
    case "p":
    case "m":
    case "phut":
      return 1;
    case "h":
    case "gio":
      return 60;
    case "d":
    case "ngay":
      return 60 * 24;
    default:
      return null;
  }
}
