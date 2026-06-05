import { LoginForm } from "./LoginForm";
import { Hero } from "@/components/Hero";
import { getNominationByToken } from "@/lib/actions/nominations";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { e?: string; next?: string };
}) {
  // If the user arrived via a nomination link, surface the nominator's name
  // so the login screen doesn't look like a generic sign-up.
  let nominatorName: string | null = null;
  let nominatorNote: string | null = null;
  if (searchParams.next) {
    const match = searchParams.next.match(/[?&]nom=([0-9a-f-]{36})/i);
    if (match) {
      const nom = await getNominationByToken(match[1]);
      if (nom) {
        nominatorName = nom.nominator_name ?? null;
        nominatorNote = nom.note;
      }
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <Hero
        size="lg"
        title={
          nominatorName ? (
            <>You have been nominated.</>
          ) : (
            <>
              Belonging,
              <br />
              on every
              <br />
              court.
            </>
          )
        }
        subtitle={
          nominatorName
            ? `${nominatorName} has nominated you for membership in Court Society.`
            : "A private network of founders, investors, and operators who carry their racquet everywhere."
        }
      />
      <div className="px-7 pt-9 pb-12">
        {nominatorName ? (
          <>
            {nominatorNote && (
              <div className="border-l-2 border-cs-brass pl-4 py-1 mb-5">
                <div className="text-[9px] tracking-[0.2em] uppercase text-cs-brass mb-1">
                  Note from {nominatorName.split(" ")[0]}
                </div>
                <p className="text-[13px] italic text-cs-black/75 leading-relaxed">
                  &ldquo;{nominatorNote}&rdquo;
                </p>
              </div>
            )}
            <p className="text-[13.5px] leading-[1.78] text-[#4a4840] mb-6">
              Create an account to begin your application — you&rsquo;ll go
              straight to the form, no email round-trip required.
            </p>
          </>
        ) : (
          <p className="text-[13.5px] leading-[1.78] text-[#4a4840] mb-6">
            Court Society is open to members of select private clubs. Your club
            is your credential.
          </p>
        )}
        <div className="w-8 h-px bg-cs-brass my-6" />
        <LoginForm
          initialError={searchParams.e}
          next={searchParams.next}
          defaultMode={nominatorName ? "signup" : "signin"}
        />
      </div>
    </div>
  );
}
