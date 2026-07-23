declare module 'hbs' {
  function compile(template: string): (data: Record<string, unknown>) => string;
  export default { compile };
}
