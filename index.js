function logError(error) {
    console.log(error.message);
}

function createClient() {
    const client = new WebTorrent({ tracker: { port: 52323 }});
    client.on('error', logError);
    client.on('torrent', function(torrent) {
        document.getElementById('note').textContent = `Keep this tab open and active while transfering "${torrent.name}".`;
    });
    
    return client;
}

function copyLink(btn) {
    navigator.clipboard.writeText(btn.previousElementSibling.value);
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1337);
}

function downloadTorrent(infohash) {
    document.getElementById('note').textContent = 'Connecting, please wait...';
    document.getElementById('note').classList.add('show');
    const client = createClient();
    client.add(infohash, { announce }, addTorrent);
}

function addTorrent(torrent) {
    torrent.on('error', logError);
    torrent.on('download', function(bytes) {
        throttle(function () {
            updateSpeed(torrent);
        }, 1000);
    });
    torrent.on('upload', function(bytes) {
        throttle(function () {
            updateSpeed(torrent);
        }, 1000);
    });
    torrent.on('done', () => {
        document.getElementById('status').textContent = 'done';
    });
    const torrentIds = torrent.magnetURI.split('&');
    const torId = torrentIds[0].split(':');
    const torHash = torId[3];
    const torrentLog = `<label for="link">Share link:</label>
              <input type="text" id="link" name="link" value="https://${window.location.host}/#${torHash}" readonly>
              <button class="copy" onclick="copyLink(this)">Copy</button>`;
    log('log', torrentLog);
    const filesLog = `<label class="files-label"><sup>${torrent.files.length}</sup> file(s) <code id="status">${window.location.hash ? 'downloading' : 'seeding'}</code></label>
              <ul class="file-list">
              </ul>`;
    log('files', filesLog);
    torrent.files.forEach(file => {
        file.getBlobURL((err, url) => {
            if (err) {
                logError(err);
                return;
            }
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.textContent = file.name + ` (${prettierBytes(file.length)})`;
            a.download = file.name;
            const link = `<li><a href="${url}" download="${file.name}" onclick="this.classList.add('visited')">${file.name} <span class="file-size">${prettierBytes(file.length)} ↓</span></a></li>`;
            document.getElementsByClassName('file-list')[0].insertAdjacentHTML('beforeEnd', link);
        });
        // Stream the file in the browser
        file.appendTo('#output');
    });
}

function updateSpeed(torrent) {
    const progress = (100 * torrent.progress).toFixed(0);
    const speed = `
            <div class="transfer-info">
              ${window.location.hash ? `<div class="progress">
  <div class="progress-bar" role="progressbar" aria-label="Example with label" style="width: ${progress}%;" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
</div>` : ''}
              <div>Peers: ${torrent.numPeers}</div>
              <div>Download speed: ${prettierBytes(torrent.downloadSpeed)}/s</div>
              <div>Upload speed: ${prettierBytes(torrent.uploadSpeed)}/s</div>
              ${window.location.hash ? `<div class="text-truncate">Remaining: ${convertMS(torrent.timeRemaining)}</div>` : ''}
            </div>
      `
    const speedInfo = document.getElementById('speed');
    speedInfo.innerHTML = speed;
}

function convertMS(ms) {
    let d, h, m, s;
    s = Math.floor(ms / 1000);
    m = Math.floor(s / 60);
    s = s % 60;
    h = Math.floor(m / 60);
    m = m % 60;
    d = Math.floor(h / 24);
    h = h % 24;
  
    let ret = '';
    if (d) {
      ret += d + ' days, ';
    }
    if (h) {
      ret += h + ' hours, ';
    }
    if (m) {
      ret += m + ' minutes, ';
    }
    if (s > 1.0) {
      ret += s + ' seconds';
    }
    else if (!d && !h && !m) {
      ret = 'done';
    }

    return ret;
}

function log(id, element) {
    document.getElementById(id).insertAdjacentHTML('afterBegin', element);
}

const announce = [["udp://tracker.leechers-paradise.org:6969"], ["udp://tracker.coppersurfer.tk:6969"], ["udp://tracker.opentrackr.org:1337"], ["udp://explodie.org:6969"], ["udp://tracker.empire-js.us:1337"], ["wss://tracker.btorrent.xyz"], ["wss://tracker.openwebtorrent.com"]];

let timeout;
function throttle (func, limit) {
    if (!timeout) {
        func();
        timeout = setTimeout(function() {
            timeout = undefined;
        }, limit);
    }
}

if (WebTorrent.WEBRTC_SUPPORT) {
    const hash = window.location.hash.substr(1);
    if (hash) {
        downloadTorrent(hash);
    }
    else {
        document.getElementById('up').classList.add('show');
    }
}
else {
    document.getElementById('note').textContent = 'Sorry, WebRTC is not supported in your browser.';
}


uploadElement(document.getElementById('upload'), (err, results) => {
    if (err) {
        logError(err);
        return;
    }
    const files = results.map(result => result.file);
    if (files.length) {
        document.getElementById('up').remove();
        document.getElementById('note').classList.add('show');
        const client = createClient();
        client.seed(files, { announce, private: true, skipVerify: true }, addTorrent);
    }
});

