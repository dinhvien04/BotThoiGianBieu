import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Import actual production exported objects and functions from migrate.cjs
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  LEGACY_CHECKSUM_TRANSITIONS,
  MIGRATIONS_TABLE,
  resolveMigrationChecksumAction,
  normalizeMigrationChecksum,
  applyMigration,
} = require(path.resolve(__dirname, '../../../app/bot/scripts/migrate.cjs'));

describe('Database Migration Runner Production Logic', () => {
  const migrationsDir = path.resolve(__dirname, '../../../app/bot/migrations');

  it('should map every legacy checksum entry to the actual current migration file SHA-256', () => {
    for (const [file, transitionMap] of Object.entries(
      LEGACY_CHECKSUM_TRANSITIONS as Record<string, Record<string, string>>,
    )) {
      const filePath = path.join(migrationsDir, file);
      expect(fs.existsSync(filePath)).toBe(true);

      const currentContent = fs.readFileSync(filePath, 'utf8');
      const expectedChecksum = crypto.createHash('sha256').update(currentContent).digest('hex');

      for (const [legacyHash, approvedTargetHash] of Object.entries(transitionMap)) {
        expect(legacyHash).toHaveLength(64);
        expect(approvedTargetHash).toBe(expectedChecksum);
        // Ensure the legacy hash is not identical to current hash (prevent redundant transitions)
        expect(legacyHash).not.toBe(expectedChecksum);
      }
    }
  });

  describe('resolveMigrationChecksumAction (production function)', () => {
    const testFile = '001-init-base-schema.sql';
    const currentHash = '9f266a18d85bfff2aea80d960d598f4bd3919f3a27641525dbe63ce85b49b08b';
    const approvedOldHash = '0e91da5a1b32d2077e68bc92d0ff1dbfc03d1ee31f137ebce1f422e1caecae54';
    const unknownHash = '1111111111111111111111111111111111111111111111111111111111111111';

    it('1. current exact checksum -> skip', () => {
      const result = resolveMigrationChecksumAction(testFile, currentHash, currentHash);
      expect(result).toEqual({ action: 'skip' });
    });

    it('2. approved legacy -> actual current checksum -> normalize', () => {
      const result = resolveMigrationChecksumAction(testFile, currentHash, approvedOldHash);
      expect(result).toEqual({ action: 'normalize' });
    });

    it('3. legacy checksum + unexpectedly modified current migration -> reject (throw)', () => {
      const modifiedCurrentHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      expect(() => {
        resolveMigrationChecksumAction(testFile, modifiedCurrentHash, approvedOldHash);
      }).toThrow(`Migration ${testFile} was already applied with a different checksum`);
    });

    it('4. unknown legacy checksum -> reject (throw)', () => {
      expect(() => {
        resolveMigrationChecksumAction(testFile, currentHash, unknownHash);
      }).toThrow(`Migration ${testFile} was already applied with a different checksum`);
    });

    it('5. new migration -> apply', () => {
      const result = resolveMigrationChecksumAction(testFile, currentHash, null);
      expect(result).toEqual({ action: 'apply' });
    });
  });

  describe('transaction execution helpers (production functions)', () => {
    const testFile = '001-init-base-schema.sql';
    const currentHash = '9f266a18d85bfff2aea80d960d598f4bd3919f3a27641525dbe63ce85b49b08b';

    it('normalizeMigrationChecksum executes UPDATE in transaction and commits', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({}) };

      await normalizeMigrationChecksum(mockClient, testFile, currentHash);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(
        `UPDATE ${MIGRATIONS_TABLE} SET checksum = $1 WHERE id = $2`,
        [currentHash, testFile],
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('normalizeMigrationChecksum rolls back on DB error', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(new Error('DB connection reset')) // UPDATE fails
          .mockResolvedValueOnce({}), // ROLLBACK
      };

      await expect(normalizeMigrationChecksum(mockClient, testFile, currentHash)).rejects.toThrow(
        'DB connection reset',
      );
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
    });

    it('applyMigration executes SQL, records in migrations table, and commits', async () => {
      const mockClient = { query: jest.fn().mockResolvedValue({}) };
      const sql = 'CREATE TABLE test_table (id INT);';

      await applyMigration(mockClient, testFile, sql, currentHash);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith(sql);
      expect(mockClient.query).toHaveBeenCalledWith(
        `INSERT INTO ${MIGRATIONS_TABLE} (id, checksum) VALUES ($1, $2)`,
        [testFile, currentHash],
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('applyMigration rolls back and does not insert record if SQL execution fails', async () => {
      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({}) // BEGIN
          .mockRejectedValueOnce(new Error('syntax error in migration SQL')) // SQL fails
          .mockResolvedValueOnce({}), // ROLLBACK
      };

      await expect(
        applyMigration(mockClient, testFile, 'INVALID SQL', currentHash),
      ).rejects.toThrow('syntax error in migration SQL');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');

      const insertCalls = mockClient.query.mock.calls.filter((call) =>
        typeof call[0] === 'string' && call[0].includes(`INSERT INTO ${MIGRATIONS_TABLE}`),
      );
      expect(insertCalls).toHaveLength(0);
    });
  });
});
