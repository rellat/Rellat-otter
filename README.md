# Rellat
The Simultaneous Collaboration Coding service to show people how to make code in real time.
Rellat Alpha with WebRTC. Simple Collaborative Code editor. Code name is Otter.

This is web server + socket server + web client.
You can test it on http://ide.rellat.com/
Or https://rellat.herokuapp.com/

## Install

- install node.js and npm.

- Download source from github.

```
git clone --recursive https://github.com/kifhan/Rellat-otter.git
cd Rellat-otter
npm install
cd mhweb
npm install
cd ..
```

- Run

```
node server.js
```

- if you want to see debug log, (in linux or mac)

```
DEBUG=y:* node server.js
```

## Made with
- [multihack-web](https://github.com/RationalCoding/multihack-web)
- [yjs](https://github.com/y-js/yjs)
