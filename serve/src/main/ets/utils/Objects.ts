export class Objects {
  static clone<T extends {}, U>(target: T, source: U): T & U {
    return Object.assign(target, source);
  }
}