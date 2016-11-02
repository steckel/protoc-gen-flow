import {CodeGeneratorRequest, CodeGeneratorResponse} from "google-protobuf/google/protobuf/compiler/plugin_pb.js";
import FileGenerator from "./file-generator";

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

class CodeGenerator {
  generate(request) {
    const response = new CodeGeneratorResponse();
    try {
      const fileToGenerate = new Set(request.getFileToGenerateList());
      const fileDescriptors = request.getProtoFileList().filter((desc) => fileToGenerate.has(desc.getName()));
      let files = fileDescriptors.map((fileDescriptorProto) => new FileGenerator(fileDescriptorProto).generate());
      files.push(generateFlowConfiguration(files));
      response.setFileList(files);
    } catch (e) {
      response.setError(`${e.message}:\n ${e.stack}`);
    }
    return response;
  }
}

export default CodeGenerator;
