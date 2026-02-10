import { CatchErrorDecorator, ErrorHandler, IconFontLibraryError } from './ErrorHandler';

describe('ErrorHandler', () => {
  describe('handle', () => {
    it('should log error name and message to console.error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

      ErrorHandler.handle(new Error('something broke'));

      expect(spy).toHaveBeenCalledWith('Error something broke');
      spy.mockRestore();
    });

    it('should include custom error name in output', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new TypeError('invalid type');

      ErrorHandler.handle(error);

      expect(spy).toHaveBeenCalledWith('TypeError invalid type');
      spy.mockRestore();
    });
  });

  describe('warn', () => {
    it('should log message with IconFontLibraryWarning prefix to console.warn', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      ErrorHandler.warn('directory not found');

      expect(spy).toHaveBeenCalledWith('IconFontLibraryWarning: directory not found');
      spy.mockRestore();
    });
  });
});

describe('IconFontLibraryError', () => {
  it('should set name to IconFontLibraryError', () => {
    const error = new IconFontLibraryError('test', {});

    expect(error.name).toBe('IconFontLibraryError');
  });

  it('should set the message', () => {
    const error = new IconFontLibraryError('something went wrong', {});

    expect(error.message).toBe('something went wrong');
  });

  it('should extend Error', () => {
    const error = new IconFontLibraryError('test', {});

    expect(error).toBeInstanceOf(Error);
  });

  it('should support ErrorOptions with cause', () => {
    const cause = new Error('root cause');
    const error = new IconFontLibraryError('wrapped', { cause });

    expect(error.cause).toBe(cause);
  });
});

describe('CatchErrorDecorator', () => {
  let handleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    handleSpy = vi.spyOn(ErrorHandler, 'handle').mockImplementation(() => {});
  });

  afterEach(() => {
    handleSpy.mockRestore();
  });

  it('should return the original method result when no error occurs', () => {
    class TestClass {
      @CatchErrorDecorator
      public getValue(): number {
        return 42;
      }
    }

    const instance = new TestClass();

    expect(instance.getValue()).toBe(42);
    expect(handleSpy).not.toHaveBeenCalled();
  });

  it('should pass arguments through to the original method', () => {
    class TestClass {
      @CatchErrorDecorator
      public add(a: number, b: number): number {
        return a + b;
      }
    }

    const instance = new TestClass();

    expect(instance.add(3, 4)).toBe(7);
  });

  it('should preserve this context', () => {
    class TestClass {
      public value = 10;

      @CatchErrorDecorator
      public getDouble(): number {
        return this.value * 2;
      }
    }

    const instance = new TestClass();

    expect(instance.getDouble()).toBe(20);
  });

  it('should catch a thrown string and wrap it in an Error', () => {
    class TestClass {
      @CatchErrorDecorator
      public throwString(): void {
        throw 'string error';
      }
    }

    const instance = new TestClass();
    instance.throwString();

    expect(handleSpy).toHaveBeenCalledTimes(1);
    const passedError = handleSpy.mock.calls[0][0];
    expect(passedError).toBeInstanceOf(Error);
    expect(passedError.message).toBe('string error');
  });

  it('should catch an object with a message property and wrap it in an Error', () => {
    class TestClass {
      @CatchErrorDecorator
      public throwObject(): void {
        throw { message: 'object error' };
      }
    }

    const instance = new TestClass();
    instance.throwObject();

    expect(handleSpy).toHaveBeenCalledTimes(1);
    const passedError = handleSpy.mock.calls[0][0];
    expect(passedError).toBeInstanceOf(Error);
    expect(passedError.message).toBe('object error');
  });

  it('should catch an Error instance and create an unknown error message', () => {
    class TestClass {
      @CatchErrorDecorator
      public throwError(): void {
        throw new Error('original message');
      }
    }

    const instance = new TestClass();
    instance.throwError();

    expect(handleSpy).toHaveBeenCalledTimes(1);
    const passedError = handleSpy.mock.calls[0][0];
    expect(passedError).toBeInstanceOf(Error);
    expect(passedError.message).toBe('an unknown error occurred');
  });

  it('should catch undefined/null and create an unknown error message', () => {
    class TestClass {
      @CatchErrorDecorator
      public throwNull(): void {
        throw null;
      }
    }

    const instance = new TestClass();
    instance.throwNull();

    expect(handleSpy).toHaveBeenCalledTimes(1);
    const passedError = handleSpy.mock.calls[0][0];
    expect(passedError.message).toBe('an unknown error occurred');
  });

  it('should catch a number and create an unknown error message', () => {
    class TestClass {
      @CatchErrorDecorator
      public throwNumber(): void {
        throw 404;
      }
    }

    const instance = new TestClass();
    instance.throwNumber();

    expect(handleSpy).toHaveBeenCalledTimes(1);
    const passedError = handleSpy.mock.calls[0][0];
    expect(passedError.message).toBe('an unknown error occurred');
  });
});
