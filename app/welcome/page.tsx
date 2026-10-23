import Link from "next/link";

export default function LandingPage() {
  return <main className="landing">
    <header className="landing-nav">
      <Link href="/welcome" className="landing-logo"><span className="workspace-mark">a</span> akiba</Link>
      <nav aria-label="Main navigation"><a href="#why-akiba">Why Akiba</a><a href="#how-it-works">How it works</a><a href="#groups">Groups</a></nav>
      <div className="landing-nav-actions"><Link href="/login" className="landing-signin">Sign in</Link><Link href="/signup" className="landing-button">Get started <span aria-hidden="true">↗</span></Link></div>
    </header>
    <section className="landing-hero">
      <div className="landing-hero-copy"><div className="landing-kicker"><span className="landing-dot"/> MADE FOR WHAT WE DO TOGETHER</div>
        <h1>Good things happen <em>together.</em></h1>
        <p>Big moments and shared ambitions take people working together. Akiba gives every Group a home to organize an event, work toward a goal, and keep everyone on the same page.</p>
        <div className="landing-hero-actions"><Link href="/signup" className="landing-button landing-button-large">Start with Akiba <span aria-hidden="true">↗</span></Link><a href="#how-it-works" className="landing-outline">See how it works <span aria-hidden="true">↓</span></a></div>
        <div className="landing-small-note">One place for your people, plans, and shared purpose.</div>
      </div>
      <div className="landing-visual" aria-label="Illustration of shared event and goal Groups">
        <div className="landing-visual-glow"/>
        <div className="landing-floating landing-floating-top"><span className="landing-mini-icon">✦</span><div><b>Every milestone matters</b><small>Make progress together</small></div></div>
        <div className="landing-preview-card"><div className="landing-preview-head"><span className="landing-preview-brand"><span className="landing-preview-mark">a</span> Your space</span><span className="landing-preview-dots">•••</span></div>
          <div className="landing-preview-intro"><small>YOUR GROUPS</small><h3>Something good is growing.</h3><p>A shared space for every purpose.</p></div>
          <div className="landing-preview-group"><span className="landing-preview-symbol event">▦</span><div><b>Our big celebration</b><small>Event Group · Plan together</small></div><span>↗</span></div>
          <div className="landing-preview-group"><span className="landing-preview-symbol goal">◎</span><div><b>The next big adventure</b><small>Goal Group · Move forward</small></div><span>↗</span></div>
          <div className="landing-preview-bottom"><span>People</span><span>Purpose</span><span>Progress</span></div>
        </div>
        <div className="landing-floating landing-floating-bottom"><span className="landing-mini-icon">◎</span><div><b>One shared purpose</b><small>Everyone in the loop</small></div></div>
        <span className="landing-visual-caption">Illustrative interface · Not live account data</span>
      </div>
    </section>
    <section className="landing-statement" id="why-akiba"><span className="landing-section-label">THE CHALLENGE</span><h2>When plans live everywhere, <em>clarity gets lost.</em></h2><p>Group plans often unfold across scattered messages, separate records, and repeated updates. Akiba is being built to bring the people and the purpose together in a more organized, transparent experience.</p></section>
    <section className="landing-features" id="how-it-works"><div className="landing-section-top"><div><span className="landing-section-label">HOW AKIBA WORKS</span><h2>Make space for what matters.</h2></div><p>Start with a purpose. Bring people together. Build from there.</p></div><div className="landing-feature-grid">
      <article><span className="landing-feature-number">01</span><div className="landing-feature-icon">◎</div><h3>Create your Group</h3><p>Choose an Event or Goal and give your shared purpose a dedicated space.</p></article>
      <article><span className="landing-feature-number">02</span><div className="landing-feature-icon">♧</div><h3>Bring people together</h3><p>Akiba is designed around Groups, so everyone can work toward the same purpose. Collaboration features are being developed.</p></article>
      <article><span className="landing-feature-number">03</span><div className="landing-feature-icon">↗</div><h3>Grow with clarity</h3><p>Keep your Group organized today, with communication and shared financial progress planned as the platform grows.</p></article>
    </div></section>
    <section className="landing-types" id="groups"><div className="landing-types-copy"><span className="landing-section-label">TWO WAYS TO BEGIN</span><h2>Every Group has <em>a reason.</em></h2><p>Some things bring us together for a moment. Others give us something to build toward. Akiba makes room for both.</p><Link href="/signup" className="landing-text-link">Create your first Group <span aria-hidden="true">↗</span></Link></div><div className="landing-type-cards"><article className="landing-type-event"><span>▦</span><small>EVENT GROUPS</small><h3>For moments worth sharing.</h3><p>Weddings, graduations, celebrations, and the important days we plan together.</p></article><article className="landing-type-goal"><span>◎</span><small>GOAL GROUPS</small><h3>For things worth building.</h3><p>Trips, family projects, and shared ambitions that take collective effort.</p></article></div></section>
    <section className="landing-final"><span className="landing-section-label">YOUR PEOPLE. YOUR PURPOSE.</span><h2>Start something <em>together.</em></h2><p>Give your next event or shared goal a place to begin.</p><Link href="/signup" className="landing-button landing-button-large">Create your account <span aria-hidden="true">↗</span></Link><div className="landing-final-signin">Already have an account? <Link href="/login">Sign in</Link></div></section>
    <footer className="landing-footer"><Link href="/welcome" className="landing-logo"><span className="workspace-mark">a</span> akiba</Link><span>A Globe Software product · © 2026 Akiba</span><span>Group creation is available. Financial transactions and collaboration features are not yet active.</span></footer>
  </main>;
}
