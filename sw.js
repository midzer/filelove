const version = '1.2.0';
const cacheName = `filelove-${version}`;

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(
        [
          '/index.html',
          '/assets/css/style.css',
          '/assets/js/webtorrent.min.js',
          '/assets/js/app.js'
        ]
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  const res = listener(event);
  if (res) event.respondWith(res);
});

self.addEventListener('activate', function(event) {
  self.clients.claim();
});

const portTimeoutDuration = 5000
let cancellable = false

const listener = event => {
  const { url } = event.request
  if (!url.includes(self.registration.scope + 'webtorrent/')) return null
  if (url.includes(self.registration.scope + 'webtorrent/keepalive/')) return new Response()
  if (url.includes(self.registration.scope + 'webtorrent/cancel/')) {
    return new Response(new ReadableStream({
      cancel () {
        cancellable = true
      }
    }))
  }
  return serve(event)
}

async function serve ({ request }) {
  const { url, method, headers, destination } = request
  const clientlist = await clients.matchAll({ type: 'window', includeUncontrolled: true })

  const [data, port] = await new Promise(resolve => {
    // Use race condition for whoever controls the response stream
    for (const client of clientlist) {
      const messageChannel = new MessageChannel()
      const { port1, port2 } = messageChannel
      port1.onmessage = ({ data }) => {
        resolve([data, port1])
      }
      client.postMessage({
        url,
        method,
        headers: Object.fromEntries(headers.entries()),
        scope: self.registration.scope,
        destination,
        type: 'webtorrent'
      }, [port2])
    }
  })

  let timeOut = null
  const cleanup = () => {
    port.postMessage(false) // send a cancel request
    clearTimeout(timeOut)
    port.onmessage = null
  }

  if (data.body !== 'STREAM') {
    cleanup()
    return new Response(data.body, data)
  }

  return new Response(new ReadableStream({
    pull (controller) {
      return new Promise(resolve => {
        port.onmessage = ({ data }) => {
          if (data) {
            controller.enqueue(data) // data is Uint8Array
          } else {
            cleanup()
            controller.close() // data is null, means the stream ended
          }
          resolve()
        }
        if (!cancellable) {
          // firefox doesn't support cancelling of Readable Streams in service workers,
          // so we just empty it after 5s of inactivity, the browser will request another port anyways
          clearTimeout(timeOut)
          if (destination !== 'document') {
            timeOut = setTimeout(() => {
              cleanup()
              resolve()
            }, portTimeoutDuration)
          }
        }
        port.postMessage(true) // send a pull request
      })
    },
    cancel () {
      cleanup()
    }
  }), data)
}
