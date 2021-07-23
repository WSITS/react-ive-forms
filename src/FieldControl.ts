import React, { Component } from 'react'
import { AbstractControl } from "./AbstractControl";
import configureControl from './configureControl'
import Field from './Field'
import { FormArray } from "./FormArray";
import { FormControl } from "./FormControl";
import { FormGroup } from "./FormGroup";
import { ValidatorFn } from "./types";

type FormState = {
  value: any
  disabled: boolean
}

type ContextType = {
  parentControl: FormArray | FormGroup
}

interface IFieldControlProps {
  strict: boolean,
  render: () => JSX.Element,
  name: string,
  index: number,
  control: FormControl,
  formState: FormState | any,
  options: {
    validators: ValidatorFn | ValidatorFn[],
    asyncValidators:  ValidatorFn | ValidatorFn[],
    updateOn: 'change' | 'blur' | 'submit'
  },
  parent: FormArray | FormGroup,
  meta: object
}

export default class FieldControl extends Component<IFieldControlProps> {
  public defaultProps = {
    strict: true
  }
  private control: AbstractControl | null
  constructor(props: IFieldControlProps, context: ContextType) {
    super(props, context)
    this.control = configureControl(props, context, 'FormControl')
  }
  public componentDidUpdate(prevProps: IFieldControlProps): void {
    if (this.props.name !== prevProps.name) {
      this.control = configureControl(this.props, this.context, 'FormControl')
    }
  }
  public render(): JSX.Element {
    const { strict, children, render } = this.props
    const FieldProps = {
      control: this.control,
      strict,
      render: render || children || null
    }
    return React.createElement(Field, FieldProps)
  }
}
