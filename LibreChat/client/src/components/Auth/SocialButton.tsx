import React from 'react';

const SocialButton = ({ id, enabled, serverDomain, oauthPath, Icon, label }) => {
  if (!enabled) {
    return null;
  }

  const handleSocialLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${serverDomain}/api/auth/sign-in/social`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: oauthPath,
          callbackURL: `${window.location.origin}/login`,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (data.redirect && data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Social login error:', error);
    }
  };

  return (
    <div className="mt-2 flex gap-x-2">
      <button
        aria-label={`${label}`}
        className="flex w-full items-center space-x-3 rounded-2xl border border-border-light bg-surface-primary px-5 py-3 text-text-primary transition-colors duration-200 hover:bg-surface-tertiary"
        onClick={handleSocialLogin}
        data-testid={id}
      >
        <Icon />
        <p>{label}</p>
      </button>
    </div>
  );
};

export default SocialButton;
