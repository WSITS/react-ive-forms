import React, { Component } from 'react'
import configureControl from './configureControl'
import Field from './Field'

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
  private control: FormControl
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
