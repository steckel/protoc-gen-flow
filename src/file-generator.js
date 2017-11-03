import {CodeGeneratorResponse} from "google-protobuf/google/protobuf/compiler/plugin_pb.js";
import {FieldDescriptorProto, FieldOptions} from 'google-protobuf/google/protobuf/descriptor_pb.js';
import {
  camelize,
  getFileName,
  getImportPath,
  getModuleName,
  pascalCase
} from "./utils";

const GENERATED_COMMENT = "// GENERATED CODE -- DO NOT EDIT!";
const INDENT = "  ";

const isNullable = (type) => {
  switch (type) {
    case FieldDescriptorProto.Type.TYPE_DOUBLE:
    case FieldDescriptorProto.Type.TYPE_FLOAT:
    case FieldDescriptorProto.Type.TYPE_DOUBLE:
    case FieldDescriptorProto.Type.TYPE_FLOAT:
    case FieldDescriptorProto.Type.TYPE_INT64:
    case FieldDescriptorProto.Type.TYPE_UINT64:
    case FieldDescriptorProto.Type.TYPE_INT32:
    case FieldDescriptorProto.Type.TYPE_FIXED64:
    case FieldDescriptorProto.Type.TYPE_FIXED32:
    case FieldDescriptorProto.Type.TYPE_UINT32:
    case FieldDescriptorProto.Type.TYPE_SFIXED32:
    case FieldDescriptorProto.Type.TYPE_SFIXED64:
    case FieldDescriptorProto.Type.TYPE_SINT32:
    case FieldDescriptorProto.Type.TYPE_SINT64:
    case FieldDescriptorProto.Type.TYPE_BOOL:
    case FieldDescriptorProto.Type.TYPE_STRING:
    case FieldDescriptorProto.Type.TYPE_BYTES:
    case FieldDescriptorProto.Type.TYPE_ENUM:
      return false;
    case FieldDescriptorProto.Type.TYPE_GROUP:
    case FieldDescriptorProto.Type.TYPE_MESSAGE:
      return true;
    default: throw new Error("UNEXPECTED TYPE");
  }
};

const generateOtherMethods = (name) => {
  return `${INDENT}toObject(opt_includeInstance: ?boolean): ${name}Obj;
${INDENT}serializeBinary(): Uint8Array;
${INDENT}serializeBinaryToWriter(writer: any): void;
${INDENT}cloneMessage(): ${name};
${INDENT}static deserializeBinary(bytes: any): ${name};
${INDENT}static deserializeBinaryFromReader(msg: ${name}, reader: any): ${name};
${INDENT}static serializeBinaryToWriter(message: ${name}, writer: any): void;
${INDENT}static toObject(includeInstance: boolean|typeof undefined, msg: ${name}): ${name}Obj;
`;
};

const generateEnumTypes = (ret, enumDescriptor) => {
  ret += `declare export var ${enumDescriptor.getName()}: {\n`;
  ret += enumDescriptor.getValueList().reduce((_ret, value, i, list) => {
    _ret += `${INDENT}${value.getName()}: ${value.getNumber()}`
    if (i !== list.length -1) _ret += ",\n";
    return _ret;
  }, "");
  ret += "\n";
  ret += "}\n";
  ret += "\n";
  ret += `export type ${enumDescriptor.getName()}Type = `;
  ret += enumDescriptor.getValueList().reduce((_ret, value, i, list) => {
    _ret += value.getNumber();
    if (i !== list.length -1) _ret += " | ";
    return _ret;
  }, "");
  ret += ";\n";
  ret += "\n";
  return ret;
};

