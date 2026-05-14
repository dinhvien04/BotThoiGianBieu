import {
  mockSchedules,
  mockTags,
  mockTemplates,
  typeLabels,
  typeColors,
  priorityLabels,
  priorityColors,
  statusLabels,
  statusColors,
  Schedule,
  Tag,
  Template,
} from '../../../app/web/src/lib/mock-data';

describe('Mock Data', () => {
  describe('mockSchedules', () => {
    it('should be an array of schedules', () => {
      expect(Array.isArray(mockSchedules)).toBe(true);
      expect(mockSchedules.length).toBeGreaterThan(0);
    });

    it('should have valid schedule structure', () => {
      mockSchedules.forEach((schedule: Schedule) => {
        expect(schedule).toHaveProperty('id');
        expect(schedule).toHaveProperty('title');
        expect(schedule).toHaveProperty('description');
        expect(schedule).toHaveProperty('type');
        expect(schedule).toHaveProperty('start');
        expect(schedule).toHaveProperty('end');
        expect(schedule).toHaveProperty('priority');
        expect(schedule).toHaveProperty('status');
        expect(schedule).toHaveProperty('tags');

        // Validate types
        expect(typeof schedule.id).toBe('number');
        expect(typeof schedule.title).toBe('string');
        expect(typeof schedule.description).toBe('string');
        expect(typeof schedule.start).toBe('string');
        expect(typeof schedule.end).toBe('string');
        expect(Array.isArray(schedule.tags)).toBe(true);
      });
    });

    it('should have valid schedule types', () => {
      const validTypes = ['cong-viec', 'ca-nhan', 'hop-hanh', 'hoc-tap', 'nghien-cuu', 'tai-chinh', 'marketing'];
      
      mockSchedules.forEach((schedule: Schedule) => {
        expect(validTypes).toContain(schedule.type);
      });
    });

    it('should have valid priority values', () => {
      const validPriorities = ['cao', 'trung-binh', 'thap'];
      
      mockSchedules.forEach((schedule: Schedule) => {
        expect(validPriorities).toContain(schedule.priority);
      });
    });

    it('should have valid status values', () => {
      const validStatuses = ['dang-cho', 'dang-thuc-hien', 'hoan-thanh', 'qua-han'];
      
      mockSchedules.forEach((schedule: Schedule) => {
        expect(validStatuses).toContain(schedule.status);
      });
    });

    it('should have valid local date formats', () => {
      mockSchedules.forEach((schedule: Schedule) => {
        expect(Number.isNaN(Date.parse(schedule.start))).toBe(false);
        expect(Number.isNaN(Date.parse(schedule.end))).toBe(false);
        
        expect(new Date(schedule.start).getTime()).toBeLessThan(new Date(schedule.end).getTime());
      });
    });

    it('should have valid recurrence values when present', () => {
      const validRecurrences = ['daily', 'weekly', 'monthly', null];
      
      mockSchedules.forEach((schedule: Schedule) => {
        if (schedule.recurrence !== undefined) {
          expect(validRecurrences).toContain(schedule.recurrence);
        }
      });
    });

    it('should have unique IDs', () => {
      const ids = mockSchedules.map(schedule => schedule.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have non-empty titles and descriptions', () => {
      mockSchedules.forEach((schedule: Schedule) => {
        expect(schedule.title.trim()).not.toBe('');
        expect(schedule.description.trim()).not.toBe('');
      });
    });
  });

  describe('mockTags', () => {
    it('should be an array of tags', () => {
      expect(Array.isArray(mockTags)).toBe(true);
      expect(mockTags.length).toBeGreaterThan(0);
    });

    it('should have valid tag structure', () => {
      mockTags.forEach((tag: Tag) => {
        expect(tag).toHaveProperty('id');
        expect(tag).toHaveProperty('name');
        expect(tag).toHaveProperty('color');
        expect(tag).toHaveProperty('count');

        expect(typeof tag.id).toBe('number');
        expect(typeof tag.name).toBe('string');
        expect(typeof tag.color).toBe('string');
        expect(typeof tag.count).toBe('number');
      });
    });

    it('should have valid color formats', () => {
      const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
      
      mockTags.forEach((tag: Tag) => {
        expect(tag.color).toMatch(hexColorRegex);
      });
    });

    it('should have positive counts', () => {
      mockTags.forEach((tag: Tag) => {
        expect(tag.count).toBeGreaterThan(0);
      });
    });

    it('should have unique IDs and names', () => {
      const ids = mockTags.map(tag => tag.id);
      const names = mockTags.map(tag => tag.name);
      
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(names).size).toBe(names.length);
    });
  });

  describe('mockTemplates', () => {
    it('should be an array of templates', () => {
      expect(Array.isArray(mockTemplates)).toBe(true);
      expect(mockTemplates.length).toBeGreaterThan(0);
    });

    it('should have valid template structure', () => {
      mockTemplates.forEach((template: Template) => {
        expect(template).toHaveProperty('id');
        expect(template).toHaveProperty('title');
        expect(template).toHaveProperty('description');
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('priority');
        expect(template).toHaveProperty('duration');
        expect(template).toHaveProperty('tags');

        expect(typeof template.id).toBe('number');
        expect(typeof template.title).toBe('string');
        expect(typeof template.description).toBe('string');
        expect(typeof template.type).toBe('string');
        expect(typeof template.duration).toBe('number');
        expect(Array.isArray(template.tags)).toBe(true);
      });
    });

    it('should have positive durations', () => {
      mockTemplates.forEach((template: Template) => {
        expect(template.duration).toBeGreaterThan(0);
      });
    });

    it('should have valid priority values', () => {
      const validPriorities = ['cao', 'trung-binh', 'thap'];
      
      mockTemplates.forEach((template: Template) => {
        expect(validPriorities).toContain(template.priority);
      });
    });

    it('should have unique IDs', () => {
      const ids = mockTemplates.map(template => template.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Label and Color Mappings', () => {
    describe('typeLabels', () => {
      it('should have Vietnamese labels for all types', () => {
        const expectedTypes = ['cong-viec', 'ca-nhan', 'hop-hanh', 'hoc-tap', 'nghien-cuu', 'tai-chinh', 'marketing'];
        
        expectedTypes.forEach(type => {
          expect(typeLabels).toHaveProperty(type);
          expect(typeof typeLabels[type]).toBe('string');
          expect(typeLabels[type].trim()).not.toBe('');
        });
      });

      it('should cover all types used in mockSchedules', () => {
        const usedTypes = new Set(mockSchedules.map(schedule => schedule.type));
        
        usedTypes.forEach(type => {
          expect(typeLabels).toHaveProperty(type);
        });
      });
    });

    describe('typeColors', () => {
      it('should have valid hex colors for all types', () => {
        const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
        
        Object.values(typeColors).forEach(color => {
          expect(color).toMatch(hexColorRegex);
        });
      });

      it('should have colors for all type labels', () => {
        Object.keys(typeLabels).forEach(type => {
          expect(typeColors).toHaveProperty(type);
        });
      });
    });

    describe('priorityLabels', () => {
      it('should have Vietnamese labels for all priorities', () => {
        const expectedPriorities = ['cao', 'trung-binh', 'thap'];
        
        expectedPriorities.forEach(priority => {
          expect(priorityLabels).toHaveProperty(priority);
          expect(typeof priorityLabels[priority]).toBe('string');
          expect(priorityLabels[priority].trim()).not.toBe('');
        });
      });

      it('should cover all priorities used in mockSchedules', () => {
        const usedPriorities = new Set(mockSchedules.map(schedule => schedule.priority));
        
        usedPriorities.forEach(priority => {
          expect(priorityLabels).toHaveProperty(priority);
        });
      });
    });

    describe('priorityColors', () => {
      it('should have valid hex colors for all priorities', () => {
        const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
        
        Object.values(priorityColors).forEach(color => {
          expect(color).toMatch(hexColorRegex);
        });
      });

      it('should have colors for all priority labels', () => {
        Object.keys(priorityLabels).forEach(priority => {
          expect(priorityColors).toHaveProperty(priority);
        });
      });
    });

    describe('statusLabels', () => {
      it('should have Vietnamese labels for all statuses', () => {
        const expectedStatuses = ['dang-cho', 'dang-thuc-hien', 'hoan-thanh', 'qua-han'];
        
        expectedStatuses.forEach(status => {
          expect(statusLabels).toHaveProperty(status);
          expect(typeof statusLabels[status]).toBe('string');
          expect(statusLabels[status].trim()).not.toBe('');
        });
      });

      it('should cover all statuses used in mockSchedules', () => {
        const usedStatuses = new Set(mockSchedules.map(schedule => schedule.status));
        
        usedStatuses.forEach(status => {
          expect(statusLabels).toHaveProperty(status);
        });
      });
    });

    describe('statusColors', () => {
      it('should have valid hex colors for all statuses', () => {
        const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
        
        Object.values(statusColors).forEach(color => {
          expect(color).toMatch(hexColorRegex);
        });
      });

      it('should have colors for all status labels', () => {
        Object.keys(statusLabels).forEach(status => {
          expect(statusColors).toHaveProperty(status);
        });
      });
    });
  });

  describe('Data Consistency', () => {
    it('should have consistent tag usage between schedules and tags', () => {
      const scheduleTagNames = new Set();
      mockSchedules.forEach(schedule => {
        schedule.tags.forEach(tag => scheduleTagNames.add(tag));
      });

      const mockTagNames = new Set(mockTags.map(tag => tag.name));
      
      // Check if most schedule tags exist in mockTags (allowing for some flexibility)
      const intersection = new Set([...scheduleTagNames].filter(x => mockTagNames.has(x)));
      expect(intersection.size).toBeGreaterThan(0);
    });

    it('should have reasonable tag counts', () => {
      mockTags.forEach(tag => {
        expect(tag.count).toBeGreaterThanOrEqual(0);
        expect(tag.count).toBeLessThanOrEqual(mockSchedules.length);
      });
    });

    it('should have templates with valid types', () => {
      mockTemplates.forEach(template => {
        expect(typeLabels).toHaveProperty(template.type);
      });
    });
  });
});
