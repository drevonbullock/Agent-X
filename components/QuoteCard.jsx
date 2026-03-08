/**
 * QuoteCard — Dark branded Twitter quote card
 * 1200×675 (16:9) aspect ratio, orange accent theme
 *
 * Props:
 *   quote     {string} — The quote text to display
 *   author    {string} — Author name (default: "Drevon Bullock")
 *   title     {string} — Author title line
 *   handle    {string} — Twitter handle (with @)
 */
export default function QuoteCard({
  quote = "The best time to build was yesterday. The second best time is now.",
  author = "Drevon Bullock",
  title = "AI Consultant • Bullock Consulting Group",
  handle = "@DrevonBullock",
}) {
  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden"
      style={{ width: 1200, height: 675, fontFamily: '-apple-system, "Helvetica Neue", Arial, sans-serif' }}
    >
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0A0A0A 0%, #111111 60%, #1A1008 100%)",
        }}
      />

      {/* Orange corner glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 0% 0%, rgba(255,107,0,0.14) 0%, transparent 55%)",
        }}
      />

      {/* Left orange accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2"
        style={{
          background: "linear-gradient(180deg, #FF8C3A 0%, #FF6B00 100%)",
        }}
      />

      {/* Bottom orange border line */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600" />

      {/* Ghost quote mark */}
      <div
        className="absolute select-none pointer-events-none"
        style={{
          top: -60,
          left: 28,
          fontSize: 320,
          fontWeight: 700,
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: "#FF6B00",
          opacity: 0.06,
          lineHeight: 1,
        }}
      >
        &ldquo;
      </div>

      {/* Quote text — centered in card above bottom strip */}
      <div className="relative flex flex-1 items-center justify-center px-20 pt-10 pb-2">
        <p
          className="text-white text-center font-bold leading-tight"
          style={{
            fontSize: "clamp(2.6rem, 4.5vw, 4rem)",
            textShadow: "0 0 40px rgba(255,107,0,0.25)",
            maxWidth: 920,
          }}
        >
          {quote}
        </p>
      </div>

      {/* Bottom strip */}
      <div className="relative" style={{ height: 90 }}>
        {/* Separator */}
        <div
          className="absolute top-0 mx-8"
          style={{
            left: 36,
            right: 36,
            height: 1,
            background: "rgba(255,107,0,0.35)",
          }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Content */}
        <div className="relative flex items-center justify-between h-full px-9">
          {/* Author info */}
          <div className="flex flex-col justify-center gap-1">
            <span className="text-white font-bold" style={{ fontSize: 22 }}>
              {author}
            </span>
            <span style={{ fontSize: 18, color: "#FF8C3A", fontWeight: 400 }}>
              {title}
            </span>
          </div>

          {/* Handle */}
          <span
            className="font-semibold"
            style={{ fontSize: 20, color: "#FF6B00" }}
          >
            {handle}
          </span>
        </div>
      </div>
    </div>
  );
}
