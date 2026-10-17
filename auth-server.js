'use strict';
const http = require('node:http');
const crypto = require('node:crypto');
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
const SITE_URL = (process.env.SITE_URL || 'https://man1ek734.github.io/CrimeDreamLife/').replace(/\/?$/, '/');
const ORIGIN = new URL(SITE_URL).origin;
const GUILD_ID = '1437087475704266928';
const sessions = new Map(), pending = new Map(), tickets = new Map();
const random = () => crypto.randomBytes(32).toString('base64url');
const redirectURI = () => PUBLIC_URL + '/auth/callback';
function reply(res, code, obj) {
  res.writeHead(code, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','access-control-allow-origin':ORIGIN,'vary':'Origin','access-control-allow-headers':'authorization, content-type','access-control-allow-methods':'GET, POST, OPTIONS'});
  res.end(JSON.stringify(obj));
}
function forward(res, url){res.writeHead(302,{'location':url,'cache-control':'no-store'});res.end()}
function clean(){const now=Date.now();for(const map of [sessions,pending,tickets])for(const [k,v] of map)if(v.expires<now)map.delete(k)}
function startAuthServer(client) {
  const port=Number(process.env.PORT || 3000);
  const server=http.createServer(async (req,res)=>{
    try{
      clean();const url=new URL(req.url,'http://localhost');
      if(req.method==='OPTIONS'){reply(res,204,{});return}
      if(url.pathname==='/health'){reply(res,200,{ok:true,botReady:client.isReady(),oauthConfigured:Boolean(CLIENT_ID&&CLIENT_SECRET&&PUBLIC_URL)});return}
      if(url.pathname==='/auth/login'){
        if(!CLIENT_ID||!CLIENT_SECRET||!PUBLIC_URL){reply(res,503,{error:'Discord OAuth nie jest jeszcze skonfigurowany.'});return}
        const state=random();pending.set(state,{expires:Date.now()+10*60*1000});
        const query=new URLSearchParams({client_id:CLIENT_ID,redirect_uri:redirectURI(),response_type:'code',scope:'identify',state,prompt:'consent'});
        res.setHeader('set-cookie', 'dl_oauth_state='+state+'; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=600');
        forward(res,'https://discord.com/oauth2/authorize?'+query);return;
      }
      if(url.pathname==='/auth/callback'){
        const state=url.searchParams.get('state'),code=url.searchParams.get('code');
        const cookie=req.headers.cookie?.match(/(?:^|; )dl_oauth_state=([^;]+)/)?.[1];
        res.setHeader('set-cookie','dl_oauth_state=; HttpOnly; Secure; SameSite=Lax; Path=/auth; Max-Age=0');
        if(!state||!code||!cookie||cookie!==state||!pending.has(state)){forward(res,SITE_URL+'?login=invalid');return}
        pending.delete(state);
        const tokenResponse=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:CLIENT_ID,client_secret:CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:redirectURI()})});
        if(!tokenResponse.ok){forward(res,SITE_URL+'?login=failed');return}
        const token=await tokenResponse.json();
        const userResponse=await fetch('https://discord.com/api/users/@me',{headers:{authorization:'Bearer '+token.access_token}});
        if(!userResponse.ok){forward(res,SITE_URL+'?login=failed');return}
        const discordUser=await userResponse.json();
        const ticket=random();tickets.set(ticket,{expires:Date.now()+60*1000,user:{id:discordUser.id,username:discordUser.global_name||discordUser.username,avatar:discordUser.avatar}});
        forward(res,SITE_URL+'?login_ticket='+encodeURIComponent(ticket));return;
      }
      if(url.pathname==='/auth/exchange'&&req.method==='POST'){
        if(req.headers.origin!==ORIGIN){reply(res,403,{error:'Nieprawidłowa domena'});return}
        let body='';for await(const chunk of req){body+=chunk;if(body.length>4096){reply(res,413,{error:'Za duże żądanie'});return}}
        const ticket=JSON.parse(body||'{}').ticket,entry=tickets.get(ticket);tickets.delete(ticket);
        if(!entry||entry.expires<Date.now()){reply(res,401,{error:'Kod logowania wygasł'});return}
        const key=random();sessions.set(key,{user:entry.user,expires:Date.now()+12*60*60*1000});
        reply(res,200,{token:key,user:entry.user});return;
      }
      if(url.pathname==='/api/me'||url.pathname==='/api/logout'){
        const bearer=req.headers.authorization?.match(/^Bearer ([a-zA-Z0-9_-]+)$/)?.[1];
        const entry=sessions.get(bearer);
        if(!entry||entry.expires<Date.now()){reply(res,401,{error:'Brak aktywnej sesji'});return}
        if(url.pathname==='/api/logout'){if(req.method!=='POST'){reply(res,405,{error:'Metoda niedozwolona'});return}sessions.delete(bearer);reply(res,200,{ok:true});return}
        const guild=client.guilds.cache.get(GUILD_ID);
        let membership=null;
        if(guild){try{const member=await guild.members.fetch(entry.user.id);membership={member:true,isAdmin:member.permissions.has('Administrator'),roles:member.roles.cache.map(r=>({id:r.id,name:r.name}))}}catch(e){if(e.code===10007)membership={member:false};else membership={member:null}}}
        reply(res,200,{user:entry.user,guild:membership});return;
      }
      reply(res,404,{error:'Nie znaleziono'});
    }catch(err){console.error('Auth API error:',err.message);reply(res,500,{error:'Błąd serwera'})}
  });
  server.listen(port,'0.0.0.0',()=>console.log('DreamLife Auth API nasłuchuje na porcie '+port));
  return server;
}
module.exports={startAuthServer};
