"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const { data: session, status } = useSession();

  // Loading state
  if (status === "loading") {
    return (
      <div className="signin-container">
        <div className="signin-card">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show sign in
  if (!session) {
    return (
      <div className="signin-container">
        <div className="signin-card">
          <div className="signin-logo">
            <h1>Location Dashboard</h1>
            <p>Job Cart Tracker - Next Manufacturing</p>
          </div>
          <button
            className="signin-btn"
            onClick={() => signIn("azure-ad")}
          >
            <svg width="20" height="20" viewBox="0 0 21 21" fill="currentColor">
              <path d="M0 0h10v10H0V0zm11 0h10v10H11V0zM0 11h10v10H0V11zm11 0h10v10H11V11z"/>
            </svg>
            Sign in with Microsoft
          </button>
          <p className="signin-footer">
            Sign in with your organization account to access the dashboard
          </p>
        </div>
      </div>
    );
  }

  // Authenticated - show dashboard
  return <Dashboard user={session.user} onSignOut={() => signOut()} />;
}
