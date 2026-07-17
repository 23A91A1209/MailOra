import React from "react";
import "./Terms.css";

const Terms = () => {
  return (
    <div className="terms-wrapper">

      <div className="terms-header">
        <h1>Terms and Conditions</h1>
        <p>Last Updated: March 2026</p>
      </div>

      <div className="terms-content">

        <h2>1. Introduction</h2>
        <p>
          Welcome to MailOra. These Terms and Conditions govern your access
          to and use of the MailOra platform. By accessing or using this
          website, you agree to be bound by these Terms and Conditions and all
          applicable laws and regulations. If you do not agree with any part of
          these terms, you must discontinue using the platform immediately.
        </p>

        <p>
          MailOra is a web-based system designed to help students and early
          professionals manage career opportunities efficiently. The platform
          assists users in tracking internships, job openings, hackathons,
          workshops, and interview schedules by analyzing relevant information
          from connected email accounts and presenting the data in a structured
          dashboard.
        </p>

        <h2>2. User Accounts</h2>
        <p>
          In order to access certain features of MailOra, users may be
          required to create an account. When creating an account, users must
          provide accurate and complete information. Users are responsible for
          maintaining the confidentiality of their login credentials and for
          all activities conducted through their account.
        </p>

        <p>
          MailOra reserves the right to suspend or terminate accounts that
          provide false information, violate these terms, or engage in activities
          that could harm the platform or other users.
        </p>

        <h2>3. Email Integration</h2>
        <p>
          MailOra allows users to connect their email accounts in order to
          detect career-related opportunities automatically. The system scans
          emails to identify information related to internships, job postings,
          hackathons, interviews, and other professional events.
        </p>

        <p>
          The platform only processes information required to identify
          opportunities and deadlines. MailOra does not send emails on
          behalf of users or modify the contents of their inbox. Users may
          revoke email access at any time through their account settings.
        </p>

        <h2>4. Opportunity Tracking and Reminders</h2>
        <p>
          MailOra organizes detected opportunities in a centralized
          dashboard and may provide reminder notifications before application
          deadlines. While the system aims to accurately extract relevant
          information from emails, MailOra does not guarantee that all
          opportunities or deadlines will always be detected correctly.
        </p>

        <p>
          Users are responsible for verifying all opportunity details directly
          from the original source before submitting applications or making
          career decisions.
        </p>

        <h2>5. Job Recommendations</h2>
        <p>
          MailOra may provide job recommendations using third-party
          services and APIs based on user preferences, resume information,
          and location. These recommendations are intended to assist users in
          discovering relevant opportunities but should not be interpreted as
          guarantees of employment or interview selection.
        </p>

        <h2>6. Acceptable Use</h2>
        <p>
          Users agree to use the platform only for lawful purposes and in a
          manner that does not harm the system or other users. Any attempt to
          access unauthorized data, disrupt platform functionality, or misuse
          the service may result in account suspension or termination.
        </p>

        <h2>7. Intellectual Property</h2>
        <p>
          All content, software, design elements, and features associated with
          MailOra are the intellectual property of the platform developers.
          Unauthorized copying, reproduction, or distribution of any part of
          the platform without permission is strictly prohibited.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          MailOra is provided as a tool to assist users in managing career
          opportunities. The platform is not responsible for missed deadlines,
          inaccurate listings, or any decisions made based on the information
          presented by the system.
        </p>

        <h2>9. Changes to These Terms</h2>
        <p>
          MailOra reserves the right to modify these Terms and Conditions
          at any time. Any updates will be posted on this page, and continued
          use of the platform after such changes indicates acceptance of the
          revised terms.
        </p>

        <h2>10. Contact Information</h2>
        <p>
          If you have any questions regarding these Terms and Conditions, you
          may contact the MailOra support team for assistance.
        </p>

        <p className="contact">
          support@mailora.com
        </p>

      </div>
    </div>
  );
};

export default Terms;
