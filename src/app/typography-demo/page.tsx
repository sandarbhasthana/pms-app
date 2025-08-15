import { TypographyShowcase } from "@/components/TypographyShowcase";

export default function TypographyDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <TypographyShowcase />
    </div>
  );
}

export const metadata = {
  title: "Typography Demo - PMS App",
  description: "Raleway typography system showcase for the PMS application"
};
