export const metadata = {
  title: "Report - Simple",
  description: "Page description",
};

import Hero from "./hero";
import AppList from "@/components/app-list";
import Cta from "@/components/cta-alternative";

export default function Report() {
  return (
    <>
      <Hero />
      <AppList />
    </>
  );
}
