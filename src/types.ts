import { AbstractControl } from "./AbstractControl";

export type FormHooks = "change" | "blur" | "submit";

/**
 * Indicates that a FormControl is valid, i.e. that no errors exist in the input value.
 */
export const VALID = "VALID";

/**
 * Indicates that a FormControl is invalid, i.e. that an error exists in the input value.
 */
export const INVALID = "INVALID";

/**
 * Indicates that a FormControl is pending, i.e. that async validation is occurring and
 * errors are not yet available for the input value.
 */
export const PENDING = "PENDING";

/**
 * Indicates that a FormControl is disabled, i.e. that the control is exempt from ancestor
 * calculations of validity or value.
 */
export const DISABLED = "DISABLED";

export type FieldStatus = "DISABLED" | "PENDING" | "INVALID" | "VALID";

export interface ValidatorOptions {
  validators?: ValidatorFn | ValidatorFn[] | null,
  asyncValidators?: ValidatorFn | ValidatorFn[] | null,
  updateOn?: FormHooks
}

export type ValidationErrors = { [key: string]: any }

export type ValidatorFn = (c: AbstractControl) => null | ValidationErrors

export interface UpdateOptions {
  onlySelf?: boolean,
  emitEvent?: boolean
}
