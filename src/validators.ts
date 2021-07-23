import { concatAll, from, scheduled } from 'rxjs';
import { AbstractControl } from "./AbstractControl";
import { ValidationErrors, ValidatorFn } from "./types";

function isEmptyInputValue(value: any): boolean {
  return value == null || value.length === 0
}
function isPresent(o: ValidatorFn | null | undefined): boolean {
  return o != null && o !== undefined
}
function _mergeErrors(arrayOfErrors: ValidationErrors[])
: ValidationErrors | null {
  const res = arrayOfErrors.reduce((res, errors) => {
    return errors != null ? Object.assign({}, res, errors) : res
  }, {})
  return Object.keys(res).length === 0 ? null : res
}
function _executeValidators(
  control: AbstractControl, validators: ValidatorFn[]
) {
  return validators.map(v => v(control))
}
function _executeAsyncValidators(
  control: AbstractControl, validators: ValidatorFn[]
) {
  return validators.map(v => v(control))
}

const EMAIL_REGEXP = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/


export default class Validators {
  /**
   * Validator that requires controls to have a value greater than a number.
   */
  public static min(min: number): ValidatorFn {
    return (control: AbstractControl) => {
      if (isEmptyInputValue(control.value) || isEmptyInputValue(min)) {
        return null // don't validate empty values to allow optional controls
      }
      const parsedValue = parseFloat(control.value)
      return !isNaN(parsedValue) && parsedValue < min
        ? { min: { min, actual: parsedValue } }
        : null
    }
  }

  /**
   * Validator that requires controls to have a value less than a number.
   */
  public static max(max: number): ValidatorFn {
    return (control: AbstractControl) => {
      if (isEmptyInputValue(control.value) || isEmptyInputValue(max)) {
        return null // don't validate empty values to allow optional controls
      }
      const parsedValue = parseFloat(control.value)
      return !isNaN(parsedValue) && parsedValue > max
        ? { max: { max, actual: parsedValue } }
        : null
    }
  }

  /**
   * Validator that requires controls to have a non-empty value.
   */
  public static required(control: AbstractControl):
    ValidationErrors | null {
    return isEmptyInputValue(control.value) ? { required: true } : null
  }

  /**
   * Validator that requires control value to be true.
   */
  public static requiredTrue(control: AbstractControl):
    ValidationErrors | null {
    return control.value === true ? null : { required: true }
  }

  /**
   * Validator that performs email validation.
   */
  public static email(control: AbstractControl): null | ValidationErrors {
    if (isEmptyInputValue(control.value)) {
      return null
    }
    return EMAIL_REGEXP.test(control.value) ? null : { email: true }
  }

  /**
   * Validator that requires controls to have a value of a minimum length.
   */
  public static minLength(minLength: number): ValidatorFn {
    return (control: AbstractControl) => {
      if (isEmptyInputValue(control.value)) {
        return null // don't validate empty values to allow optional controls
      }
      const length = control.value ? control.value.length : 0
      return length < minLength
        ? { minLength: { requiredLength: minLength, actualLength: length } }
        : null
    }
  }

  /**
   * Validator that requires controls to have a value of a maximum length.
   */
  public static maxLength(maxLength: number): ValidatorFn {
    return (control: AbstractControl) => {
      const length = control.value ? control.value.length : 0
      return length > maxLength
        ? { maxLength: { requiredLength: maxLength, actualLength: length } }
        : null
    }
  }
  /**
   * Validator that requires a control to match a regex to its value.
   */
  public static pattern(pattern: string | RegExp): null | ValidatorFn {
    if (!pattern) return null
    let regex: RegExp
    let regexStr: string
    if (typeof pattern === 'string') {
      regexStr = `^${pattern}$`
      regex = new RegExp(regexStr)
    } else {
      regexStr = pattern.toString()
      regex = pattern
    }
    return (control: AbstractControl) => {
      if (isEmptyInputValue(control.value)) {
        return null // don't validate empty values to allow optional controls
      }
      return regex.test(control.value)
        ? null
        : { pattern: { requiredPattern: regexStr, actualValue: control.value } }
    }
  }
  /**
   * Compose multiple validators into a single function that returns the union
   * of the individual error maps.
   * @param {(Function|null|undefined)[]|null} validators
   * @return {Function|null}
   */
  public static compose(
    validators?: Array<ValidatorFn | null | undefined>
  ): ValidatorFn | null {
    if (!validators) return null
    const presentValidators = validators.filter(isPresent) as ValidatorFn[]
    if (presentValidators.length === 0) return null
    return (control: AbstractControl) =>
      _mergeErrors(_executeValidators(control, presentValidators))
  }
  /**
   * Compose multiple async validators into a single function that returns the union
   * of the individual error maps.
   * @param {(Function|null|undefined)[]|null} validators
   * @return {Function|null}
   */
  public static composeAsync(
    validators?: Array<ValidatorFn | null | undefined>
  ): ValidatorFn | null {
    if (!validators) return null;
    const presentValidators = validators.filter(isPresent) as ValidatorFn[]
    if (presentValidators.length === 0) return null;
    return (control: AbstractControl) => {
      const observables = _executeAsyncValidators(control, presentValidators)
      return scheduled(from(Promise.all(observables)), _mergeErrors)
      .pipe(concatAll())
    }
  }
}