const reducerForEnumTypes = (parentDescriptors) => (ret, enumDescriptor, index, collection) => {
  const prefix = parentDescriptors.map((desc) => desc.getName()).join("$");
  ret += `type ${prefix}$${enumDescriptor.getName()} = {\n`;
  ret += enumDescriptor.getValueList().reduce((_ret, value, i, list) => {
    _ret += `${INDENT}${value.getName()}: ${value.getNumber()}`
    if (i !== list.length -1) _ret += ",\n";
    return _ret;
  }, "");
  ret += "\n";
  ret += "}\n";
  ret += "\n";
  ret += `export type ${prefix}$${enumDescriptor.getName()}Type = `;
  ret += enumDescriptor.getValueList().reduce((_ret, value, i, list) => {
    _ret += value.getNumber();
    if (i !== list.length -1) _ret += " | ";
    return _ret;
  }, "");
  ret += ";\n";
  ret += "\n";
  return ret;
};

const reducerForNestedStaticEnums = (prefix) => (ret, enumDescriptorProto, index, collection) => {
  const name = enumDescriptorProto.getName();
  ret += `${INDENT}static ${name}: ${prefix}$${name};\n`;
  return ret;
};

class FileGenerator {
  constructor(fileDescriptorProto, deps) {
    this.fileDescriptorProto = fileDescriptorProto;
    this.deps = deps;
    this.importTypes = Array.from(this.deps.values()).reduce((map, dep) => {
      map[dep.moduleName] = new Set();
      return map;
    }, {});
  }

  generate() {
    const file = new CodeGeneratorResponse.File();
    const strippedName = getFileName(this.fileDescriptorProto.getName());
    file.setName(`${strippedName}.js.flow`);

    let content = "";
    content += this.fileDescriptorProto.getMessageTypeList().reduce(this.reducerForMessageTypes().bind(this), "");
    content += this.fileDescriptorProto.getEnumTypeList().reduce(generateEnumTypes, "");

    let header = "// @flow\n";
    header += `${GENERATED_COMMENT}\n`;
    header += "\n";
    header += this.fileDescriptorProto.getDependencyList().reduce(this.reduceDependencies.bind(this), "");
    file.setContent(header + content);
    return file;
  }

  reduceDependencies(ret, dependency, index, array) {
    const moduleName = getModuleName(dependency);
    const importTypes = Array.from(this.importTypes[moduleName].values());
    ret += `import * as ${moduleName} from "${getImportPath(dependency)}.js";\n`;
    if (importTypes.length > 0) {
      ret += `import type {${importTypes.join(", ")}} from "${getImportPath(dependency)}.js";\n`;
    }
    if (array.length - 1 === index) ret += "\n";
    return ret;
  }

  reducerForMessageTypes(parentDescriptors = []) {
    return (ret, descriptorProto) => {
      ret += this.generateMessageClass(descriptorProto, parentDescriptors);
      const nestedEnumReducer = reducerForEnumTypes([...parentDescriptors, descriptorProto]);
      ret += descriptorProto.getEnumTypeList().reduce(nestedEnumReducer, "");
      ret += this.generateMessageObj(descriptorProto, parentDescriptors);
      ret += descriptorProto.getNestedTypeList().reduce(this.reducerForMessageTypes([...parentDescriptors, descriptorProto]).bind(this), "");
      return ret;
    }
  }

  /**
   * ```
   * declare export class Foo {
   *   ...
   * }
   * ```
   */
  generateMessageClass(descriptorProto, parentDescriptors) {
    if (descriptorProto.hasOptions() && descriptorProto.getOptions().getMapEntry()) {
      return "";
    }

    let ret = "";

    const name = (() => {
      var prefix = parentDescriptors.map((desc) => desc.getName()).join("$");
      return prefix === '' ? descriptorProto.getName() : `${prefix}$${descriptorProto.getName()}`;
    })();

    ret += `declare export class ${name} {\n`;
    ret += descriptorProto.getFieldList().reduce(this.reduceMessageFields.bind(this), "");
    ret += generateOtherMethods(name);
    ret += descriptorProto.getNestedTypeList().reduce(this.reducerForNestedStaticTypes([...parentDescriptors, descriptorProto]).bind(this), "");
    ret += descriptorProto.getEnumTypeList().reduce(reducerForNestedStaticEnums(name).bind(this), "");
    ret += '}\n';
    ret += "\n";
    return ret;
  }

