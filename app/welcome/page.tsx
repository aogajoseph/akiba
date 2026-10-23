import Link from "next/link";

function DashboardPreview() {
  const bars = [36, 55, 43, 71, 61, 85, 68, 94, 77, 100, 82, 93];
  return <div className="landing-showcase">
    <div className="landing-showcase-halo" aria-hidden="true" />
    <div className="landing-dashboard" aria-label="Illustrative preview of a future Akiba dashboard. The displayed Groups, activities and amounts are fictional.">
      <aside className="landing-dashboard-side">
        <div className="landing-dashboard-brand"><span className="landing-mark">a</span><b>akiba</b></div>
        <span className="landing-dash-caption">WORKSPACE</span>
        <div className="landing-dash-nav active"><span>▦</span> Overview</div>
        <div className="landing-dash-nav"><span>◎</span> My Groups</div>
        <div className="landing-dash-nav"><span>▤</span> Activity</div>
        <div className="landing-dash-nav"><span>◫</span> Insights</div>
        <div className="landing-dash-side-bottom"><span className="landing-dash-avatar">JA</span><div><b>Joseph A.</b><small>Personal space</small></div><span>⌄</span></div>
      </aside>
      <div className="landing-dashboard-main">
        <div className="landing-dash-toolbar"><span>Workspace <span className="landing-dash-muted">/ Overview</span></span><div><span className="landing-dash-search">⌕ &nbsp; Search</span><span className="landing-dash-bell">♧</span><span className="landing-dash-avatar">JA</span></div></div>
        <div className="landing-dash-body">
          <div className="landing-dash-heading"><div><span className="landing-dash-caption">MONDAY, OCTOBER 19</span><h3>Good morning, Joseph <span>✳</span></h3><p>Here's what's happening across your Groups.</p></div><span className="landing-dash-create">＋ New Group</span></div>
          <div className="landing-dash-stats">
            <div><span>My Groups <i>◎</i></span><strong>04</strong><small>↗ &nbsp; Shared spaces</small></div>
            <div><span>People together <i>♧</i></span><strong>48</strong><small>Across your Groups</small></div>
            <div><span>Contributions tracked <i>⌁</i></span><strong>KES 248,500</strong><small>Illustrative amount</small></div>
          </div>
          <div className="landing-dash-grid">
            <section className="landing-dash-panel landing-dash-chart"><div className="landing-dash-panel-head"><div><small>GROUP ACTIVITY</small><h4>Progress over time</h4></div><span>Last 12 months ⌄</span></div><div className="landing-dash-chart-area"><div className="landing-dash-gridlines"><i/><i/><i/><i/></div><div className="landing-dash-bars">{bars.map((height,index)=><span key={index} style={{height:height+"%"}} />)}</div></div><div className="landing-dash-axis"><span>JAN</span><span>MAR</span><span>MAY</span><span>JUL</span><span>SEP</span><span>DEC</span></div></section>
            <section className="landing-dash-panel landing-dash-recent"><div className="landing-dash-panel-head"><div><small>YOUR SPACES</small><h4>Active Groups</h4></div><span>View all ↗</span></div><div className="landing-dash-group"><span className="landing-dash-group-icon green">▦</span><div><b>Family celebration</b><small>Event · 18 members</small></div><span>↗</span></div><div className="landing-dash-group"><span className="landing-dash-group-icon gold">◎</span><div><b>Our next adventure</b><small>Goal · 12 members</small></div><span>↗</span></div><div className="landing-dash-group"><span className="landing-dash-group-icon violet">◎</span><div><b>Home project</b><small>Goal · 9 members</small></div><span>↗</span></div></section>
          </div>
          <div className="landing-dash-bottom"><span className="landing-dash-avatar pale">AM</span><span><b>Recent activity</b> &nbsp; Amina shared an update in Our next adventure</span><small>12 min ago</small></div>
        </div>
      </div>
    </div>
    <p className="landing-showcase-caption"><span aria-hidden="true">✦</span> Concept preview of Akiba's vision. All dashboard information is fictional; financial and collaboration features are not yet available.</p>
  </div>;
}

