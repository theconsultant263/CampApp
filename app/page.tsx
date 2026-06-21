import { CampRegistrationPage } from "@/components/camp-registration-page";
import { RenderErrorBoundary } from "@/components/render-error-boundary";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-hero-grid bg-[size:30px_30px] opacity-20" />
      <RenderErrorBoundary>
        <CampRegistrationPage />
      </RenderErrorBoundary>
    </main>
  );
}
