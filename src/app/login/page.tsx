import { LoginForm } from "./LoginForm";
import { Hero } from "@/components/Hero";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { e?: string; next?: string };
}) {
  return (
    <div className="min-h-dvh flex flex-col">
      <Hero
        size="lg"
        title={
          <>
            Belonging,
            <br />
            on every
            <br />
            court.
          </>
        }
        subtitle="A private network of founders, investors, and operators who carry their racquet everywhere."
      />
      <div className="px-7 pt-9 pb-12">
        <p className="text-[13.5px] leading-[1.78] text-[#4a4840] mb-6">
          Court Society is open to members of select private clubs. Your club is your credential.
        </p>
        <div className="w-8 h-px bg-cs-brass my-6" />
        <LoginForm initialError={searchParams.e} next={searchParams.next} />
      </div>
    </div>
  );
}
