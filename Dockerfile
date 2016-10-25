FROM alpine:3.4

COPY package.json package.json

RUN apk add --update nodejs \
    && apk add --update protobuf

ENTRYPOINT ["npm"]
