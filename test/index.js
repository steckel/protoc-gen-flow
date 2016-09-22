import tmp from "tmp";
import {spawn} from "child_process";
import {readFileSync, readdirSync} from "fs";
import { deepEqual, strictEqual } from "assert";
import path from "path";
import {describe, it} from "mocha";

const tmpDir = () => new Promise((resolve, reject) => {
  tmp.dir((err, path, cleanup) => {
    if (err != null) {
      reject(err);
      return;
    } else {
      resolve([path, cleanup]);
    }
  });
});

const asyncSpawn = (...args) => new Promise((resolve, reject) => {
  const spawned = spawn(...args);
  let stdout = "";
  let stderr = "";
  spawned.stdout.on('data', (data) => stdout += data.toString());
  spawned.stderr.on('data', (data) => stderr += data.toString());
  spawned.on("close", (code) => {
    resolve({stdout, stderr, code});
  });
});

const plugin = path.resolve(__dirname, "../bin/protoc-gen-flow");

const testCase = (testCase, entry) => {
  describe("proto3", () => {
    let tmpPath, cleanup, stdout, stderr, code, generatedFiles;
    const expectedDir = path.resolve(__dirname, testCase, "expected");
    const expectedFiles = readdirSync(expectedDir);

    before(async () => {
      const protoPath = path.resolve(__dirname, testCase, "src");
      const proto = path.resolve(protoPath, entry);
      [tmpPath, cleanup] = await tmpDir();
      ({stdout, stderr, code} =
        await asyncSpawn("protoc", [ `--plugin=${plugin}`, `--flow_out=${tmpPath}/`, `--proto_path=${protoPath}/`, proto ]));
      generatedFiles = readdirSync(tmpPath);
    });

    it("has an empty stdout", () => {
      strictEqual(stdout, '');
    });

    it("has an empty stderr", () => {
      strictEqual(stderr, '');
    });

    it("returns 0", () => {
      strictEqual(code, 0);
    });

    it("generates the expected files", () => {
      deepEqual(generatedFiles, expectedFiles);
    });

    it("generates the expected flow annotations", () => {
      generatedFiles.forEach((file) => {
        const generated = readFileSync(path.resolve(tmpPath, file), {encoding: "utf8"});
        const expected = readFileSync(path.resolve(expectedDir, file), {encoding: "utf8"});
        strictEqual(generated, expected, file);
      });
    });
  });
};

describe("protoc-gen-flow", () => {
  testCase("proto3", "proto3.proto");
});

