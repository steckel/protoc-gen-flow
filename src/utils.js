export const getFileName = (depName) =>
  `${depName.match(/(.*)\.proto/)[1]}_pb`;

export const getImportPath = (depName) => {
  const prefix = depName.match(/\//g).map((_) => "../").join("");
  return `${prefix}${depName.match(/(.*)\.proto/)[1]}_pb`;
};

export const getModuleName = (depName) => {
  const depNames = depName.match(/(.*)\.proto/)[1].split("/");
  return depNames.splice(1).reduce((str, name) => {
    return `${str}${name.charAt(0).toUpperCase()}${pascalCase(name).slice(1)}`
  }, depNames[0]);
};

// strings

export const camelize = (inStr) => {
  const str = pascalCase(inStr);
  return str.charAt(0).toLowerCase() + str.slice(1);
};

export const pascalCase = (inStr) =>
  inStr.replace(/(?:^|[-_])(\w)/g, (_, c) => c ? c.toUpperCase() : '');
