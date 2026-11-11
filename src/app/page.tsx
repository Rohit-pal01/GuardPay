export default function HomePage() {
  return (
    <main style={{ maxWidth: 800, margin: "40px auto" }}>
      <h1>Mandate</h1>
      <p>
        The AI shopping agent governed by deterministic guardrails.
      </p>
      <ul>
        <li><code>POST /api/agent/run</code> - SSE Stream of AgentEvents</li>
        <li><code>POST /api/negotiate/start</code> - Multi-turn Seller/Buyer Negotiation SSE Stream</li>
      </ul>
    </main>
  );
}
