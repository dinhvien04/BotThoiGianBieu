import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Import exported objects from migrate.cjs
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { LEGACY_CHECKSUM_TRANSITIONS, MIGRATIONS_TABLE } = require(
  path.resolve(__dirname, '../../../app/bot/scripts/migrate.cjs'),
);

describe('Database Migration Runner Logic', () => {
  const migrationsDir = path.resolve(__dirname, '../../../app/bot/migrations');

  it('should have exact checksum transitions mapped to actual current migration file checksums', () => {
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
      }
    }
  });

  describe('checksum verification and transaction behavior simulation', () => {
    function simulateMigrationCheck(params: {
      file: string;
      fileChecksum: string;
      recordedChecksum: string | null;
      transitionMap: Record<string, Record<string, string>>;
    }) {
      const { file, fileChecksum, recordedChecksum, transitionMap } = params;

      if (recordedChecksum === null) {
        return { action: 'apply', updateRecord: false };
      }

      const allowedCurrentChecksum = transitionMap[file]?.[recordedChecksum];

      if (recordedChecksum !== fileChecksum && allowedCurrentChecksum !== fileChecksum) {
        throw new Error(`Migration ${file} was already applied with a different checksum`);
      }

      if (allowedCurrentChecksum === fileChecksum && recordedChecksum !== fileChecksum) {
        return { action: 'normalize', updateRecord: true };
      }

      return { action: 'skip', updateRecord: false };
    }

    const testFile = '001-init-base-schema.sql';
    const currentHash = '9f266a18d85bfff2aea80d960d598f4bd3919f3a27641525dbe63ce85b49b08b';
    const approvedOldHash = '0e91da5a1b32d2077e68bc92d0ff1dbfc03d1ee31f137ebce1f422e1caecae54';
    const unknownHash = '1111111111111111111111111111111111111111111111111111111111111111';

    it('1. exact checksum -> pass (skip)', () => {
      const result = simulateMigrationCheck({
        file: testFile,
        fileChecksum: currentHash,
        recordedChecksum: currentHash,
        transitionMap: LEGACY_CHECKSUM_TRANSITIONS,
      });
      expect(result.action).toBe('skip');
      expect(result.updateRecord).toBe(false);
    });

    it('2. approved OLD -> CURRENT transition -> pass (normalize checksum in DB)', () => {
      const result = simulateMigrationCheck({
        file: testFile,
        fileChecksum: currentHash,
        recordedChecksum: approvedOldHash,
        transitionMap: LEGACY_CHECKSUM_TRANSITIONS,
      });
      expect(result.action).toBe('normalize');
      expect(result.updateRecord).toBe(true);
    });

    it('3. OLD checksum + unexpected future modified file -> FAIL', () => {
      const modifiedFutureHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
      expect(() => {
        simulateMigrationCheck({
          file: testFile,
          fileChecksum: modifiedFutureHash,
          recordedChecksum: approvedOldHash,
          transitionMap: LEGACY_CHECKSUM_TRANSITIONS,
        });
      }).toThrow(`Migration ${testFile} was already applied with a different checksum`);
    });

    it('4. unknown legacy checksum -> FAIL', () => {
      expect(() => {
        simulateMigrationCheck({
          file: testFile,
          fileChecksum: currentHash,
          recordedChecksum: unknownHash,
          transitionMap: LEGACY_CHECKSUM_TRANSITIONS,
        });
      }).toThrow(`Migration ${testFile} was already applied with a different checksum`);
    });

    it('5. migration SQL failure -> transaction rollback', async () => {
      const mockClient = {
        query: jest.fn(),
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('syntax error in migration SQL')) // migration SQL fails
        .mockResolvedValueOnce({}); // ROLLBACK

      const executeMigration = async () => {
        await mockClient.query('BEGIN');
        try {
          await mockClient.query('INVALID SQL STATEMENT');
          await mockClient.query(`INSERT INTO ${MIGRATIONS_TABLE} (id, checksum) VALUES ($1, $2)`, [
            testFile,
            currentHash,
          ]);
          await mockClient.query('COMMIT');
        } catch (error) {
          await mockClient.query('ROLLBACK');
          throw error;
        }
      };

      await expect(executeMigration()).rejects.toThrow('syntax error in migration SQL');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.query).not.toHaveBeenCalledWith('COMMIT');
    });

    it('6. migration record is not written after failed SQL', async () => {
      const mockClient = {
        query: jest.fn(),
      };

      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('table already exists')) // migration SQL fails
        .mockResolvedValueOnce({}); // ROLLBACK

      const executeMigration = async () => {
        await mockClient.query('BEGIN');
        try {
          await mockClient.query('CREATE TABLE fail_table()');
          await mockClient.query(`INSERT INTO ${MIGRATIONS_TABLE} (id, checksum) VALUES ($1, $2)`, [
            testFile,
            currentHash,
          ]);
          await mockClient.query('COMMIT');
        } catch (error) {
          await mockClient.query('ROLLBACK');
          throw error;
        }
      };

      await expect(executeMigration()).rejects.toThrow('table already exists');

      // Verify INSERT INTO migrations table was never called
      const insertCalls = mockClient.query.mock.calls.filter((call) =>
        typeof call[0] === 'string' && call[0].includes(`INSERT INTO ${MIGRATIONS_TABLE}`),
      );
      expect(insertCalls).toHaveLength(0);
    });
  });
});
