import {CodeGeneratorRequest, CodeGeneratorResponse} from "google-protobuf/google/protobuf/compiler/plugin_pb.js";
import FileGenerator from "./file-generator";
import { getModuleName } from "./utils";

// .flowconfig

const flowConfigTemplate =
`[ignore]

[include]

[libs]

[options]
`;

const generateFlowConfiguration = (fileMessages) => {
  const fileNames = fileMessages.map((file) => file.getName());
  const file = new CodeGeneratorResponse.File();
  file.setName(".flowconfig");
  let content = ""
  content += flowConfigTemplate;
  content += fileNames.reduce((prev, fileName) => {
    const sourceName = fileName.match(/(.*)\.js\.flow/)[1];
    prev += `module.name_mapper='^\\(.*\\)${sourceName}\\(\\.js\\)?$' -> '<PROJECT_ROOT>/decls/${fileName}'\n`;
    return prev;
  }, "");
  file.setContent(content);
  return file;
};

// deps

const typeNameToModule = (getProtoFileList) => {
  const reducerForEnumType = ({packageName, moduleName, prefix}) => (map, descriptor) => {
    const name = `${prefix}${descriptor.getName()}`;
    const fullyQualifiedName = `.${packageName}.${name}`;
    map.set(fullyQualifiedName, { packageName, moduleName, name });
    return map;
  };

  const reducerForMessageType = ({packageName, moduleName, prefix}) => (map, descriptor) => {
    const name = `${prefix}${descriptor.getName()}`;
    const fullyQualifiedName = `.${packageName}.${name}`;
    map.set(fullyQualifiedName, { packageName, moduleName, name });
    map = descriptor.getNestedTypeList().reduce(reducerForMessageType({packageName, moduleName, prefix: `${name}.`}), map);
    return descriptor.getEnumTypeList().reduce(reducerForEnumType({packageName, moduleName, prefix: `${name}.`}), map);
  };

  return getProtoFileList.reduce((map, fileDescriptor) => {
    const packageName = fileDescriptor.getPackage();
    const moduleName = getModuleName(fileDescriptor.getName());
    map = fileDescriptor.getMessageTypeList().reduce(reducerForMessageType({packageName, moduleName, prefix: ""}), map);
    return fileDescriptor.getEnumTypeList().reduce(reducerForEnumType({packageName, moduleName, prefix: ""}), map);
  }, new Map());
};

// CodeGenerator

class CodeGenerator {
  generate(request) {
    const response = new CodeGeneratorResponse();
    try {
      const fileToGenerate = new Set(request.getFileToGenerateList());
      const fileDescriptors = request.getProtoFileList().filter((desc) => fileToGenerate.has(desc.getName()));
      const deps = typeNameToModule(request.getProtoFileList());

      let files = fileDescriptors
        .map((fileDescriptorProto) => new FileGenerator(fileDescriptorProto, deps).generate());
      files.push(generateFlowConfiguration(files));

      response.setFileList(files);
    } catch (e) {
      response.setError(`${e.message}:\n ${e.stack}`);
    }
    return response;
  }
}

export default CodeGenerator;
