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
    <div className="mt-3 flex gap-x-2">
      <button
        aria-label={`${label}`}
        className="flex w-full items-center justify-center space-x-3 rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-700 transition-colors duration-200 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        onClick={handleSocialLogin}
        data-testid={id}
      >
        <Icon />
        <span className="font-medium">{label}</span>
      </button>
    </div>
  );
};

export default SocialButton;
