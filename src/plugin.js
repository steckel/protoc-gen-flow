import CodeGenerator from './code-generator';
import {CodeGeneratorRequest} from "google-protobuf/google/protobuf/compiler/plugin_pb.js";

const generateCode = (serializedRequest) => {
  const request = CodeGeneratorRequest.deserializeBinary(serializedRequest);
  const generator = new CodeGenerator();
  const response = generator.generate(request);
  const serializedResponse = response.serializeBinary();
  return Buffer.from(serializedResponse); // TODO: is Buffer.from necessary?
};

const main = () => {
   process.stdin.on('readable', () => {
    const data = process.stdin.read();
    if (data == null) return;

    const input = new Uint8Array(data); // TODO: s/Uint8Array/Buffer
    const output = generateCode(input);
    process.stdout.write(output, {encoding:'binary'});
    process.exit(0);
 });
};

export default main;
