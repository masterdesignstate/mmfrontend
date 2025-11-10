'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import HamburgerMenu from '@/components/HamburgerMenu';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Image
            src="/assets/mmlogox.png"
            alt="Logo"
            width={32}
            height={32}
            className="mr-2"
          />
        </div>
        <HamburgerMenu />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last Updated: November 2025</p>

        {/* Introduction */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
          <p className="text-gray-700 mb-4">
            Welcome to Matchmatical. By accessing or using our matchmaking platform, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our service.
          </p>
          <p className="text-gray-700">
            Matchmatical is a compatibility-based matchmaking platform that uses a question-and-answer system to help users find meaningful connections
            based on shared values, lifestyle preferences, and compatibility scores.
          </p>
        </section>

        {/* Eligibility */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Eligibility</h2>
          <p className="text-gray-700 mb-4">
            You must be at least 18 years old to use Matchmatical. By creating an account, you represent and warrant that:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>You are at least 18 years of age</li>
            <li>You have the legal capacity to enter into these Terms of Service</li>
            <li>You will comply with these terms and all applicable local, state, national, and international laws</li>
            <li>You have not been previously banned or suspended from using our service</li>
          </ul>
        </section>

        {/* Account Registration */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Account Registration and Security</h2>
          <p className="text-gray-700 mb-4">
            To use Matchmatical, you must create an account using a valid email address and password. You agree to:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Provide accurate, current, and complete information during registration</li>
            <li>Maintain and update your information to keep it accurate and current</li>
            <li>Keep your password secure and confidential</li>
            <li>Notify us immediately of any unauthorized access to your account</li>
            <li>Accept responsibility for all activities that occur under your account</li>
          </ul>
        </section>

        {/* User Content and Questions */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Content and Question Answers</h2>
          <p className="text-gray-700 mb-4">
            Matchmatical allows users to answer questions about themselves and their preferences. You retain ownership of your responses,
            but grant us a license to use this information for:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Calculating compatibility scores with other users</li>
            <li>Displaying your profile information to potential matches</li>
            <li>Improving our matching algorithms and platform features</li>
            <li>Aggregated and anonymized data analysis</li>
          </ul>
          <p className="text-gray-700 mt-4">
            You are responsible for the accuracy of your answers. Intentionally providing false information may result in account suspension.
          </p>
        </section>

        {/* Profile Photos and Moderation */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Profile Photos and Content Moderation</h2>
          <p className="text-gray-700 mb-4">
            All profile photos are subject to moderation. You agree that:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Profile photos must be appropriate and not contain nudity, violence, or offensive content</li>
            <li>Photos must accurately represent you and not contain other people as the primary subject</li>
            <li>We reserve the right to reject or remove any photo that violates these guidelines</li>
            <li>Repeated violations may result in account restrictions or termination</li>
          </ul>
        </section>

        {/* Matching and Compatibility */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Matching and Compatibility System</h2>
          <p className="text-gray-700 mb-4">
            Our platform uses a proprietary compatibility algorithm based on your question answers. You understand that:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Compatibility scores are calculated based on mutual question answers and importance ratings</li>
            <li>Higher compatibility scores indicate greater alignment in values and preferences</li>
            <li>Compatibility scores are not guarantees of relationship success</li>
            <li>We continuously improve our algorithms and scores may change over time</li>
            <li>Answering more questions, especially required questions, improves match quality</li>
          </ul>
        </section>

        {/* Prohibited Conduct */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Prohibited Conduct</h2>
          <p className="text-gray-700 mb-4">
            You agree not to:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Harass, threaten, or harm other users</li>
            <li>Use the platform for commercial purposes without authorization</li>
            <li>Create fake accounts or impersonate others</li>
            <li>Use restricted words or offensive language in your profile or messages</li>
            <li>Attempt to circumvent our security measures or access other users' accounts</li>
            <li>Scrape, data mine, or use automated tools to access the platform</li>
            <li>Share or distribute other users' information without consent</li>
          </ul>
        </section>

        {/* User Reports and Restrictions */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. User Reports and Account Restrictions</h2>
          <p className="text-gray-700 mb-4">
            Users may report inappropriate behavior. We reserve the right to:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Investigate reported violations of these terms</li>
            <li>Temporarily or permanently restrict or ban accounts</li>
            <li>Remove content that violates our guidelines</li>
            <li>Take appropriate action based on the severity of violations</li>
          </ul>
        </section>

        {/* Privacy and Data */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Privacy and Data Protection</h2>
          <p className="text-gray-700 mb-4">
            Your privacy is important to us. We collect and use your data as described in our Privacy Policy, including:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>Account information (email, profile details)</li>
            <li>Question answers and preferences</li>
            <li>Profile photos stored securely in Azure Blob Storage</li>
            <li>Usage data and activity logs</li>
            <li>Compatibility calculations and match history</li>
          </ul>
        </section>

        {/* Termination */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Termination</h2>
          <p className="text-gray-700 mb-4">
            You may terminate your account at any time through your settings. We may terminate or suspend your account if:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>You violate these Terms of Service</li>
            <li>You engage in prohibited conduct</li>
            <li>We receive valid legal requests</li>
            <li>We discontinue the service</li>
          </ul>
        </section>

        {/* Disclaimers */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Disclaimers</h2>
          <p className="text-gray-700 mb-4">
            Matchmatical is provided "as is" without warranties of any kind. We do not guarantee:
          </p>
          <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
            <li>That you will find compatible matches</li>
            <li>The accuracy of user-provided information</li>
            <li>Uninterrupted or error-free service</li>
            <li>The behavior or intentions of other users</li>
          </ul>
        </section>

        {/* Limitation of Liability */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Limitation of Liability</h2>
          <p className="text-gray-700">
            To the maximum extent permitted by law, Matchmatical shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages arising from your use of the platform, including but not limited to damages
            for loss of profits, data, or relationships.
          </p>
        </section>

        {/* Changes to Terms */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Changes to Terms</h2>
          <p className="text-gray-700">
            We reserve the right to modify these Terms of Service at any time. We will notify users of material changes
            through the platform or via email. Continued use of the service after changes constitutes acceptance of the updated terms.
          </p>
        </section>

        {/* Contact */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Contact Information</h2>
          <p className="text-gray-700">
            If you have questions about these Terms of Service, please contact us through the platform or via our support channels.
          </p>
        </section>

        {/* Back Button */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <button
            onClick={() => router.push('/settings')}
            className="inline-flex items-center text-[#672DB7] hover:text-[#5624A0] font-medium"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            <span>Back to Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
