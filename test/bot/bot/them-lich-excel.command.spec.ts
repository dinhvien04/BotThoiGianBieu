import * as XLSX from 'xlsx';
import { ThemLichExcelCommand } from 'src/bot/commands/them-lich-excel.command';
import { DateParser } from 'src/shared/utils/date-parser';

type ParseWorkbookResult = {
  rows: Array<{
    title: string;
    startTime: Date;
    endTime: Date;
    priority: 'low' | 'normal' | 'high';
  }>;
  errors: Array<{
    rowNumber: number;
    message: string;
  }>;
};

describe('ThemLichExcelCommand', () => {
  let command: ThemLichExcelCommand;

  beforeEach(() => {
    command = new ThemLichExcelCommand(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      new DateParser(),
    );
  });

  it('should parse split date and time columns', () => {
    const result = parseWorkbook(command, [
      [
        'tieu_de',
        'loai',
        'ngay_bat_dau',
        'gio_bat_dau',
        'ngay_ket_thuc',
        'gio_ket_thuc',
      ],
      ['Split row', 'meeting', '01/05/2099', '09:00', '01/05/2099', '10:00'],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toBe('Split row');
    expect(result.rows[0].startTime).toEqual(new Date('2099-05-01T02:00:00.000Z'));
    expect(result.rows[0].endTime).toEqual(new Date('2099-05-01T03:00:00.000Z'));
  });

  it('should keep supporting legacy combined datetime columns', () => {
    const result = parseWorkbook(command, [
      ['tieu_de', 'loai', 'bat_dau', 'ket_thuc'],
      ['Legacy row', 'task', '01/05/2099 09:00', '01/05/2099 10:00'],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].title).toBe('Legacy row');
  });

  it('should default priority to normal when column missing', () => {
    const result = parseWorkbook(command, [
      ['tieu_de', 'loai', 'bat_dau', 'ket_thuc'],
      ['Default prio', 'task', '01/05/2099 09:00', '01/05/2099 10:00'],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows[0].priority).toBe('normal');
  });

  it('should parse priority column with VN values', () => {
    const result = parseWorkbook(command, [
      ['tieu_de', 'loai', 'uu_tien', 'bat_dau', 'ket_thuc'],
      ['High row', 'task', 'cao', '01/05/2099 09:00', '01/05/2099 10:00'],
      ['Low row', 'task', 'thap', '01/05/2099 11:00', '01/05/2099 12:00'],
    ]);

    expect(result.errors).toEqual([]);
    expect(result.rows.map((r) => r.priority)).toEqual(['high', 'low']);
  });

  it('should reject invalid priority value', () => {
    const result = parseWorkbook(command, [
      ['tieu_de', 'loai', 'uu_tien', 'bat_dau', 'ket_thuc'],
      ['Bad prio', 'task', 'sieu-cao', '01/05/2099 09:00', '01/05/2099 10:00'],
    ]);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      {
        rowNumber: 2,
        message: 'Ưu tiên không hợp lệ: sieu-cao.',
      },
    ]);
  });

  it('should report missing split datetime parts', () => {
    const result = parseWorkbook(command, [
      [
        'tieu_de',
        'loai',
        'ngay_bat_dau',
        'ngay_ket_thuc',
        'gio_ket_thuc',
      ],
      ['Missing time row', 'task', '01/05/2099', '01/05/2099', '10:00'],
    ]);

    expect(result.rows).toEqual([]);
    expect(result.errors).toEqual([
      {
        rowNumber: 2,
        message: 'Thiếu giờ bắt đầu.',
      },
    ]);
  });
});

function parseWorkbook(command: ThemLichExcelCommand, rows: unknown[][]): ParseWorkbookResult {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'lich');
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return (
    command as unknown as {
      parseWorkbook(buffer: Buffer, defaultRemindMinutes: number): ParseWorkbookResult;
    }
  ).parseWorkbook(buffer, 30);
}
