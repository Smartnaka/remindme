/**
 * Input validation utilities for the app
 */

// Constants for input limits
export const MAX_COURSE_NAME_LENGTH = 100;
export const MAX_LOCATION_LENGTH = 200;
export const MIN_COURSE_NAME_LENGTH = 1;

/**
 * Validates course name input
 */
export const validateCourseName = (courseName: string): { valid: boolean; error?: string } => {
  const trimmed = courseName.trim();

  if (!trimmed) {
    return { valid: false, error: 'Course name is required' };
  }

  if (trimmed.length < MIN_COURSE_NAME_LENGTH) {
    return { valid: false, error: `Course name must be at least ${MIN_COURSE_NAME_LENGTH} character` };
  }

  if (trimmed.length > MAX_COURSE_NAME_LENGTH) {
    return { valid: false, error: `Course name must be less than ${MAX_COURSE_NAME_LENGTH} characters` };
  }

  // Check for potentially harmful characters (basic sanitization)
  const harmfulPattern = /[<>{}[\]\\]/;
  if (harmfulPattern.test(trimmed)) {
    return { valid: false, error: 'Course name contains invalid characters' };
  }

  return { valid: true };
};

/**
 * Validates location input (optional field)
 */
export const validateLocation = (location: string): { valid: boolean; error?: string } => {
  const trimmed = location.trim();

  if (trimmed.length > MAX_LOCATION_LENGTH) {
    return { valid: false, error: `Location must be less than ${MAX_LOCATION_LENGTH} characters` };
  }

  // Basic sanitization for location
  const harmfulPattern = /[<>{}[\]\\]/;
  if (harmfulPattern.test(trimmed)) {
    return { valid: false, error: 'Location contains invalid characters' };
  }

  return { valid: true };
};

/**
 * Validates time format (HH:MM)
 */
export const validateTimeFormat = (time: string): { valid: boolean; error?: string } => {
  const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  
  if (!timePattern.test(time)) {
    return { valid: false, error: 'Invalid time format. Use HH:MM format (e.g., 09:30)' };
  }

  return { valid: true };
};

/**
 * Validates that end time is after start time
 */
export const validateTimeRange = (startTime: string, endTime: string): { valid: boolean; error?: string } => {
  const startValidation = validateTimeFormat(startTime);
  if (!startValidation.valid) {
    return startValidation;
  }

  const endValidation = validateTimeFormat(endTime);
  if (!endValidation.valid) {
    return endValidation;
  }

  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const [endHours, endMinutes] = endTime.split(':').map(Number);

  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;

  if (endTotal <= startTotal) {
    return { valid: false, error: 'End time must be after start time' };
  }

  // Check for reasonable duration (not more than 12 hours)
  const duration = endTotal - startTotal;
  if (duration > 12 * 60) {
    return { valid: false, error: 'Class duration cannot exceed 12 hours' };
  }

  return { valid: true };
};

/**
 * Comprehensive validation for lecture data
 */
export interface LectureValidationResult {
  valid: boolean;
  errors: string[];
}

export const validateLecture = (
  courseName: string,
  startTime: string,
  endTime: string,
  location?: string
): LectureValidationResult => {
  const errors: string[] = [];

  const courseNameValidation = validateCourseName(courseName);
  if (!courseNameValidation.valid) {
    errors.push(courseNameValidation.error!);
  }

  const timeRangeValidation = validateTimeRange(startTime, endTime);
  if (!timeRangeValidation.valid) {
    errors.push(timeRangeValidation.error!);
  }

  if (location) {
    const locationValidation = validateLocation(location);
    if (!locationValidation.valid) {
      errors.push(locationValidation.error!);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
