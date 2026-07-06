import HeroSection from "@/components/gummi/HeroSection";
import MarqueeSection from "@/components/gummi/MarqueeSection";
import AboutSection from "@/components/gummi/AboutSection";
import ServicesSection from "@/components/gummi/ServicesSection";
import ProjectsSection from "@/components/gummi/ProjectsSection";

export default function GummiPage() {
  return (
    <div
      style={{
        background: "#0C0C0C",
        fontFamily: "'Kanit', sans-serif",
        overflowX: "clip",
      }}
    >
      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <ProjectsSection />
    </div>
  );
}

