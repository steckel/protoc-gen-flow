# protoc-gen-flow

This project aims to generate [flow](http://www.flowtype.com) annotations for use with Google's [JavaScript implementation](https://github.com/google/protobuf/tree/master/js) of [Protocol Buffers](https://developers.google.com/protocol-buffers/).

## Not for production use.

This plugin is in active development, but very volatile. Please do not blindly use output in production, as it may be incomplete or inaccurate.

## Usage

```
npm install -g protoc-gen-flow
protoc --js_out=import_style=commonjs,binary:./ --flow_out=./ --proto_path=./test/proto3/src ./test/proto3/src/proto3.proto
```

