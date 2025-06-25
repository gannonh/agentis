module.exports = {
  plugins: [
    require('postcss-import'),
    require('postcss-preset-env')({
      // Disable the is-pseudo-class polyfill to prevent transformation warnings
      // Modern browsers support :is() natively, so this polyfill is not needed
      features: {
        'is-pseudo-class': false,
      },
    }),
    require('tailwindcss'),
    require('autoprefixer'),
  ],
};
