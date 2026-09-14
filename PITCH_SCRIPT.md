# 🎙️ AgenC Pitch Video: Teleprompter Script

**Demo Command:** `npm run demo:pitch`  
**Target Duration:** 120 Seconds (2 Minutes)

---

### [0:00 — 0:25] THE HOOK
**Screen Action:** *Start with a clean terminal window or a slide showing the AgenC logo. Do NOT run the command yet.*

**Spoken Words:**
> "Autonomous AI agents are the next frontier of productivity, but they have a fundamental problem: they’re silos. Today, if Agent A hires Agent B to audit a contract or analyze a trade, there is no trustless way to guarantee payment or prove the work was actually done without leaking proprietary data. 
>
> Meet **AgenC**: The trustless coordination and economic settlement layer for AI agents on Solana."

---

### [0:25 — 0:55] STEP 1: LIVE STATE
**Screen Action:** *Run `npm run demo:pitch`. The terminal clears and the banner appears. **[STEP 1/3]** prints. Hover your mouse over the Program ID and Treasury Explorer links.*

**Spoken Words:**
> "Let’s look at the live system. Right now, I'm running our Golden Path demo. 
>
> Step one: Live State. Our agent isn't just guessing—it's querying the real Solana Devnet. You can see the live Program ID and the Protocol Treasury PDA right here in the terminal. We've anchored the economic trust on-chain using Anchor escrows, ensuring that bounties are locked and guaranteed before a single line of code is executed."

---

### [0:55 — 1:30] STEP 2 & 3: THE MAGIC MOMENT
**Screen Action:** *Terminal prints **[STEP 2/3]**. The Hermes 3 reasoning stream begins to flow. As it finishes, the screen hits **[STEP 3/3]** and the ZK-hashes (Constraint Hash, Binding, etc.) appear in green.*

**Spoken Words:**
> "Now, the magic moment. We're dispatching a task to Hermes 3. Watch the reasoning stream: the agent is analyzing live protocol parameters and formulating an optimal settlement plan in real-time.
>
> But here is the differentiator: To prevent front-running and protect proprietary logic, the agent doesn't just return text. It seals the result. 
>
> Using RISC Zero Groth16 ZK-VM proofs, the agent generates a cryptographic commitment. It proves the result is correct without revealing the private data. That's a complete, private, and verifiable settlement cycle—all in under seven seconds."

---

### [1:30 — 2:00] THE VISION & CLOSE
**Screen Action:** *Leave the terminal open on the "Demo Complete" banner. Transition to a quick shot of the `HACKATHON_QUICKSTART.md` or the `npm test` success output (5,514 passing).*

**Spoken Words:**
> "We aren't just pitching a prototype. AgenC is a fortress. We have five-thousand-five-hundred and fourteen passing unit tests and forty-two out of forty-two Anchor instructions verified. 
>
> We've built the rails for a decentralized AI workforce. Trustless, private, and scalable.
>
> AgenC: The settlement layer for the agentic era. Thank you."

---

### 🎬 Recording Tips for the "Golden Path":
1. **The Pause:** When the script says "Let's look at the live system," hit `Enter` on the command. The 400ms-800ms delays in `record_pitch.ts` give you natural speaking space.
2. **The Zoom:** If using a screen recorder (Loom, OBS), zoom in on the **ZK-Seal hashes** at the 1:15 mark. That is the primary technical differentiator for the judges.
3. **The Tone:** Fast-paced, punchy, and confident.
