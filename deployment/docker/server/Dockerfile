FROM ubuntu:mantic

# Install node 20 on the ubuntu image

RUN apt-get update && apt-get install -y ca-certificates curl gnupg
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
ARG NODE_MAJOR=20
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt-get update && apt-get install nodejs -y
RUN npm install --global yarn

# Install tools needed for the multilink

RUN apt update && apt -y install openvpn openssl bridge-utils sed kmod iproute2 iptables net-tools iputils-ping

RUN mkdir -p /etc/openvpn/server

WORKDIR /server

COPY . .

WORKDIR /server/api

RUN yarn

CMD ["node", "api_server.js"]

EXPOSE 3333