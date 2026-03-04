/**
 * Validation utilities for forms
 */

export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const validateName = (name) => {
  return name.trim().length >= 2;
};

export const validateCompanyName = (name) => {
  return name.trim().length >= 2 && name.trim().length <= 100;
};

export const validateInviteCode = (code) => {
  return code.length === 6 && /^[A-Z0-9]+$/.test(code);
};

export const validateRequired = (value) => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

/**
 * Form validation helper
 */
export const createValidator = (rules) => {
  return (formData) => {
    const errors = {};

    Object.keys(rules).forEach((field) => {
      const value = formData[field];
      const fieldRules = rules[field];

      for (const rule of fieldRules) {
        const error = rule(value, formData);
        if (error) {
          errors[field] = error;
          break; // Stop at first error for this field
        }
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };
};

/**
 * Common validation rules
 */
export const rules = {
  required:
    (message = "This field is required") =>
    (value) => {
      if (!validateRequired(value)) {
        return message;
      }
    },

  email:
    (message = "Please enter a valid email address") =>
    (value) => {
      if (value && !validateEmail(value)) {
        return message;
      }
    },

  minLength: (min, message) => (value) => {
    if (value && value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
  },

  maxLength: (max, message) => (value) => {
    if (value && value.length > max) {
      return message || `Must be less than ${max} characters`;
    }
  },

  match:
    (otherField, message = "Fields do not match") =>
    (value, formData) => {
      if (value !== formData[otherField]) {
        return message;
      }
    },

  pattern:
    (regex, message = "Invalid format") =>
    (value) => {
      if (value && !regex.test(value)) {
        return message;
      }
    },
};

/**
 * Example usage:
 *
 * const validator = createValidator({
 *   email: [rules.required(), rules.email()],
 *   password: [rules.required(), rules.minLength(6, 'Password must be at least 6 characters')],
 *   confirmPassword: [rules.required(), rules.match('password', 'Passwords do not match')]
 * });
 *
 * const { isValid, errors } = validator(formData);
 */





