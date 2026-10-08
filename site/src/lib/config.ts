/** Relative path from the current page to the site root ("./" or "../"). */
export const ROOT: string =
  document.querySelector('meta[name="site-root"]')?.getAttribute('content') ?? './';
export const url = (path: string) => ROOT + path;
