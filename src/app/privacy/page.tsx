import Image from 'next/image';
import Link from 'next/link';

const sections = [
  {
    title: 'Information we collect',
    body: 'We collect the account details, profile information, photos, question answers, preferences, and activity needed to operate CompatibleFirst. We also collect limited technical and usage information to keep the service reliable and improve the product.',
  },
  {
    title: 'How we use information',
    body: 'We use your information to create your profile, calculate and explain compatibility, show relevant people and content, deliver messages and notifications, moderate safety issues, prevent abuse, and support the service.',
  },
  {
    title: 'Who can see your information',
    body: 'Other members can see the profile details and answers you choose to share. Your settings control the visibility of answer notes and activity. Administrative access is limited to operating, supporting, and protecting the platform.',
  },
  {
    title: 'Storage and service providers',
    body: 'Profile media is stored with Azure Blob Storage. We use hosting, email, and analytics providers only as needed to deliver and monitor the service. We do not sell your personal information.',
  },
  {
    title: 'Retention and deletion',
    body: 'We retain information while your account is active and as reasonably needed for safety, fraud prevention, legal obligations, and dispute resolution. Contact us if you want to request access, correction, or deletion of your information.',
  },
  {
    title: 'Safety and your choices',
    body: 'Use the privacy controls in Settings to choose what you share. You can block or report concerning behavior. Avoid posting sensitive information that you do not want other members to see.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
            <Image src="/assets/mmlogox.png" alt="CompatibleFirst" width={36} height={36} />
            CompatibleFirst
          </Link>
          <Link href="/settings" className="text-sm font-medium text-[#672DB7] hover:text-[#5624A0]">
            Settings
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: August 1, 2026</p>
        <p className="mt-6 text-gray-700 leading-7">
          This policy explains what CompatibleFirst collects, why we use it, and the choices available to you.
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((section, index) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-gray-900">{index + 1}. {section.title}</h2>
              <p className="mt-3 text-gray-700 leading-7">{section.body}</p>
            </section>
          ))}
        </div>

        <section className="mt-10 border-t border-gray-200 pt-8">
          <h2 className="text-xl font-semibold text-gray-900">7. Contact</h2>
          <p className="mt-3 text-gray-700">
            Questions or privacy requests can be sent to{' '}
            <a className="font-medium text-[#672DB7] hover:underline" href="mailto:hello@matchmatical.com">
              hello@matchmatical.com
            </a>.
          </p>
        </section>

        <div className="mt-10">
          <Link href="/" className="font-medium text-[#672DB7] hover:underline">← Back to home</Link>
        </div>
      </main>
    </div>
  );
}