  /**
   * ```
   * export type FooObj = {
   *   ...
   * }
   * ```
   */
  generateMessageObj(descriptorProto, parentDescriptors) {
    let ret = "";
    const name = (() => {
      var prefix = parentDescriptors.map((desc) => desc.getName()).join("$");
      return prefix === '' ? descriptorProto.getName() : `${prefix}$${descriptorProto.getName()}`;
    })();
    ret += `export type ${name}Obj = {\n`;
    ret += descriptorProto.getFieldList().reduce(this.reduceMessageObjFields.bind(this), "");
    ret += '}\n';
    ret += '\n';
    return ret;
  }

  // fields

  reduceMessageFields(prev, fieldDescriptor, index, array) {
    const isMap = this.isMap(fieldDescriptor);
    prev += `${INDENT}${this.getterForField(fieldDescriptor, {isMap})}\n`;
    if (!isMap) prev += `${INDENT}${this.setterForField(fieldDescriptor)}\n`;
    return prev;
  }

  reduceMessageObjFields(ret, fieldDescriptor, index, array) {
    const isMap = this.isMap(fieldDescriptor);
    const fieldName = this.getFieldName(fieldDescriptor, {isMap});
    const fieldType = this.getType(fieldDescriptor, {toObject: true});
    const tail = (index === (array.length - 1)) ? "\n" : ",\n";

    ret += `${INDENT}${fieldName}: ${fieldType}${tail}`;
    return ret;
  }

  reducerForNestedStaticTypes(parentDescriptors) {
    const prefix = parentDescriptors.map((desc) => desc.getName()).join("$") + "$";
    return (ret, descriptorProto, index, collection) => {
      const options = descriptorProto.getOptions();
      if (options != null && options.getMapEntry()) return ret;

      const name = descriptorProto.getName();
      ret += `${INDENT}static ${name}: typeof ${prefix}${name};\n`;
      return ret;
    }
  }

  //
  // FieldDescriptorProto
  //

  getFieldName(fieldDescriptor, options = {}) {
    const {isMap} = Object.assign({}, {isMap: false}, options);
    let name = camelize(fieldDescriptor.getName());
    if (fieldDescriptor.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED) {
      name += isMap ? "Map" : "List";
    }
    return name;
  }

  getterForField(fieldDescriptor, options = {}) {
    const {isMap} = Object.assign({}, {isMap: false}, options);
    let name = pascalCase(fieldDescriptor.getName());
    if (fieldDescriptor.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED) {
      name += isMap ? "Map" : "List";
    }
    return `get${name}(): ${this.getType(fieldDescriptor, {isMap})};`;
  }

  setterForField(fieldDescriptor) {
    let name = pascalCase(fieldDescriptor.getName());
    if (fieldDescriptor.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED) name += "List";
    return `set${name}(val: ${this.getType(fieldDescriptor)}): void;`;
  }


  getType(fieldDescriptor, options = {}) {
    const {toObject, isMap} = Object.assign({}, {isMap: false, toObject: false}, options);

    let partOne, partTwo, type;
    if (toObject) {
      [partOne, partTwo] = this.getType$label(fieldDescriptor);
      type = this.getType$type(fieldDescriptor, toObject);
    } else {
      [partOne, partTwo] = isMap ? ["", ""] : this.getType$label(fieldDescriptor);
      // FIXME(steckel): 'any' is a shitty type for a Map;
      type = isMap ? "any" : this.getType$type(fieldDescriptor, toObject);
    }

    if (Array.isArray(type)) {
      return type.map((t) => `${partOne}${t}${partTwo}`).join("|");
    } else {
      return `${partOne}${type}${partTwo}`;
    }
  }

  getType$label(fieldDescriptor) {
    switch (fieldDescriptor.getLabel()) {
      case FieldDescriptorProto.Label.LABEL_OPTIONAL:
        return [(isNullable(fieldDescriptor.getType()) ? "?" : ""), ""];
      case FieldDescriptorProto.Label.LABEL_REQUIRED: return ["", ""];
      case FieldDescriptorProto.Label.LABEL_REPEATED: return ["Array<", ">"];
    }
  }

