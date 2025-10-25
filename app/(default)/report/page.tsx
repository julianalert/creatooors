"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Report() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page since reports are now generated dynamically
    router.push("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to home page...</p>
      </div>
    </div>
  );
}
