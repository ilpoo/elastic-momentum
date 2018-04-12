export interface ResolveFunction {
  (returns: any): void;
}

export interface RejectFunction {
  (reason?: any): void;
}

export interface PromiseFunctions {
  resolve: ResolveFunction;
  reject: RejectFunction;
}
