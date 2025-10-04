export default {
  plugins: {
    autoprefixer: {
      // Automatically add vendor prefixes based on .browserslistrc
      flexbox: 'no-2009', // Only use final flexbox spec
      grid: 'autoplace', // Enable IE 11 grid support with autoplace
      overrideBrowserslist: undefined, // Use .browserslistrc
    },
  },
}

