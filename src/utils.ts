import { FormControl } from "./FormControl";

export const isReactNative = () =>
  typeof window !== "undefined" &&
  window.navigator &&
  window.navigator.product &&
  window.navigator.product === "ReactNative";
export const isEvent = (candidate: any ) =>
  !!(candidate && candidate.stopPropagation && candidate.preventDefault);

// Common props
export const propsToBeMap = {
  value: "value",
  touched: "touched",
  untouched: "untouched",
  disabled: "disabled",
  enabled: "enabled",
  invalid: "invalid",
  valid: "valid",
  pristine: "pristine",
  dirty: "dirty",
  errors: "errors",
  hasError: "hasError",
  getError: "getError",
  status: "status",
  pending: "pending",
  pendingValue: "_pendingValue"
};
export const controlsToBeMap = {
  ReactNative: {
    switch: {
      value: "value",
      onValueChange: "onChange",
      onBlur: "onBlur",
      onFocus: "onFocus",
      disabled: "disabled"
    },
    default: {
      value: "value",
      onChange: "onChange",
      onBlur: "onBlur",
      onFocus: "onFocus",
      editable: "enabled"
    }
  },
  default: {
    value: "value",
    onChange: "onChange",
    onBlur: "onBlur",
    onFocus: "onFocus",
    disabled: "disabled"
  }
};
export const getAbsoluteValue = (value: any) =>
  value === undefined || value === null ? "" : value;

export const getInputControls = (inputType: string) =>
  isReactNative()
    ? controlsToBeMap.ReactNative[inputType] ||
      controlsToBeMap.ReactNative.default
    : controlsToBeMap.default;

export function getHandler(inputType, value: any, control: FormControl) {
  const controlObject = {};
  const inputControls = getInputControls(inputType);
  Object.keys(inputControls).forEach(key => {
    let controlProperty = null;
    if (key === "value") {
      if (control.updateOn !== "change") {
        controlProperty = getAbsoluteValue(control._pendingValue);
      } else {
        controlProperty = getAbsoluteValue(control.value);
      }
    } else {
      controlProperty = control[inputControls[key]];
    }
    controlObject[key] = controlProperty;
  });
  const mappedObject = controlObject;
  switch (inputType) {
    case "checkbox":
      mappedObject["checked"] = !!mappedObject.value;
      mappedObject["type"] = inputType;
      break;
    case "radio":
      mappedObject["checked"] = mappedObject.value === value;
      mappedObject.value = value;
      mappedObject["type"] = inputType;
      break;
    default:
  }
  return mappedObject;
}
/**
 * Display warning messages
 * @param {condition} any
 * @param {message} string
 * @returns {void}
 */
export function warning(condition: boolean, message: string): void {
  if (process.env.NODE_ENV !== "production") {
    if (!condition) {
      console.error(`Warning: ${message}`);
    }
  }
}
/**
 * Generates the unique key for react elements
 * @param {*} pre
 */
export const generateKey = (pre: any) => {
  return `${pre}_${new Date().getTime()}`;
};

export const FIELD_PROPS = [
  "strict",
  "render",
  "name",
  "index",
  "control",
  "formState",
  "options",
  "parent",
  "meta"
];

export const mapConfigToFieldProps = (config: object) => {
  const props = {};
  if (config) {
    Object.keys(config).forEach(configKey => {
      if (FIELD_PROPS.indexOf(configKey) > -1) {
        props[configKey] = config[configKey];
      }
    });
  }
  return props;
};