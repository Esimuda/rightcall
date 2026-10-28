import type { ReactNode } from "react";
import { MEMWAL_ACCOUNT_OBJECT, PREDICT, PUBLIC_SUI_GRAPHQL, readChain, TATUM_GRAPHQL, TATUM_GRPC } from "@/lib/chain";
import { FADE_AT, FLAT_USD, FOLLOW_AT, MIN_N_TO_MOVE, PRIOR_STRENGTH, SPLIT_EDGE, SPLIT_MIN } from "@/lib/learning";

export default async function DocsPage() {
  const chain = await readChain();
  return (
    <article className="space-y-10">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-accent">Docs</p>
        <h1 className="mt-2 font-display text-5xl leading-none tracking-tight md:text-6xl">How the desk learns.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          RightCall is a prediction intelligence agent for the Tatum × Walrus Total Recall hackathon, Markets and Sports track. It stores what happened, then changes the next similar read.
        </p>
      </header>

      <Section id="requirements" title="Requirements">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-6">
          <li>A call locks before the event. There is no route to edit the pick, the confidence, or the timestamp.</li>
          <li>An outcome is a separate write. It becomes an observation: prediction, source, category, conditions, result, calibration.</li>
          <li>Walrus Memory stores that observation. It does not store “this analyst is unreliable.”</li>
          <li>The next similar call recalls those observations and can move Follow, Fade, or Pass.</li>
          <li>OddsSplit shows a book-versus-chain gap. Memory on adds the historical lean. Memory off keeps the gap and drops the lean.</li>
          <li>Sportsbook probabilities in the demo are seed. Tatum is used for Sui object reads, not for invented sportsbook odds.</li>
        </ul>
      </Section>

      <Section id="architecture" title="Architecture">
        <p>
          Next.js App Router. Keys stay in server modules: <code>lib/walrus.ts</code> and <code>lib/chain.ts</code>. The browser talks to <code>/api/calls</code>, <code>/api/calls/[id]/resolve</code>, <code>/api/chain</code>, <code>/api/walrus</code>, and <code>/api/memories</code>.
        </p>
        <p>
          Seed observations live in <code>lib/seed.ts</code>. Locks and resolutions append to <code>data/runtime/state.json</code>. Pages render from the merged ledger, so the learning loop works before any mainnet write.
        </p>
        <p>
          Assessment is a pure function in <code>lib/learning.ts</code>. The Discover hero, the decision report, and <code>npm run check</code> all call it.
        </p>
      </Section>

      <Section id="walrus" title="Walrus Memory">
        <p>
          SDK <code>@mysten-incubation/memwal</code>. Relayer <code>https://relayer.memory.walrus.xyz</code> (mainnet). Namespace <code>rightcall</code>. The hosted relayer does the encrypt, upload, and index, so the desk does not ask anyone to buy WAL or SUI.
        </p>
        <p>The loop is remember, wait, recall:</p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <code>rememberAndWait(text, {"{"} idempotencyKey {"}"})</code> writes one observation. The text is a plain sentence plus a <code>RIGHTCALL_JSON</code> line so recall can be parsed.
          </li>
          <li>The relayer returns a Walrus <code>blob_id</code>. The timeline shows it when the write lands.</li>
          <li>
            <code>recall</code> searches the namespace. <code>listMemories</code> counts rows without decrypting them. That count is the proof of at least ten mainnet memories.
          </li>
        </ol>
        <p>
          Credentials: <code>MEMWAL_KEY</code> or <code>MEMWAL_PRIVATE_KEY</code>, and <code>MEMWAL_ACCOUNT_ID</code>. Optional <code>MEMWAL_SERVER_URL</code>. Namespace comes from <code>MEMWAL_NAMESPACE</code> and defaults to <code>rightcall</code>. <code>MEMWAL_AGENT_ID</code> is N/A: the Walrus UI does not issue one for this delegate, and the desk does not read it. Create the account and delegate key at memory.walrus.xyz. Do not reuse an example account id.
        </p>
        <p>
          Without those variables the ledger stays local and every screen still runs. <code>npm run seed:memories</code> writes the seed set. <code>npm run prove:memories</code> lists the namespace and prints a recall sample. The seed script sends batches of 15 through <code>rememberBulkAndWait</code>, then a marker beginning <code>RIGHTCALL_SEED_MARKER</code>.
        </p>
      </Section>

      <Section id="tatum" title="Tatum">
        <p>
          The live gateway document at <code>https://sui-mainnet.gateway.tatum.io/llms.txt</code> advertises GraphQL only. RightCall sends <code>POST {TATUM_GRAPHQL}</code> with header <code>x-api-key</code>. The key stays on the server. JSON-RPC <code>POST</code> to the gateway root returns 404 on the free key, so this desk does not call it. gRPC is available at <code>{TATUM_GRPC}</code> and is not used.
        </p>
        <p>
          This read is <code>{chain.transport === "tatum" ? "on Tatum" : chain.transport}</code>
          {chain.checkpoint ? `, checkpoint ${chain.checkpoint.toLocaleString("en-US")}` : ""}. MemWalAccount{" "}
          <code>{MEMWAL_ACCOUNT_OBJECT}</code> is {chain.accountFound ? "onchain" : "not confirmed this read"}.
          {chain.accountVersion ? ` Object version ${chain.accountVersion}.` : ""} Spot{" "}
          {chain.spotUsd ? `$${Math.round(chain.spotUsd).toLocaleString("en-US")}` : "unread"}, reference{" "}
          {chain.selected?.referenceUsd ? `$${Math.round(chain.selected.referenceUsd).toLocaleString("en-US")}` : "unread"}.
        </p>
        <p>One GraphQL operation reads:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <code>checkpoint</code> — the lock clock. A new call stores <code>sequenceNumber</code> when the read succeeds.
          </li>
          <li>
            <code>ProtocolConfig</code> <code>{PREDICT.protocolConfig}</code> — <code>trading_paused</code> and <code>frozen</code>. If either is set, OddsSplit is Blocked. The chain side is not executable.
          </li>
          <li>
            <code>PoolVault</code> <code>{PREDICT.poolVault}</code> — <code>active_expiry_markets</code> for DeepBook Predict BTC.
          </li>
          <li>Each <code>ExpiryMarket</code> — reference strike, cash, mint pause, settlement.</li>
          <li>
            <code>PythFeed</code> <code>{PREDICT.pythFeed}</code> — BTC spot. Spot versus reference chooses the memory cohort.
          </li>
          <li>
            <code>MemWalAccount</code> <code>{MEMWAL_ACCOUNT_OBJECT}</code> — the same gateway reads this object. A missing object means Walrus writes are not anchored to the account the desk is using. The object id is public. The delegate key is not.
          </li>
        </ul>
        <p>
          Those reads change the product. Spot under the reference by more than ${FLAT_USD} recalls the <code>spot-under</code> disagreements. Spot over recalls <code>spot-over</code>. A paused protocol blocks the lean even if history is loud. A missing checkpoint leaves the lock marked unstamped.
        </p>
        <p>
          If <code>TATUM_API_KEY</code> is unset, and <code>RIGHTCALL_PUBLIC_SUI_FALLBACK</code> is not <code>0</code>, the same query goes to <code>{PUBLIC_SUI_GRAPHQL}</code> and the strip says so. A failed Tatum key does not silently fall over to the public node. Set the fallback to <code>0</code> to make a missing key a hard stop.
        </p>
        <p>
          DeepBook Predict’s market object does not contain a probability. <code>read.price</code> in the Predict SDK simulates the pricer. This desk does not invent that number. The probability columns on OddsSplit are labeled seed. The spot, reference, protocol flags, and checkpoint are the live chain fields.
        </p>
        <p>
          Tatum does not return sportsbook odds for these NFL, NBA, soccer, or MLB calls. Those books are seed, labeled on the card.
        </p>
      </Section>

      <Section id="learning" title="Learning">
        <p>Comparable means the same source, the same category, and every focus tag on the new call. Other results in the category are shown as held out. They do not move the number.</p>
        <p>
          With n comparable results and h hits, the empirical rate is h/n. Weight is n / (n + {PRIOR_STRENGTH}). Adjusted confidence is (1 − weight) × stated + weight × empirical.
        </p>
        <p>
          Memory off uses the stated confidence only. Follow at {FOLLOW_AT} or above. Fade at {FADE_AT} or below. Otherwise Pass.
        </p>
        <p>
          Memory on uses the adjusted value, then refuses to follow or fade when n is under {MIN_N_TO_MOVE}. A two-for-two book stays Pass. Uncertainty is a 95% Wilson interval, labeled Thin, Wide, or Usable.
        </p>
        <p>
          The seeded Leon Varga primetime unders are the flip: stated 74% would Follow, six similar results with one hit adjust to a Fade. Two day-slate overs stay held out. Mina Okonkwo’s home dogs move the other way, from Pass to Follow. Jonah Adeyemi’s two run lines stay Pass once memory can see how small the sample is.
        </p>
        <p>
          OddsSplit history leans chain when the chain side won at least {Math.round(SPLIT_EDGE * 100)}% of a cohort of {SPLIT_MIN} or more, and leans book at or below {Math.round((1 - SPLIT_EDGE) * 100)}%. Memory off prints the gap and withholds that sentence.
        </p>
      </Section>

      <Section id="demo" title="Demo script">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Open Discover. The hero is Leon Varga, Chiefs at Bills, Under 47.5. Before is Follow. After recall is Fade. The track is the same component as the decision report.</li>
          <li>Open that decision. Read the six used memories and the two held out. Switch to Memory off. The call returns to Follow and the memories hide. The locked pick does not change.</li>
          <li>Open OddsSplit. Memory on states the cohort the live spot selected. Memory off keeps book, chain quote, and gap, and drops the lean.</li>
          <li>Sources shows sample size, Wilson band, and the running-rate sparkline.</li>
          <li>Memory shows every observation text. With credentials, it also shows relayer health, the namespace count, and a recall sample.</li>
          <li>Lock a call with a start time in the future. Resolve it later with Hit or Miss. The new observation appears on the timeline. The original pick stays put.</li>
        </ol>
      </Section>

      <Section id="env" title="Environment">
        <ul className="list-disc space-y-2 pl-5">
          <li><code>TATUM_API_KEY</code> — Sui GraphQL on the Tatum gateway.</li>
          <li><code>MEMWAL_KEY</code> or <code>MEMWAL_PRIVATE_KEY</code> — delegate private key.</li>
          <li><code>MEMWAL_ACCOUNT_ID</code> — MemWalAccount object id.</li>
          <li><code>MEMWAL_SERVER_URL</code> — defaults to the mainnet relayer.</li>
          <li><code>RIGHTCALL_PUBLIC_SUI_FALLBACK</code> — set to <code>0</code> to disable the public GraphQL fallback.</li>
        </ul>
      </Section>

      <Section id="ai" title="Tatum AI Builder">
        <p>
          Optional, not on the v1 path. The catalog is <code>https://ai.tatum.io/openapi</code>. Authenticated data calls use <code>https://api.tatum.io</code> and the same <code>x-api-key</code> as <code>TATUM_API_KEY</code>. <code>lib/tatum-ai.ts</code> can read the SUI/USD rate from <code>GET /v4/data/exchange-rate</code> as a connectivity check. The learning loop does not call it. A later pass could narrate a report. It must not be the source of the probability.
        </p>
      </Section>

      <Section id="later" title="Later">
        <p>
          A thin personal EdgeJournal can sit on the same observation schema. WhisperRank and CrowdFade are not separate products and are not in this build.
        </p>
      </Section>
    </article>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="max-w-3xl space-y-3 text-sm leading-6">
      <h2 className="font-display text-3xl tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
