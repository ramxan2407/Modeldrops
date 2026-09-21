"""Exercise preview migration triggers in an isolated in-memory SQLite database."""
import sqlite3,pathlib
c=sqlite3.connect(':memory:');c.execute('PRAGMA foreign_keys=ON')
for p in sorted(pathlib.Path('drizzle').glob('*.sql')):c.executescript(p.read_text())
c.execute("INSERT INTO users(id,name,email) VALUES('u','Test','test@example.test')")
c.execute("INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key) VALUES('a','u',100,'promotion','test',0,100,'a')")
def rejected(name,sql):
 try:c.execute(sql)
 except sqlite3.IntegrityError:print('PASS',name);return
 raise AssertionError(name)
rejected('Ledger update is forbidden',"UPDATE credit_transactions SET amount=10 WHERE id='a'")
rejected('Ledger deletion is forbidden',"DELETE FROM credit_transactions WHERE id='a'")
rejected('Forged balance is rejected',"INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key) VALUES('b','u',50,'promotion','test',0,50,'b')")
rejected('Overdraft is rejected',"INSERT INTO credit_transactions(id,user_id,amount,type,description,balance_before,balance_after,idempotency_key) VALUES('c','u',-101,'generation_charge','test',100,-1,'c')")
c.execute("INSERT INTO character_purchases(id,user_id,character_id,license_snapshot,license_version,price_cents) VALUES('p','u','nova','original terms','v1',0)")
rejected('License snapshots cannot change',"UPDATE character_purchases SET license_snapshot='new terms' WHERE id='p'")
print('5 ledger invariant checks passed')
