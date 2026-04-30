import { parseNaturalLanguage } from '../../src/shared/utils/nl-datetime-parser';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Build a UTC Date that represents the given VN local time. */
function vn(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - VN_OFFSET_MS);
}

describe('parseNaturalLanguage', () => {
  // Reference "now" = 2026-04-25 (thứ 7) 10:00 VN
  const NOW = vn(2026, 4, 25, 10, 0);

  describe('câu rỗng / không có giờ ngày', () => {
    it('trả về null start khi câu rỗng', () => {
      const r = parseNaturalLanguage('', NOW);
      expect(r.start).toBeNull();
      expect(r.title).toBe('');
    });

    it('trả về null start khi không có ngày/giờ', () => {
      const r = parseNaturalLanguage('chỉ là một câu vô nghĩa', NOW);
      expect(r.start).toBeNull();
      expect(r.title).toBe('chỉ là một câu vô nghĩa');
    });
  });

  describe('giờ', () => {
    it('parse "9h" → 09:00', () => {
      const r = parseNaturalLanguage('họp team 9h mai', NOW);
      expect(r.hadTime).toBe(true);
      expect(r.start).toEqual(vn(2026, 4, 26, 9, 0));
      expect(r.title).toBe('họp team');
    });

    it('parse "9h30" → 09:30', () => {
      const r = parseNaturalLanguage('chạy bộ 6h30 mai', NOW);
      expect(r.start).toEqual(vn(2026, 4, 26, 6, 30));
    });

    it('parse "9:30"', () => {
      const r = parseNaturalLanguage('họp 9:30 mai', NOW);
      expect(r.start).toEqual(vn(2026, 4, 26, 9, 30));
    });

    it('parse "21h" giữ nguyên 24h', () => {
      const r = parseNaturalLanguage('xem phim 21h mai', NOW);
      expect(r.start).toEqual(vn(2026, 4, 26, 21, 0));
    });

    it('giờ + sáng → giữ nguyên buổi sáng', () => {
      const r = parseNaturalLanguage('cafe 9h sáng mai', NOW);
      expect(r.start).toEqual(vn(2026, 4, 26, 9, 0));
    });

    it('giờ + tối → +12h', () => {
      const r = parseNaturalLanguage('xem phim 9h tối mai', NOW);
      expect(r.start).toEqual(vn(2026, 4, 26, 21, 0));
    });

    it('giờ + chiều → +12h', () => {
      const r = parseNaturalLanguage('họp 3h chiều mai', NOW);
      expect(r.start).toEqual(vn(2026, 4, 26, 15, 0));
    });

    it('"12h trưa" → 12:00 (không +12)', () => {
      const r = parseNaturalLanguage('ăn trưa 12h trưa hôm nay', NOW);
      expect(r.start).toEqual(vn(2026, 4, 25, 12, 0));
    });
  });

  describe('ngày tương đối', () => {
    it('hôm nay', () => {
      const r = parseNaturalLanguage('họp 14h hôm nay', NOW);
      expect(r.start).toEqual(vn(2026, 4, 25, 14, 0));
    });

    it('mai → +1 ngày', () => {
      const r = parseNaturalLanguage('họp 14h mai', NOW);
      expect(r.start).toEqual(vn(2026, 4, 26, 14, 0));
    });

    it('ngày mai → +1 ngày', () => {
      const r = parseNaturalLanguage('họp 14h ngày mai', NOW);
      expect(r.start).toEqual(vn(2026, 4, 26, 14, 0));
    });

    it('ngày kia → +2 ngày', () => {
      const r = parseNaturalLanguage('họp 14h ngày kia', NOW);
      expect(r.start).toEqual(vn(2026, 4, 27, 14, 0));
    });
  });

  describe('thứ trong tuần', () => {
    it('thứ 2 (NOW = thứ 7) → next Monday', () => {
      const r = parseNaturalLanguage('họp 9h thứ 2', NOW);
      expect(r.start).toEqual(vn(2026, 4, 27, 9, 0));
    });

    it('thứ hai chữ', () => {
      const r = parseNaturalLanguage('họp 9h thứ hai', NOW);
      expect(r.start).toEqual(vn(2026, 4, 27, 9, 0));
    });

    it('t2 viết tắt', () => {
      const r = parseNaturalLanguage('họp 9h t2', NOW);
      expect(r.start).toEqual(vn(2026, 4, 27, 9, 0));
    });

    it('chủ nhật → next Sunday', () => {
      const r = parseNaturalLanguage('nghỉ 8h chủ nhật', NOW);
      expect(r.start).toEqual(vn(2026, 4, 26, 8, 0));
    });

    it('thứ 2 tuần sau → +7 ngày so với next Monday', () => {
      const r = parseNaturalLanguage('họp 9h thứ 2 tuần sau', NOW);
      expect(r.start).toEqual(vn(2026, 5, 4, 9, 0));
    });
  });

  describe('ngày literal', () => {
    it('30/4 trong tương lai năm hiện tại', () => {
      const r = parseNaturalLanguage('lễ 30/4 sáng', NOW);
      expect(r.start).toEqual(vn(2026, 4, 30, 9, 0));
      expect(r.notes.some((n) => n.includes('mặc định'))).toBe(true);
    });

    it('1/1 đã qua → assume năm sau', () => {
      const r = parseNaturalLanguage('chúc mừng 1/1 9h', NOW);
      expect(r.start).toEqual(vn(2027, 1, 1, 9, 0));
    });

    it('30-4-2027 đầy đủ năm', () => {
      const r = parseNaturalLanguage('lễ 30-4-2027 9h', NOW);
      expect(r.start).toEqual(vn(2027, 4, 30, 9, 0));
    });
  });

  describe('không có ngày, có giờ', () => {
    it('giờ tương lai hôm nay → giữ hôm nay', () => {
      const r = parseNaturalLanguage('họp 14h', NOW);
      expect(r.start).toEqual(vn(2026, 4, 25, 14, 0));
    });

    it('giờ đã qua hôm nay → chuyển sang ngày mai', () => {
      const r = parseNaturalLanguage('họp 8h', NOW);
      expect(r.start).toEqual(vn(2026, 4, 26, 8, 0));
      expect(r.notes.some((n) => n.includes('ngày mai'))).toBe(true);
    });
  });

  describe('extract title', () => {
    it('strip filler words', () => {
      const r = parseNaturalLanguage('họp team vào 9h sáng mai nhé', NOW);
      expect(r.title).toBe('họp team');
    });

    it('giữ tên + chi tiết', () => {
      const r = parseNaturalLanguage('deadline báo cáo Q2 17h thứ 6', NOW);
      expect(r.title).toBe('deadline báo cáo Q2');
      expect(r.start).toEqual(vn(2026, 5, 1, 17, 0));
    });
  });
});
