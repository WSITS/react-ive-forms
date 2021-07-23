import { AbstractControl } from "./AbstractControl";
import { FormArray } from "./FormArray";
import { FormGroup } from "./FormGroup";
import { AsyncValidatorFn, ValidatorFn, ValidatorOptions } from "./types";
import { isEvent, isReactNative } from "./utils";
import Validators from "./validators";

/**
 * Calculates the control's value according to the input type
 * @param {any} event
 * @return {any}
 */
export function getControlValue(event: any): any {
  if (isEvent(event)) {
    switch (event.target.type) {
      case "checkbox":
        return event.target.checked;
      case "select-multiple":
        if (event.target.options) {
          const options = event.target.options;
          const value = [];
          for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
              value.push(options[i].value);
            }
          }
          return value;
        }
        return event.target.value;
      default:
        return isReactNative() ? event.nativeEvent.text : event.target.value;
    }
  }
  return event;
}
/**
 * @param {AbstractControl} control
 * @param {(String|Number)[]|String} path
 * @param {String} delimiter
 */
export function _find(
  control: AbstractControl,
  path: Array<string | number> | string,
  delimiter: string
): AbstractControl | null {
  if (path == null) return null;
  if (!(path instanceof Array)) {
    path = path.split(delimiter);
  }
  if (path instanceof Array && path.length === 0) return null;
  return path.reduce((v, name) => {
    if (v instanceof FormGroup) {
      return v.controls[name] || null;
    }
    if (v instanceof FormArray) {
      return v.at(name) || null;
    }
    return null;
  }, control);
}
/**
 * @param {{validators: Function|Function[]|null, asyncValidators: Function|Function[]|null, updateOn: 'change' | 'blur' | 'submit'}} validatorOrOpts
 * @return {Boolean}
 */
export function isOptionsObj(
  validatorOrOpts: ValidatorOptions | ValidatorFn | ValidatorFn[] | null
): boolean {
  return (
    validatorOrOpts != null &&
    !Array.isArray(validatorOrOpts) &&
    typeof validatorOrOpts === "object"
  );
}
/**
 * @param {Function} validator
 * @return {Function}
 */
export function normalizeValidator(validator: ValidatorFn | any): ValidatorFn {
  if (validator.validate) {
    return c => validator(c);
  }
  return validator;
}
/**
 * @param {Function} validator
 * @return {Function}
 */
export function normalizeAsyncValidator(validator: ValidatorFn | any): ValidatorFn {
  if (validator.validate) {
    return (c: AbstractControl) => validator(c);
  }
  return validator;
}
/**
 * @param {Function[]} validators
 * @return {Function|null}
 */
export function composeValidators(validators: ValidatorFn[]): ValidatorFn | null {
  return validators != null
    ? Validators.compose(validators.map(normalizeValidator))
    : null;
}
/**
 * @param {Function[]} validators
 * @return {Function|null}
 */
export function composeAsyncValidators(validators: ValidatorFn[]): AsyncValidatorFn | null {
  return validators != null
    ? Validators.composeAsync(validators.map(normalizeAsyncValidator))
    : null;
}

export function coerceToValidator(validatorOrOpts: ValidatorFn | ValidatorFn[] | ValidatorOptions | null = {}):
ValidatorFn | null {
  const validator = isOptionsObj(validatorOrOpts)
    ? validatorOrOpts.validators
    : validatorOrOpts;
  return Array.isArray(validator)
    ? composeValidators(validator)
    : validator || null;
}

export function coerceToAsyncValidator(
  asyncValidator: ValidatorFn | ValidatorFn[] | null, validatorOrOpts: ValidatorFn | ValidatorOptions = {}
): AsyncValidatorFn | null {
  const origAsyncValidator = isOptionsObj(validatorOrOpts)
    ? validatorOrOpts.asyncValidators
    : asyncValidator;
  return Array.isArray(origAsyncValidator)
    ? composeAsyncValidators(origAsyncValidator)
    : origAsyncValidator || null;
}
