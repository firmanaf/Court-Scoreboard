const VERSION='1.3.0';
const CACHE=`court-scoreboard-${VERSION}`;
const STATIC_ASSETS=['./manifest.webmanifest','./icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();

    const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(windows.map(client=>{
      if(client.url.startsWith(self.registration.scope)) return client.navigate(client.url);
      return Promise.resolve();
    }));
  })());
});

self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;

  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        if(response&&response.ok){
          const copy=response.clone();
          const cache=await caches.open(CACHE);
          await cache.put('./index.html',copy);
        }
        return response;
      }catch(error){
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    const cached=await caches.match(event.request);
    if(cached) return cached;
    const response=await fetch(event.request,{cache:'no-store'});
    if(response&&response.ok){
      const copy=response.clone();
      const cache=await caches.open(CACHE);
      await cache.put(event.request,copy);
    }
    return response;
  })());
});
