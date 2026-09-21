"""Integration checks against the isolated localhost development database."""
import json,urllib.request,urllib.error,http.cookiejar,uuid,time,concurrent.futures
base='http://localhost:5173'
jar=http.cookiejar.CookieJar();opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar));opener.open(base+'/signin-with-chatgpt?return_to=/').read()
passed=[]
def call(action,data=None,origin=base):
 req=urllib.request.Request(base+'/api/platform'+('?action='+action if data is None else ''),data=None if data is None else json.dumps({'action':action,'data':data}).encode(),headers={'Content-Type':'application/json','Origin':origin})
 try:
  r=opener.open(req);return r.status,json.load(r)
 except urllib.error.HTTPError as e:
  raw=e.read().decode();return e.code,json.loads(raw) if raw.startswith("{") else {"error":raw}
def check(name,condition):
 assert condition,name
 passed.append(name);print('PASS',name)
status,state=call('state');before=state['account']['balance'];check('Authenticated persistent workspace',status==200 and before>=0)
try:urllib.request.urlopen(base+'/api/platform?action=state');check('Unauthenticated access rejected',False)
except urllib.error.HTTPError as e:check('Unauthenticated access rejected',e.code==401)
check('Admin role enforced',call('admin')[0]==403)
check('Cross-origin writes rejected',call('project',{'name':'bad'},'https://untrusted.example')[0]==403)
check('Payments fail closed',call('checkout',{'packageId':'creator'})[0]==503)
check('License acceptance required',call('claim',{'characterId':'nova','acceptedLicense':False})[0]==400)
check('License snapshot purchase',call('claim',{'characterId':'nova','acceptedLicense':True})[0]==200)
payload={'idempotencyKey':str(uuid.uuid4()),'characterId':'nova','modelId':'forma-image','prompt':'Integration test: cinematic demo frame','settings':{'ratio':'16:9','resolution':'1024','outputs':1,'negative':'','seed':42,'duration':5}}
status,g=call('generate',payload);check('Generation enqueued',status==202);gid=g['id']
status,replayed=call('generate',payload);check('Retry returns same generation',status==200 and replayed['id']==gid)
_,state=call('state');check('Exactly one credit charge',state['account']['balance']==before-12)
check('Idempotency rejects changed input',call('generate',{**payload,'prompt':'Different content'})[0]==409)
check('Cancellation accepted',call('cancel',{'id':gid})[0]==200)
check('Repeated cancellation is safe',call('cancel',{'id':gid})[0]==200)
_,state=call('state');check('Refund applied exactly once',state['account']['balance']==before)
payload['idempotencyKey']=str(uuid.uuid4());status,g=call('generate',payload);gid=g['id']
for _ in range(15):
 time.sleep(1);_,state=call('state');job=next(x for x in state['account']['generations'] if x['id']==gid)
 if job['status'] not in ['queued','processing']:break
check('Background job completes without an open submit request',job['status']=='completed')
r=opener.open(base+job['image']);check('Owned media is served privately',r.status==200 and r.headers.get('Cache-Control')=='private, no-store' and r.read(8)==b'\x89PNG\r\n\x1a\n')
check('Cancel after completion cannot refund',call('cancel',{'id':gid})[0]==200 and call('state')[1]['account']['balance']==before-12)
check('Projects persist',call('project',{'name':'Integration test project','description':'Created by the local test suite'})[0]==200)
project=call('state')[1]['account']['projects'][0]
check('Media can be assigned to a project',call('move',{'id':gid,'projectId':project['id']})[0]==200)
check('Unknown project rejected',call('move',{'id':gid,'projectId':str(uuid.uuid4())})[0]==404)
payload['idempotencyKey']=str(uuid.uuid4())
current=call('state')[1]['account']['balance']
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 race=list(pool.map(lambda _:call('generate',payload),range(2)))
check('Concurrent retries return the same job',set(r[0] for r in race)<={200,202} and len(set(r[1]['id'] for r in race))==1)
check('Concurrent retries debit only once',call('state')[1]['account']['balance']==current-12)
call('cancel',{'id':race[0][1]['id']})
payload['idempotencyKey']=str(uuid.uuid4());payload['settings']['outputs']=100
check('Invalid output count rejected',call('generate',payload)[0]==400)
print(f'{len(passed)} checks passed')
