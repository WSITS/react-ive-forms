import { Subject } from "rxjs";
import { AbstractControl } from "./AbstractControl";
import { coerceToAsyncValidator, coerceToValidator, getControlValue } from "./controlUtils";
import { UpdateOptions, ValidatorFn } from "./types";
import { getHandler } from "./utils";

/**
 * This is the base class for `FormControl`, `FormGroup`, and
 * `FormArray`.
 *
 * It provides some of the shared behavior that all controls and groups of controls have, like
 * running validators, calculating status, and resetting state. It also defines the properties
 * that are shared between all sub-classes, like `value`, `valid`, and `dirty`. It shouldn't be
 * instantiated directly.
 */
export class FormControl extends AbstractControl {
  public active: boolean;
  public onValueChanges: Subject<any>;
  public onBlurChanges: Subject<any>;
  protected _pendingChange: boolean = true;
  protected _pendingDirty: boolean = false;
  protected _pendingTouched: boolean = false;
  protected _pendingValue: any = null;
  protected validatorsOrOpts: ValidatorFn | ValidatorFn[] | UpdateOptions;
  constructor(formState, validatorOrOpts: ValidatorFn | UpdateOptions, asyncValidator?: ValidatorFn | ValidatorFn[]) {
    super(
      coerceToValidator(validatorOrOpts),
      coerceToAsyncValidator(asyncValidator, validatorOrOpts)
    );
    this.formState = formState;
    this.validatorsOrOpts = validatorOrOpts;
    this._applyFormState(formState);
    this._setUpdateStrategy(validatorOrOpts);
    /**
     * A control is `active` when its focused.
     */
    this.active = false;
    this.onValueChanges = new Subject();
    this.onBlurChanges = new Subject();
    this.updateValueAndValidity({
      onlySelf: true,
      emitEvent: false
    });
    this._initObservables();
  }
  /**
   * Called whenevers an onChange event triggers.
   * Updates the control value according to the update strategy.
   *
   * @param {any} event
   * @return {void}
   */
   public onChange = (event: Event) => {
    const value = getControlValue(event);
    const isDirty = value !== this.value;
    if (this.updateOn !== "change") {
      this._pendingValue = value;
      this._pendingChange = true;
      if (isDirty && !this._pendingDirty) {
        this._pendingDirty = true;
      }
      this.stateChanges.next(null);
    } else {
      if (isDirty && !this.dirty) {
        this.markAsDirty();
      }
      this.setValue(value);
    }
    this.onValueChanges.next(value);
  };
  /**
   * Called whenevers an onBlur event triggers.
   */
  public onBlur = () => {
    this.active = false;
    if (this.updateOn === "blur") {
      if (this._pendingDirty && !this.dirty) {
        this.markAsDirty();
      }
      if (!this.touched) {
        this.markAsTouched();
      }
      this.setValue(this._pendingValue);
    } else if (this.updateOn === "submit") {
      this._pendingTouched = true;
    } else {
      const emitChangeToView = !this.touched;
      if (!this.touched) {
        this.markAsTouched();
      }
      if (emitChangeToView) {
        this.stateChanges.next(null);
      }
    }
    this.onBlurChanges.next(this._pendingValue);
  };
  /**
   * Called whenevers an onFocus event triggers.
   */
  public onFocus = () => {
    this.active = true;
    this.stateChanges.next(null);
  };
  /**
   * Returns the required props to bind an input element.
   * @param {string} inputType
   * @param {any} value
   */
  public handler = (inputType: any, value: any) => getHandler(inputType, value, this);
  /**
   * A control is `inactive` when its not focused.
   * @return {Boolean}
   */
  public get inactive(): boolean {
    return !this.active;
  }
  /**
   * @param {{onlySelf: Boolean, emitEvent: Boolean}} options
   * @return {void}
   */
  public setValue(value: any, options: UpdateOptions = {}): void {
    this.value = this._pendingValue = value;
    this.updateValueAndValidity(options);
  }
  /**
   * Patches the value of a control.
   *
   * This function is functionally the same as setValue at this level.
   * It exists for symmetry with patchValue on `FormGroups` and
   * `FormArrays`, where it does behave differently.
   * @param {any} value
   * @param {{onlySelf: Boolean, emitEvent: Boolean}} options
   * @return {void}
   */
  public patchValue(value: any, options: UpdateOptions = {}): void {
    this.setValue(value, options);
  }

  /**
   * @param {{onlySelf: Boolean, emitEvent: Boolean}} options
   * @return {void}
   */
  public reset(formState = null, options: UpdateOptions = {}): void {
    this._applyFormState(formState);
    this.markAsPristine(options);
    this.markAsUntouched(options);
    this.setValue(this.value, options);
    this._pendingChange = false;
  }
  /**
   * @param {Function} condition
   * @return {Boolean}
   */
  private _anyControls(condition: any): boolean {
    return false
  }
  /**
   * @return {Boolean}
   */
  private _allControlsDisabled(): boolean {
    return this.disabled;
  }
  /**
   * @return {Boolean}
   */
  private _isBoxedValue(formState): boolean {
    return (
      typeof formState === "object" &&
      formState !== null &&
      Object.keys(formState).length === 2 &&
      "value" in formState &&
      "disabled" in formState
    );
  }
  private _applyFormState(formState): void {
    if (this._isBoxedValue(formState)) {
      this.value = this._pendingValue = formState.value;
      if (formState.disabled) {
        this.disable({
          onlySelf: true,
          emitEvent: false
        });
      } else {
        this.enable({
          onlySelf: true,
          emitEvent: false
        });
      }
    } else {
      this.value = this._pendingValue = formState;
    }
  }
  private _syncPendingControls(): boolean {
    if (this.updateOn === "submit") {
      if (this._pendingDirty) this.markAsDirty();
      if (this._pendingTouched) this.markAsTouched();
      if (this._pendingChange) {
        this.setValue(this._pendingValue);
        this._pendingChange = false;
        return true;
      }
    }
    return false;
  }
}
