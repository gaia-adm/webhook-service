FROM gaiaadm/nodejs:4.4.3

# Set the working directory
WORKDIR /src

# Bundle app source
COPY . /src

# setup.sh script is temporary workaround until Docker adds support for passing ENV variables
# to docker build command to allow setting up proxy
ADD setup.sh /tmp/setup.sh
RUN chmod +x /tmp/setup.sh
RUN sync
RUN /tmp/setup.sh /src

# moved to circle.yml: RUN grunt --gruntfile /src/Gruntfile.js jshint

EXPOSE  3000

CMD ["node", "/src/server.js"]

# temporary - manual run example: docker run -e AMQ_USER="admin" -e AMQ_SERVER="localhost:5672" -p 3210:3000 -e ETCD_SERVER="localhost:4001" -e AUTH_SERVER="localhost:9001"-i -t --rm --name tcs gaiaadm/tcs
