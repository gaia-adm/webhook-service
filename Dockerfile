FROM gaiaadm/nodejs:4.4.7

# Set the working directory
WORKDIR /src

# set Node to production
ARG NODE=production
ENV NODE_ENV ${NODE}

# Install app dependencies
COPY package.json /tmp/package.json
RUN npm config set proxy "http://16.82.112.30:8080"
RUN npm config set https-proxy "http://16.82.112.30:8080"
ENV proxy "http://16.82.112.30:8080"
ENV https_proxy "http://16.82.112.30:8080"
RUN cd /tmp && npm install && mv /tmp/node_modules /src/ && rm -rf /tmp/*

# Bundle app source
COPY . /src

EXPOSE  3000

CMD ["node", "/src/server.js"]
