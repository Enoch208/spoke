CREATE TABLE IF NOT EXISTS api_records (
 kind text NOT NULL, id text NOT NULL, owner text NOT NULL, payload jsonb NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (kind,id)
);
CREATE INDEX IF NOT EXISTS records_owner ON api_records(kind,owner,id);
CREATE TABLE IF NOT EXISTS api_identities (namespace text NOT NULL, value text NOT NULL, owner text NOT NULL, PRIMARY KEY(namespace,value));
CREATE INDEX IF NOT EXISTS identities_owner ON api_identities(owner);
CREATE TABLE IF NOT EXISTS api_challenges (
 nonce text PRIMARY KEY, address text NOT NULL, message text NOT NULL, kind text NOT NULL, purpose text NOT NULL, action text, "accountId" text, "expiresAt" timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS api_sessions (
 hash text PRIMARY KEY, id text NOT NULL, "accountId" text NOT NULL, address text NOT NULL, "csrfHash" text NOT NULL, method text NOT NULL, "deviceLabel" text NOT NULL,
 "signedInAt" timestamptz NOT NULL DEFAULT now(), "lastActiveAt" timestamptz NOT NULL DEFAULT now(), "expiresAt" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_account ON api_sessions("accountId");
CREATE TABLE IF NOT EXISTS api_confirmations (hash text PRIMARY KEY,"sessionHash" text NOT NULL,action text NOT NULL,"expiresAt" timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS api_idempotency (owner text NOT NULL,key text NOT NULL,fingerprint text NOT NULL,"recordId" text NOT NULL,"createdAt" timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(owner,key));
CREATE TABLE IF NOT EXISTS api_rate_buckets (key text PRIMARY KEY,count integer NOT NULL,"expiresAt" timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS api_chain_events (
 id text PRIMARY KEY,"chainId" integer NOT NULL,"txHash" text NOT NULL,"logIndex" integer NOT NULL,"blockHash" text NOT NULL,"blockNumber" text NOT NULL,name text NOT NULL,payload jsonb NOT NULL,at timestamptz NOT NULL,
 UNIQUE("chainId","txHash","logIndex","blockHash")
);
CREATE UNIQUE INDEX IF NOT EXISTS record_node_slug ON api_records ((payload->>'code')) WHERE kind='link';
CREATE INDEX IF NOT EXISTS challenges_expiry ON api_challenges("expiresAt");
CREATE INDEX IF NOT EXISTS sessions_expiry ON api_sessions("expiresAt");
CREATE INDEX IF NOT EXISTS confirmations_expiry ON api_confirmations("expiresAt");
CREATE INDEX IF NOT EXISTS rate_buckets_expiry ON api_rate_buckets("expiresAt");
CREATE INDEX IF NOT EXISTS records_campaign ON api_records(kind,(payload->>'campaignId'),id);
CREATE INDEX IF NOT EXISTS records_address ON api_records(kind,lower(payload->>'address'));
CREATE INDEX IF NOT EXISTS chain_events_at ON api_chain_events(at,id);
