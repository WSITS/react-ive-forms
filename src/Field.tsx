import React, { Component } from 'react';
import { Subscription } from "rxjs";
import { FormArray } from "./FormArray";
import { FormControl } from "./FormControl";
import { FormGroup } from "./FormGroup";
import { warning } from './utils';

type ControlTypes = FormControl | FormArray | FormGroup

interface IFieldProps {
  strict?: boolean
  control: ControlTypes
  render?: () => JSX.Element
}

export default class Field extends Component<IFieldProps> {
  public componentDidMount(): void {
    const { control } = this.props
    // Add listener
    this.addListener(control)
  }
  public componentDidUpdate(prevProps: IFieldProps): void {
    const { control } = this.props
    if (control !== prevProps.control) {
      this.removeListener(control)
      this.addListener(control)
    }
  }
  public addListener(control: ControlTypes): void {
    if (control) {
      control.stateChanges.subscribe(() => {
        this.forceUpdate()
      })
    }
  }
  public removeListener(control: ControlTypes): void {
    if (control) {
      if (control.stateChanges.observers) {
        control.stateChanges.observers.forEach((observer: Subscription) => {
          control.stateChanges.unsubscribe(observer)
        })
      }
    }
  }
  public componentWillUnmount(): void {
    const { control } = this.props
    // Remove Listener
    this.removeListener(control)
  }
  public shouldComponentUpdate(props: IFieldProps): boolean {
    if (!props.strict) {
      return true
    }
    return false
  }
  public getComponent(): JSX.Element {
    const { render, children, control } = this.props
    warning(
      control,
      `Missing Control.Please make sure that an instance of FormControl, FormGroup or FormArray must be passed as a control prop in the Field component`
    )
    if (control) {
      // Render function as child
      if (children) {
        return children(control)
      }
      // Render function as render prop
      if (render) {
        return render(control)
      }
      return <></>
    }
    return <></>
  }
  public render(): JSX.Element {
    return this.getComponent()
  }
}