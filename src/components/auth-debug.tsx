"use client";

import { useAuth } from "@/lib/auth/auth-context";

export function AuthDebug() {
  const { userId, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 p-3 bg-gray-800 text-white text-xs rounded-md shadow-lg">
        <p>Loading auth...</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 p-3 bg-gray-800 text-white text-xs rounded-md shadow-lg">
      <p className="font-semibold mb-1">Auth Status</p>
      <p>User ID: {userId ? `${userId.slice(0, 8)}...` : "None"}</p>
    </div>
  );
}
