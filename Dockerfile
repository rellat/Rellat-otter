FROM node

# Create app directory
WORKDIR /usr/src/Rellat

# Install app dependencies
COPY package.json .

RUN npm install

# Bundle app source
COPY . .
RUN echo 'module.exports = { hostname: "127.0.0.1", port: 80 }' >> config.js

EXPOSE 80
EXPOSE 8080
EXPOSE 3000
EXPOSE 443
CMD [ "npm", "start" ]

# setting SSH from https://docs.docker.com/engine/examples/running_ssh_service/
RUN apt-get update && apt-get install -y git openssh-server 
RUN mkdir /var/run/sshd
RUN echo 'root:rellatotter' | chpasswd
RUN sed -i 's/PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

# SSH login fix. Otherwise user is kicked off after login
RUN sed 's@session\s*required\s*pam_loginuid.so@session optional pam_loginuid.so@g' -i /etc/pam.d/sshd

ENV NOTVISIBLE "in users profile"
RUN echo "export VISIBLE=now" >> /etc/profile

EXPOSE 22
CMD ["/usr/sbin/sshd", "-D"]

# docker build -t kifhan/rellat .
# docker run -p 80:80 -p 8080:8080 -p 3000:3000 -p 2121:22 -p 443:443 -d kifhan/rellat