FROM node:8

ENV PROTOC_VERSION 3.3.0

RUN set -ex; apt-get update; apt-get install -y --no-install-recommends unzip

RUN curl -SLO "https://github.com/google/protobuf/releases/download/v$PROTOC_VERSION/protoc-$PROTOC_VERSION-linux-x86_64.zip" \
  && unzip "protoc-$PROTOC_VERSION-linux-x86_64.zip" -d "protoc-$PROTOC_VERSION-linux-x86_64" \
  && rm "protoc-$PROTOC_VERSION-linux-x86_64.zip" \
  && mv "protoc-$PROTOC_VERSION-linux-x86_64"/bin/protoc /usr/bin/protoc

RUN mkdir -p /opt/protoc-gen-flow
WORKDIR /opt/protoc-gen-flow

COPY package.json /opt/protoc-gen-flow
RUN npm install

CMD [ "npm", "install" ]
