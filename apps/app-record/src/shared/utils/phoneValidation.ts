import { isValidNumber, parsePhoneNumber } from 'libphonenumber-js';
import { logger } from './logger';

const ENABLE_LOGGING = true;

/**
 * Normalize a phone number to E.164 format for consistent storage/comparison
 * This ensures that numbers like +61478778288 and +610478778288 are treated as the same
 */
export const normalizePhoneNumber = (phoneNumber: string): string => {
  try {
    logger.info(ENABLE_LOGGING, '📱 Phone Normalization - Input:', {
      rawPhone: phoneNumber,
      type: typeof phoneNumber,
      length: phoneNumber.length,
    });

    const parsed = parsePhoneNumber(phoneNumber);
    if (!parsed) {
      logger.warn(ENABLE_LOGGING, '📱 Phone Normalization - Parse Failed:', {
        rawPhone: phoneNumber,
        reason: 'parsePhoneNumber returned null',
      });
      return phoneNumber; // Return original if parsing fails
    }

    // Get the E.164 format which is the international standard
    const normalized = parsed.format('E.164');

    logger.info(ENABLE_LOGGING, '📱 Phone Normalization - Success:', {
      rawPhone: phoneNumber,
      normalizedPhone: normalized,
      country: parsed.country,
      nationalNumber: parsed.nationalNumber,
      internationalFormat: parsed.formatInternational(),
      nationalFormat: parsed.formatNational(),
    });

    return normalized;
  } catch (error) {
    logger.error(ENABLE_LOGGING, '📱 Phone Normalization - Error:', {
      rawPhone: phoneNumber,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return phoneNumber; // Return original if normalization fails
  }
};

/**
 * Validate if a phone number is valid
 */
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  try {
    const isValid = isValidNumber(phoneNumber);
    logger.info(ENABLE_LOGGING, '📱 Phone Validation:', {
      phone: phoneNumber,
      isValid,
    });
    return isValid;
  } catch (error) {
    logger.error(ENABLE_LOGGING, '📱 Phone Validation - Error:', {
      phone: phoneNumber,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
};

/**
 * Check if two phone numbers are equivalent (considering normalization)
 */
export const arePhoneNumbersEquivalent = (
  phone1: string,
  phone2: string
): boolean => {
  const normalized1 = normalizePhoneNumber(phone1);
  const normalized2 = normalizePhoneNumber(phone2);
  const areEquivalent = normalized1 === normalized2;

  logger.info(ENABLE_LOGGING, '📱 Phone Comparison:', {
    phone1,
    phone2,
    normalized1,
    normalized2,
    areEquivalent,
  });

  return areEquivalent;
};

/**
 * Get phone number in different formats for debugging
 */
export const getPhoneFormats = (phoneNumber: string) => {
  try {
    const parsed = parsePhoneNumber(phoneNumber);
    if (!parsed) {
      return {
        raw: phoneNumber,
        e164: phoneNumber,
        international: phoneNumber,
        national: phoneNumber,
        country: null,
        isValid: false,
      };
    }

    return {
      raw: phoneNumber,
      e164: parsed.format('E.164'),
      international: parsed.formatInternational(),
      national: parsed.formatNational(),
      country: parsed.country,
      isValid: true,
    };
  } catch (error) {
    return {
      raw: phoneNumber,
      e164: phoneNumber,
      international: phoneNumber,
      national: phoneNumber,
      country: null,
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
