# RightCall

Prediction intelligence that learns who deserves trust.

A call locks before the event. The outcome is stored as an observation: source, category, conditions, result, calibration. Walrus Memory keeps that observation. The next similar call recalls it and the recommendation can move. OddsSplit is the disagreement desk inside the same app: a seeded book versus a seeded chain quote, with the live Sui read deciding whether that history applies.

Sportsbook numbers in the demo are seed. Tatum does not provide them. Chain spot, reference strike, protocol gates, and the checkpoint come from Sui.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

The desk listens on [http://127.0.0.1:38471](http://127.0.0.1:38471). It runs with empty env vars. The ledger is the seeded local book. The chain strip uses public Sui GraphQL until `TATUM_API_KEY` is set, and it says so.

## Environment

| Variable | Role |
| --- | --- |
| `TATUM_API_KEY` | `x-api-key` for `POST https://sui-mainnet.gateway.tatum.io/graphql` |
| `RIGHTCALL_PUBLIC_SUI_FALLBACK` | Set to `0` to disable the public GraphQL fallback |
| `MEMWAL_KEY` or `MEMWAL_PRIVATE_KEY` | Walrus Memory delegate key |
| `MEMWAL_ACCOUNT_ID` | `MemWalAccount` object id |
| `MEMWAL_SERVER_URL` | Defaults to `https://relayer.memory.walrus.xyz` |
| `MEMWAL_NAMESPACE` | Defaults to `rightcall` |
| `MEMWAL_AGENT_ID` | N/A. The Walrus UI does not issue one, and the desk does not read it. Leave unset. |

Create the account and delegate at [memory.walrus.xyz](https://memory.walrus.xyz). The hosted relayer writes to mainnet. You do not buy WAL or SUI for this app. Do not paste an example account id from the docs.

The gateway’s own `llms.txt` lists GraphQL only. JSON-RPC is not on `/_methods`. RightCall uses the GraphQL endpoint on that host.

## Prove the learning loop

```bash
npm run check
```

This asserts the seeded flip without network:

- Leon Varga, memory off: Follow at 74%. Memory on: Fade, using 6 primetime unders and holding out 2 day-slate overs.
- Mina Okonkwo: Pass becomes Follow.
- Jonah Adeyemi: Follow becomes Pass because two results are too few.
- OddsSplit memory on leans chain when spot is under the reference, leans book when spot is over, and shows no edge when the chain spot was not read. Memory off keeps the +9 pp gap and drops the judgment.

## Prove at least 10 mainnet memories

```bash
npm run seed:memories
npm run prove:memories
```

`seed:memories` writes the observation texts with `rememberBulkAndWait` in batches of 15, namespace `rightcall`, then a `RIGHTCALL_SEED_MARKER` line. It stores blob ids in `data/runtime/state.json` and skips ids already indexed. Re-runs use an idempotency key per batch.

`prove:memories` calls relayer health, pages `listMemories` for namespace `rightcall`, and prints a `recall` sample. It exits non-zero if both the list and the parsed recall are under 10.

Open Memory in the app after a successful seed. Rows that landed show a Walrus blob id. The status cards show relayer health and the namespace count.

## Demo

1. Discover. The hero is the Leon Varga call. Before recall: Follow. After recall: Fade.
2. Open the decision. Read the six used outcomes and the two held out. Switch to Memory off. The call returns to Follow.
3. Open OddsSplit. Memory on names the cohort selected by the live spot-versus-reference read. Memory off keeps the gap and removes the lean.
4. Sources shows sample size, the Wilson band, and the running-rate line.
5. Memory shows the stored sentences. Docs records the Tatum objects and the formula.
6. Lock a new call with a future start. The checkpoint stamps when the chain read works. Resolve it later. The pick cannot be edited.

## Tatum reads

GraphQL against the gateway, or the public node when the key is absent:

- `checkpoint` — stamped onto a new lock
- `ProtocolConfig` `0x5fa6efbe…79580` — pause or freeze blocks OddsSplit
- `PoolVault` `0x4d227a1b…e3b99` — active BTC expiry markets
- `ExpiryMarket` — reference strike and cash
- `PythFeed` `0x4c5d2b4c…e1a20` — BTC spot, which picks the disagreement cohort
- `MemWalAccount` — the memory account object. The id is on the in-app Docs page.

Details are on the in-app Docs page and in the chain strip.

`lib/tatum-ai.ts` is an optional hook to `GET https://api.tatum.io/v4/data/exchange-rate`. The v1 loop does not call it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Desk on port 38471 |
| `npm run check` | Learning assertions |
| `npm run lint` | ESLint |
| `npm run seed:memories` | Write the seed book to Walrus mainnet |
| `npm run prove:memories` | Count and recall those memories |
