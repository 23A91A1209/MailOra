import React from "react";
import "./Privacy.css";

const PrivacyPolicy = () => {
  return (
    <div className="privacy-page">

      {/* HERO SECTION */}

      <div className="privacy-hero">
        <div className="hero-content">
          {/* <p className="breadcrumb">Home  ›  Privacy Policy</p> */}
          <h1>Privacy Policy</h1>
        </div>
      </div>

      {/* CONTENT SECTION */}

      <div className="privacy-container">

        <p className="intro">
          This Privacy Policy explains how MailORA collects, uses, and protects
          personal information when users interact with our platform.
          Our system analyzes career-related emails and provides job opportunity
          tracking, deadline reminders, and job recommendations.
        </p>

        <p>
          The information collected may include email metadata, resume details,
          and account information necessary for delivering personalized career
          insights. We are committed to maintaining transparency and protecting
          user privacy while providing our services.
        </p>

        <h2>Personally Identifiable Information</h2>

        <p>
          Personally Identifiable Information (PII) refers to data that can be
          used to identify an individual. MailORA collects PII only when users
          voluntarily provide such information during account creation, resume
          upload, or email integration.
        </p>

        <p>
          Examples of information we may collect include:
        </p>

        <ul>
          <li>Name and email address</li>
          <li>Email metadata such as sender and timestamps</li>
          <li>Resume information including skills and education</li>
          <li>Account activity and system usage data</li>
        </ul>

        <h2>How We Use Information</h2>

        <p>
          The information collected is used solely for improving the
          functionality of our platform and providing users with personalized
          career insights.
        </p>

        <ul>
          <li>Detect career opportunities from emails</li>
          <li>Send reminders before application deadlines</li>
          <li>Recommend jobs based on resume data</li>
          <li>Improve system performance and features</li>
        </ul>

        <h2>Data Security</h2>

        <p>
          MailORA implements industry-standard security practices including
          secure authentication, encrypted data transmission, and restricted
          access control to protect user information.
        </p>

        <h2>Third-Party Services</h2>

        <p>
          Our platform may integrate with external services such as authentication
          providers or job APIs. These services operate under their own privacy
          policies.
        </p>

        <h2>Policy Updates</h2>

        <p>
          This Privacy Policy may be updated periodically to reflect changes in
          our services or legal requirements. Updates will be published on this
          page with a revised date.
        </p>

        <h2>Contact</h2>

        <p>
          For questions regarding this Privacy Policy please contact:
        </p>

        <p className="contact">
          support@mailora.com
        </p>

      </div>

    </div>
  );
};

export default PrivacyPolicy;
