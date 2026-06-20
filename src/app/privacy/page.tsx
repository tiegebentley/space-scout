import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Soccer IQ Lab",
  description: "How Soccer IQ Lab collects, uses, and protects your information.",
};

const UPDATED = "June 20, 2026";

export default function PrivacyPage() {
  return (
    <main className="flex-1 p-4 max-w-2xl mx-auto w-full">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-bold text-[#5d6f63] mb-4 hover:text-[#1F6E3D]"
      >
        &larr; Home
      </Link>

      <h1 className="font-[Fredoka] font-bold text-3xl text-[#16241c] mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-[#5d6f63] mb-8">Last updated: {UPDATED}</p>

      <div className="space-y-6 text-[#16241c] leading-relaxed">
        <p>
          Soccer IQ Lab (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or the
          &ldquo;app&rdquo;) is an interactive soccer-tactics training app for
          youth players and coaches, available on the web and as a mobile app.
          This policy explains what information we collect, how we use it, and
          the choices you have. It applies to the web app at
          thesocceriqlab.com and the Soccer IQ Lab mobile app.
        </p>

        <Section title="Information We Collect">
          <p>We collect only what we need to run your account and save your progress:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            <li>
              <strong>Account information</strong> — your email address, a
              display name, and a password. Passwords are stored securely in
              hashed form and are never visible to us.
            </li>
            <li>
              <strong>Role and team data</strong> — whether you are a coach or a
              player, and any teams you create or join (team names and join
              codes). Coaches may assign courses and lessons to their teams.
            </li>
            <li>
              <strong>Learning progress</strong> — lessons completed, scores,
              and progress through courses, so your training picks up where you
              left off.
            </li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> collect your location, contacts, photos,
            or device identifiers, and we do <strong>not</strong> use
            advertising or third-party tracking.
          </p>
        </Section>

        <Section title="How We Use Your Information">
          <ul className="list-disc pl-6 space-y-1">
            <li>To create and secure your account and sign you in.</li>
            <li>To save and sync your learning progress across devices.</li>
            <li>
              To enable coach/player features such as creating teams and
              assigning content.
            </li>
            <li>To respond to support requests you send us.</li>
          </ul>
          <p className="mt-2">
            We do not sell, rent, or share your personal information with third
            parties for marketing.
          </p>
        </Section>

        <Section title="How Your Data Is Stored">
          <p>
            Account, team, and progress data is stored using{" "}
            <a
              href="https://supabase.com/privacy"
              className="text-[#1F6E3D] underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Supabase
            </a>
            , our database and authentication provider. Access is restricted by
            row-level security so that you (and, for assigned content, your
            coach) can only see data you are authorized to see. Data is
            transmitted over encrypted (HTTPS) connections.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            Soccer IQ Lab is designed to help youth players learn soccer
            tactics. Accounts are intended to be created and managed by a parent,
            guardian, or coach. We collect only the limited information described
            above and never use it for advertising or profiling. If you believe a
            child has provided us information without appropriate consent, contact
            us and we will delete it.
          </p>
        </Section>

        <Section title="Your Choices and Rights">
          <ul className="list-disc pl-6 space-y-1">
            <li>You can update your display name and password from within the app.</li>
            <li>
              You can request deletion of your account and all associated data by
              contacting us at the email below.
            </li>
          </ul>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this policy from time to time. When we do, we will
            revise the &ldquo;Last updated&rdquo; date above. Continued use of
            the app after a change means you accept the updated policy.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>
            Questions about this policy or your data? Email us at{" "}
            <a
              href="mailto:bentleytiege@gmail.com"
              className="text-[#1F6E3D] underline"
            >
              bentleytiege@gmail.com
            </a>
            .
          </p>
        </Section>
      </div>

      <div className="mt-10 pt-6 border-t border-[#e0e7e3] text-sm text-[#5d6f63]">
        &copy; {new Date().getFullYear()} Soccer IQ Lab. All rights reserved.
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-[Fredoka] font-bold text-xl text-[#16241c] mb-2">{title}</h2>
      {children}
    </section>
  );
}
