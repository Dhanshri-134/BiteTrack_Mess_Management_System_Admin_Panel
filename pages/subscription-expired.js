export default function SubscriptionExpired() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "column",
      background: "#f8fafc"
    }}>
      <h1>🚫 Subscription Expired</h1>
      <p>Your plan is no longer active.</p>
      <p>Please renew to continue using BiteTrack.</p>
    </div>
  );
}
