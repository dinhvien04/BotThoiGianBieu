import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../../src/users/users.service';
import { User } from '../../src/users/entities/user.entity';
import { UserSettings } from '../../src/users/entities/user-settings.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: Repository<User>;
  let settingsRepository: Repository<UserSettings>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockSettingsRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(UserSettings),
          useValue: mockSettingsRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    settingsRepository = module.get<Repository<UserSettings>>(getRepositoryToken(UserSettings));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByUserId', () => {
    it('should find user by user_id', async () => {
      const mockUser: User = {
        user_id: '123',
        username: 'testuser',
        display_name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
      } as User;

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByUserId('123');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: '123' },
        relations: ['settings'],
      });
      expect(result).toBe(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.findByUserId('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('registerUser', () => {
    const input = {
      user_id: '123',
      username: 'testuser',
      display_name: 'Test User',
      default_channel_id: '456',
    };

    it('should create new user when not exists', async () => {
      const mockUser: User = {
        user_id: '123',
        username: 'testuser',
        display_name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
      } as User;

      const mockSettings: UserSettings = {
        user_id: '123',
        timezone: 'Asia/Ho_Chi_Minh',
        default_channel_id: '456',
        default_remind_minutes: 30,
        notify_via_dm: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as UserSettings;

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockSettingsRepository.findOne.mockResolvedValue(null);
      mockSettingsRepository.create.mockReturnValue(mockSettings);
      mockSettingsRepository.save.mockResolvedValue(mockSettings);

      const result = await service.registerUser(input);

      expect(result.user).toBe(mockUser);
      expect(result.settings).toBe(mockSettings);
      expect(result.isNew).toBe(true);

      expect(mockUserRepository.create).toHaveBeenCalledWith({
        user_id: '123',
        username: 'testuser',
        display_name: 'Test User',
      });

      expect(mockSettingsRepository.create).toHaveBeenCalledWith({
        user_id: '123',
        timezone: 'Asia/Ho_Chi_Minh',
        default_channel_id: '456',
        default_remind_minutes: 30,
        notify_via_dm: false,
      });
    });

    it('should return existing user when already registered', async () => {
      const mockUser: User = {
        user_id: '123',
        username: 'testuser',
        display_name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
        settings: {
          user_id: '123',
          timezone: 'Asia/Ho_Chi_Minh',
          default_channel_id: '456',
          default_remind_minutes: 30,
          notify_via_dm: false,
          created_at: new Date(),
          updated_at: new Date(),
        } as UserSettings,
      } as User;

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.registerUser(input);

      expect(result.user).toBe(mockUser);
      expect(result.settings).toBe(mockUser.settings);
      expect(result.isNew).toBe(false);

      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should create settings if user exists but settings missing', async () => {
      const mockUser: User = {
        user_id: '123',
        username: 'testuser',
        display_name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
      } as User;

      const mockSettings: UserSettings = {
        user_id: '123',
        timezone: 'Asia/Ho_Chi_Minh',
        default_channel_id: '456',
        default_remind_minutes: 30,
        notify_via_dm: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as UserSettings;

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockSettingsRepository.findOne.mockResolvedValue(null);
      mockSettingsRepository.create.mockReturnValue(mockSettings);
      mockSettingsRepository.save.mockResolvedValue(mockSettings);

      const result = await service.registerUser(input);

      expect(result.settings).toBe(mockSettings);
      expect(mockSettingsRepository.create).toHaveBeenCalled();
    });

    it('should handle null username and display_name', async () => {
      const inputWithNulls = {
        user_id: '123',
        username: null,
        display_name: null,
        default_channel_id: null,
      };

      const mockUser: User = {
        user_id: '123',
        username: null,
        display_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      } as User;

      const mockSettings: UserSettings = {
        user_id: '123',
        timezone: 'Asia/Ho_Chi_Minh',
        default_channel_id: null,
        default_remind_minutes: 30,
        notify_via_dm: false,
        created_at: new Date(),
        updated_at: new Date(),
      } as UserSettings;

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockSettingsRepository.findOne.mockResolvedValue(null);
      mockSettingsRepository.create.mockReturnValue(mockSettings);
      mockSettingsRepository.save.mockResolvedValue(mockSettings);

      const result = await service.registerUser(inputWithNulls);

      expect(result.user.username).toBeNull();
      expect(result.user.display_name).toBeNull();
      expect(result.settings.default_channel_id).toBeNull();
    });
  });
});