  getType$type(fieldDescriptor, toObject) {
    const type = fieldDescriptor.getType();
    const typeName = fieldDescriptor.getTypeName();

    switch (type) {
      case FieldDescriptorProto.Type.TYPE_DOUBLE:
      case FieldDescriptorProto.Type.TYPE_FLOAT:
      case FieldDescriptorProto.Type.TYPE_INT32:
      case FieldDescriptorProto.Type.TYPE_FIXED32:
      case FieldDescriptorProto.Type.TYPE_UINT32:
      case FieldDescriptorProto.Type.TYPE_SFIXED32:
      case FieldDescriptorProto.Type.TYPE_SINT32:
        return "number";
      case FieldDescriptorProto.Type.TYPE_INT64:
      case FieldDescriptorProto.Type.TYPE_UINT64:
      case FieldDescriptorProto.Type.TYPE_SINT64:
      case FieldDescriptorProto.Type.TYPE_FIXED64:
      case FieldDescriptorProto.Type.TYPE_SFIXED64:
        if (fieldDescriptor.hasOptions() && fieldDescriptor.getOptions().hasJstype()) {
          if (fieldDescriptor.getOptions().getJstype() === FieldOptions.JSType.JS_STRING) {
            return "string";
          }
        }
        return "number";
      case FieldDescriptorProto.Type.TYPE_BOOL:
        return "boolean";
      case FieldDescriptorProto.Type.TYPE_STRING:
        return "string";
      case FieldDescriptorProto.Type.TYPE_BYTES:
        return ["string", "Uint8Array"];
      case FieldDescriptorProto.Type.TYPE_GROUP:
      case FieldDescriptorProto.Type.TYPE_MESSAGE: {
        const dependency = this.deps.get(typeName);
        if (dependency == null) {
          return `${typeName}${toObject ? "Obj" : ""}`;
        } else {
          const normalizedName = dependency.name.replace(/\./g, "$");
          if (toObject) {
            const typeName = `${normalizedName}Obj`;
            this.importTypes[dependency.moduleName].add(typeName);
            return typeName;
          } else {
            return (dependency.fileName === this.fileDescriptorProto.getName())
              ? normalizedName
              : `${dependency.moduleName}.${normalizedName}`;
          }
        }
      }
      case FieldDescriptorProto.Type.TYPE_ENUM: {
        const dependency = this.deps.get(typeName);
        if (dependency == null) {
          return `${typeName}Type`;
        } else {
          const typeName = `${dependency.name.replace(/\./g, "$")}Type`;
          this.importTypes[dependency.moduleName].add(typeName);
          return typeName;
        }
        // TODO: https://github.com/steckel/protoc-gen-flow/issues/9 Add to req imports
      }
      default:
        return "ERROR";
    }
  }

  isMap(fieldDescriptor) {
    const isMessageType = fieldDescriptor.getType() === FieldDescriptorProto.Type.TYPE_MESSAGE;
    const isRepeated = fieldDescriptor.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED;
    // repeated message types are potential maps
    if (!(isMessageType && isRepeated)) return;

    // FIXME(steckel): This is sloppy.
    let typeName = fieldDescriptor.getTypeName();
    const type = typeName.split(".")
    typeName = type[type.length - 1];

    const find = (typeName, descriptorProtos) => {
      let found = undefined;
      for (let descriptorProto of descriptorProtos) {

        if (descriptorProto.getName() === typeName) {
          found = descriptorProto;
          break;
        }

        let deepFound = find(typeName, descriptorProto.getNestedTypeList());
        if (deepFound != null) {
          found = deepFound;
          break;
        }
      }

      return found;
    };

    const foundDescriptor = find(typeName, this.fileDescriptorProto.getMessageTypeList());

    return foundDescriptor != null &&
      foundDescriptor.hasOptions() &&
      foundDescriptor.getOptions().getMapEntry();
  }
}

export default FileGenerator;
