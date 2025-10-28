export const metadata = {
  title: "Go viral. Again and again.",
  description: "Our AI scans your content, finds patterns behind your top posts, and tells you exactly what to post next to accelerate your growth.",
};

import Hero from "@/components/hero-home";
import BusinessCategories from "@/components/business-categories";
import LargeTestimonial from "@/components/large-testimonial";
import FeaturesPlanet from "@/components/features-planet";
import Features from "@/components/features-home";
import TestimonialsCarousel from "@/components/testimonials-carousel";
import Cta from "@/components/cta";

export default function Home() {
  return (
    <>
      <Hero />
       {/* <BusinessCategories />
      <LargeTestimonial />
      <FeaturesPlanet />
      <Features />
      <TestimonialsCarousel /> 
      <Cta /> */}
    </>
  );
}
