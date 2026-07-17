import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

const Home = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginPopup, setShowLoginPopup] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [popupMessage, setPopupMessage] = useState("");

  // Scroll-triggered animation refs
  const aboutRef = useRef(null);
  const cardsRef = useRef([]);
  const footerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("ca-visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    if (aboutRef.current) observer.observe(aboutRef.current);
    if (footerRef.current) observer.observe(footerRef.current);
    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, []);

  const handleNavClick = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      setPopupMessage("Please login to access this page.");
      setShowLoginPopup(true);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      setIsLoggedIn(true);
      setConnectedAccounts((prev) => {
        if (!prev.includes(email)) return [...prev, email];
        return prev;
      });
      setShowLoginForm(false);
      setEmail("");
      setPassword("");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setConnectedAccounts([]);
  };

  const features = [
    { icon: "✉️", title: "Email Integration", desc: "Connect your inbox and let our system automatically detect career-related emails with smart filtering." },
    { icon: "⚡", title: "Deadline Reminders", desc: "Get notified three days before every application deadline so you never miss an opportunity." },
    { icon: "📊", title: "Opportunity Dashboard", desc: "Track total opportunities, pending applications, interviews scheduled, and your progress in one place." },
    { icon: "🛡️", title: "Job Recommendations", desc: "Real-time job suggestions based on your resume, preferred role, and location using intelligent matching." },
  ];

  return (
    <div className="home-container">

      <main>
        {/* Hero */}
        <section className="ca-hero">
          <div className="ca-hero-content-centered">
            <h1 className="ca-hero-headline ca-animate-hero-title">
              Never miss a career{" "}
              <span>opportunity again.</span>
            </h1>
            <p className="ca-hero-description ca-animate-hero-desc">
              MailOra connects to your inbox, automatically detects internships, jobs, hackathons, and interviews — then reminds you before every deadline.
            </p>
            <p className="ca-hero-tagline ca-animate-hero-tagline">
              Join 10,000+ students tracking opportunities smarter, not harder.
            </p>

            {!isLoggedIn ? (
              <button className="ca-hero-btn ca-animate-hero-btn" onClick={() => setShowLoginForm(true)}>
                Create Account <span className="ca-arrow-bounce">→</span>
              </button>
            ) : (
              <div className="ca-connected-accounts ca-animate-hero-btn">
                <h3>Connected Accounts ({connectedAccounts.length})</h3>
                <ul>
                  {connectedAccounts.map((acc, i) => (
                    <li key={i}>📧 {acc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* About */}
        <section className="ca-about">
          <div className="ca-about-container">
            <div className="ca-about-header ca-scroll-animate" ref={aboutRef}>
              <span className="ca-badge ca-badge-pulse">Platform</span>
              <h2>Smart opportunity tracking</h2>
              <p>
                Students receive dozens of career emails daily. Career Alert cuts through the noise — filtering, organizing, and reminding you so no deadline slips by.
              </p>
            </div>

            <div className="ca-features-grid">
              {features.map((f, i) => (
                <div
                  className="ca-feature-card ca-scroll-animate"
                  key={i}
                  ref={(el) => (cardsRef.current[i] = el)}
                  style={{ transitionDelay: `${i * 0.12}s` }}
                >
                  <div className="ca-feature-icon ca-icon-float">{f.icon}</div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>


      {/* Login Popup */}
      {showLoginPopup && (
        <div className="ca-popup-overlay" onClick={() => setShowLoginPopup(false)}>
          <div className="ca-popup" onClick={(e) => e.stopPropagation()}>
            <button className="ca-popup-close" onClick={() => setShowLoginPopup(false)}>✕</button>
            <div className="ca-popup-icon ca-icon-float">🔒</div>
            <h3>{popupMessage}</h3>
            <button
              className="ca-popup-login-btn ca-btn-animated"
              onClick={() => {
                setShowLoginPopup(false);
                setShowLoginForm(true);
              }}
            >
              Login Now
            </button>
          </div>
        </div>
      )}

      {/* Login Form Modal */}
      {showLoginForm && (
        <div className="ca-popup-overlay" onClick={() => setShowLoginForm(false)}>
          <div className="ca-popup ca-login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="ca-popup-close" onClick={() => setShowLoginForm(false)}>✕</button>
            <h3>Login to MailOra</h3>
            <form onSubmit={handleLogin} className="ca-login-form">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit" className="ca-popup-login-btn ca-btn-animated">Login</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
