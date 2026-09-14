import { 
  OllamaProvider 
} from "../runtime/src/index.js";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import fs from "fs";
import path from "path";

async function runSentryMonitor() {
  const LOG_FILE = path.join(process.cwd(), "sentry_telemetry.log");
  const provider = new OllamaProvider({ model: "hermes3:latest" });
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  console.log("🛡️  Sentry Monitor Mode Active...");
  console.log(`📝 Telemetry logging to: ${LOG_FILE}`);
  console.log("⏱️  Interval: 60s | Status: STANDBY for 07:00 EDT Launch");
  console.log("============================================================");

  const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(LOG_FILE, entry);
    console.log(entry.trim());
  };

  while (true) {
    try {
      // 1. Solana Slot Progression
      const slot = await connection.getSlot();
      
      // 2. Ollama Latency Check
      const start = Date.now();
      await provider.chat([{ role: "user", content: "ping" }]);
      const latency = Date.now() - start;

      // 3. Resource Monitoring
      const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      
      const status = `STATUS: OK | Slot: ${slot} | Ollama: ${latency}ms | Mem: ${memUsage.toFixed(2)}MB`;
      log(status);

    } catch (e: any) {
      log(`⚠️  SENTRY ALERT: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 60000));
  }
}

runSentryMonitor().catch(console.error);
