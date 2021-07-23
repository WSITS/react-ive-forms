import { AbstractControl } from "./AbstractControl";
import { coerceToAsyncValidator, coerceToValidator } from "./controlUtils";
import { FormControl } from "./FormControl";
import { UpdateOptions, ValidatorFn, ValidatorOptions } from "./types";

export class FormArray extends AbstractControl {
  public controls: AbstractControl[] = [];
  public validatorOrOpts: ValidatorOptions;
  constructor(controls: AbstractControl = [], validatorOrOpts?: Validator | ValidatorOptions, asyncValidator?: ValidatorFn) {
    super(
      coerceToValidator(validatorOrOpts),
      coerceToAsyncValidator(asyncValidator, validatorOrOpts)
    );
    this.validatorOrOpts = validatorOrOpts;
    this._initObservables();
    this._setUpdateStrategy(validatorOrOpts);
    this._setUpControls();
    this.updateValueAndValidity({
      onlySelf: true,
      emitEvent: false
    });
    this.handleSubmit = e => {
      if (e) {
        e.preventDefault();
      }
      if (this._anyControlsUnsubmitted()) {
        this.markAsSubmitted({
          emitEvent: false
        });
      }
      if (!this._syncPendingControls()) {
        this.updateValueAndValidity();
      }
    };
  }
  /**
   * Get the `AbstractControl` at the given `index` in the array.
   * @param {Number} index
   * @return {AbstractControl}
   */
  public at(index: number): AbstractControl {
    return this.controls[index];
  }

  /**
   * Insert a new `AbstractControl` at the end of the array.
   * @param {AbstractControl} control
   * @return {Void}
   */
  public push(control: AbstractControl): void {
    this.controls.push(control);
    this._registerControl(control);
    this.updateValueAndValidity();
    this._onCollectionChange();
  }

  /**
   * Insert a new `AbstractControl` at the given `index` in the array.
   * @param {Number} index
   * @param {AbstractControl} control
   */
  public insert(index: number, control: AbstractControl): void {
    this.controls.splice(index, 0, control);
    this._registerControl(control);
    this.updateValueAndValidity();
    this._onCollectionChange();
  }

  /**
   * Remove the control at the given `index` in the array.
   * @param {Number} index
   */
  public removeAt(index: number): void {
    if (this.controls[index])
      this.controls[index]._registerOnCollectionChange(() => {});
    this.controls.splice(index, 1);
    this.updateValueAndValidity();
    this._onCollectionChange();
  }

  /**
   * Replace an existing control.
   * @param {Number} index
   * @param {AbstractControl} control
   */
  public setControl(index: number, control: AbstractControl): void {
    if (this.controls[index])
      this.controls[index]._registerOnCollectionChange(() => {});
    this.controls.splice(index, 1);

    if (control) {
      this.controls.splice(index, 0, control);
      this._registerControl(control);
    }

    this.updateValueAndValidity();
    this._onCollectionChange();
  }

  /**
   * Length of the control array.
   * @return {Number}
   */
  public get length(): number {
    return this.controls.length;
  }

  /**
   * Sets the value of the `FormArray`. It accepts an array that matches
   * the structure of the control.
   * @param {any[]} value
   * @param {{onlySelf?: boolean, emitEvent?: boolean}} options
   */
  public setValue(value: any[], options?: UpdateOptions): void {
    this._checkAllValuesPresent(value);
    value.forEach((newValue, index) => {
      this._throwIfControlMissing(index);
      this.at(index).setValue(newValue, {
        onlySelf: true,
        emitEvent: options?.emitEvent || false
      });
    });
    this.updateValueAndValidity(options);
  }

  /**
   *  Patches the value of the `FormArray`. It accepts an array that matches the
   *  structure of the control, and will do its best to match the values to the correct
   *  controls in the group.
   * @param {any[]} value
   * @param {{onlySelf?: boolean, emitEvent?: boolean}} options
   */
  public patchValue(value: any[], options?: UpdateOptions): void {
    value.forEach((newValue, index) => {
      if (this.at(index)) {
        this.at(index).patchValue(newValue, {
          onlySelf: true,
          emitEvent: options?.emitEvent || false
        });
      }
    });
    this.updateValueAndValidity(options);
  }

  /**
   * Resets the `FormArray`.
   * @param {any[]} value
   * @param {{onlySelf?: boolean, emitEvent?: boolean}} options
   */
  public reset(value = [], options: UpdateOptions = {}): void {
    this._forEachChild((control: AbstractControl, index: number) => {
      control.reset(value[index], {
        onlySelf: true,
        emitEvent: options.emitEvent
      });
    });
    this.updateValueAndValidity(options);
    this.markAsUnsubmitted();
    this._updatePristine(options);
    this._updateTouched(options);
  }

  /**
   * The aggregate value of the array, including any disabled controls.
   *
   * If you'd like to include all values regardless of disabled status, use this method.
   * Otherwise, the `value` property is the best way to get the value of the array.
   * @return {any[]}
   */
  public getRawValue(): any[] {
    return this.controls.map(control => {
      return control instanceof FormControl
        ? control.value
        : control.getRawValue();
    });
  }

  _syncPendingControls() {
    let subtreeUpdated = this.controls.reduce((updated, child) => {
      return child._syncPendingControls() ? true : updated;
    }, false);
    if (subtreeUpdated) this.updateValueAndValidity();
    return subtreeUpdated;
  }

  _throwIfControlMissing(index) {
    if (!this.controls.length) {
      throw new Error(`
        There are no form controls registered with this array yet.
      `);
    }
    if (!this.at(index)) {
      throw new Error(`Cannot find form control at index ${index}`);
    }
  }

  _forEachChild(cb) {
    this.controls.forEach((control, index) => {
      cb(control, index);
    });
  }

  _updateValue() {
    this.value = this.controls
      .filter(control => control.enabled || this.disabled)
      .map(control => control.value);
  }

  _anyControls(condition) {
    return this.controls.some(control => control.enabled && condition(control));
  }

  _setUpControls() {
    this._forEachChild(control => this._registerControl(control));
  }

  _checkAllValuesPresent(value) {
    this._forEachChild((control, i) => {
      if (value[i] === undefined) {
        throw new Error(`Must supply a value for form control at index: ${i}.`);
      }
    });
  }

  _allControlsDisabled() {
    for (const control of this.controls) {
      if (control.enabled) return false;
    }
    return this.controls.length > 0 || this.disabled;
  }

  _registerControl(control) {
    control.setParent(this);
    control._registerOnCollectionChange(this._onCollectionChange);
  }

  _onCollectionChange() {}
}