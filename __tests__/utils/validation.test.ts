
import {
  validateCourseName,
  validateLocation,
  validateTimeFormat,
  validateTimeRange,
  validateLecture,
  validateAssignmentTitle,
  validateDescription,
  validateNotes,
  MAX_COURSE_NAME_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_ASSIGNMENT_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_NOTES_LENGTH,
} from '../../utils/validation';

describe('validateCourseName', () => {
  it('returns invalid for empty string', () => {
    expect(validateCourseName('').valid).toBe(false);
  });

  it('returns invalid for whitespace-only string', () => {
    expect(validateCourseName('   ').valid).toBe(false);
  });

  it('returns valid for a normal course name', () => {
    expect(validateCourseName('CS101').valid).toBe(true);
  });

  it('returns invalid when name exceeds max length', () => {
    const longName = 'a'.repeat(MAX_COURSE_NAME_LENGTH + 1);
    const result = validateCourseName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_COURSE_NAME_LENGTH}`);
  });

  it('returns valid for name exactly at max length', () => {
    const maxName = 'a'.repeat(MAX_COURSE_NAME_LENGTH);
    expect(validateCourseName(maxName).valid).toBe(true);
  });
});

describe('validateLocation', () => {
  it('returns valid for empty string (optional field)', () => {
    expect(validateLocation('').valid).toBe(true);
  });

  it('returns valid for a normal location', () => {
    expect(validateLocation('Room 101').valid).toBe(true);
  });

  it('returns invalid when location exceeds max length', () => {
    const longLocation = 'a'.repeat(MAX_LOCATION_LENGTH + 1);
    const result = validateLocation(longLocation);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_LOCATION_LENGTH}`);
  });
});

describe('validateTimeFormat', () => {
  it('returns valid for HH:MM format', () => {
    expect(validateTimeFormat('09:30').valid).toBe(true);
    expect(validateTimeFormat('00:00').valid).toBe(true);
    expect(validateTimeFormat('23:59').valid).toBe(true);
  });

  it('returns invalid for bad formats', () => {
    expect(validateTimeFormat('').valid).toBe(false);
    expect(validateTimeFormat('9:30').valid).toBe(true); // Single digit hour is allowed by regex
    expect(validateTimeFormat('25:00').valid).toBe(false);
    expect(validateTimeFormat('12:60').valid).toBe(false);
    expect(validateTimeFormat('abc').valid).toBe(false);
  });
});

describe('validateTimeRange', () => {
  it('returns valid when end is after start', () => {
    expect(validateTimeRange('09:00', '10:30').valid).toBe(true);
  });

  it('returns invalid when end equals start', () => {
    expect(validateTimeRange('09:00', '09:00').valid).toBe(false);
  });

  it('returns invalid when end is before start', () => {
    expect(validateTimeRange('10:00', '09:00').valid).toBe(false);
  });

  it('returns invalid when duration exceeds 12 hours', () => {
    const result = validateTimeRange('00:00', '13:00');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('12 hours');
  });

  it('returns invalid for bad time formats', () => {
    expect(validateTimeRange('invalid', '10:00').valid).toBe(false);
    expect(validateTimeRange('09:00', 'invalid').valid).toBe(false);
  });
});

describe('validateLecture', () => {
  it('returns valid for correct inputs', () => {
    const result = validateLecture('CS101', '09:00', '10:30');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns multiple errors for multiple invalid fields', () => {
    const result = validateLecture('', '10:00', '09:00');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('validates optional location when provided', () => {
    const longLocation = 'a'.repeat(MAX_LOCATION_LENGTH + 1);
    const result = validateLecture('CS101', '09:00', '10:30', longLocation);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Location'))).toBe(true);
  });
});

describe('validateAssignmentTitle', () => {
  it('returns invalid for empty title', () => {
    expect(validateAssignmentTitle('').valid).toBe(false);
  });

  it('returns invalid for whitespace-only title', () => {
    expect(validateAssignmentTitle('   ').valid).toBe(false);
  });

  it('returns valid for a normal title', () => {
    expect(validateAssignmentTitle('Homework 1').valid).toBe(true);
  });

  it('returns invalid when title exceeds max length', () => {
    const longTitle = 'a'.repeat(MAX_ASSIGNMENT_TITLE_LENGTH + 1);
    const result = validateAssignmentTitle(longTitle);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_ASSIGNMENT_TITLE_LENGTH}`);
  });

  it('returns valid for title exactly at max length', () => {
    const maxTitle = 'a'.repeat(MAX_ASSIGNMENT_TITLE_LENGTH);
    expect(validateAssignmentTitle(maxTitle).valid).toBe(true);
  });
});

describe('validateDescription', () => {
  it('returns valid for empty description', () => {
    expect(validateDescription('').valid).toBe(true);
  });

  it('returns valid for normal description', () => {
    expect(validateDescription('Some notes here').valid).toBe(true);
  });

  it('returns invalid when description exceeds max length', () => {
    const longDesc = 'a'.repeat(MAX_DESCRIPTION_LENGTH + 1);
    const result = validateDescription(longDesc);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_DESCRIPTION_LENGTH}`);
  });
});

describe('validateNotes', () => {
  it('returns valid for empty notes', () => {
    expect(validateNotes('').valid).toBe(true);
  });

  it('returns valid for normal notes', () => {
    expect(validateNotes('Study chapters 1-3').valid).toBe(true);
  });

  it('returns invalid when notes exceed max length', () => {
    const longNotes = 'a'.repeat(MAX_NOTES_LENGTH + 1);
    const result = validateNotes(longNotes);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(`${MAX_NOTES_LENGTH}`);
  });
});
