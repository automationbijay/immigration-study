import React from 'react';

export default function Home({ session }) {
  // Extract a display name from email or fallback to 'User'
  const email = session?.user?.email || '';
  const name = email ? email.split('@')[0] : 'User';

  return (
    <div className="home-welcome">
      <h1>Welcome, {name}! 👋</h1>
      <p>
        We're glad to have you here. Explore the navigation menu to calculate your points,
        view migration pathways, and manage your profile.
      </p>
    </div>
  );
}
