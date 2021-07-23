import { AbstractControl } from "./AbstractControl";

export class FormGroup extends AbstractControl {
  constructor(controls, validatorOrOpts, asyncValidator) {
    super(
      coerceToValidator(validatorOrOpts),
      coerceToAsyncValidator(asyncValidator, validatorOrOpts)
    );
    this.controls = controls;
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
   * Check whether there is an enabled control with the given name in the group.
   *
   * It will return false for disabled controls. If you'd like to check for existence in the group
   * only, use `AbstractControl` get instead.
   * @param {String} controlName
   * @return {Boolean}
   */
  contains(controlName) {
    return (
      this.controls.hasOwnProperty(controlName) &&
      this.controls[controlName].enabled
    );
  }
  /**
   * Registers a control with the group's list of controls.
   *
   * This method does not update the value or validity of the control, so for most cases you'll want
   * to use addControl instead.
   * @param {String} name
   * @param {AbstractControl} control
   * @return {AbstractControl}
   */
  registerControl(name, control) {
    if (this.controls[name]) return this.controls[name];
    this.controls[name] = control;
    control.setParent(this);
    control._registerOnCollectionChange(this._onCollectionChange);
    return control;
  }

  /**
   * Add a control to this group.
   * @param {String} name
   * @param {AbstractControl} control
   * @return {void}
   */
  addControl(name, control) {
    this.registerControl(name, control);
    this.updateValueAndValidity();
    this._onCollectionChange();
  }

  /**
   * Remove a control from this group.
   * @param {String} name
   * @return {void}
   */
  removeControl(name) {
    if (this.controls[name])
      this.controls[name]._registerOnCollectionChange(() => {});
    delete this.controls[name];
    this.updateValueAndValidity();
    this._onCollectionChange();
  }

  /**
   * Replace an existing control.
   * @param {String} name
   * @param {AbstractControl} control
   * @return {void}
   */
  setControl(name, control) {
    if (this.controls[name])
      this.controls[name]._registerOnCollectionChange(() => {});
    delete this.controls[name];
    if (control) this.registerControl(name, control);
    this.updateValueAndValidity();
    this._onCollectionChange();
  }
  /**
   * Sets the value of the FormGroup. It accepts an object that matches
   * the structure of the group, with control names as keys.
   *
   * This method performs strict checks, so it will throw an error if you try
   * to set the value of a control that doesn't exist or if you exclude the
   * value of a control.
   *
   *  ### Example
   *  form.setValue({first: 'Jon', last: 'Snow'});
   *  console.log(form.value);   // {first: 'Jon', last: 'Snow'}
   * @param {{[key: string]: any}} value
   * @param {{onlySelf: boolean, emitEvent: boolean}} options
   * @return {void}
   */
  setValue(value, options = {}) {
    this._checkAllValuesPresent(value);
    Object.keys(value).forEach(name => {
      this._throwIfControlMissing(name);
      this.controls[name].setValue(value[name], {
        onlySelf: true,
        emitEvent: options.emitEvent
      });
    });
    this.updateValueAndValidity(options);
  }
  /**
   * Resets the `FormGroup`.
   * @param {any} value
   * @param {{onlySelf: boolean, emitEvent: boolean}} options
   * @return {void}
   */
  reset(value = {}, options = {}) {
    this._forEachChild((control, name) => {
      control.reset(value[name], {
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
   *  Patches the value of the FormGroup. It accepts an object with control
   *  names as keys, and will do its best to match the values to the correct controls
   *  in the group.
   *
   *  It accepts both super-sets and sub-sets of the group without throwing an error.
   *
   *  ### Example
   *  ```
   *  console.log(form.value);   // {first: null, last: null}
   *
   *  form.patchValue({first: 'Jon'});
   *  console.log(form.value);   // {first: 'Jon', last: null}
   *
   *  ```
   * @param {{[key: string]: any}} value
   * @param {{onlySelf: boolean, emitEvent: boolean}} options
   * @return {void}
   */
  patchValue(value, options = {}) {
    Object.keys(value).forEach(name => {
      if (this.controls[name]) {
        this.controls[name].patchValue(value[name], {
          onlySelf: true,
          emitEvent: options.emitEvent
        });
      }
    });
    this.updateValueAndValidity(options);
  }
  /**
   * The aggregate value of the FormGroup, including any disabled controls.
   *
   * If you'd like to include all values regardless of disabled status, use this method.
   * Otherwise, the `value` property is the best way to get the value of the group.
   */
  getRawValue() {
    return this._reduceChildren({}, (acc, control, name) => {
      acc[name] =
        control instanceof FormControl ? control.value : control.getRawValue();
      return acc;
    });
  }
  /**
   * @param {{(v: any, k: String) => void}} callback
   * @return {void}
   */
  _forEachChild(callback) {
    Object.keys(this.controls).forEach(k => callback(this.controls[k], k));
  }

  _onCollectionChange() {}
  /**
   * @param {Function} condition
   * @return {Boolean}
   */
  _anyControls(condition) {
    let res = false;
    this._forEachChild((control, name) => {
      res = res || (this.contains(name) && condition(control));
    });
    return res;
  }
  _updateValue() {
    this.value = this._reduceValue();
  }
  _reduceValue() {
    return this._reduceChildren({}, (acc, control, name) => {
      if (control.enabled || this.disabled) {
        acc[name] = control.value;
      }
      return acc;
    });
  }
  _reduceErrors() {
    return this._reduceChildren({}, (acc, control, name) => {
      if (control.enabled || this.disabled) {
        acc[name] = control.errors;
      }
      return acc;
    });
  }
  /**
   * @param {Function} fn
   */
  _reduceChildren(initValue, fn) {
    let res = initValue;
    this._forEachChild((control, name) => {
      res = fn(res, control, name);
    });
    return res;
  }
  _setUpControls() {
    this._forEachChild(control => {
      control.setParent(this);
      control._registerOnCollectionChange(this._onCollectionChange);
    });
  }
  /**
   * @return {Boolean}
   */
  _allControlsDisabled() {
    for (const controlName of Object.keys(this.controls)) {
      if (this.controls[controlName].enabled) {
        return false;
      }
    }
    return Object.keys(this.controls).length > 0 || this.disabled;
  }
  _checkAllValuesPresent(value) {
    this._forEachChild((control, name) => {
      if (value[name] === undefined) {
        throw new Error(
          `Must supply a value for form control with name: '${name}'.`
        );
      }
    });
  }
  _throwIfControlMissing(name) {
    if (!Object.keys(this.controls).length) {
      throw new Error(`
        There are no form controls registered with this group yet.
      `);
    }
    if (!this.controls[name]) {
      throw new Error(`Cannot find form control with name: ${name}.`);
    }
  }
  _syncPendingControls() {
    let subtreeUpdated = this._reduceChildren(false, (updated, child) => {
      return child._syncPendingControls() ? true : updated;
    });
    if (subtreeUpdated) this.updateValueAndValidity();
    return subtreeUpdated;
  }
}