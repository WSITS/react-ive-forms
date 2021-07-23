import { from, Subject, Subscription } from "rxjs";
import { coerceToAsyncValidator, coerceToValidator, isOptionsObj, _find } from "./controlUtils";
import { FormArray } from "./FormArray";
import { FormGroup } from "./FormGroup";
import {
  AsyncValidatorFn,
  DISABLED,
  FieldStatus,
  FormHooks,
  INVALID,
  PENDING,
  UpdateOptions,
  VALID,
  ValidationErrors,
  ValidatorFn,
  ValidatorOptions
} from "./types";

/**
 * This is the base class for `FormControl`, `FormGroup`, and
 * `FormArray`.
 *
 * It provides some of the shared behavior that all controls and groups of controls have, like
 * running validators, calculating status, and resetting state. It also defines the properties
 * that are shared between all sub-classes, like `value`, `valid`, and `dirty`. It shouldn't be
 * instantiated directly.
 */
export abstract class AbstractControl {
  public validator: ValidatorFn | null = null;
  public asyncValidator: AsyncValidatorFn | null = null;
  public status: FieldStatus = "VALID";
  public errors: ValidationErrors | null = null;
  public touched = false;
  public submitted = false;
  public pristine = true;
  public meta: { [key: string]: any } = {};
  public statusChanges: Subject<any>;
  public stateChanges: Subject<any>;
  public valueChanges: Subject<any>;
  public value: any;
  protected abstract _pendingChange = this.updateOn !== "change";
  protected _pendingDirty = false;
  protected _pendingTouched = false;
  protected _asyncValidationSubscription: Subscription;
  protected abstract _onCollectionChange: () => void;
  private _parent: AbstractControl | null = null;
  private _updateOn: FormHooks = "change";
  private _onDisabledChange: Array<(disabled: boolean) => void> = [];
  /**
   * @param {Function|null} validator
   * @param {Function|null} asyncValidator
   */
  constructor(validator: ValidatorFn | null = null, asyncValidator: AsyncValidatorFn | null = null) {
    this.validator = validator;
    this.asyncValidator = asyncValidator;
    this.statusChanges = new Subject();
    this.stateChanges = new Subject();
    this.valueChanges = new Subject();
    this._asyncValidationSubscription = new Subject().subscribe();
    // this.hasError = this.hasError.bind(this);
    // this.getError = this.getError.bind(this);
    // this.reset = this.reset.bind(this);
    // this.get = this.get.bind(this);
    // this.patchValue = this.patchValue.bind(this);
    // this.setValue = this.setValue.bind(this);
  }
  public abstract reset(value: any, options?: UpdateOptions): void;
  public abstract setValue(value: any, options?: UpdateOptions): void;
  public abstract patchValue(value: any, options?: UpdateOptions): void;
  /**
   * Returns the update strategy of the `AbstractControl` (i.e.
   * the event on which the control will update itself).
   * Possible values: `'change'` (default) | `'blur'` | `'submit'`
   */
  public get updateOn(): FormHooks {
    return this._updateOn
      ? this._updateOn
      : this.parent
        ? this.parent.updateOn
        : "change";
  }
  /**
   * A control is `dirty` if the user has changed the value
   * in the UI.
   *
   * Note that programmatic changes to a control's value will
   * *not* mark it dirty.
   * @return {Boolean}
   */
  public get dirty(): boolean {
    return !this.pristine;
  }
  /**
   * A control is `valid` when its `status === VALID`.
   *
   * In order to have this status, the control must have passed all its
   * validation checks.
   * @return {Boolean}
   */
  public get valid(): boolean {
    return this.status === VALID;
  }
  /**
   * A control is `invalid` when its `status === INVALID`.
   *
   * In order to have this status, the control must have failed
   * at least one of its validation checks.
   * @return {Boolean}
   */
  public get invalid(): boolean {
    return this.status === INVALID;
  }
  /**
   * A control is `pending` when its `status === PENDING`.
   *
   * In order to have this status, the control must be in the
   * middle of conducting a validation check.
   */
  public get pending(): boolean {
    return this.status === PENDING;
  }
  /**
   * The parent control.
   * * @return {FormGroup|FormArray}
   */
  public get parent(): AbstractControl | null {
    return this._parent;
  }
  /**
   * A control is `untouched` if the user has not yet triggered
   * a `blur` event on it.
   * @return {Boolean}
   */
  public get untouched(): boolean {
    return !this.touched;
  }
  /**
   * A control is `enabled` as long as its `status !== DISABLED`.
   *
   * In other words, it has a status of `VALID`, `INVALID`, or
   * `PENDING`.
   * @return {Boolean}
   */
  public get enabled(): boolean {
    return this.status !== DISABLED;
  }
  /**
   * A control is disabled if it's status is `DISABLED`
   */
  public get disabled(): boolean {
    return this.status === DISABLED;
  }
  /**
   * Retrieves the top-level ancestor of this control.
   * @return {AbstractControl}
   */
  public get root(): AbstractControl {
    let x: AbstractControl = this;
    while (x._parent) {
      x = x._parent;
    }
    return x;
  }
  public setInitialStatus(): void {
    if (this.disabled) {
      this.status = DISABLED;
    } else {
      this.status = VALID;
    }
  }
  /**
   * Disables the control. This means the control will be exempt from validation checks and
   * excluded from the aggregate value of any parent. Its status is `DISABLED`.
   *
   * If the control has children, all children will be disabled to maintain the model.
   * @param {{onlySelf: Boolean, emitEvent: Boolean}} opts
   * @return {void}
   */
  public disable(opts: UpdateOptions): void {
    this.status = DISABLED;
    this.errors = null;
    this._forEachChild((control: AbstractControl) => {
      control.disable({
        onlySelf: true
      });
    });
    this._updateValue();

    if (opts.emitEvent !== false) {
      this.valueChanges.next(this.value);
      this.statusChanges.next(this.status);
      this.stateChanges.next(null);
    }

    this._updateAncestors(!!opts.onlySelf);
    this._onDisabledChange.forEach(changeFn => changeFn(true));
  }
  /**
   * Enables the control. This means the control will be included in validation checks and
   * the aggregate value of its parent. Its status is re-calculated based on its value and
   * its validators.
   *
   * If the control has children, all children will be enabled.
   * @param {{onlySelf: Boolean, emitEvent: Boolean}} opts
   * @return {void}
   */
  public enable(opts: UpdateOptions): void {
    this.status = VALID;
    this._forEachChild(control => {
      control.enable({
        onlySelf: true
      });
    });
    this.updateValueAndValidity({
      onlySelf: true,
      emitEvent: opts.emitEvent
    });
    this._updateAncestors(!!opts.onlySelf);
    this._onDisabledChange.forEach(changeFn => changeFn(false));
  }
  /**
   * Re-calculates the value and validation status of the control.
   *
   * By default, it will also update the value and validity of its ancestors.
   * @param {{onlySelf: Boolean, emitEvent: Booelan}} options
   */
  public updateValueAndValidity(options?: UpdateOptions): void {
    this.setInitialStatus();
    this._updateValue();
    const shouldValidate =
      this.enabled && (this.updateOn !== "submit" || this.submitted);
    if (shouldValidate) {
      this._cancelExistingSubscription();
      this.errors = this._runValidator();
      this.status = this._calculateStatus();
      if (this.status === VALID || this.status === PENDING) {
        this._runAsyncValidator(true);
      }
    }
    if (options && options.emitEvent !== false) {
      this.valueChanges.next(this.value);
      this.statusChanges.next(this.status);
      this.stateChanges.next(null);
    }
    if (this.parent && options && !options.onlySelf) {
      this.parent.updateValueAndValidity(options);
    }
  }
  /**
   * Marks the control as `touched`.
   *
   * This will also mark all direct ancestors as `touched` to maintain
   * the model.
   * @param {{onlySelf: Boolean, emitEvent: Boolean}} opts
   * @return {void}
   */
  public markAsTouched(opts?: UpdateOptions): void {
    this.touched = true;
    if (opts) {
      if (this._parent && !opts.onlySelf) {
        this._parent.markAsTouched(opts);
      }
      if (opts.emitEvent) {
        this.stateChanges.next(null);
      }
    }
  }
  /**
   * Marks the control as `submitted`.
   *
   * If the control has any children, it will also mark all children as `submitted`
   * @param {{emitEvent: Boolean}} opts
   * @return {void}
   */
  public markAsSubmitted(opts?: UpdateOptions): void {
    this.submitted = true;

    this._forEachChild(control => {
      control.markAsSubmitted();
    });

    if (opts && opts.emitEvent !== false) {
      this.stateChanges.next(null);
    }
  }
  /**
   * Marks the control as `unsubmitted`.
   *
   * If the control has any children, it will also mark all children as `unsubmitted`.
   *
   * @param {{emitEvent: Boolean}} opts
   * @return {void}
   */
  public markAsUnsubmitted(opts?: UpdateOptions): void {
    this.submitted = false;

    this._forEachChild(control => {
      control.markAsUnsubmitted({
        onlySelf: true
      });
    });

    if (opts && opts.emitEvent !== false) {
      this.stateChanges.next(null);
    }
  }
  /**
   * Marks the control as `pristine`.
   *
   * If the control has any children, it will also mark all children as `pristine`
   * to maintain the model, and re-calculate the `pristine` status of all parent
   * controls.
   * @param {{onlySelf: Boolean, emitEvent: Boolean}} opts
   * @return {void}
   */
  public markAsPristine(opts?: UpdateOptions): void {
    this.pristine = true;
    this._pendingDirty = false;
    if (opts && opts.emitEvent) {
      this.stateChanges.next(null);
    }
    this._forEachChild(control => {
      control.markAsPristine({
        onlySelf: true
      });
    });
    if (this._parent && opts && !opts.onlySelf) {
      this._parent._updatePristine(opts);
    }
  }
  /**
   * Marks the control as `untouched`.
   *
   * If the control has any children, it will also mark all children as `untouched`
   * to maintain the model, and re-calculate the `touched` status of all parent
   * controls.
   * @param {{onlySelf: Boolean, emitEvent: Boolean}} opts
   * @return {void}
   */
  public markAsUntouched(opts: UpdateOptions): void {
    this.touched = false;
    this._pendingTouched = false;
    this._forEachChild(control => {
      control.markAsUntouched({
        onlySelf: true
      });
    });
    if (this._parent && !opts.onlySelf) {
      this._parent._updateTouched(opts);
    }
    if (opts.emitEvent) {
      this.stateChanges.next(null);
    }
  }
  /**
   * Marks the control as `dirty`.
   *
   * This will also mark all direct ancestors as `dirty` to maintain
   * the model.
   * @param {{onlySelf: Boolean, emitEvent: Boolean}} opts
   * @return {void}
   */
  public markAsDirty(opts?: UpdateOptions): void {
    this.pristine = false;
    if (opts && opts.emitEvent) {
      this.stateChanges.next(null);
    }
    if (this._parent && opts && !opts.onlySelf) {
      this._parent.markAsDirty(opts);
    }
  }
  /**
   * Marks the control as `pending`.
   * @param {{onlySelf: Boolean}} opts
   * @return {void}
   */
  public markAsPending(opts:UpdateOptions): void {
    this.status = PENDING;

    if (this._parent && !opts.onlySelf) {
      this._parent.markAsPending(opts);
    }
  }
  /**
   * Sets the synchronous validators that are active on this control.  Calling
   * this will overwrite any existing sync validators.
   * @param {Function|Function[]|null} newValidator
   * @return {void}
   */
  public setValidators(newValidator: ValidatorFn | ValidatorFn[] | null): void {
    this.validator = coerceToValidator(newValidator);
  }
  /**
   * Sets the async validators that are active on this control. Calling this
   * will overwrite any existing async validators.
   */
  public setAsyncValidators(newValidator: ValidatorFn | ValidatorFn[] | null): void {
    this.asyncValidator = coerceToAsyncValidator(newValidator);
  }
  /**
   * Sets errors on a form control.
   *
   * This is used when validations are run manually by the user, rather than automatically.
   *
   * Calling `setErrors` will also update the validity of the parent control.
   *
   * ### Example
   *
   * ```
   * const login = new FormControl("someLogin");
   * login.setErrors({
   *   "notUnique": true
   * });
   *
   * ```
   * @param {{onlySelf: boolean}} opts
   * @return {void}
   */
  public setErrors(
    errors: ValidationErrors | null, opts: UpdateOptions = {}
  ): void {
    this.errors = errors;
    this._updateControlsErrors(opts?.emitEvent !== false);
  }
  /**
   * Retrieves a child control given the control's name or path.
   *
   * Paths can be passed in as an array or a string delimited by a dot.
   *
   * To get a control nested within a `person` sub-group:
   *
   * * `this.form.get('person.name');`
   *
   * -OR-
   *
   * * `this.form.get(['person', 'name']);`
   * @param {(String|Number)[]|String} path
   * @return {AbstractControl|null}
   */
  public get(path: Array<string | number> | string): AbstractControl | null {
    return _find(this, path, ".");
  }
  /**
   * Returns error data if the control with the given path has the error specified. Otherwise
   * returns null or undefined.
   *
   * If no path is given, it checks for the error on the present control.
   * @param {String} errorCode
   * @param {(String|Number)[]|String} path
   */
  public getError(errorCode: string, path: Array<string | number> | string): any | null {
    const control = path ? this.get(path) : this;
    return control && control.errors ? control.errors[errorCode] : null;
  }
  /**
   * Returns true if the control with the given path has the error specified. Otherwise
   * returns false.
   *
   * If no path is given, it checks for the error on the present control.
   * @param {String} errorCode
   * @param {(String|Number)[]|String} path
   * @return {Booelan}
   */
  public hasError(errorCode: string, path: Array<string | number> | string): boolean {
    return !!this.getError(errorCode, path);
  }
  /**
   * Empties out the sync validator list.
   */
  public clearValidators(): void {
    this.validator = null;
  }
  /**
   * Empties out the async validator list.
   */
  public clearAsyncValidators(): void {
    this.asyncValidator = null;
  }
  /**
   * @param {FormGroup|FormArray} parent
   * @return {Void}
   */
  public setParent(parent: FormGroup | FormArray): void {
    this._parent = parent;
  }
  protected _initObservables(): void {
    this.valueChanges = new Subject();
    this.statusChanges = new Subject();
    this.stateChanges = new Subject();
  }
  /**
   * @param {{validators: Function|Function[]|null, asyncValidators: Function|Function[]|null, updateOn: 'change' | 'blur' | 'submit'}} opts
   * @return {Void}
   */
  protected _setUpdateStrategy(opts: ValidatorOptions): void {
    if (isOptionsObj(opts) && opts.updateOn != null) {
      this._updateOn = opts.updateOn;
    }
  }
  protected _anyControlsUnsubmitted(): boolean {
    return this._anyControls((control: AbstractControl) => !control.submitted);
  }
  protected _registerOnCollectionChange(fn: () => void): void {
    this._onCollectionChange = fn;
  }
  /**
   * @param {{onlySelf: boolean}} opts
   * @return {void}
   */
  protected _updatePristine(opts?: UpdateOptions): void {
    this.pristine = !this._anyControlsDirty();
    if (this._parent && opts && !opts.onlySelf) {
      this._parent._updatePristine(opts);
    }
  }
  /**
   * @param {{onlySelf: boolean}} opts
   * @return {void}
   */
  protected _updateTouched(opts?: UpdateOptions): void {
    this.touched = this._anyControlsTouched();
    if (this._parent && opts && !opts.onlySelf) {
      this._parent._updateTouched(opts);
    }
  }
  protected abstract _forEachChild(cb: (c: AbstractControl) => void): void;
  protected abstract _updateValue(): void;
  protected abstract _allControlsDisabled(): boolean;
  protected abstract _anyControls(cb: (c: AbstractControl) => boolean): boolean;
  /**
   * @param {Boolean} onlySelf
   */
  private _updateAncestors(onlySelf: boolean): void {
    if (this._parent && !onlySelf) {
      this._parent.updateValueAndValidity();
      this._parent._updatePristine();
      this._parent._updateTouched();
    }
  }
  /**
   * @param {String} status
   * @return {Booelan}
   */
  private _anyControlsHaveStatus(status: string): boolean {
    return this._anyControls(control => control.status === status);
  }
  /**
   * @return {String}
   */
  private _calculateStatus(): 'DISABLED' | 'INVALID' | 'PENDING' | 'VALID'  {
    if (this._allControlsDisabled()) return DISABLED;
    if (this.errors) return INVALID;
    if (this._anyControlsHaveStatus(PENDING)) return PENDING;
    if (this._anyControlsHaveStatus(INVALID)) return INVALID;
    return VALID;
  }
  private _runValidator(): ValidationErrors | null {
    return this.validator ? this.validator(this) : null;
  }
  /**
   * @param {Booelan} emitEvent
   * @return {void}
   */
  private _runAsyncValidator(emitEvent: boolean): void {
    if (this.asyncValidator) {
      this.status = PENDING;
      const obs = from(this.asyncValidator(this));
      this._asyncValidationSubscription = obs.subscribe(
        {
          error: (errors: ValidationErrors) => {
            this.setErrors(errors, {
              emitEvent
            })
          }
        }
      );
    }
  }
  private _cancelExistingSubscription(): void {
    if (this._asyncValidationSubscription) {
      this._asyncValidationSubscription.unsubscribe();
    }
  }
  /**
   * @return {Boolean}
   */
  private _anyControlsDirty(): boolean {
    return this._anyControls((control: AbstractControl) => control.dirty);
  }
  /**
   * @return {Boolean}
   */
  private _anyControlsTouched(): boolean {
    return this._anyControls((control: AbstractControl) => control.touched);
  }
  /**
   * @param {Booelan} emitEvent
   * @return {void}
   */
  private _updateControlsErrors(emitEvent: boolean): void {
    this.status = this._calculateStatus();
    if (emitEvent) {
      this.statusChanges.next(this.status);
      this.stateChanges.next(this.status);
    }
    if (this._parent) {
      this._parent._updateControlsErrors(emitEvent);
    }
  }
}
