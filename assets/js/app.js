import WebTorrent from '/assets/js/webtorrent.min.js'

function prettyBytes (num) {
    const units = ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    const neg = num < 0
    if (neg) num = -num
    if (num < 1) return (neg ? '-' : '') + num + ' B'
    const exponent = Math.min(Math.floor(Math.log(num) / Math.log(1000)), units.length - 1)
    const unit = units[exponent]
    num = Number((num / Math.pow(1000, exponent)).toFixed(2))
    return (neg ? '-' : '') + num + ' ' + unit
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
        document.getElementById('note').textContent = `Keep this tab open and active while transfering "${torrent.name}".`;
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
    const client = createClient();
    client.add(infohash, { announce: announceList, announceList: announceList }, addTorrent);
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
        updateSpeed(torrent);
        document.getElementById('status').textContent = 'done';
    });
    const torrentIds = torrent.magnetURI.split('&');
    const torId = torrentIds[0].split(':');
    const torHash = torId[3];
    const torrentLog = `<label for="link">Share link:</label>
              <input type="text" id="link" name="link" value="https://${window.location.host}/#${torHash}" readonly>
              <button id="copy-btn">Copy</button>`;
    log('log', torrentLog);
    const filesLog = `<label class="files-label"><sup>${torrent.files.length}</sup> file(s) <code id="status">${window.location.hash ? 'downloading' : 'seeding'}</code></label>
              <ul class="file-list">
              </ul>`;
    log('files', filesLog);
    torrent.files.forEach(file => {
        // Stream the file in the browser
        file.appendTo('#output');
        
        // Create download link
        file.getBlobURL((err, url) => {
            if (err) {
                logError(err);
                return;
            }
            const a = document.createElement('a');
            a.href = url;
            a.textContent = file.name + ` (${prettyBytes(file.length)})`;
            a.download = file.name;
            const link = `<li><a href="${url}" download="${file.name}" onclick="this.classList.add('visited')">${file.name} <span class="file-size">${prettyBytes(file.length)} ↓</span></a></li>`;
            document.getElementsByClassName('file-list')[0].insertAdjacentHTML('beforeEnd', link);
        });
    });
    document.getElementById('copy-btn').addEventListener('click', copyLink);
}

function updateSpeed(torrent) {
    const progress = (100 * torrent.progress).toFixed(0);
    const speed = `
            <div class="transfer-info">
              ${window.location.hash ? `<div class="progress">
  <div class="progress-bar" role="progressbar" aria-label="Current download progress" style="width: ${progress}%;" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
</div>` : ''}
              <div>Peers: ${torrent.numPeers}</div>
              <div>Download speed: ${prettyBytes(torrent.downloadSpeed)}/s</div>
              <div>Upload speed: ${prettyBytes(torrent.uploadSpeed)}/s</div>
              ${window.location.hash ? `<div class="text-truncate">Remaining: ${torrent.done ? 'done' : convertMS(torrent.timeRemaining)}</div>` : ''}
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
    if (s) {
      ret += s + ' seconds';
    }

    return ret;
}

function log(id, element) {
    document.getElementById(id).insertAdjacentHTML('afterBegin', element);
}

const announceList = [
    [/*'udp://tracker.leechers-paradise.org:6969',
    'udp://tracker.coppersurfer.tk:6969',
    'udp://tracker.opentrackr.org:1337',
    'udp://explodie.org:6969',
    'udp://tracker.empire-js.us:1337',
    'wss://tracker.btorrent.xyz',*/
    'wss://tracker.openwebtorrent.com'
]];

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
	        noteElement.textContent = 'Please select file(s) to start seeding.';
	        upElement.classList.add('show');
	    }
    }
    else {
        noteElement.textContent = 'Sorry, WebRTC is not supported in your browser.';
    }
    noteElement.classList.add('show');

    const fileInput = document.getElementById('upload');
    fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        if (files.length) {
	        upElement.remove();
	        noteElement.textContent = 'File hashing in progress, please wait...';
	        const client = createClient();
	        client.seed(files, { announce: announceList, announceList: announceList, private: true }, addTorrent);
	    }
    });
});
// Install Service Worker
if ('serviceWorker' in navigator) {
    // Delay registration until after the page has loaded, to ensure that our
    // precaching requests don't degrade the first visit experience.
    // See https://developers.google.com/web/fundamentals/instant-and-offline/service-worker/registration
    window.addEventListener('load', function () {
        // Your service-worker.js *must* be located at the top-level directory relative to your site.
        // It won't be able to control pages unless it's located at the same level or higher than them.
        // *Don't* register service worker file in, e.g., a scripts/ sub-directory!
        // See https://github.com/slightlyoff/ServiceWorker/issues/468
    
        navigator.serviceWorker.register('/sw.js');
    
        navigator.serviceWorker.ready.then(function() {
        console.log('Service worker registered');
        }).catch(function (e) {
            console.error('Error during service worker registration, possibly cookies are blocked:', e);
        });
    });
}
