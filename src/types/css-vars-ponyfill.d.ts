// Type definitions for css-vars-ponyfill
declare module 'css-vars-ponyfill' {
  interface CssVarsOptions {
    watch?: boolean;
    onlyLegacy?: boolean;
    shadowDOM?: boolean;
    silent?: boolean;
    preserveStatic?: boolean;
    preserveVars?: boolean;
    variables?: Record<string, string>;
    include?: string;
    exclude?: string;
    fixNestedCalc?: boolean;
    onlyVars?: boolean;
    updateDOM?: boolean;
    updateURLs?: boolean;
    onBeforeSend?: (xhr: XMLHttpRequest, node: HTMLElement, url: string) => void;
    onWarning?: (message: string) => void;
    onError?: (message: string, node: HTMLElement, xhr: XMLHttpRequest, url: string) => void;
    onSuccess?: (cssText: string, node: HTMLElement, url: string) => void;
    onComplete?: (cssText: string, styleNode: HTMLElement, cssVariables: Record<string, string>, benchmark: number) => void;
  }

  function cssVars(options?: CssVarsOptions): void;
  
  export default cssVars;
}

