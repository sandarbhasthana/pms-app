import { ColorShowcase } from "@/components/ColorShowcase";

export default function ColorDemoPage() {
  return (
    <div className="min-h-screen bg-background">
      <ColorShowcase />
    </div>
  );
}

export const metadata = {
  title: "Color Demo - PMS App",
  description: "Custom color system showcase for the PMS application with purple accent theme"
};
