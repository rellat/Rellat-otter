
    var client = new WebTorrent()
    Polymer({
      is: 'shared-filesystem',
      properties: {
        /**
         * `path` is the sub-folder you want to show. Defaults to '/'
         */
        path: {
          type: Array,
          value: [],
          notify: true,
          observer: '_updatePath'
        },
        /**
         * Readable version of `path` in the form '/sub/subsub/'
         */
        readablePath: {
          type: String,
          computed: '_computeReadablePath(path)',
          notify: true
        },
        /**
         * Files in the current `path`
         */
        files: {
          type: Array,
          value: [],
          notify: true,
          readOnly: true
        },
        /**
         * Webrtc room name (required)
         */
        room: String
      },
      _fileInputEvent: function () {
        var input = this.$.fileInputElement.inputElement
        this.createFiles(input.files)
        input.value = ""
        this.$.createDialog.close()
      },
      createFiles: function (files) {
        var self = this
        for(var i=0; i < files.length; i++){
          (function (file) {
            var createFile = function () {
              console.log('Client is seeding ' + torrent.magnetURI)
              self.createFile(file.name, torrent.magnetURI)
            }
            var torrent = this.webtorrent.seed(file)
            // we don't care if its an error (there are some cases when it is expected - when a file is added twice, webtorrent won't create two duplicate torrents)
            torrent.on('metadata', createFile)
            torrent.on('error', function (err) {
              // I expect here that the error is something like 'Cannot add duplicate torrent 2d0e9fe2a9277b88ff9e7ddd0924fc691325a27d'
              // Where 2d0.. is the infoHash. I think this is the only way to retrieve the non-duplicate (maybe also via torrent._debugid?)
              var infoHash = err.message.slice(29)
              var torrent = self.webtorrent.torrents.find(function (torrent) {
                return torrent.infoHash === infoHash
              })
              if (torrent == null) {
                throw new Error('This hack does not work anymore, implement something proper!')
              } else {
                console.log('Client is seeding (case 2) ' + torrent.magnetURI)
                self.createFile(file.name, torrent.magnetURI)
              }
            })
          }).call(this, files[i])
        }
      },
      _computeReadablePath: function (path) {
        return '/' + path.join('/')
      },
      attached: function() {
        if (this.room == null) {
          throw new Error('You must specify a room property!')
        }
        var self = this
        this.$.createDialog.fitInto = this.$.main
        this.y = null
        this.folder = null
        this._updateFiles = this._updateFiles.bind(this)
        this.createFiles = this.createFiles.bind(this)
        this._unobservePath = Promise.resolve(function () {}) // just mocking function behavior
        Y({
          db: {
            name: 'memory'
          },
          connector: {
            name: 'webrtc',
            room: this.room
          },
          sourceDir: '/components',
          share: {
            root: 'Map'
          }
        }).then(function (y) {
          self.y = y
          self.folder = y.share.root
          self._updatePath()
        })
        this.webtorrent = new WebTorrent()
        DragDrop('#main', this.createFiles)
        window.setInterval(this._updateFiles, 100)
      },
      goBack () {
        if (this.path.length > 0) {
          this.path = this.path.slice(0, -1)
        }
      },
      getFileIcon (file) {
        return file.type === 'file' ? 'icons:description' : 'icons:folder'
      },
      getTorrent: function (magnetURI, f) {
        return this.webtorrent.torrents.find(function (t) {
          return t.magnetURI === magnetURI
        })
      },
      _deleteFile: function (e) {
        this.folder.delete(e.model.file.name)
        e.preventDefault()
        e.stopPropagation()
      },
      _fileClicked: function (e) {
        var f = e.model.file
        if (f.type === 'file') {
          var self = this
          var torrent = this.getTorrent(f.val)
          if (torrent == null) {
            this.webtorrent.add(f.val, function (torrent) {
              self._updateFiles()
              torrent.files[0].getBlobURL(self._updateFiles)
            })
          } else if (torrent.files.length > 0) {
            var location = torrent.files[0].getBlobURL(function (err, url) {
              if (err == null) {
                // window.location = url
                console.log('got it', url)
                var a = document.createElement('a')
                a.setAttribute('href', url)
                a.setAttribute('download', torrent.files[0].name)
                document.body.appendChild(a)
                a.click()
                a.remove()
              } else {
                console.err(err)
              }
            })
          }
        } else {
          this.path = this.path.concat([f.name])
        }
      },
      _updatePath: function () {
        if (this.y != null) {
          var self = this
          this._unobservePath.then(function (del) {del()})
          this._unobservePath = this.y.share.root.observePath(this.path, function (folder) {
            if (folder instanceof Y.Map.typeDefinition.class) {
              self.folder.unobserve(self._updateFiles)
              self.folder = folder
              self.folder.observe(self._updateFiles)
              self._updateFiles()
            }
          })
        }
      },
      _updateFiles: function () {
        if (this.y != null) {
          var self = this
          Promise.all(this.folder.keys()
            .map(function (key) {
              var val = self.folder.get(key)
              if (val instanceof Promise) {
                return val.then(function (val) {
                  return Promise.resolve({
                    name: key,
                    val: val,
                    type: 'folder',
                    progress: 0
                  })
                })
              } else {
                var state
                var torrent = self.getTorrent(val)
                if (torrent == null) {
                  state = 'off'
                } else if (torrent.torrentFileBlobURL != null) {
                  state = 'downloaded'
                } else {
                  state = 'downloading'
                }
                return Promise.resolve({
                  name: key,
                  val: val,
                  type: 'file',
                  progress: torrent != null ? torrent.progress * 100 + 10 : 0
                })
              }
            })
          ).then(function (files) {
            self._setFiles(files.sort(function (a, b) { return a.name > b.name }))
          })
        }
      },
      getStateIcon: function (f) {
        if (f.type === 'file')
        if (f.type === 'file' && f.progress < 10) {
          return 'icons:cloud-download'
        } else if (f.type === 'file' && f.progress === 110) {
          return 'icons:cloud-done'
        } else {
          return 'icons:watch-later'
        }
      },
      createFile: function (name, magnetURI) {
        this.folder.set(name, magnetURI)
      },
      createFolder: function (name) {
        if (name.length > 0) {
          this.folder.set(name, Y.Map)
        }
      },
      _createDialog: function () {
        var input = this.$.folderInputElement
        this.createFolder(input.value)
        input.value = ''
      },
    });
