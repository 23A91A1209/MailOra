import { Link } from 'react-router-dom';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer custom-footer">
      <div className="footer-container">
        <div className="footer-info">
          <Link to="/" className="footer-logo">
            MailOra
          </Link>
          <p>A smart platform that helps students track career opportunities, manage deadlines, and discover jobs.</p>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} MailOra. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
