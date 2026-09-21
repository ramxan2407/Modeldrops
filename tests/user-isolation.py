"""Two trusted dispatcher identities against the LOCAL built worker only.

Run npm run build, then npm start -- --port 8787. The development mock intentionally
strips identity headers, so this suite targets the built worker on loopback.
Never expose the worker directly: hosted identity headers must come from Sites.
"""
import json, time, uuid, urllib.request, urllib.error

BASE = 'http://127.0.0.1:8787'
A, B = 'test-a-' + str(uuid.uuid4()), 'test-b-' + str(uuid.uuid4())
passed = []

def request(path, user=None, payload=None):
    headers = {'Content-Type': 'application/json', 'Origin': BASE}
    if user:
        headers.update({'oai-authenticated-user-id': user,
                        'oai-authenticated-user-email': user + '@example.test',
                        'oai-authenticated-user-full-name': 'Isolation Test'})
    req = urllib.request.Request(BASE + path, headers=headers,
                                 data=json.dumps(payload).encode() if payload else None)
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        return e.code, e.read(), dict(e.headers)

def api(user, action, data=None):
    status, body, _ = request('/api/platform' + ('?action=' + action if data is None else ''),
                              user, {'action': action, 'data': data} if data is not None else None)
    return status, json.loads(body)

def account(user):
    status, state = api(user, 'state')
    assert status == 200, (status, state)
    return state['account']

def check(name, condition):
    assert condition, name
    passed.append(name)
    print('PASS', name)

check('Anonymous dashboard reaches sign-in', b'Continue with ChatGPT' in request('/dashboard')[1])
check('Anonymous API requires authentication', api(None, 'state')[0] == 401)
a, b = account(A), account(B)
check('New accounts have separate empty workspaces', not a['owned'] and not b['owned'] and not a['generations'] and not b['generations'])
check('Identity email follows authenticated account', a['email'] == A + '@example.test' and b['email'] == B + '@example.test')
check('User A can acquire a demo model', api(A, 'claim', {'characterId':'nova', 'acceptedLicense':True, 'userId':B})[0] == 200)
a, b = account(A), account(B)
check('Claims ignore client-supplied user ID', a['owned'] == ['nova'] and not b['owned'])
check('Saved licenses are isolated', len(a['purchases']) == 1 and bool(a['purchases'][0]['licenseSnapshot']) and b['purchases'] == [])
api(A, 'project', {'name':'Isolation test project'})
api(A, 'favorite', {'characterId':'nova'})
api(A, 'settings', {'name':'Creator A', 'defaultPrivate':True})
api(A, 'creator-submit', {'name':'Isolation concept', 'description':'Test-only concept for account isolation verification.', 'rights':True})
a, b = account(A), account(B)
check('Projects remain private', len(a['projects']) == 1 and not b['projects'])
check('Favorites remain private', a['favorites'] == ['nova'] and not b['favorites'])
check('Profiles remain independent', a['name'] == 'Creator A' and b['name'] != 'Creator A')
check('Creator submissions remain private', len(a['listings']) == 1 and not b['listings'])
payload = {'idempotencyKey':str(uuid.uuid4()), 'characterId':'nova', 'modelId':'forma-image', 'prompt':'Account isolation test frame', 'settings':{'ratio':'16:9', 'resolution':'1024', 'outputs':1, 'negative':'', 'seed':42, 'duration':5}}
check('Unowned model generation rejected', api(B, 'generate', payload)[0] == 403)
status, generation = api(A, 'generate', payload)
check('Owner can create with their model', status == 202)
gid = generation['id']
check('Other account cannot cancel the job', api(B, 'cancel', {'id':gid})[0] == 404)
check('Other account cannot move the job', api(B, 'move', {'id':gid, 'projectId':None})[0] == 404)
for _ in range(20):
    a = account(A)
    job = next(g for g in a['generations'] if g['id'] == gid)
    if job['status'] not in ['queued','processing']:
        break
    time.sleep(1)
check('Owner generation completes', job['status'] == 'completed')
check('Owner can read their private output', request('/api/media?id=' + gid, A)[0] == 200)
check('Other account cannot read private output', request('/api/media?id=' + gid, B)[0] == 404)
b = account(B)
check('Credits and creation history remain isolated', b['balance'] == 1840 and not b['generations'] and a['balance'] == 1828)
check('Notifications remain isolated', len(a['notifications']) > 0 and not b['notifications'])
check('Another account cannot access administrator data', api(B, 'admin')[0] == 403)
print(f'{len(passed)} account isolation checks passed')
