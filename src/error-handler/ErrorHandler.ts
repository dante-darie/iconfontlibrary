import { IErrorHandler, IIconFontLibraryError } from './ErrorHandler.types';

export const CatchErrorDecorator = (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    try {
      return originalMethod.apply(this, args);
    } catch (e) {
      let error;

      if (typeof e === 'string') {
        error = new Error(e);
      } else if (e && typeof e === 'object' && !(e instanceof Error) && 'message' in e && typeof e.message === 'string') {
        error = new Error(e.message);
      } else {
        error = new Error('an unknown error occurred');
      }

      ErrorHandler.handle(error);
    }
  };
};

export class IconFontLibraryError extends Error implements IIconFontLibraryError {
  constructor(message: string, options: ErrorOptions) {
    super(message, options);

    this.name = 'IconFontLibraryError';
  }
}

export abstract class ErrorHandler implements IErrorHandler {
  public static handle({ name, message }: Error) {
    console.error(`${name} ${message}`);
  }

  public static warn(message: string) {
    console.warn(`IconFontLibraryWarning: ${message}`);
  }
}
