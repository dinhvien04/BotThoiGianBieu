# Test Report - 2026-05-15

## Scope

Chi them va sua test trong thu muc `test/`.

Khong sua source trong `app/` trong pham vi cong viec viet testcase nay.

## Test files changed

- Added `test/bot/bot/admin-stats.command.spec.ts`
  - 9 testcase moi cho `AdminStatsCommand`.
  - Cover metadata, registry, auth guard flow, plain text KPI output, zero stats, va viec tranh markdown/emoji co the lam Mezon render thanh poll.
- Added `test/bot/bot/backup.command.extra.spec.ts`
  - 10 testcase moi cho `BackupCommand`.
  - Cover aliases, registry, sender lookup, canonical user id, not-initialized flow, inline JSON, large backup warning, va custom prefix hint.
- Added `test/bot/schedules/backup.service.edge.spec.ts`
  - 12 testcase moi cho `BackupService`.
  - Cover repository query shape, deterministic export time, nullable fields, optional dates, tags/shared users, missing relations, template/settings serialization, va `summarizeBackup`.
- Updated `test/bot/admin/admin-commands.spec.ts`
  - Cap nhat expectation cua `admin-stats` tu markdown/Vietnamese output sang plain text `Tong user`.

Tong testcase moi: 31.

## Commands run

### Focused bot tests

```bash
npx jest --config app/bot/jest.config.js --runInBand --verbose test/bot/bot/admin-stats.command.spec.ts test/bot/bot/backup.command.extra.spec.ts test/bot/schedules/backup.service.edge.spec.ts test/bot/admin/admin-commands.spec.ts
```

Result:

- Test Suites: 4 passed, 4 total
- Tests: 47 passed, 47 total
- Snapshots: 0 total
- Time: 12.778 s

### Full bot test suite

```bash
npx jest --config app/bot/jest.config.js --runInBand
```

Result:

- Test Suites: 76 passed, 76 total
- Tests: 1118 passed, 1118 total
- Snapshots: 0 total
- Time: 134.58 s

Notes:

- Suite co log/error gia lap tu cac test hien co cua `ReminderService`, `InteractionRouter`, `BotGateway`.
- Cac log nay la expected path trong test loi/retry, khong lam fail suite.

### Web test suite

```bash
npm run web:test
```

Result:

- Test Suites: 5 passed, 5 total
- Tests: 103 passed, 103 total
- Snapshots: 0 total
- Time: 74.954 s

Coverage:

- Statements: 97.29%
- Branches: 88.46%
- Functions: 92.59%
- Lines: 98.27%

Notes:

- Web tests co warning hien co ve React update khong boc trong `act(...)` tai `Sidebar.tsx`.
- Web tests co warning jsdom `Not implemented: navigation`.
- Cac warning nay khong lam fail suite.

## Summary

Tat ca test da chay deu pass.

Pham vi moi tap trung vao:

- Dam bao `admin-stats` tra text thuong, tranh Mezon render thanh UI binh chon.
- Tang coverage cho backup command o cac flow user, JSON nho, JSON lon, prefix.
- Tang coverage cho serialization backup service voi edge cases null/missing relation/settings/template.
