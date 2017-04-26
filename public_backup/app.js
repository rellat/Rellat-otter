/* global Y, CodeMirror */
(function() {
    var target_room = 'Rellat-otter-dev';

    // initialize a shared object. This function call returns a promise!
    Y({
    db: {
        name: 'memory' // Data stored in each peer's browser. When all peer disconnect, data will disappears.
    },
    connector: {
        name: 'webrtc', // use webRTC for p2p connection.
        room: target_room
    },
    sourceDir: '/bower_components',
    share: {
        dir_tree: 'Map',
        code_editor: 'Text', // y.share.code_editor is of type Y.Text
        cm_reply: 'Array', // { auth_id, line_num, order_num, level, value }
        chat: 'Array', // { auth_id, value }
        peers: 'Array' // { peer_id, auth_id, name, state}
    }
    }).then(function (y) {
        window.yCodeMirror = y;
        // Set CodeMirror
        var ct = document.getElementById("editor"),
        var editor = CodeMirror(function(node) {
        ct.parentNode.replaceChild(node, ct);
        }, {
        mode:  "javascript",
        theme: "ambiance",
        lineNumbers: true,
        lineWrapping: true
        });
        // bind the textarea to a shared text element
        y.share.code_editor.bindCodeMirror(editor)
    });
})();
