export const camelize = (inStr) => {
  const str = pascalCase(inStr);
  return str.charAt(0).toLowerCase() + str.slice(1);
};

export const pascalCase = (inStr) => inStr.replace(/(?:^|[-_])(\w)/g, (_, c) => c ? c.toUpperCase() : '');
