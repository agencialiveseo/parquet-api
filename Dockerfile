
FROM node:16

ARG ver=v0.6.0

RUN apt update 

RUN apt install -y \
	wget \
	ca-certificates \
	jq

RUN apt-get clean

WORKDIR /usr/local/bin

ARG ver
ENV DUCKDB_VER $ver

RUN wget -O cli.zip "https://github.com/duckdb/duckdb/releases/download/$DUCKDB_VER/duckdb_cli-linux-amd64.zip" && \
	unzip cli.zip && \
	rm cli.zip && \
	chmod +x duckdb

WORKDIR /data

# generate db and install httpfs
RUN duckdb myduck.db 'CALL dbgen(sf=0.1)'
RUN duckdb myduck.db 'select 42;'
RUN duckdb myduck.db 'install "httpfs";'

VOLUME ["/data"]

EXPOSE 8080

WORKDIR /usr/src/app

COPY package.json .
RUN npm install
COPY index.js .
COPY db.js .

CMD bash -c "node ."