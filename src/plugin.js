import CodeGenerator from './code-generator';
import {CodeGeneratorRequest} from "google-protobuf/google/protobuf/compiler/plugin_pb.js";

const generateCode = (serializedRequest) => {
  const request = CodeGeneratorRequest.deserializeBinary(serializedRequest);
  const generator = new CodeGenerator();
  const response = generator.generate(request);
  const serializedResponse = response.serializeBinary();
  return Buffer.from(serializedResponse); // TODO: is Buffer.from necessary?
};

const stdin = (stream) => new Promise((resolve, reject) => {
  let value = [];
  let length = 0;

  stream.on("readable", () => {
    var chunk;
    while ((chunk = stream.read())) {
      value.push(chunk);
      length += chunk.length;
    }
  });

  stream.on("end", () => {
    resolve(Buffer.concat(value, length));
  });
});

const main = () => stdin(process.stdin)
  .then((data) => new Uint8Array(data))
  .then(generateCode)
  .then((output) => process.stdout.write(output, {encoding:'binary'}))
  .then(() => process.exit(0))
  .catch((error) => {
    console.warn(error);
    process.exit(1);
  });

export default main;
