import WebTorrent from '/assets/js/webtorrent.min.js';

function prettyBytes (num) {
    const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const neg = num < 0;
    if (neg) num = -num;
    if (num < 1) return (neg ? '-' : '') + num + ' B';
    const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1);
    const unit = units[exponent];
    num = Number((num / Math.pow(1000, exponent)).toFixed(2));
    return (neg ? '-' : '') + num + ' ' + unit;
}

function logError(err) {
    console.log(err.message);
}

function createClient() {
    const client = new WebTorrent({
        tracker: {
            rtcConfig: {
                iceServers: [
                    {
                        urls: [
                            'stun:stun.piratenbrandenburg.de:3478',
                            'stun:stun.stadtwerke-eutin.de:3478'
                        ]
                    }
                ]
            },
            port: 52323
        }
    });
    client.on('error', logError);
    client.on('torrent', function(torrent) {
        document.getElementById('note').innerHTML = `Keep this tab active while <code id="status">${window.location.hash ? 'leeching' : 'seeding'}</code> <sup>${torrent.files.length}</sup> file(s).`;
    });
    return client;
}

function copyLink(event) {
    const btn = event.target;
    navigator.clipboard.writeText(btn.previousElementSibling.value);
    btn.textContent = 'Copied';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1337);
}

function downloadTorrent(infohash) {
    client.add(infohash, { announce: announceList, announceList: announceList }, addTorrent);
}

function addTorrent(torrent) {
    torrent.on('error', logError);
    torrent.on('download', function() {
        throttle(function () {
            updateSpeed(torrent);
        }, 1000);
    });
    torrent.on('upload', function() {
        throttle(function () {
            updateSpeed(torrent);
        }, 1000);
    });
    torrent.on('done', () => {
        updateSpeed(torrent);
        document.getElementById('status').textContent = 'seeding';
    });
    const torrentIds = torrent.magnetURI.split('&');
    const torId = torrentIds[0].split(':');
    const torHash = torId[3];
    const torrentShare = `<label for="link">Share link</label>
                          <input type="text" id="link" name="link" value="https://${window.location.host}/#${torHash}" readonly>
                          <button id="copy-btn">Copy</button>`;
    log('share', torrentShare);
    const filesLog = `
              <ul class="file-list">
              </ul>`;
    log('files', filesLog);
    const output = document.getElementById('output');
    torrent.files.forEach(async file => {
        // Stream the file in the browser
        const type = file.type;
        let element;
        if (type.startsWith('video') || type.startsWith('audio')) {
            element = document.createElement('video');
            element.controls = true;
            file.streamTo(element);
        }
        const blob = await file.blob();
        const url = URL.createObjectURL(blob);
        if (type.startsWith('image')) {
            element = document.createElement('img');   
        }
        else if(type.startsWith('text')) {
            element = document.createElement('iframe');
        }
        if (element) {
            element.src = url;
            output.appendChild(element);
        }
        // Create download link
        const li = document.createElement('li');
        const link = document.createElement('a');
        link.href = url;
        link.textContent = file.name + ` (${prettyBytes(file.length)}) ↓`;
        link.download = file.name;
        li.appendChild(link);
        document.querySelector('.file-list').appendChild(li);
    });
    document.getElementById('copy-btn').addEventListener('click', copyLink);
}

function updateSpeed(torrent) {
    const progress = (100 * torrent.progress).toFixed(0);
    const speed = `
        <div class="progress">
          <div class="progress-bar" role="progressbar" aria-label="Current download progress" style="width: ${progress}%;" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
        </div>
        <div>Peers: ${torrent.numPeers}</div>
        <div>Download speed: ${prettyBytes(torrent.downloadSpeed)}/s</div>
        <div>Upload speed: ${prettyBytes(torrent.uploadSpeed)}/s</div>
        ${window.location.hash ? `<div class="text-truncate">Remaining: ${torrent.done ? 'done' : convertMS(torrent.timeRemaining)}</div>` : ''}
    `
    const speedInfo = document.getElementById('speed');
    speedInfo.innerHTML = speed;
    speedInfo.hidden = false;
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
    if (s) {
      ret += s + ' seconds';
    }

    return ret;
}

function log(id, item) {
    const element = document.getElementById(id);
    element.insertAdjacentHTML('afterBegin', item);
    element.hidden = false;
}

const announceList = [
    /*'udp://tracker.leechers-paradise.org:6969',
    'udp://tracker.coppersurfer.tk:6969',
    'udp://tracker.opentrackr.org:1337',
    'udp://explodie.org:6969',
    'udp://tracker.empire-js.us:1337',
    ['wss://tracker.fastcast.nz'],
    ['wss://tracker.openwebtorrent.com']*/
    ['wss://tracker.btorrent.xyz']
];

const client = createClient();

let timeout;
function throttle (func, limit) {
    if (!timeout) {
        func();
        timeout = setTimeout(function() {
            timeout = undefined;
        }, limit);
    }
}

window.addEventListener('DOMContentLoaded', function() {
    const noteElement = document.getElementById('note');
    const upElement = document.getElementById('up');
    if (WebTorrent.WEBRTC_SUPPORT) {
        const hash = window.location.hash.substr(1);
        if (hash) {
            noteElement.textContent = 'Connecting, please wait...';
            downloadTorrent(hash);
	    }
	    else {
	        upElement.classList.add('show');
	    }
    }
    else {
        noteElement.textContent = 'Sorry, WebRTC is not supported in your browser.';
    }

    const fileInput = document.getElementById('upload');
    fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        if (files.length) {
	        upElement.remove();
	        noteElement.textContent = 'File hashing in progress, please wait...';
	        client.seed(files, { announce: announceList, announceList: announceList, private: true }, addTorrent);
	    }
    });
});
// Install Service Worker
navigator.serviceWorker.register('./sw.js', { scope: './' }).then(reg => {
    const worker = reg.active || reg.waiting || reg.installing;
    function checkState (worker) {
        return worker.state === 'activated' && client.createServer({ controller: reg });
    }
    if (!checkState(worker)) {
        worker.addEventListener('statechange', ({ target }) => checkState(target));
    }
});
