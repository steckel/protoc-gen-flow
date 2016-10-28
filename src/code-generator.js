import {CodeGeneratorRequest, CodeGeneratorResponse} from "google-protobuf/google/protobuf/compiler/plugin_pb.js";
import FileGenerator from "./file-generator";
import {getAllTypeNames} from "./utils";

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
      /*
       * FIXME: We should parse the file's types into a map and pass them to
       * the FileGenerator for better referencing of imports.
       */
      const fileTest = new CodeGeneratorResponse.File();
      fileTest.setName("a");
      const filesAndTypes = request.getProtoFileList().reduce((arr, fileDescriptorProto) => {
        return [
          ...arr,
          `${fileDescriptorProto.getName()}: ${getAllTypeNames(fileDescriptorProto).join(',')}`
        ];
      }, []);
      fileTest.setContent(filesAndTypes.join('\n'));

      let files = request.getProtoFileList()
        .map((fileDescriptorProto) => new FileGenerator(fileDescriptorProto).generate());
      files.push(generateFlowConfiguration(files));
      files.unshift(fileTest);
      response.setFileList(files);
    } catch (e) {
      response.setError(`${e.message}:\n ${e.stack}`);
    }
    return response;
  }
}

export default CodeGenerator;
