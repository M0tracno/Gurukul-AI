// This file overrides the problematic @types/minimatch package
// minimatch provides its own types, so we don't need @types/minimatch
declare module 'minimatch' {
  function minimatch(target: string, pattern: string, options?: any): boolean;
  export = minimatch;
}