export default function LandingPage() {
  return <main className="landing">
    <header className="landing-nav">
      <Link href="/welcome" className="landing-logo" aria-label="Akiba home"><span className="landing-mark">a</span><span>akiba</span></Link>
      <nav aria-label="Main navigation"><a href="#why-akiba">Why Akiba</a><a href="#how-it-works">How it works</a><a href="#groups">Events & Goals</a></nav>
      <div className="landing-nav-actions"><Link href="/login" className="landing-signin">Sign in</Link><Link href="/signup" className="landing-button landing-button-nav">Get started <span aria-hidden="true">↗</span></Link></div>
    </header>
    <section className="landing-hero">
      <div className="landing-hero-copy">
        <div className="landing-kicker"><span className="landing-dot" /> BUILT FOR WHAT WE DO TOGETHER</div>
        <h1>Good things happen <em>together.</em></h1>
        <p>From life's big moments to the goals we share, Akiba brings your people and plans into one organized space. A better way to move forward, together.</p>
        <div className="landing-hero-actions"><Link href="/signup" className="landing-button landing-button-large">Get started for free <span aria-hidden="true">↗</span></Link><a href="#how-it-works" className="landing-outline">Explore how it works <span aria-hidden="true">↓</span></a></div>
        <span className="landing-hero-note">Your people. Your purpose. One place to begin.</span>
      </div>
      <DashboardPreview />
    </section>
    <section className="landing-statement" id="why-akiba"><span className="landing-section-label">THE REASON WE'RE BUILDING AKIBA</span><h2>Big plans shouldn't get <em>lost in the chat.</em></h2><p>Important plans often live across scattered conversations, spreadsheets, and constant follow-ups. Akiba is being built to give shared events and goals a clearer, more connected home.</p></section>
    <section className="landing-features" id="how-it-works"><div className="landing-section-top"><div><span className="landing-section-label">SIMPLE BY DESIGN</span><h2>A shared purpose.<br/><em>A better way forward.</em></h2></div><p>Start with a Group. Organize around what matters. Grow together as more Akiba features become available.</p></div><div className="landing-feature-grid">
      <article><span className="landing-feature-number">01 / START</span><div className="landing-feature-icon">◎</div><h3>Create your Group</h3><p>Choose an Event or Goal and create a dedicated space for your shared purpose.</p></article>
      <article><span className="landing-feature-number">02 / CONNECT</span><div className="landing-feature-icon">♧</div><h3>Bring people together</h3><p>Akiba is designed for shared coordination, with invitations and collaboration features on the roadmap.</p></article>
      <article><span className="landing-feature-number">03 / PROGRESS</span><div className="landing-feature-icon">↗</div><h3>Move with clarity</h3><p>A vision for communication, accountability, and financial progress in one place. These tools are in development.</p></article>
    </div></section>
    <section className="landing-types" id="groups"><div className="landing-types-copy"><span className="landing-section-label">EVERY GROUP HAS A PURPOSE</span><h2>For the moments.<br/><em>For the milestones.</em></h2><p>Some things bring us together for a day. Others give us something to build toward. Akiba makes room for both.</p><Link href="/signup" className="landing-text-link">Create your first Group <span aria-hidden="true">↗</span></Link></div><div className="landing-type-cards"><article className="landing-type-event"><span className="landing-type-symbol">▦</span><small>EVENT GROUPS</small><h3>Make the moment count.</h3><p>Weddings, graduations, celebrations, and the important days we plan together.</p></article><article className="landing-type-goal"><span className="landing-type-symbol">◎</span><small>GOAL GROUPS</small><h3>Build toward something bigger.</h3><p>Trips, family projects, and shared ambitions that take collective effort.</p></article></div></section>
    <section className="landing-final"><span className="landing-section-label">GOOD THINGS START SOMEWHERE</span><h2>Let's build something <em>together.</em></h2><p>Give your next event or shared goal a place to begin.</p><Link href="/signup" className="landing-button landing-button-large">Create your account <span aria-hidden="true">↗</span></Link><div className="landing-final-signin">Already have an account? <Link href="/login">Sign in</Link></div></section>
    <footer className="landing-footer"><Link href="/welcome" className="landing-logo"><span className="landing-mark">a</span><span>akiba</span></Link><span>© 2026 Akiba · A Globe Software product</span><span>Group creation is available. Financial transactions and collaboration are not yet active.</span></footer>
  </main>;
}
