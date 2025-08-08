declare module '@storybook/react' {
  export interface Meta<T = {}> {
    title?: string;
    component?: T;
    parameters?: any;
    argTypes?: any;
    args?: any;
    decorators?: any[];
    [key: string]: any;
  }

  export interface StoryObj<T = {}> {
    args?: any;
    parameters?: any;
    [key: string]: any;
  }

  export type Story<T = {}> = StoryObj<T>;
}
