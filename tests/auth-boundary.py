"""Local built-worker checks, with Supabase intentionally unconfigured."""
import urllib.request, urllib.error, json, os
BASE = os.environ.get('MODEL_DROPS_TEST_ORIGIN', 'http://127.0.0.1:8787')
passed = []
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl): return None
def req(path, data=None, headers=None, follow=True):
    r = urllib.request.Request(BASE + path, data=json.dumps(data).encode() if data is not None else None, headers=headers or {})
    try:
        with urllib.request.build_opener(*([] if follow else [NoRedirect])).open(r, timeout=10) as result: return result.status, result.read(), dict(result.headers)
    except urllib.error.HTTPError as e: return e.code, e.read(), dict(e.headers)
def check(name, ok):
    assert ok, name
    passed.append(name); print('PASS', name)
status, body, _ = req('/login')
check('Email/password and Google login are visible', status == 200 and b'Email address' in body and b'Password' in body and b'Continue with Google' in body)
check('ChatGPT login removed from app', b'Continue with ChatGPT' not in body and b'signin-with-chatgpt' not in body)
check('Unavailable configuration is explicit', b'Sign-in is being set up' in body)
check('Dashboard requires an application session', b'Sign-in is being set up' in req('/dashboard')[1])
check('Anonymous API denied', req('/api/platform?action=state')[0] == 401)
check('Former ChatGPT headers cannot authenticate', req('/api/platform?action=state', headers={'oai-authenticated-user-id':'local_seedy','oai-authenticated-user-email':'test@example.test'})[0] == 401)
check('Forged app cookies cannot authenticate', req('/api/platform?action=state', headers={'Cookie':'md-login-method=supabase; md-auth=forged'})[0] == 401)
check('Cross-origin login rejected', req('/api/auth/signin', {}, {'Origin':'https://evil.test','Content-Type':'application/json'})[0] == 403)
check('Missing origin rejected', req('/api/auth/signin', {}, {'Content-Type':'application/json'})[0] == 403)
check('Unconfigured login fails closed', req('/api/auth/signin', {}, {'Origin':BASE,'Content-Type':'application/json'})[0] == 503)
status, _, headers = req('/api/auth/signout', {}, {'Origin':BASE,'Content-Type':'application/json'}, follow=False)
check('Sign-out returns to the browser-facing origin', status == 303 and headers.get('location', headers.get('Location')) == BASE + '/login')
check('Password reset page requires a verified session', b'Sign-in is being set up' in req('/auth/update-password')[1])
check('Unsolicited callback rejected', b'Sign-in could not be completed' in req('/auth/complete?code=forged&flow=forged')[1])
for path in ['/api/lora', '/api/lora?admin=1', '/api/lora?request=forged', '/api/lora/file?id=forged', '/api/lora/zip?request=forged']:
    check('Anonymous training route denied: ' + path, req(path)[0] == 401)
check('Forged session cannot read training requests', req('/api/lora', headers={'Cookie':'md-login-method=supabase; md-auth=forged'})[0] == 401)
check('Cross-origin training mutation rejected', req('/api/lora', {'action':'draft'}, {'Origin':'https://evil.test','Content-Type':'application/json'})[0] == 403)
check('Email job requires a secret', req('/api/lora/email', {})[0] == 401)
check('Generation recovery requires a secret', req('/api/jobs', {})[0] == 401)
check('Generation recovery GET requires a secret', req('/api/jobs')[0] == 401)
check('Anonymous super admin data denied', req('/api/admin?section=users')[0] == 401)
check('Forged cookie cannot access super admin', req('/api/admin?section=credits', headers={'Cookie':'md-login-method=supabase; md-auth=forged'})[0] == 401)
check('Super admin page requires a session', b'Sign-in is being set up' in req('/admin')[1])
for path in ['/api/platform','/api/admin','/api/lora','/api/upload']:
    check('Missing origin rejected: ' + path, req(path, {'action':'anything'}, {'Content-Type':'application/json'})[0] == 403)
for path in ['/api/platform','/api/admin','/api/lora','/api/upload','/api/lora/file','/api/transfers','/api/characters/checkout','/api/image-models']:
    check('Valid origin reaches session validation: ' + path, req(path, {'action':'anything','data':{}}, {'Origin':BASE,'Content-Type':'application/json'})[0] == 401)
check('Cross-origin super admin mutation rejected', req('/api/admin', {}, {'Origin':'https://evil.test','Content-Type':'application/json'})[0] == 403)
print(f'{len(passed)} auth boundary checks passed')
